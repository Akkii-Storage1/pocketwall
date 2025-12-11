# 🔒 PocketWall Security & Configuration Guide

## 1. Offline Bypass Prevention

### Current Security Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    FIREBASE (Server)                         │
│  ┌─────────────────┐  ┌─────────────────────────────────┐   │
│  │ users/{uid}     │  │ Security Rules                  │   │
│  │  - plan: "pro"  │  │ - Only owner can read/write    │   │
│  │  - trialEnds    │  │ - Server timestamp validation  │   │
│  │  - isPaidPlan   │  │                                 │   │
│  └─────────────────┘  └─────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                    DESKTOP APP                               │
│  ┌─────────────────┐  ┌─────────────────────────────────┐   │
│  │ FeatureContext  │  │ Security Checks                 │   │
│  │  - Real-time    │  │ - Firebase listener (real-time) │   │
│  │    listener     │  │ - Periodic verification (1hr)  │   │
│  │  - Offline mode │  │ - Last verified timestamp      │   │
│  └─────────────────┘  └─────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Security Measures

| Attack Vector | Protection |
|--------------|------------|
| System date manipulation | Trial uses Firebase `serverTimestamp()` |
| localStorage tampering | Re-verify from Firebase on app start |
| License key forgery | Cryptographic validation + server check |
| Offline exploitation | Max 24hr offline grace period |
| Network interception | HTTPS + Firebase security rules |

### Recommended: Add Offline Verification

In `FeatureContext.jsx`, the app now:
1. Stores `lastVerifiedAt` timestamp
2. Requires online verification every 24 hours
3. Shows warning if offline too long
4. Falls back to Starter if verification fails

---

## 2. Plan Configuration

### How to Change Plan Pricing

Pricing is set in **Stripe Dashboard**, not in code:
1. Go to [Stripe Dashboard](https://dashboard.stripe.com) → Products
2. Edit "PocketWall Pro" product
3. Add/modify prices (Monthly $4.99, Yearly $49, etc.)
4. Copy new Price IDs to your checkout code

### How to Add/Modify Features

Edit `FeatureContext.jsx`:

```javascript
export const TIER_CONFIG = {
    [TIERS.STARTER]: {
        label: 'Starter Plan',
        limits: {
            maxAccounts: 2,        // ← Change limits here
            maxBudgets: 5,
            maxRecurring: 2,
        },
        features: {
            exportPDF: false,      // ← Toggle features
            aiInsights: false,
            investments: false,
            crypto: false,
            // Add new features:
            newFeature: false,     // ← Add new feature
        }
    },
    [TIERS.PRO]: {
        label: 'Pro Plan',
        limits: {
            maxAccounts: -1,       // -1 = Unlimited
            maxBudgets: -1,
            maxRecurring: -1,
        },
        features: {
            exportPDF: true,
            aiInsights: false,     // Save for Elite
            investments: true,
            crypto: true,
            newFeature: true,      // Enable in Pro
        }
    },
    // Add new tier:
    [TIERS.ELITE]: {
        label: 'Elite Plan',
        features: {
            aiInsights: true,      // Only in Elite
            // All Pro features + more
        }
    }
};
```

### Usage in Components

```jsx
// Lock a feature
<FeatureGate feature="newFeature">
    <MyNewComponent />
</FeatureGate>

// Check limit
const { checkLimit } = useFeature();
if (!checkLimit('maxAccounts', currentAccounts.length)) {
    toast.error('Upgrade to add more accounts!');
}
```

---

## 3. Adding New Plans

### Step 1: Add Tier Constant
```javascript
export const TIERS = {
    STARTER: 'starter',
    PRO: 'pro',
    ELITE: 'elite',
    ENTERPRISE: 'enterprise'  // ← New
};
```

### Step 2: Add Configuration
```javascript
[TIERS.ENTERPRISE]: {
    label: 'Enterprise Plan',
    limits: { /* all unlimited */ },
    features: { /* all enabled + API access */ }
}
```

### Step 3: Add Stripe Product
1. Create product in Stripe
2. Add price tiers
3. Update checkout to offer new plan

---

## Quick Reference

| Task | Where to Change |
|------|-----------------|
| Change feature limits | `TIER_CONFIG.limits` in FeatureContext |
| Enable/disable features | `TIER_CONFIG.features` in FeatureContext |
| Change plan names | `TIER_CONFIG.label` |
| Change pricing | Stripe Dashboard → Products |
| Add new plan | Add to `TIERS` + `TIER_CONFIG` |
| Lock new feature | Use `<FeatureGate feature="name">` |
