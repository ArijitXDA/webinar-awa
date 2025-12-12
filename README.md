# AI Webinar Landing Page

A premium, mobile-first landing page for AI certification webinars by AIwithArijit.com

## Features

- 🎨 Premium, modern UI design
- 📱 Mobile-first, responsive layout
- 📝 5 webinar course cards (all visible on single mobile screen)
- ✨ Expandable cards with details
- 📋 Registration form with validation
- 💬 WhatsApp floating button
- 📊 UTM tracking for marketing analytics
- 🔒 Supabase integration for data storage

## Tech Stack

- **Framework**: Next.js 14
- **Styling**: Tailwind CSS
- **Database**: Supabase
- **Deployment**: Vercel

## Setup Instructions

### 1. Supabase Setup

1. Go to your Supabase project: https://supabase.com/dashboard
2. Navigate to SQL Editor
3. Copy the contents of `supabase_tables.sql` and run it
4. This will create:
   - `QR_landing_webinar_links` table with 5 sample webinars
   - `QR_landing_registrations` table for form submissions
   - Necessary indexes, triggers, and RLS policies

### 2. Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open http://localhost:3000 in your browser.

### 3. Deploy to Vercel

#### Option A: Quick Deploy (Vercel CLI)
```bash
npm install -g vercel
vercel
```

#### Option B: GitHub Integration
1. Push this code to a GitHub repository
2. Connect the repo to Vercel
3. Add environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 4. Environment Variables

The Supabase credentials are already embedded for quick start. For production:

1. Go to Vercel Project Settings > Environment Variables
2. Add:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon key

## Updating Webinar Details

1. Go to Supabase Dashboard > Table Editor
2. Select `QR_landing_webinar_links` table
3. Edit the webinar dates, times, or descriptions as needed

## UTM Tracking

The landing page automatically captures UTM parameters from URLs:
- `utm_source`
- `utm_medium`
- `utm_campaign`
- `utm_term`
- `utm_content`

Example URL with UTM:
```
https://your-domain.vercel.app/?utm_source=qr_standee&utm_medium=offline&utm_campaign=jan2025
```

## WhatsApp Integration

The WhatsApp button is configured to message: +91 9930051053

To change, update the phone number in `src/app/page.tsx`:
```javascript
href="https://wa.me/919930051053?text=..."
```

## Moving to AIwithArijit.com

To embed this page in your Bolt.new website:

1. Export the built code from Vercel
2. Or use an iframe embed
3. Or copy the components to your Bolt.new project

## Support

For questions: AI@withArijit.com

---

Built with ❤️ by AIwithArijit.com
