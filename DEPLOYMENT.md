# Deploying CampusIQ (free)

CampusIQ runs as three parts, each on a free service:

| Part | Folder | Host |
|---|---|---|
| Website (React) | `client/` | **Vercel** |
| API (Node/Express) | `server/` | **Render** |
| Database (MySQL) | — | **Aiven** |
| Email (verification codes) | — | **Brevo** (web API) |

> **Free plan limits:** Render's free API sleeps after ~15 minutes without visitors; the next visit takes up to a minute while it wakes (the login page says so). Render's free plan also blocks email (SMTP) ports, which is why production uses Brevo's **web API** instead of SMTP.

---

## 1. Push the latest code

```bash
git add .
git commit -m "Prepare for deployment"
git push
```

## 2. Database: Aiven (free MySQL)

1. Sign up at **aiven.io** → **Create service** → **MySQL** → **Free** plan → pick a region near your users → name it `campusiq-db` → **Create**.
2. Wait until it shows **Running** (a few minutes).
3. On the service **Overview**, note: **Host**, **Port**, **User** (`avnadmin`), **Password**, **Database name** (`defaultdb`).
4. Download the **CA certificate** (`ca.pem`) from the same page.

## 3. Set up the database from your laptop

1. Save `ca.pem` as `server/ca.pem` (it is git-ignored).
2. Copy `server/.env.example` to **`server/.env.production`** (git-ignored) and fill in:

   ```
   NODE_ENV=production
   CLIENT_ORIGIN=http://localhost:5173
   DB_HOST=<Aiven host>
   DB_PORT=<Aiven port>
   DB_NAME=defaultdb
   DB_USER=avnadmin
   DB_PASSWORD=<Aiven password>
   DB_SSL=true
   DB_SSL_CA_FILE=ca.pem
   JWT_SECRET=<new random secret, see below>
   MAIL_TRANSPORT=brevo-api
   BREVO_API_KEY=<Brevo API key, step 4>
   MAIL_FROM=<sender verified in Brevo>
   MAIL_FROM_NAME=CampusIQ
   ```

   Make a new `JWT_SECRET` (don't reuse your local one):

   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```

3. In `server/`, create the tables, your admin and (optionally) the demo data on Aiven:

   ```bash
   npm run prod:migrate
   npm run prod:create-admin -- "Your Name" you@example.com "YourStrongPassword"
   npm run prod:seed        # optional demo lecturer, students, course and quiz
   ```

## 4. Email: Brevo API key

1. Brevo → **Settings → SMTP & API → API Keys** → **Generate a new API key** → name it `CampusIQ` → copy it into `BREVO_API_KEY`.
2. Brevo → **Settings → Security → Authorised IPs**: turn **off** blocking of unknown IP addresses (Render's IP changes, so a fixed allow-list won't work).
3. `MAIL_FROM` must be a sender you verified in Brevo (**Senders, domains & dedicated IPs**).

## 5. API: Render

1. Sign up at **render.com** with GitHub → **New → Web Service** → pick your repository.
2. Settings:

   | Setting | Value |
   |---|---|
   | Root Directory | `server` |
   | Runtime | Node |
   | Build Command | `npm install` |
   | Start Command | `npm run start:prod` (runs new migrations, then starts) |
   | Instance Type | Free |
   | Health Check Path | `/api/health` (under Advanced) |

3. **Environment variables**: add every line from `server/.env.production`, except:
   - replace `DB_SSL_CA_FILE` with **`DB_SSL_CA`** and paste the whole contents of `ca.pem` (including the `-----BEGIN CERTIFICATE-----` and `-----END CERTIFICATE-----` lines);
   - leave `CLIENT_ORIGIN` as `http://localhost:5173` for now (fixed in step 7).
4. **Create Web Service**. When the log shows `CampusIQ API listening`, open `https://<your-service>.onrender.com/api/health`. It should show `{"status":"ok",…}`.

## 6. Website: Vercel

1. Sign up at **vercel.com** with GitHub → **Add New → Project** → import your repository.
2. **Root Directory**: `client` (Vercel detects **Vite**; the build command and output folder fill in automatically).
3. **Environment Variables**: `VITE_API_URL` = `https://<your-service>.onrender.com` (no trailing slash).
4. **Deploy**. You get an address like `https://campusiq-xyz.vercel.app`.

## 7. Connect the two

On Render → your service → **Environment** → set
`CLIENT_ORIGIN=https://campusiq-xyz.vercel.app,http://localhost:5173` → **Save** (Render redeploys).

## 8. Test it online

Open your Vercel address and:
1. Sign up as a student with a real email → the code arrives → you're signed in.
2. Sign in on the **Admin** tab with the admin from step 3 → create a lecturer and a course.
3. As the lecturer: create an exam, import questions, publish.
4. As a student: take the exam and see your score.

---

## Updating later

Push to GitHub: Render and Vercel both redeploy automatically. New database migrations run on Render's start.

## Troubleshooting

| Problem | Fix |
|---|---|
| Website says "Cannot reach the server" | Check `VITE_API_URL` on Vercel (redeploy after changing it) and that `/api/health` on Render works |
| Browser console shows a **CORS** error | `CLIENT_ORIGIN` on Render must match the Vercel address exactly (https, no trailing slash) |
| Render log: `DB_SSL_CA: paste the whole certificate` | Paste all of `ca.pem`, including the BEGIN/END lines |
| Render log: `ETIMEDOUT` / `ECONNREFUSED` to the database | Check `DB_HOST`/`DB_PORT`; make sure the Aiven service is **Running** |
| No verification email | Render **Logs** show a `[mail]` line with the reason (API key, sender not verified, IP blocked) |
| Refreshing a page on Vercel shows 404 | `client/vercel.json` must be deployed (it routes every page to the app) |
