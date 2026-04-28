# formdrop-server

Tiny Express server that receives FormDrop submissions and emails you a formatted HTML email + `.xlsx` attachment using your Gmail account and a Google App Password.

---

## Setup

### 1. Get a Google App Password

1. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
2. Make sure **2-Step Verification** is turned on
3. Create an app password → name it "FormDrop"
4. Copy the 16-character password (spaces don't matter, include them or not)

### 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env`:

```env
SMTP_USER=you@gmail.com          # Gmail you'll send FROM
SMTP_PASS=xxxx xxxx xxxx xxxx   # App Password from step 1
TO_EMAIL=you@gmail.com           # Where responses are sent (can be same)
PORT=3000
ALLOWED_ORIGIN=*                 # Lock this down to your fill.html domain in prod
```

### 3. Run locally

```bash
npm install
npm start
# → ✓ FormDrop server running on port 3000
```

Test it:
```bash
curl http://localhost:3000/health
# → {"ok":true,"service":"formdrop-server"}
```

---

## Deploy to Railway (free)

1. Push this folder to a GitHub repo
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Select your repo
4. Go to **Variables** and add `SMTP_USER`, `SMTP_PASS`, `TO_EMAIL`
5. Railway auto-deploys and gives you a URL like `https://formdrop-server-production.up.railway.app`

## Deploy to Render (free)

1. Push to GitHub
2. Go to [render.com](https://render.com) → New Web Service
3. Connect repo, set **Build Command** to `npm install` and **Start Command** to `node server.js`
4. Add environment variables under **Environment**
5. Copy the `.onrender.com` URL

---

## Connect to FormDrop

1. In `builder.html`, go to the **Email alerts** tab
2. Paste your deployed server URL (e.g. `https://my-app.railway.app`)
3. Click **Test connection** to verify
4. Re-copy your share link — the server URL is now embedded in it

---

## API

### `POST /submit`

Receives a form submission and sends an email.

**Body (JSON):**
```json
{
  "formTitle": "My Form",
  "questions": [
    { "id": "q1", "label": "Name", "type": "short" },
    { "id": "q2", "label": "Favourite colour", "type": "radio" }
  ],
  "answers": {
    "q1": "Alice",
    "q2": "Green"
  }
}
```

**Response:**
```json
{ "ok": true }
```

### `GET /health`

Returns `{ "ok": true }` — use this to verify the server is running.