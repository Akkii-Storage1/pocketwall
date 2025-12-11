# Force delete node_modules
$nodeModules = "D:\Project\PocketWall\node_modules"
if (Test-Path $nodeModules) {
    Write-Host "Attempting to delete node_modules..."
    
    # Method 1: Try normal delete
    try {
        Remove-Item -Path $nodeModules -Recurse -Force -ErrorAction Stop
        Write-Host "Successfully deleted using Remove-Item"
    } catch {
        Write-Host "Remove-Item failed, trying alternative methods..."
        
        # Method 2: Use cmd rmdir
        try {
            cmd /c "rmdir /s /q `"$nodeModules`""
            Write-Host "Successfully deleted using cmd rmdir"
        } catch {
            Write-Host "cmd rmdir failed"
            
            # Method 3: Robocopy trick (copy empty folder over it)
            $emptyDir = "D:\Project\PocketWall\empty_temp"
            New-Item -ItemType Directory -Path $emptyDir -Force | Out-Null
            robocopy $emptyDir $nodeModules /MIR /R:0 /W:0 | Out-Null
            Remove-Item -Path $emptyDir -Force
            Remove-Item -Path $nodeModules -Force
            Write-Host "Successfully deleted using robocopy method"
        }
    }
}

# Delete package-lock.json
if (Test-Path "D:\Project\PocketWall\package-lock.json") {
    Remove-Item -Path "D:\Project\PocketWall\package-lock.json" -Force
}

Write-Host "Cleanup complete. You can now run: npm install"
