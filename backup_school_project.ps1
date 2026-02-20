# PowerShell script to archive School_Project excluding unnecessary folders

# Set variables
$source = "D:\School_Project"           # Change this to your actual project path if different
$timestamp = Get-Date -Format "dd-MMM-yy_hh-mm_tt"
$archive = "D:\ProjectBackup\School_Project_backup_$timestamp.7z" # Backup filename with timestamp

# 7-Zip exclude patterns (use -xr! for each folder to exclude)
$excludes = @(
    "-xr!build",
    "-xr!dist",
    "-xr!android\app\build",
    "-xr!android\build",
    "-xr!android\.gradle",
    "-xr!android\.cxx",
    "-xr!android\.externalNativeBuild",
    "-xr!node_modules",
    "-xr!android\node_modules",
    "-xr!android\app\node_modules"
)

# Build the 7z command
$excludeString = $excludes -join " "
$cmd = "7z a -t7z -mx=9 `"$archive`" `"$source\*`" $excludeString"

Write-Host "[INFO] Starting backup of $source to $archive..."
Write-Host "[DEBUG] Running: $cmd"

$startTime = Get-Date

try {
    $process = Start-Process -FilePath "cmd.exe" -ArgumentList "/c $cmd" -NoNewWindow -Wait -PassThru
    $endTime = Get-Date
    $elapsed = $endTime - $startTime
    if ($process.ExitCode -eq 0) {
        Write-Host "[SUCCESS] Backup completed successfully! Archive created at: $archive"
    } else {
        Write-Host "[ERROR] Backup failed with exit code $($process.ExitCode)."
    }
    Write-Host ("[INFO] Time elapsed: {0:hh\:mm\:ss}" -f $elapsed)
} catch {
    Write-Host "[ERROR] Exception occurred during backup: $_"
}

Write-Host "Press any key to exit..."
[void][System.Console]::ReadKey($true) 