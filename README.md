# Manriki — Setup & Deployment Guide

## What you have

A complete Next.js application with:
- Mobile-first chat interface (dark, industrial aesthetic)
- AI coaching brain powered by Claude (with the full Manriki personality)
- Commitment tracking with done/missed/rescheduled states
- Supabase database for persistent storage
- PWA support (installable on your phone home screen)

## Step-by-step setup

### 1. Prerequisites (10 minutes)

Install these if you don't have them:

```bash
# Install Node.js (v18+) — download from https://nodejs.org
# Verify:
node -v
npm -v
```

### 2. Get your API keys (15 minutes)

**Supabase (free tier):**
1. Go to https://supabase.com and sign up
2. Click "New Project" — name it "manriki"
3. Pick a region close to you, set a database password
4. Once created, go to Settings → API
5. Copy the **Project URL** and **anon/public key**

**Anthropic (pay-as-you-go):**
1. Go to https://console.anthropic.com
2. Sign up and add a payment method ($5 minimum)
3. Go to API Keys → Create Key
4. Copy the key

### 3. Set up the database (5 minutes)

1. In your Supabase dashboard, click **SQL Editor** (left sidebar)
2. Click "New query"
3. Paste the entire contents of `supabase-schema.sql` from this project
4. Click **Run**
5. You should see "Success. No rows returned" — that means it worked

### 4. Configure environment (2 minutes)

```bash
cd manriki
cp .env.example .env.local
```

Edit `.env.local` with your actual values:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your_anon_key
ANTHROPIC_API_KEY=sk-ant-...your_api_key
```

### 5. Install and run (3 minutes)

```bash
npm install
npm run dev
```

Open http://localhost:3000 on your phone (same wifi) or computer.

### 6. Deploy to Vercel (10 minutes)

**First time:**
1. Push your code to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Manriki Phase 1"
   # Create a repo on github.com, then:
   git remote add origin https://github.com/YOUR_USERNAME/manriki.git
   git branch -M main
   git push -u origin main
   ```

2. Go to https://vercel.com and sign up with GitHub
3. Click "Import Project" → select your manriki repo
4. In **Environment Variables**, add all three:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `ANTHROPIC_API_KEY`
5. Click Deploy

You'll get a URL like `manriki-xxx.vercel.app`. That's your app.

### 7. Install on your phone (1 minute)

1. Open your Vercel URL on your phone's browser (Safari on iOS, Chrome on Android)
2. **iOS:** Tap Share → "Add to Home Screen"
3. **Android:** Tap the three dots → "Add to Home Screen" or "Install app"
4. It now looks and feels like a native app

## Using Manriki

### Talk to the coach
Open the app. Type what you want to be held accountable for. Manriki will push for specifics and start tracking.

Example first messages:
- "I want to go to the gym at 6am every Monday, Wednesday, and Friday"
- "I need to work on my business for 2 hours every morning before I check social media"
- "I'm supposed to do cold outreach to 5 potential clients this week"

### Track commitments
Tap the **Commitments** tab to:
- Create specific commitments with deadlines
- Mark them done or missed (with a reason)
- See your stats: active, completed, missed

### The AI reads everything
When you miss a commitment and give a reason, the AI remembers it. When you reschedule something, it counts. When you go silent for a day, it notices. This is the whole point — the coach gets smarter about YOUR patterns over time.

## Customizing the AI personality

The coaching personality lives in `src/lib/coaching.ts`. The `MANRIKI_SYSTEM_PROMPT` constant controls everything about how the AI talks to you. Edit it to:
- Make it more or less aggressive
- Add specific areas it should focus on (fitness, business, etc.)
- Change the tone (drill sergeant vs. thoughtful mentor)

This is your product — make the coach feel right for YOU first. You'll refine it for others later.

## What's next (Phase 2)

Once you've used Manriki daily for a week, come back and we'll build:
- Pattern detection engine (automatic excuse categorization)
- Weekly report card (brutally honest summary)
- Push notifications (so it reaches you even when you're avoiding it)
- Coaching intensity slider (1 = gentle, 5 = drill sergeant)

## Troubleshooting

**"Failed to get response" in chat:**
- Check that your `ANTHROPIC_API_KEY` is correct in `.env.local`
- Make sure you have credits in your Anthropic account

**No messages loading:**
- Check that your Supabase URL and key are correct
- Make sure you ran the SQL schema in Supabase SQL Editor

**PWA not installing:**
- You need HTTPS (works automatically on Vercel)
- On localhost, PWA install won't work — deploy first

**Chat feels slow:**
- Claude API calls take 2-5 seconds — this is normal
- The typing indicator shows while it's thinking
