# 🚀 PocketWall SaaS Implementation Plan

> **Version**: 1.0  
> **Created**: December 5, 2024  
> **Status**: Approved & Implementation In Progress

---

## 📋 Quick Reference

**Project Type**: Personal Finance Desktop App (Electron + React)  
**Business Model**: Freemium SaaS (Free + Pro subscription)  
**Target Market**: US & India  
**Tech Stack**: Firebase Auth, Firestore, Stripe, React, TailwindCSS

---

## 🎯 User Journey Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         COMPLETE USER FLOW                                  │
└─────────────────────────────────────────────────────────────────────────────┘

Step 1: DISCOVERY
  User finds website via Google/Social media
  ↓
Step 2: WEBSITE
  Sees features, pricing (FREE vs PRO)
  Clicks "Download Free" (no login required)
  ↓
Step 3: DOWNLOAD & INSTALL
  Downloads .exe (~100MB)
  Installs on Windows (Next-Next-Finish)
  ↓
Step 4: SIGNUP/LOGIN (In App)
  Options: Google Sign-In (1-click) OR Email+Password
  New users get 7-DAY FREE TRIAL (Pro features unlocked)
  ↓
Step 5: USE THE APP
  Dashboard shows trial countdown
  User adds transactions, tracks investments, sets budgets
  ↓
Step 6: TRIAL ENDS
  After 7 days: Auto-downgrade to FREE plan
  Pro features get locked (blur + "Upgrade" overlay)
  ↓
Step 7: UPGRADE (If user wants Pro)
  Clicks "Upgrade to Pro" button
  Browser opens → Stripe Checkout
  Pays $4.99/month or $49/year
  ↓
Step 8: INSTANT ACTIVATION ✨
  Stripe webhook → Firebase update → App unlocks Pro
  NO manual work, NO email, NO license key!
```

---

## 💰 Pricing Plans

| Feature | FREE | PRO ($4.99/mo) |
|---------|------|----------------|
| Transactions | ✅ Unlimited | ✅ Unlimited |
| Basic Budget | ✅ | ✅ |
| Accounts | 1 | ✅ Unlimited |
| Investment Tracking | ❌ | ✅ |
| Portfolio | ❌ | ✅ |
| Goals | ❌ | ✅ |
| Reports & Export | ❌ | ✅ |
| Fixed Assets | ❌ | ✅ |
| Debt/Loan Tracking | ❌ | ✅ |
| Cloud Sync | ❌ | ✅ |
| Priority Support | ❌ | ✅ |

**US Pricing**: $4.99/month or $49/year  
**India Pricing**: ₹199/month or ₹1499/year

---

## 🏗️ Technical Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SYSTEM ARCHITECTURE                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌──────────────┐           ┌──────────────┐                              │
│   │   WEBSITE    │           │  DESKTOP APP │                              │
│   │   (React)    │           │  (Electron)  │                              │
│   └──────┬───────┘           └──────┬───────┘                              │
│          │                          │                                       │
│          └──────────┬───────────────┘                                       │
│                     │                                                       │
│          ┌──────────▼──────────┐                                           │
│          │    FIREBASE AUTH    │  ← Google Sign-In + Email/Password        │
│          └──────────┬──────────┘                                           │
│                     │                                                       │
│          ┌──────────▼──────────┐                                           │
│          │     FIRESTORE DB    │  ← User data, plan status                 │
│          └──────────┬──────────┘                                           │
│                     │                                                       │
│   ┌─────────────────┼─────────────────┐                                    │
│   │                 │                 │                                     │
│   ▼                 ▼                 ▼                                     │
│ ┌─────┐         ┌──────┐         ┌─────────┐                               │
│ │STRIPE│        │FINNHUB│        │ mfapi.in │                              │
│ │Payment│       │Stocks │        │Mutual Fund│                             │
│ └───┬───┘       └───────┘        └──────────┘                              │
│     │                                                                       │
│     │ Webhook                                                               │
│     ▼                                                                       │
│ ┌──────────┐                                                               │
│ │ Make.com │  → Updates Firebase on payment success                        │
│ └──────────┘                                                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔐 Authentication

### Primary Method: Google Sign-In (Recommended for US)
- 1-click signup/login
- No password to remember
- FREE (no SMS costs)

### Secondary Method: Email + Password
- Email verification link sent
- "Forgot Password" option available
- Firebase handles password hashing (secure)

### Security Notes
- Passwords are NEVER stored in plain text
- Firebase Auth handles all security
- Admin cannot see user passwords
- PIN (app lock) stored encrypted

---

## ⚙️ Firebase Database Schema

```javascript
// Collection: users/{userId}
{
    email: "user@example.com",
    plan: "free",              // "free" or "pro"
    createdAt: "2024-12-05T10:00:00Z",
    trialEnds: "2024-12-12T10:00:00Z",    // 7 days from signup
    subscriptionId: "sub_xxx",             // Stripe subscription ID
    subscriptionStatus: "active",          // active, canceled, past_due
    country: "US",                         // Auto-detected
    lastActive: "2024-12-05T12:00:00Z"
}
```

---

## 💳 Stripe Integration

### Flow
1. User clicks "Upgrade" in app
2. Browser opens Stripe Checkout
3. User pays
4. Stripe sends webhook to Make.com
5. Make.com updates Firebase: `plan = "pro"`
6. App detects change, unlocks features

### Webhook Events
- `checkout.session.completed` → Activate Pro
- `customer.subscription.deleted` → Downgrade to Free
- `invoice.payment_failed` → Send reminder

---

## 🖥️ Admin Panel (Website Only)

### Features
| Tab | Features |
|-----|----------|
| **Dashboard** | Total users, Pro users, Revenue |
| **Users** | Search, filter, view details |
| **Plans** | Feature toggle per plan |
| **Revenue** | Stripe dashboard embed |

### Access
- Protected route: `/admin`
- Login required (specific admin email)
- 2FA recommended

---

## 📱 File Structure

```
PocketWall/
├── website/                    ← Marketing site + User dashboard
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.jsx        ← Landing page
│   │   │   ├── Login.jsx       ← TODO
│   │   │   ├── Signup.jsx      ← TODO
│   │   │   ├── Dashboard.jsx   ← TODO (user account)
│   │   │   └── Admin.jsx       ← TODO
│   │   ├── context/
│   │   │   └── AuthContext.jsx ← TODO
│   │   └── utils/
│   │       └── firebase.js     ← TODO
│   └── firebase.json
│
├── src/                        ← Desktop app (Electron)
│   └── renderer/src/
│       ├── context/
│       │   └── AuthContext.jsx ← DONE (7-day trial)
│       ├── utils/
│       │   └── firebase.js     ← DONE
│       └── pages/              ← All app pages (DONE)
│
└── docs/
    └── SAAS_PLAN.md           ← This file!
```

---

## ✅ Implementation Checklist

### Phase 1: Website Auth
- [ ] Firebase config for website
- [ ] Login page with Google + Email
- [ ] Signup page
- [ ] User dashboard
- [ ] Protected routes

### Phase 2: Desktop App Updates
- [x] 7-day trial (done)
- [ ] Trial countdown display
- [ ] Upgrade button → Stripe
- [ ] Feature locking

### Phase 3: Stripe
- [ ] Create Stripe account
- [ ] Create product & prices
- [ ] Checkout integration
- [ ] Customer portal

### Phase 4: Automation
- [ ] Make.com webhook setup
- [ ] Test payment flow
- [ ] Auto-activation verify

### Phase 5: Admin Panel
- [ ] Admin auth
- [ ] User management
- [ ] Analytics dashboard

### Phase 6: Deploy
- [ ] Website to Firebase Hosting
- [ ] Desktop app build
- [ ] Final testing

---

## 💵 Cost Analysis

### FREE Forever (Until 50,000 users)
- Firebase Auth: FREE
- Firestore: FREE
- Firebase Hosting: FREE
- Stripe: Pay only on transactions (2.9% + 30¢)
- Make.com: 1,000 operations/month FREE

### When You Start Paying
| Users | Estimated Cost |
|-------|---------------|
| 0-1,000 | $0/month |
| 1,000-10,000 | ~$25/month |
| 10,000+ | ~$100+/month |

---

## 🎉 Revenue Projection

| Pro Users | Monthly Revenue | After Stripe Fees |
|-----------|-----------------|-------------------|
| 10 | $49.90 | ~$47 |
| 50 | $249.50 | ~$234 |
| 100 | $499 | ~$468 |
| 500 | $2,495 | ~$2,340 |
| 1,000 | $4,990 | ~$4,680 |

---

> **Jai Mata Di! 🙏**  
> Ab ek ek karke implement karenge!

---

*Document maintained in project for reference.*
