# PocketWall - Naye PC Pe Setup

## Yahan Se Shuru Karo

### 1️⃣ Node.js Install Karo
👉 https://nodejs.org se download karo (LTS version)

### 2️⃣ Project Copy Karo
- Ye pura `PocketWall` folder USB mein copy karo
- Naye PC mein paste karo (C:\Dev\PocketWall)

### 3️⃣ Terminal Kholo aur Ye Commands Run Karo

**Pehle Desktop App ke packages:**
```
cd C:\Dev\PocketWall
npm install
```

**Phir Website ke packages:**
```
cd C:\Dev\PocketWall\website
npm install
```

### 4️⃣ Firebase Login Karo
```
cd C:\Dev\PocketWall\website
npx firebase login
```
(Browser khulega, Google se login karo)

### 5️⃣ App Chalu Karo
**Desktop App:**
```
cd C:\Dev\PocketWall
npm run dev
```

**Website (naya terminal):**
```
cd C:\Dev\PocketWall\website
npm run dev
```

---

## ✅ Bas Itna Hi!

| Kya | Kahan Hai |
|-----|-----------|
| Users ka data | Firebase Cloud ☁️ (auto sync) |
| Code | Project folder mein |
| Settings | Code mein already hai |

---

## ⚠️ Problem Aayi?

1. **"npm not found"** → Node.js install nahi hua
2. **"firebase not found"** → `npx firebase login` use karo
3. **kuch aur** → ChatGPT/Google pe search karo

---

*Made with ❤️ for PocketWall*
