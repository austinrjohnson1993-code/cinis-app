# Domain Setup — cinis.app

Steps to connect the custom domain to Vercel.

## 1. Porkbun DNS

1. Go to [Porkbun](https://porkbun.com) → log in → **Domain Management** → `cinis.app`
2. Click **DNS** (or "Edit DNS records")
3. Delete any existing A or CNAME records for `@` and `www`
4. Add the following records:

| Type  | Host | Value                  | TTL  |
|-------|------|------------------------|------|
| CNAME | `@`  | `cname.vercel-dns.com` | Auto |
| CNAME | `www`| `cname.vercel-dns.com` | Auto |

> Note: Some registrars don't allow a CNAME on `@` (the apex). If Porkbun blocks it, use their ALIAS or ANAME record type instead, pointing to `cname.vercel-dns.com`.

## 2. Vercel

1. Go to [Vercel Dashboard](https://vercel.com) → select project **focusbuddy-app**
2. **Settings** → **Domains**
3. Click **Add** and enter: `cinis.app` → confirm
4. Click **Add** again and enter: `www.cinis.app` → confirm
5. Vercel will auto-provision SSL via Let's Encrypt (usually takes < 5 minutes)

## 3. Verify

- Visit `https://cinis.app` — should load the app with a valid SSL cert
- Visit `https://www.cinis.app` — should redirect to apex or load directly
- `/pro` → `/pricing` redirect is handled in `vercel.json`

## Env vars reminder

Make sure these are set in Vercel → Settings → Environment Variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY`
- `STRIPE_SECRET_KEY` *(when Stripe is wired up)*
- `STRIPE_WEBHOOK_SECRET` *(when Stripe is wired up)*
