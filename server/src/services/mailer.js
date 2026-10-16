const nodemailer = require('nodemailer')
const env = require('../config/env')

const settings = env.mail

// Any SMTP provider (Brevo by default), created only when a login and password are set
const smtpTransport =
  settings.configured && settings.transport === 'smtp'
    ? nodemailer.createTransport({
        host: settings.host,
        port: settings.port,
        secure: settings.secure,
        auth: { user: settings.user, pass: settings.password },
      })
    : null

if (env.NODE_ENV !== 'test') {
  const how = settings.transport === 'brevo-api' ? "Brevo's API" : `${settings.host}:${settings.port}`
  console.log(
    settings.configured
      ? `[mail] Sending email through ${how} as ${settings.from}`
      : '[mail] Email is not set up, so codes will be printed here instead of emailed',
  )
}

// Sends through Brevo's HTTPS API (https://developers.brevo.com/reference/sendtransacemail)
async function sendWithBrevoApi({ to, subject, text, html }) {
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': settings.apiKey, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      sender: { name: settings.fromName, email: settings.from },
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text,
    }),
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    const err = new Error(`Brevo API ${response.status}: ${body.message ?? response.statusText}`)
    err.responseCode = response.status
    err.response = body.message ?? ''
    throw err
  }
}

// Turns common provider errors into a hint about what to fix in .env
function explainSendError(err) {
  const text = `${err.code ?? ''} ${err.responseCode ?? ''} ${err.response ?? ''} ${err.message ?? ''}`
  if (settings.transport === 'brevo-api' && /unrecogni[sz]ed IP|authori[sz]ed IP/i.test(text)) {
    return 'Brevo blocked this server\'s IP address. In Brevo: Settings > Security > Authorised IPs, turn off blocking of unknown IPs (hosting providers change IPs).'
  }
  if (settings.transport === 'brevo-api' && err.responseCode === 401) {
    return 'Brevo rejected the API key. Check BREVO_API_KEY (Brevo: Settings > SMTP & API > API Keys).'
  }
  if (err.code === 'EAUTH' || /\b535\b/.test(text)) {
    return 'The email login was refused. Check MAIL_USER and MAIL_PASSWORD (for Brevo, use the SMTP key, not your Brevo account password).'
  }
  if (/sender|from address|not (yet )?(validated|verified)/i.test(text)) {
    return 'The sender address was refused. MAIL_FROM must be a sender you have verified in Brevo (Senders, domains & dedicated IPs).'
  }
  if (['ECONNECTION', 'ETIMEDOUT', 'ESOCKET', 'ENOTFOUND'].includes(err.code)) {
    return `Could not reach ${settings.host}:${settings.port}. Check MAIL_HOST / MAIL_PORT and your internet connection (try port 2525 if 587 is blocked).`
  }
  return null
}

// Sends an email. Without mail settings (development only), prints it to the terminal instead.
async function sendMail({ to, subject, text, html, devSummary }) {
  if (!settings.configured) {
    console.log(`[mail] To ${to}: ${devSummary ?? subject}`)
    return
  }

  try {
    if (settings.transport === 'brevo-api') {
      await sendWithBrevoApi({ to, subject, text, html })
    } else {
      await smtpTransport.sendMail({
        from: { name: settings.fromName, address: settings.from },
        to,
        subject,
        text,
        html,
      })
    }
  } catch (err) {
    const hint = explainSendError(err)
    if (hint) console.error(`[mail] ${hint}`)
    throw err
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char])
}

async function sendVerificationCode({ to, name, code, expiresInMinutes }) {
  const firstName = escapeHtml(name.split(' ')[0])
  const spacedCode = code.split('').join(' ')

  const text = [
    `Hi ${name.split(' ')[0]},`,
    '',
    `Your CampusIQ verification code is: ${code}`,
    '',
    `It expires in ${expiresInMinutes} minutes.`,
    "If you didn't create a CampusIQ account, you can ignore this email.",
  ].join('\n')

  // Email clients only support simple HTML, so styles are inline and the layout is a table
  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#1f2a44;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border:1px solid #e1e4ea;border-radius:8px;">
            <tr>
              <td style="padding:28px 32px 8px;font-size:22px;font-weight:bold;">
                Campus<span style="color:#c0392b;">IQ</span>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 0;font-size:16px;line-height:24px;">
                <p style="margin:0 0 16px;">Hi ${firstName},</p>
                <p style="margin:0 0 20px;">Enter this code to verify your email and finish creating your CampusIQ account:</p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:0 32px;">
                <div style="display:inline-block;background:#f4f5f7;border:1px solid #e1e4ea;border-radius:8px;padding:16px 24px;font-family:'Courier New',monospace;font-size:32px;font-weight:bold;letter-spacing:6px;color:#1f2a44;">
                  ${spacedCode}
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 28px;font-size:14px;line-height:22px;color:#5b6478;">
                <p style="margin:0 0 8px;">This code expires in ${expiresInMinutes} minutes.</p>
                <p style="margin:0;">If you didn't create a CampusIQ account, you can ignore this email.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`

  await sendMail({
    to,
    subject: 'Your CampusIQ verification code',
    text,
    html,
    devSummary: `verification code ${code}`,
  })
}

module.exports = { sendVerificationCode }
