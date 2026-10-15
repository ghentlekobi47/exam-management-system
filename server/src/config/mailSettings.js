// Works out the email (SMTP) settings from .env values.
// Brevo is the default; a Gmail address with no host set uses Gmail's server.

const PROVIDERS = {
  brevo: { host: 'smtp-relay.brevo.com', port: 587 },
  gmail: { host: 'smtp.gmail.com', port: 465 },
}

// "true"/"yes"/"1" -> true, "false"/"no"/"0" -> false, empty -> fallback
function textToBoolean(value, fallback) {
  const text = String(value ?? '').trim().toLowerCase()
  if (['true', 'yes', '1'].includes(text)) return true
  if (['false', 'no', '0'].includes(text)) return false
  return fallback
}

function resolveMailSettings(raw) {
  const user = (raw.MAIL_USER ?? '').trim()
  // MAIL_APP_PASSWORD is the older name, from the Gmail-only setup
  const password = (raw.MAIL_PASSWORD || raw.MAIL_APP_PASSWORD || '').replace(/\s+/g, '')

  const looksLikeGmail = /@(gmail|googlemail)\.com$/i.test(user)
  const fallback = raw.MAIL_HOST ? {} : looksLikeGmail ? PROVIDERS.gmail : PROVIDERS.brevo

  const host = (raw.MAIL_HOST ?? '').trim() || fallback.host
  const port = Number(raw.MAIL_PORT) || fallback.port || 587
  // Port 465 uses a secure connection from the start; 587 upgrades it (STARTTLS)
  const secure = textToBoolean(raw.MAIL_SECURE, port === 465)

  return {
    host,
    port,
    secure,
    user,
    password,
    from: (raw.MAIL_FROM ?? '').trim() || user,
    fromName: (raw.MAIL_FROM_NAME ?? '').trim() || 'CampusIQ',
    configured: Boolean(user && password),
  }
}

module.exports = { resolveMailSettings, textToBoolean }
