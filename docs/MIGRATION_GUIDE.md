# 🚀 PocketWall Project Migration Guide

## Personal Laptop Pe Project Transfer Kaise Karein

### Step 1: Copy Project Folder
```
C:\Dev\PocketWall → USB/Cloud → Personal Laptop pe paste
```

**Ya Git use karo (recommended):**
```bash
# Office PC pe:
cd C:\Dev\PocketWall
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/your-username/PocketWall.git
git push -u origin main

# Personal PC pe:
git clone https://github.com/your-username/PocketWall.git
```

---

### Step 2: Install Dependencies (Personal PC)

**Terminal 1 - Desktop App:**
```bash
cd PocketWall
npm install
```

**Terminal 2 - Website:**
```bash
cd PocketWall/website
npm install
```

---

### Step 3: Required Installations (One Time)

| Software | Download Link | Check Command |
|----------|---------------|---------------|
| Node.js | https://nodejs.org | `node --version` |
| Git | https://git-scm.com | `git --version` |

---

### Step 4: Firebase Setup (One Time per PC)

```bash
# Login to Firebase (browser will open)
cd PocketWall/website
npx firebase login
```

---

### Step 5: Run Project

**Desktop App:**
```bash
cd PocketWall
npm run dev
```

**Website (separate terminal):**
```bash
cd PocketWall/website
npm run dev
```

---

## 📁 What Gets Transferred Automatically

| Item | Included in Project? |
|------|---------------------|
| Source Code | ✅ Yes |
| Firebase Config | ✅ Yes (in code) |
| Firebase Data | ✅ Cloud (auto-sync) |
| User Database | ✅ Cloud (Firebase) |
| npm packages | ❌ Need `npm install` |

---

## ⚠️ Important Files (Don't Delete)

```
PocketWall/
├── package.json           ← Dependencies list
├── src/                   ← Desktop app code
├── website/               ← Website code
│   ├── firebase.json      ← Firebase config
│   └── .firebaserc        ← Project ID
└── docs/                  ← Documentation
```

---

## 🔑 Firebase Keys (Already in Code)

Firebase config already hai in:
- `src/renderer/src/utils/firebase.js`
- `website/src/utils/firebase.js`

**No extra setup needed!**

---

## Quick Checklist for New PC

- [ ] Install Node.js
- [ ] Copy/Clone project
- [ ] Run `npm install` in both folders
- [ ] Run `npx firebase login` in website folder
- [ ] Done! 🎉
