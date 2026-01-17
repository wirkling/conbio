# ConMS - Symbio Contract Management System

A lightweight contract management system for Symbio, built with Next.js, Supabase, and Tailwind CSS.

## Features (MVP)

- **Contract Search**: Fuzzy search by vendor, client, project, or sponsor name
- **Contract Detail**: View signature date, runtime, commercials, and parties
- **Change Order Tracking**: Link amendments and track financial impact
- **Document Upload**: Attach PDFs to contracts
- **Basic Reporting**: Contracts by status, type, and expiring soon
- **HubSpot Integration**: UI placeholder (coming soon)

## Tech Stack

- **Frontend**: Next.js 16, React 18, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui
- **Backend**: Supabase (PostgreSQL, Storage, Auth)
- **Deployment**: Vercel (recommended)

## Getting Started

### 1. Clone and Install

```bash
cd contract-management
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the schema from `supabase/schema.sql`
3. Create a storage bucket called `contracts` (private)
4. Copy your project URL and anon key

### 3. Configure Environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
contract-management/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── page.tsx           # Dashboard
│   │   ├── contracts/         # Contract list, detail, new
│   │   ├── reports/           # Reporting page
│   │   └── settings/          # Settings, HubSpot config
│   ├── components/
│   │   ├── layout/            # Sidebar, Header
│   │   └── ui/                # shadcn/ui components
│   ├── lib/
│   │   └── supabase/          # Supabase client config
│   └── types/
│       └── database.ts        # TypeScript types
├── supabase/
│   └── schema.sql             # Database schema
└── .env.local.example         # Environment template
```

## Database Schema

Key tables:
- `contracts` - Main contract records
- `change_orders` - Contract amendments
- `documents` - Uploaded files
- `users` - User accounts

See `supabase/schema.sql` for full schema with indexes and functions.

## Roadmap

### Phase 1 (MVP) - Done
- [x] Contract CRUD
- [x] Search and filtering
- [x] Change order tracking
- [x] Document upload UI
- [x] Basic reporting
- [x] HubSpot UI placeholder

### Phase 2 (Coming)
- [ ] HubSpot API integration
- [ ] Deadline notifications (email)
- [ ] AI document summarization (Bedrock)
- [ ] OCR for scanned documents

### Phase 3 (Future)
- [ ] Finance dashboard data pipeline
- [ ] Budget alerts → Legal triggers
- [ ] Advanced reporting/BI

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import to Vercel
3. Add environment variables
4. Deploy

### Manual

```bash
npm run build
npm start
```

## Cost Estimate

| Service | Monthly |
|---------|---------|
| Supabase Pro | $25 |
| Vercel Pro | $20 |
| **Total** | **~$45** |

vs. commercial solutions at €15-50k implementation + €5-10k/year.

## Support

Contact your IT administrator for support.

---

Built for Symbio | v1.0.0 MVP
