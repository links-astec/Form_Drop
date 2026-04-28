# FormDrop — Vercel Deployment

## What changed from the Express version

The original `server.js` uses Express and runs as a long-lived process (Railway/Render).  
On Vercel, there's no persistent server — instead each route becomes a **serverless function** in the `api/` folder:

| Old (Express route)  | New (Vercel file)       |
|----------------------|-------------------------|
| `POST /submit`       | `api/submit.js`         |
| `GET /health`        | `api/health.js`         |

No `express`, `cors`, or `dotenv` packages needed. Vercel handles routing, HTTPS, and env vars natively.

---

## Folder structure

```
formdrop/
├── api/
│   ├── submit.js       ← handles POST /api/submit
│   └── health.js       ← handles GET  /api/health
├── builder.html
├── fill.html
├── analytics.html
├── package.json
└── vercel.json
```

---

## Deploy steps

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "initial"
gh repo create formdrop --public --push --source=.
```

(Or use the GitHub Desktop app / any git client.)

### 2. Import on Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your GitHub repo
3. Leave **Framework Preset** as `Other` (no build step needed)
4. Click **Deploy** — it will fail with env var warnings, that's fine

### 3. Add environment variables

In Vercel → Project → **Settings → Environment Variables**, add:

| Name             | Value                        |
|------------------|------------------------------|
| `SMTP_USER`      | `you@gmail.com`              |
| `SMTP_PASS`      | `xxxx xxxx xxxx xxxx`        |
| `TO_EMAIL`       | `you@gmail.com`              |
| `ALLOWED_ORIGIN` | `*` (or your fill.html URL)  |
| `SMTP_HOST`      | `smtp.gmail.com` (optional)  |
| `SMTP_PORT`      | `465` (optional)             |

Then go to **Deployments** and click **Redeploy**.

### 4. Get your server URL

Vercel gives you a URL like:
```
https://formdrop-abc123.vercel.app
```

Test it:
```bash
curl https://formdrop-abc123.vercel.app/api/health
# → {"ok":true,"service":"formdrop-server"}
```

### 5. Connect to builder.html

1. Open `builder.html` → **Email alerts** tab
2. Paste your Vercel URL: `https://formdrop-abc123.vercel.app`  
   ⚠️ The builder appends `/health` and `/submit` — but Vercel routes them as `/api/health` and `/api/submit`.

**You need to enter the full base path:**
```
https://formdrop-abc123.vercel.app/api
```

Then click **Test connection** — it should show ✓.

---

## Hosting the HTML files

Because these are plain HTML files (no framework), Vercel will serve them automatically from your project root:

- `https://your-app.vercel.app/builder.html`
- `https://your-app.vercel.app/fill.html`
- `https://your-app.vercel.app/analytics.html`

In `builder.html`, the **Fill form URL** field should be set to:
```
https://your-app.vercel.app/fill.html
```

---

## Gmail App Password reminder

1. Enable 2-Step Verification on your Google account
2. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. Create → name it "FormDrop" → copy the 16-char password
4. Paste it (with or without spaces) into `SMTP_PASS`