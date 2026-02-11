# Deploying Lodging War Room

## Prerequisites

- A [Vercel](https://vercel.com) account
- A [Neon](https://neon.tech) account (free tier is fine)
- DNS access to functionlabs.com
- (Optional) A [Mapbox](https://mapbox.com) account for the interactive map

---

## Step 1: Set up the database (Neon)

1. Go to [neon.tech](https://neon.tech) and create a free account
2. Create a new project (name it `lodging-warroom`)
3. Choose the region closest to your Vercel deployment (US East / `iad1`)
4. Once created, copy the two connection strings from the dashboard:
   - **Connection string** (pooled) → this is your `DATABASE_URL`
   - **Direct connection** → this is your `DIRECT_DATABASE_URL`

   They'll look like:
   ```
   postgresql://neondb_owner:abc123@ep-cool-name-123.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

5. Push the schema to your new database:
   ```bash
   DATABASE_URL="your-pooled-url" DIRECT_DATABASE_URL="your-direct-url" npx prisma db push
   ```

---

## Step 2: Deploy to Vercel

### Option A: Via Vercel Dashboard (recommended)

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import the `lodging-warroom` repository from GitHub
3. Vercel will auto-detect it as a Next.js project
4. Add environment variables:

   | Variable | Value |
   |----------|-------|
   | `DATABASE_URL` | Your Neon pooled connection string |
   | `DIRECT_DATABASE_URL` | Your Neon direct connection string |
   | `NEXT_PUBLIC_MAPBOX_TOKEN` | Your Mapbox public token (optional) |

5. Click **Deploy**

### Option B: Via CLI

```bash
npm i -g vercel
vercel login
vercel --prod
```

It will prompt you to set up the project and link it. Add env vars via:
```bash
vercel env add DATABASE_URL
vercel env add DIRECT_DATABASE_URL
vercel env add NEXT_PUBLIC_MAPBOX_TOKEN
```

Then redeploy:
```bash
vercel --prod
```

---

## Step 3: Set up the custom domain

### In Vercel:

1. Go to your project → **Settings** → **Domains**
2. Add: `lodging.functionlabs.com` (or whatever subdomain you want)
3. Vercel will show you DNS records to add

### In your DNS provider (for functionlabs.com):

Add a **CNAME** record:

| Type | Name | Value |
|------|------|-------|
| CNAME | `lodging` | `cname.vercel-dns.com` |

- TTL: 300 (or auto)
- If using Cloudflare, set proxy status to **DNS only** (gray cloud) initially

Wait a few minutes for DNS propagation. Vercel will auto-provision an SSL certificate.

### Verify:

Visit `https://lodging.functionlabs.com` — it should show the app.

---

## Step 4: Get a Mapbox token (optional but recommended)

1. Sign up at [mapbox.com](https://mapbox.com)
2. Go to your **Account** → **Access tokens**
3. Copy your **Default public token** (starts with `pk.`)
4. Add it to Vercel as `NEXT_PUBLIC_MAPBOX_TOKEN`
5. Redeploy (or it will take effect on the next deploy)

Without Mapbox, the app still works — it shows a fallback list view instead of the map.

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Neon pooled connection string |
| `DIRECT_DATABASE_URL` | Yes | Neon direct connection string (for migrations) |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | No | Mapbox GL JS public token for the map |
| `OPENAI_API_KEY` | No | For photo classification (future feature) |
| `ANTHROPIC_API_KEY` | No | Alternative for photo classification |

---

## Updating

Push to the main branch connected to Vercel → automatic redeploy.

To update the database schema:
```bash
npx prisma db push
```

To reset the database (destructive):
```bash
npx prisma db push --force-reset
```
