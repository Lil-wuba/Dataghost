# 👻 DataGhost — Vulnerability Management Platform

<div align="center">

![DataGhost Banner](https://img.shields.io/badge/DataGhost-Security%20Platform-10B981?style=for-the-badge&logo=shield&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)
![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?style=for-the-badge&logo=supabase)
![Vercel](https://img.shields.io/badge/Vercel-Deployed-black?style=for-the-badge&logo=vercel)

**A full-stack cybersecurity platform for real-time vulnerability management, site auditing, and compliance reporting.**

🌐 **[Live Demo](https://vulnerability-app-blush.vercel.app)** &nbsp;|&nbsp; 🔐 **[Login](https://vulnerability-app-blush.vercel.app/login)** &nbsp;|&nbsp; 📖 **[How to Use](https://vulnerability-app-blush.vercel.app/guide)**

</div>

---

## 🚀 What is DataGhost?

DataGhost is a production-ready vulnerability management platform built for security teams, developers, and organizations who want to monitor, track, and remediate security threats across their infrastructure.

It combines **real CVE data**, **live website security scanning**, **compliance reporting**, and **threat management** into one beautiful dashboard.

---

## ✨ Features

### 🔍 Website Security Auditor
- Scan any website for SSL certificates, HTTP security headers, and DNS records
- Get a score out of 100 with letter grades (A+ to F)
- Detailed breakdown with fix recommendations
- Scans saved automatically to history

### 🛡️ CVE Database
- Live vulnerability data from the **National Vulnerability Database (NVD)**
- Search by keyword (apache, nginx, wordpress, linux...)
- Filter by severity: Critical, High, Medium, Low
- CVSS scores and direct NVD links

### 📊 Security Dashboard
- Real-time risk score calculation
- Vulnerability trend charts (7 months)
- Severity distribution doughnut chart
- Top risky assets table
- Animated KPI counters

### 🖥️ Asset Management
- Add and track servers, websites, databases, cloud resources
- Assign vulnerabilities to assets
- Monitor asset risk levels

### 🔓 Vulnerability Tracker
- Log and track vulnerabilities by severity
- Filter by status: Open, In Progress, Resolved
- Link vulnerabilities to assets

### ⚠️ Threat Intelligence
- Real-time threat feed
- Categorized by threat type and severity
- Mark threats as acknowledged or mitigated

### 🔧 Remediation Plans
- Create step-by-step remediation plans
- Track fix progress
- Confetti celebration when vulnerabilities are resolved 🎉

### 📋 Compliance Reports
- Generate reports for **PCI DSS**, **ISO 27001**, **SOC 2**, **GDPR**
- Export to **PDF** with one click
- Compliance score tracking

### 🕐 Scan History
- All past website security scans saved
- Filter by grade (A+, A, B, C, D, F)
- Search by domain
- Re-scan or delete entries

### 🔒 Authentication & Security
- Secure login/register with Supabase Auth
- Password reset via email
- New user onboarding flow
- Row-level security on all data

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 14 (App Router), React |
| **Backend** | Next.js API Routes |
| **Database** | Supabase (PostgreSQL) |
| **Auth** | Supabase Auth |
| **Deployment** | Vercel |
| **Charts** | Chart.js, React-Chartjs-2 |
| **APIs** | NVD CVE API, ip-api.com |
| **Styling** | Inline styles, CSS |

---

## 📸 Screenshots

### Dashboard
> Real-time security overview with charts, KPIs, and risk scores

### Site Auditor
> Scan any website — SSL, headers, DNS scored out of 100

### CVE Database
> Live vulnerability data from NVD with severity filtering

### Compliance Reports
> One-click PDF export for PCI DSS, ISO 27001, SOC 2, GDPR

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- A Supabase account
- A Vercel account (for deployment)

### Local Setup

```bash
# Clone the repository
git clone https://github.com/Lil-wuba/vulnerability-app.git
cd vulnerability-app

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
```

Add your credentials to `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

```bash
# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) 🚀

### Supabase Setup

Run these SQL queries in your Supabase SQL editor:

```sql
-- Assets table
CREATE TABLE assets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  type TEXT,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vulnerabilities table
CREATE TABLE vulnerabilities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  asset_id UUID REFERENCES assets(id),
  title TEXT NOT NULL,
  severity TEXT NOT NULL,
  status TEXT DEFAULT 'open',
  discovered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Scan history table
CREATE TABLE scan_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  url TEXT NOT NULL,
  hostname TEXT,
  score INTEGER NOT NULL,
  grade TEXT,
  headers_score INTEGER DEFAULT 0,
  dns_score INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE vulnerabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_history ENABLE ROW LEVEL SECURITY;
```

---

## 🌐 Deployment

This app is deployed on **Vercel** with automatic deployments on every git push.

```bash
# Deploy to Vercel
vercel --prod
```

---

## 🎯 Demo Flow

1. Visit the **[live demo](https://vulnerability-app-blush.vercel.app)**
2. Register a new account
3. Complete the **onboarding** flow
4. Go to **Site Auditor** → scan `google.com`
5. Check **Scan History** to see saved results
6. Browse the **CVE Database** → search "apache"
7. Add assets in **Asset Management**
8. Generate a **Compliance Report** → export PDF

---

## 👥 Built With

- 💚 **Next.js** — React framework
- 🗄️ **Supabase** — Backend as a service
- 🚀 **Vercel** — Deployment platform
- 🔒 **NVD API** — Real CVE vulnerability data

---

## 📄 License

MIT License — feel free to use this project as a template.

---

<div align="center">

**Built with ❤️ for hackathon**

⭐ Star this repo if you found it useful!

</div>