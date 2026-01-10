# PocketWall - Complete Project Context for Claude/Antigravity

## 📋 PROJECT OVERVIEW

**Application Name:** PocketWall
**Type:** Electron-based Personal Finance Desktop Application
**Platform:** Windows (with potential for Mac/Linux)
**Version:** 1.5.1
**Author:** Ankit Dixit
**Tech Stack:** React + Electron + Vite + TailwindCSS + Firebase

---

## 🏗️ ARCHITECTURE

### Core Structure
```
PocketWall/
├── src/
│   ├── main/              # Electron main process
│   │   └── index.js       # Main entry, window management
│   ├── preload/           # Electron preload scripts
│   └── renderer/          # React frontend
│       └── src/
│           ├── pages/     # Main page components
│           ├── components/# Reusable UI components
│           ├── utils/     # Utility functions & APIs
│           └── context/   # React contexts
├── website/               # Firebase-hosted marketing site
├── .github/workflows/     # CI/CD for releases
└── package.json
```

### Data Storage
- **Local:** JSON file at `%APPDATA%/pocketwall/pocketwall-data.json`
- **Cloud:** Firebase Firestore (optional sync)
- **Settings:** localStorage for preferences

---

## ✅ COMPLETED FEATURES (30+)

### 1. Core Finance Management
| Feature | File(s) | Description |
|---------|---------|-------------|
| Transactions | `Transactions.jsx` | Income/Expense with splits, categories, filters |
| Budgets | `Budget.jsx` | Per-category limits, weekly/monthly/custom periods, **custom start day (1-31)**, rollover, envelope view |
| **Budget Insights** | `Budget.jsx` | **Click any budget card for detailed insights: daily avg, safe daily limit, projected spend, peak spending days, top expenses, health status, suggestions** |
| Recurring | `Recurring.jsx` | Auto-detect patterns, SIP tracking |
| Goals | `Goals.jsx` | Financial goals with milestones, notifications |

### 2. Investment Tracking
| Feature | File(s) | Description |
|---------|---------|-------------|
| Investments | `Investments.jsx` | Stocks, MF, ETFs, Crypto, Gold, FD, PPF |
| Portfolio | `Portfolio.jsx` | Asset allocation, Nivo charts, filters |
| Dividends | `DividendReport.jsx` | Recording, tracking, tax reports |
| IPO/NFO/Bonds | `IPOTracker.jsx` | Track applications, allotments |
| SIP Manager | `SIPManager.jsx` | Systematic investment plans |
| Watchlist | `Watchlist.jsx` | Yahoo Finance live prices |
| US Investments | Multiple | ETF, Bonds, REITs with tax reporting |

### 3. Analytics & Reports
| Feature | File(s) | Description |
|---------|---------|-------------|
| Dashboard | `Dashboard.jsx` | Summary cards, charts, **widget customization (hide/show with animation)** |
| Financial Health | `FinancialHealth.jsx` | Score calculation, custom weights |
| Reports | `Report.jsx` | PDF export with charts |
| Tax Reports | `TaxReport.jsx` | India + US tax formats |

### 4. Calculators
| Feature | Description |
|---------|-------------|
| SIP Calculator | Future value calculation |
| EMI Calculator | Loan EMI with amortization |
| **EMI Pre-closure** | Savings on early loan closure |
| Goal Planner | How much to save monthly |
| Retirement | Corpus estimation |

### 5. System Features
| Feature | File(s) | Description |
|---------|---------|-------------|
| Dark/Light Theme | `App.jsx` | Full theming support |
| Multi-Currency | `CurrencyConverter.js` | Live exchange rates |
| Encrypted Backup | `DataAdapter.js` | AES-256 export/import |
| Firebase Cloud Sync | `CloudSync.js` | Real-time sync across devices |
| Recycle Bin | `RecycleBin.jsx` | Soft delete with restore |
| Custom Categories | `CategoryManager.js` | User-defined expense categories |
| Factory Reset | `Settings.jsx` | Complete data wipe |
| Auto-Updates | `electron-updater` | Silent background updates |

### 6. Website
| Feature | Description |
|---------|-------------|
| Marketing Site | Firebase hosted at Firebase Hosting |
| Dynamic Download | Auto-fetches latest GitHub release |
| Auth Pages | Login/Signup UI (connected to Firebase Auth) |
| GitHub Actions | Auto-deploy on push to main |

---

## 🔧 RECENT SESSION WORK (Dec 2024)

### Dashboard Customization
- **Widget visibility toggle** with fade-in animations
- **Drag-to-reorder** feature (UI implemented, drag handlers added)
- Settings saved in localStorage

### Budget Enhancements
- **Custom Start Day (1-31)** for budget cycles (e.g., salary on 10th)
- **Interactive Budget Cards** - Click to see:
  - 💰 Spent amount
  - 📊 Daily average spending
  - 🎯 Safe daily spending limit
  - 📈 Projected month-end spend
  - 📝 Transaction count
  - 🔥 Peak spending days (weekday analysis)
  - 💸 Top 5 expenses
  - 💡 Personalized suggestions based on health

### Color Optimizations
- All colors optimized for both light and dark themes
- Using inline styles with `isDark` conditional
- Dark mode: Softer colors for eye comfort
- Light mode: Darker, more saturated colors for visibility

---

## 🛠️ KEY UTILITIES

### DataAdapter.js
Central data management with:
- `getTransactions()`, `saveTransactions()`
- `getBudgets()`, `saveBudgets()`
- `getGoals()`, `saveGoals()`
- `getInvestments()`, `saveInvestments()`
- Encrypted backup/restore

### CurrencyConverter.js
- Live rates from ExchangeRate API
- 10+ currencies supported
- `convert(amount, from, to)`
- `format(amount, currency)`

### CloudSync.js
- Firebase Firestore integration
- Real-time sync with `onSnapshot`
- Conflict resolution
- Offline support

---

## 📁 IMPORTANT FILE LOCATIONS

### Source Code
- Main App: `src/renderer/src/App.jsx`
- Pages: `src/renderer/src/pages/*.jsx`
- Components: `src/renderer/src/components/*.jsx`
- Utilities: `src/renderer/src/utils/*.js`

### Configuration
- Package: `package.json`
- Electron Vite: `electron.vite.config.mjs`
- Tailwind: `tailwind.config.js`

### GitHub Actions
- Release: `.github/workflows/release.yml`
- Website Deploy: `.github/workflows/deploy-website.yml`

---

## 🎨 DESIGN SYSTEM

### Colors (Light/Dark)
| Element | Light Mode | Dark Mode |
|---------|------------|-----------|
| Background | `#f0f0f0` | `#2d2d30` |
| Panel | `#ffffff` | `#252526` |
| Border | `#d4d4d4` | `#3e3e42` |
| Text | `#000000` | `#ffffff` |
| Primary | `#0078d4` | `#0078d4` |
| Success Green | `#16a34a` | `#4ade80` |
| Error Red | `#dc2626` | `#f87171` |
| Warning Orange | `#d97706` | `#fbbf24` |

### Component Patterns
- All components receive `isDark` and `currency` props
- Inline styles for dynamic theming
- Tailwind for layout utilities
- Lucide React for icons

---

## 🚀 DEVELOPMENT COMMANDS

```bash
# Install dependencies
npm install

# Run in development
npm run dev

# Build for production
npm run build

# Create Windows installer
npm run build:win

# Build website
npm run build:web
```

---

## 📝 CODING CONVENTIONS

1. **State Management:** useState + useEffect, localStorage for persistence
2. **Styling:** Inline styles with `isDark` for theme, Tailwind for layout
3. **Icons:** Lucide React (`import { Edit2, Trash2 } from 'lucide-react'`)
4. **Currency:** Always use CurrencyConverter for display
5. **Data:** Load via DataAdapter, save immediately after changes
6. **Toasts:** `const toast = useToast()` for notifications

---

## 🐛 KNOWN ISSUES / FUTURE WORK

1. Drag-and-drop reorder for dashboard widgets (UI ready, functionality partial)
2. Widget resizing feature (planned)
3. Biometric lock (optional, not implemented)
4. Mobile app version (future consideration)

---

## 📌 NOTES FOR AI ASSISTANT

When working on this project:
1. Always check `isDark` theme state for colors
2. Use `formatMoney(toDisplay(amountINR))` for currency display
3. Save data immediately after state changes
4. Test in both light and dark modes
5. Keep accessibility in mind (contrast ratios)
6. Budget amounts stored in INR, displayed in user's currency

---

*This document provides complete context for AI assistance. Update as features are added.*
