# 🏠 PocketWall - Ghar ke PC pe Setup Guide (Hinglish)

## 📋 Ye Guide Kiske Liye Hai?

Ye guide tumhe office PC se ghar ke PC pe PocketWall project transfer karne mein help karegi. Saari steps follow karo ek-ek karke.

---

## 🔧 STEP 1: Pre-requisites Install Karo (5-10 minutes)

### 1.1 Node.js Install Karo
```
Download: https://nodejs.org/
Version: LTS (18.x ya 20.x - jo bhi available ho)
```

**Installation ke baad verify karo:**
```powershell
node -v
# Output: v18.x.x ya v20.x.x hona chahiye
```

### 1.2 Git Install Karo
```
Download: https://git-scm.com/download/win
Options: Sab default rakhna
```

**Verify karo:**
```powershell
git --version
# Output: git version 2.x.x
```

### 1.3 Visual Studio Code Install Karo (Already hai to skip)
```
Download: https://code.visualstudio.com/
```

---

## 📁 STEP 2: Project Files Transfer Karo (Pendrive se)

### 2.1 Pendrive Connect Karo
- Pendrive insert karo

### 2.2 PocketWall Folder Copy Karo
```
Source (Pendrive):  E:\PocketWall\  (ya jo bhi drive letter ho)
Destination:        C:\Dev\PocketWall\
```

**Important:** Pura `PocketWall` folder copy karo, sirf files nahi!

### 2.3 Antigravity Files Copy Karo
```
Source (Pendrive):  E:\antigravity-brain\
Destination:        C:\Users\{TUMHARA_USERNAME}\.gemini\antigravity\brain\
```

**Note:** `.gemini` folder hidden ho sakta hai. Windows Explorer mein "Show hidden files" enable karo.

---

## 📦 STEP 3: Dependencies Install Karo (2-5 minutes)

### 3.1 Terminal Open Karo
VS Code open karo aur Terminal > New Terminal

Ya Windows PowerShell mein:
```powershell
cd C:\Dev\PocketWall
```

### 3.2 npm install Run Karo
```powershell
npm install
```

**Yahan 2-5 minute lagenge.** Errors aayein to DEPENDENCIES_LIST.txt mein Troubleshooting section dekho.

---

## 🧪 STEP 4: Project Test Karo

### 4.1 Development Server Start Karo
```powershell
npm run dev
```

### 4.2 Browser mein Check Karo
- Automatically Electron window open hoga
- Agar nahi hota to: http://localhost:5173/

### 4.3 Features Test Karo
- Dashboard dekho
- Budget page kholo, kisi card pe click karo
- Light/Dark mode toggle karo
- Settings mein jaake check karo

---

## 🤖 STEP 5: Antigravity/Claude Setup (Important!)

### 5.1 VS Code mein Extension Install Karo
- Gemini Code Assist ya Antigravity extension install karo
- Same Google/Gemini account se login karo jo office mein use kiya tha

### 5.2 Antigravity ko Project Context Do
Jab Antigravity se baat shuru karo, pehle ye prompt do:

```
Main PocketWall project pe kaam kar raha hun. Ye ek Electron-based personal finance app hai. 

Please read these files for complete context:
1. CLAUDE_CONTEXT_PROMPT.md - Complete feature list aur architecture
2. C:\Users\{TUMHARA_USERNAME}\.gemini\antigravity\brain\{SESSION_ID}\task.md

Features already implemented:
- 30+ features including investments, budgets, goals
- Firebase cloud sync
- Dashboard customization with widget visibility
- Budget insights with click-to-view details
- Light/Dark theme support

Kya specific cheez pe kaam karna hai?
```

### 5.3 CLAUDE_CONTEXT_PROMPT.md File Share Karo
Antigravity se bolo:
```
Pehle CLAUDE_CONTEXT_PROMPT.md file read karo jisme complete project details hain.
```

---

## ☁️ STEP 6: Firebase Sync (Optional)

Agar cloud sync use karna hai:

### 6.1 Firebase Console Check Karo
```
https://console.firebase.google.com/
```

### 6.2 App mein Cloud Sync Enable Karo
- Settings page pe jaao
- Cloud Sync section mein login karo
- Data automatically sync hoga

---

## 🔄 STEP 7: Git Setup (Optional - GitHub ke liye)

Agar GitHub pe push karna hai:

### 7.1 Git Configure Karo
```powershell
git config --global user.name "Ankit Dixit"
git config --global user.email "tumhara.email@example.com"
```

### 7.2 Remote Check Karo
```powershell
cd C:\Dev\PocketWall
git remote -v
```

### 7.3 Changes Push Karo
```powershell
git add .
git commit -m "Changes from home PC"
git push origin main
```

---

## 📝 COMMON COMMANDS (Yaad Rakho!)

| Command | Kya Karta Hai |
|---------|---------------|
| `npm run dev` | Development server start karo |
| `npm run build` | Production build banao |
| `npm run build:win` | Windows EXE installer banao |
| `Ctrl+C` | Server band karo |

---

## 🐛 TROUBLESHOOTING

### Problem: "npm install" pe error aa raha hai
**Solution:**
```powershell
# node_modules delete karo
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json

# Cache clear karo
npm cache clean --force

# Dubara install karo
npm install
```

### Problem: Electron window nahi khul raha
**Solution:**
```powershell
# Kill existing processes
taskkill /F /IM electron.exe

# Dubara start karo
npm run dev
```

### Problem: "Cannot find module" error
**Solution:**
```powershell
npm install
```

### Problem: Port 5173 already in use
**Solution:**
```powershell
# Port free karo
netstat -ano | findstr :5173
taskkill /PID {PID_NUMBER} /F
```

---

## ✅ CHECKLIST - Sab Ho Gaya?

- [ ] Node.js installed aur working
- [ ] Git installed
- [ ] VS Code installed
- [ ] PocketWall folder copied to C:\Dev\PocketWall
- [ ] Antigravity brain files copied to .gemini folder
- [ ] `npm install` successful
- [ ] `npm run dev` working
- [ ] App open ho raha hai
- [ ] Light/Dark mode working
- [ ] Budget cards clickable hain

---

## 📞 HELP CHAHIYE?

Agar koi step mein problem aaye to:
1. Error message copy karo
2. Antigravity/Claude se poocho with error
3. DEPENDENCIES_LIST.txt mein troubleshooting dekho

---

## 📌 IMPORTANT FILES YAAD RAKHO

| File | Location | Purpose |
|------|----------|---------|
| `CLAUDE_CONTEXT_PROMPT.md` | `C:\Dev\PocketWall\` | AI ko project samjhane ke liye |
| `DEPENDENCIES_LIST.txt` | `C:\Dev\PocketWall\` | Sab installations ka list |
| `package.json` | `C:\Dev\PocketWall\` | npm dependencies |
| `task.md` | `.gemini\antigravity\brain\{ID}\` | Current tasks |

---

**🎉 Bas ho gaya! Ab ghar pe bhi PocketWall pe kaam kar sakte ho!**
