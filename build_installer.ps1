Write-Host "Starting PocketWall Installer Build..." -ForegroundColor Green

# 1. Disable Signing (Fixes winCodeSign error)
$env:CSC_IDENTITY_AUTO_DISCOVERY="false"

# 2. Clean previous builds
Write-Host "Cleaning dist folder..." -ForegroundColor Yellow
Remove-Item -Recurse -Force dist -ErrorAction SilentlyContinue

# 3. Run Build
Write-Host "Building Installer..." -ForegroundColor Yellow
npm run build:win

if ($LASTEXITCODE -eq 0) {
    Write-Host "Build Success!" -ForegroundColor Green
    Write-Host "Installer is located at: dist\PocketWall Setup 1.2.3.exe" -ForegroundColor Green
} else {
    Write-Host "Build Failed." -ForegroundColor Red
}

Read-Host -Prompt "Press Enter to exit"
