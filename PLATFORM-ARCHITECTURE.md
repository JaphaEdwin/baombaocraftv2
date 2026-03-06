# BaoMbao Digital Platform Architecture

## Overview

A progressive web application (PWA) built for mobile-first, low-bandwidth environments in Uganda and similar markets. The platform combines a customer-facing website with admin tools for quotation management, CRM, and business intelligence.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                         │
├─────────────────┬─────────────────┬─────────────────┬───────────────────────┤
│   Customer      │    Admin        │    Partner      │    WhatsApp           │
│   Portal        │    Dashboard    │    Portal       │    Business API       │
│   (Public)      │    (/admin)     │    (/partner)   │    (Webhook)          │
└────────┬────────┴────────┬────────┴────────┬────────┴───────────┬───────────┘
         │                 │                 │                     │
         └─────────────────┴─────────────────┴─────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React PWA)                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │ • Service Worker (Offline Support)                                      │ │
│  │ • Code Splitting (Lazy Loading)                                         │ │
│  │ • Image Optimization (WebP, Lazy Load)                                  │ │
│  │ • Redux/Context (State Management)                                      │ │
│  │ • React Query (Data Fetching/Caching)                                   │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         API GATEWAY (Node.js/Express)                        │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │ • JWT Authentication & RBAC                                             │ │
│  │ • Rate Limiting                                                         │ │
│  │ • Request Validation                                                    │ │
│  │ • Compression (gzip/brotli)                                             │ │
│  │ • CORS & Security Headers                                               │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
         ┌──────────────────────────┼──────────────────────────┐
         ▼                          ▼                          ▼
┌─────────────────┐    ┌─────────────────────┐    ┌─────────────────────────┐
│  AUTH SERVICE   │    │   CORE SERVICES     │    │   EXTERNAL SERVICES     │
│  ───────────────│    │   ─────────────────── │   │   ─────────────────────  │
│  • User Auth    │    │  • Quotation Engine │    │  • MTN MoMo API         │
│  • JWT/Refresh  │    │  • Project Tracker  │    │  • Airtel Money API     │
│  • Password     │    │  • CRM/Lead Scoring │    │  • Stripe (Cards)       │
│  • Roles/Perms  │    │  • Inventory        │    │  • Twilio (SMS)         │
│                 │    │  • Analytics        │    │  • WhatsApp Business    │
│                 │    │  • CMS              │    │  • SendGrid (Email)     │
│                 │    │  • Costing Engine   │    │  • Cloudinary (Images)  │
└────────┬────────┘    └──────────┬──────────┘    └─────────────────────────┘
         │                        │
         └────────────┬───────────┘
                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DATABASE LAYER                                       │
│  ┌──────────────────────┐    ┌──────────────────────┐    ┌────────────────┐ │
│  │   PostgreSQL         │    │   Redis              │    │   S3/Cloudinary│ │
│  │   ────────────────   │    │   ───────────────    │    │   ─────────────│ │
│  │   • Users            │    │   • Sessions         │    │   • Images     │ │
│  │   • Quotations       │    │   • Cache            │    │   • Documents  │ │
│  │   • Projects         │    │   • Rate Limits      │    │   • 3D Models  │ │
│  │   • Payments         │    │   • Job Queues       │    │                │ │
│  │   • Inventory        │    │                      │    │                │ │
│  │   • Analytics        │    │                      │    │                │ │
│  └──────────────────────┘    └──────────────────────┘    └────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Role-Based Access Control (RBAC)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER ROLES                                      │
├─────────────────┬─────────────────┬─────────────────┬───────────────────────┤
│   SUPER_ADMIN   │    ADMIN        │    PARTNER      │    CUSTOMER           │
│   ─────────────  │   ─────────────  │   ─────────────  │   ─────────────────── │
│   Full access   │   Quotations    │   Spec sheets   │   View own quotes     │
│   User mgmt     │   Projects      │   Package conf  │   Project tracking    │
│   Analytics     │   CRM           │   Order history │   Payment history     │
│   System config │   Inventory     │   Bulk orders   │   Profile mgmt        │
│   All reports   │   CMS           │                 │   Inquiry submission  │
└─────────────────┴─────────────────┴─────────────────┴───────────────────────┘
```

---

## Phase 2 Features (Months 4-6)

### 2.1 Admin Quotation Builder
- **Access**: Admin only (`/admin/quotations`)
- **Features**:
  - Product template library (kitchens, wardrobes, doors, furniture)
  - Material selector with real-time pricing
  - Dimension calculator
  - Add-ons and customizations
  - PDF generation and email sending
  - Quote versioning and history

### 2.2 Customer Account Portal
- **Access**: Authenticated customers (`/account`)
- **Features**:
  - Registration/login (email, phone, Google)
  - View quote history
  - Accept/reject quotes
  - Project dashboard
  - Payment history
  - Profile management

### 2.3 Payment Integration
- **Access**: Customers (checkout flow)
- **Providers**:
  - MTN Mobile Money (Uganda primary)
  - Airtel Money
  - Card payments via Stripe/Flutterwave
- **Features**:
  - Deposit collection (50% initial)
  - Payment status tracking
  - Receipt generation
  - Webhook handling

### 2.4 Project Tracker
- **Access**: Customer + Admin
- **Milestones**:
  1. Quote Accepted
  2. Design Approval
  3. Production Started
  4. Quality Check
  5. Ready for Delivery
  6. Installation
  7. Completed
- **Notifications**: Email + SMS via Twilio

### 2.5 CMS System
- **Access**: Admin (`/admin/cms`)
- **Content Types**:
  - Blog posts
  - Case studies
  - Testimonials
  - FAQs (existing page integration)

### 2.6 Costing Engine
- **Access**: Admin only
- **Features**:
  - Material cost calculator
  - Labor hour tracking
  - Overhead allocation
  - Margin analysis
  - QA checklist templates

---

## Phase 3 Features (Months 7-12)

### 3.1 Partner Package Configurator
- **Access**: Partner portal (`/partner`)
- **Features**:
  - Bulk unit configurator
  - Volume discount calculator
  - Project timeline estimator
  - Collaborative quote building

### 3.2 Architect/Designer Portal
- **Access**: Partner portal
- **Features**:
  - Spec sheet downloads (PDF)
  - CAD file library
  - Material samples ordering
  - Project collaboration tools

### 3.3 Interactive Room Planner
- **Access**: Customer-facing
- **Technology**: Three.js / React Three Fiber
- **Features**:
  - Drag-and-drop furniture placement
  - Dimension input
  - Material/color preview
  - Save and share designs
  - Quote request from design

### 3.4 Inventory System
- **Access**: Admin only
- **Features**:
  - Stock level tracking
  - Supplier management
  - Reorder alerts
  - Material usage logging
  - Cost tracking

### 3.5 Analytics Dashboard
- **Access**: Admin/Super Admin
- **Metrics**:
  - Revenue & margins
  - Conversion rates
  - Project timelines
  - Customer satisfaction
  - Inventory turnover

### 3.6 Lead Scoring & Automation
- **Access**: Admin CRM
- **Features**:
  - Engagement scoring
  - Automated follow-up sequences
  - Email/SMS campaigns
  - Pipeline management

---

## Database Schema Overview

### Core Entities

```
Users
├── id (uuid)
├── email
├── phone
├── password_hash
├── role (customer|admin|partner|super_admin)
├── profile (JSON: name, company, address)
├── verified (boolean)
├── created_at
└── updated_at

Quotations
├── id (uuid)
├── quote_number (auto-increment)
├── customer_id → Users
├── created_by → Users (admin)
├── status (draft|sent|viewed|accepted|rejected|expired)
├── items (JSON: products, materials, dimensions)
├── subtotal, tax, total
├── valid_until
├── version
├── notes
├── created_at
└── updated_at

Projects
├── id (uuid)
├── project_number
├── quotation_id → Quotations
├── customer_id → Users
├── status (pending|design|production|qa|delivery|installation|completed)
├── milestones (JSON array)
├── assigned_team (JSON)
├── start_date, target_date, completed_date
├── created_at
└── updated_at

Payments
├── id (uuid)
├── project_id → Projects
├── quotation_id → Quotations
├── amount
├── currency (UGX, USD)
├── method (mtn_momo|airtel|card)
├── provider_ref
├── status (pending|completed|failed|refunded)
├── created_at
└── updated_at

Inventory
├── id (uuid)
├── material_name
├── category
├── unit (sqm, piece, kg)
├── quantity_available
├── reorder_level
├── unit_cost
├── supplier_id
├── last_restocked
└── updated_at
```

---

## API Structure

```
/api/v1
├── /auth
│   ├── POST /register
│   ├── POST /login
│   ├── POST /logout
│   ├── POST /refresh
│   ├── POST /forgot-password
│   └── POST /reset-password
│
├── /users (Admin)
│   ├── GET /
│   ├── GET /:id
│   ├── PUT /:id
│   └── DELETE /:id
│
├── /quotations
│   ├── GET / (Admin: all, Customer: own)
│   ├── GET /:id
│   ├── POST / (Admin)
│   ├── PUT /:id (Admin)
│   ├── POST /:id/send (Admin)
│   ├── POST /:id/accept (Customer)
│   └── POST /:id/reject (Customer)
│
├── /projects
│   ├── GET /
│   ├── GET /:id
│   ├── PUT /:id/status (Admin)
│   └── POST /:id/milestones (Admin)
│
├── /payments
│   ├── POST /initiate
│   ├── POST /callback/:provider
│   ├── GET /:id/status
│   └── GET /history
│
├── /inventory (Admin)
│   ├── GET /
│   ├── POST /
│   ├── PUT /:id
│   └── GET /alerts
│
├── /cms (Admin write, Public read)
│   ├── /posts
│   ├── /testimonials
│   └── /case-studies
│
├── /analytics (Admin)
│   ├── GET /dashboard
│   ├── GET /conversions
│   ├── GET /revenue
│   └── GET /performance
│
└── /webhooks
    ├── POST /mtn-momo
    ├── POST /airtel
    ├── POST /stripe
    └── POST /whatsapp
```

---

## Success Metrics Implementation

### Platform Performance
- **Page Load Time**: Lighthouse CI in deployment pipeline
- **Mobile Score**: Automated testing with Puppeteer
- **Uptime**: AWS CloudWatch / Vercel Analytics

### Business Metrics Tracking
```javascript
// Event tracking structure
trackEvent({
  category: 'conversion',
  action: 'inquiry_submitted',
  label: 'contact_form',
  value: 1,
  metadata: {
    source: 'website',
    page: '/contact',
    device: 'mobile'
  }
});
```

### KPI Dashboard Data Points
- Inquiry count (daily/weekly/monthly)
- Quote response times
- Conversion rates (inquiry → quote → project)
- Revenue and margins
- Customer satisfaction scores
- Repeat customer rate

---

## Risk Mitigations

### 1. Low Internet Speeds
- **Service Worker**: Offline-first PWA
- **Image Optimization**: WebP with AVIF fallback, lazy loading
- **Code Splitting**: React.lazy() for route-based splitting
- **Data Caching**: React Query with stale-while-revalidate
- **Compression**: Brotli/gzip for all responses

### 2. Content Creation Bottleneck
- **Automated Capture**: Project completion triggers photo upload flow
- **Templates**: Pre-built case study templates
- **User-Generated**: Customer testimonial submission flow

### 3. Customer Adoption
- **WhatsApp Integration**: Primary communication channel
- **Progressive Enhancement**: Works without JavaScript
- **SMS Fallback**: Critical notifications via SMS

### 4. Payment Complexity
- **Staged Rollout**: Manual confirmation → MTN MoMo → Full integration
- **Retry Logic**: Automatic retry for failed transactions
- **Reconciliation**: Daily payment reconciliation reports

---

## Timeline (3 Developer Team)

### Phase 2: Months 4-6

**Month 4 (Weeks 1-4)**
- Week 1-2: Backend setup, auth system, database schemas
- Week 3-4: Admin quotation builder (backend + frontend)

**Month 5 (Weeks 5-8)**
- Week 5-6: Customer portal, project tracker
- Week 7-8: Payment integration (MTN MoMo first)

**Month 6 (Weeks 9-12)**
- Week 9-10: CMS system, costing engine
- Week 11-12: Testing, bug fixes, Phase 2 launch

### Phase 3: Months 7-12

**Month 7-8**
- Partner portal foundation
- Package configurator

**Month 9-10**
- Room planner (Three.js)
- Inventory system

**Month 11-12**
- Analytics dashboard
- Lead scoring
- Phase 3 launch

---

## Tech Stack Summary

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, TailwindCSS, React Query |
| State | Redux Toolkit / Zustand |
| 3D Visualization | Three.js / React Three Fiber |
| Backend | Node.js 20, Express.js, TypeScript |
| Database | PostgreSQL 15, Prisma ORM |
| Cache | Redis |
| Auth | JWT + Refresh Tokens, bcrypt |
| Payments | MTN MoMo API, Airtel Money, Stripe |
| Notifications | Twilio (SMS), SendGrid (Email) |
| Storage | Cloudinary / AWS S3 |
| Hosting | Vercel (Frontend), Railway/Render (Backend) |
| Monitoring | Sentry, LogRocket, Google Analytics |
