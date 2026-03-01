# EquiMind Secrets Setup Script for PowerShell
# This script helps set up Docker secrets securely

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "EquiMind Secrets Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Create secrets directory if it doesn't exist
if (-not (Test-Path "secrets")) {
    New-Item -ItemType Directory -Path "secrets" | Out-Null
    Write-Host "[✓] Created secrets directory" -ForegroundColor Green
}

# Check if secrets already exist
if (Test-Path "secrets\supabase_url.txt") {
    Write-Host "[✓] Supabase URL secret already exists" -ForegroundColor Green
} else {
    $supabaseUrl = Read-Host "Please enter your Supabase URL"
    $supabaseUrl | Out-File -FilePath "secrets\supabase_url.txt" -Encoding utf8 -NoNewline
    Write-Host "[✓] Supabase URL saved to secrets\supabase_url.txt" -ForegroundColor Green
}

if (Test-Path "secrets\supabase_key.txt") {
    Write-Host "[✓] Supabase Key secret already exists" -ForegroundColor Green
} else {
    $supabaseKey = Read-Host "Please enter your Supabase Anon Key" -AsSecureString
    $supabaseKeyPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($supabaseKey))
    $supabaseKeyPlain | Out-File -FilePath "secrets\supabase_key.txt" -Encoding utf8 -NoNewline
    Write-Host "[✓] Supabase Key saved to secrets\supabase_key.txt" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Security Notes:" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "- Secrets are stored in plain text files" -ForegroundColor White
Write-Host "- These files are used by Docker secrets" -ForegroundColor White
Write-Host "- Make sure secrets/ is in .gitignore" -ForegroundColor White
Write-Host "- Never commit secrets to version control" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan

Read-Host "Press Enter to continue"