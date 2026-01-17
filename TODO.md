# ConMS - Remaining Work

## MVP Completion (Wire up Supabase)

### Priority 1: Connect to Real Data
- [ ] Create Supabase project and run `supabase/schema.sql`
- [ ] Add environment variables to `.env.local`
- [ ] Replace mock data with Supabase queries in:
  - [ ] `src/app/page.tsx` (dashboard stats, recent contracts, deadlines)
  - [ ] `src/app/contracts/page.tsx` (contract list)
  - [ ] `src/app/contracts/[id]/page.tsx` (contract detail)
  - [ ] `src/app/reports/page.tsx` (reporting data)

### Priority 2: CRUD Operations
- [ ] Implement contract creation (`/contracts/new` form submission)
- [ ] Implement contract editing (`/contracts/[id]/edit` page - needs creation)
- [ ] Implement contract deletion (soft delete)
- [ ] Implement change order creation (dialog currently shows but doesn't save)
- [ ] Implement document upload to Supabase Storage

### Priority 3: Search
- [ ] Connect search to `search_contracts()` PostgreSQL function
- [ ] Add debouncing to search input

---

## Phase 2: Core Automation

### HubSpot Integration
- [ ] Get HubSpot API key (Private App token)
- [ ] Implement webhook endpoint for deal stage changes
- [ ] Create Supabase Edge Function to receive webhooks
- [ ] Wire up `/settings/hubspot` configuration page
- [ ] Display real HubSpot deals on dashboard
- [ ] Add "Create Contract from Deal" flow

### Deadline Notifications
- [ ] Set up Supabase scheduled function (cron) for daily deadline check
- [ ] Implement email sending (Resend, SendGrid, or Supabase Edge Function)
- [ ] Create notification preferences in user settings
- [ ] Add notification log table and UI

### AI Features (Bedrock)
- [ ] Set up AWS Bedrock access
- [ ] Implement document text extraction (pdf-parse or Textract)
- [ ] Create summarization endpoint using Claude
- [ ] Add Q&A interface on contract detail page
- [ ] Store embeddings in pgvector for semantic search

### OCR for Scanned Documents
- [ ] Evaluate Tesseract vs AWS Textract
- [ ] Add OCR processing pipeline for uploaded images/scanned PDFs
- [ ] Store extracted text for search indexing

---

## Phase 3: Finance Integration

### Data Pipeline to Finance Dashboard
- [ ] Define data export format/API
- [ ] Create scheduled sync or webhook to finance system
- [ ] Add financial summary views

### Budget Alert → Legal Trigger
- [ ] Connect to project budget data source
- [ ] Implement threshold monitoring
- [ ] Auto-create "potential change order" tasks when budget runs low
- [ ] Notify Legal team

---

## Nice-to-Have Improvements

### UI/UX
- [ ] Add loading skeletons for data fetching
- [ ] Implement optimistic updates
- [ ] Add keyboard shortcuts (Cmd+K for search)
- [ ] Mobile responsive improvements
- [ ] Dark mode support

### Data Management
- [ ] Bulk import from CSV/Excel
- [ ] Export contracts to CSV
- [ ] SharePoint bi-directional sync (read contract metadata from SP)

### Security & Auth
- [ ] Configure Azure AD SSO in Supabase
- [ ] Implement role-based access control (RLS policies)
- [ ] Add audit logging

### Advanced Reporting
- [ ] Add charts (recharts or chart.js)
- [ ] Custom report builder
- [ ] Scheduled report emails

---

## Technical Debt

- [ ] Add unit tests (Vitest)
- [ ] Add E2E tests (Playwright)
- [ ] Set up CI/CD pipeline
- [ ] Add error boundaries
- [ ] Implement proper form validation with Zod
- [ ] Add React Query for data fetching/caching

---

## Environment Setup Checklist

```bash
# 1. Supabase
- [ ] Create project at supabase.com
- [ ] Run supabase/schema.sql in SQL Editor
- [ ] Create 'contracts' storage bucket (private)
- [ ] Copy URL and anon key to .env.local

# 2. HubSpot (when ready)
- [ ] Create Private App in HubSpot
- [ ] Get API token
- [ ] Configure pipeline and stage IDs

# 3. AWS Bedrock (Phase 2)
- [ ] Set up AWS account with Bedrock access
- [ ] Create IAM credentials
- [ ] Add to environment variables

# 4. Deployment
- [ ] Push to GitHub
- [ ] Connect to Vercel
- [ ] Add environment variables in Vercel
- [ ] Deploy
```
