@echo off
REM EquiMind Secrets Setup Script
REM This script helps set up Docker secrets securely

echo ========================================
echo EquiMind Secrets Setup
echo ========================================

REM Create secrets directory if it doesn't exist
if not exist "secrets" (
    mkdir secrets
    echo Created secrets directory
)

REM Check if secrets already exist
if exist "secrets\supabase_url.txt" (
    echo Supabase URL secret already exists
) else (
    echo Please enter your Supabase URL:
    set /p supabase_url="URL: "
    echo %supabase_url% > secrets\supabase_url.txt
    echo Supabase URL saved to secrets\supabase_url.txt
)

if exist "secrets\supabase_key.txt" (
    echo Supabase Key secret already exists
) else (
    echo Please enter your Supabase Anon Key:
    set /p supabase_key="Key: "
    echo %supabase_key% > secrets\supabase_key.txt
    echo Supabase Key saved to secrets\supabase_key.txt
)

echo.
echo ========================================
echo Security Notes:
echo ========================================
echo - Secrets are stored in plain text files
echo - These files are used by Docker secrets
echo - Make sure secrets/ is in .gitignore
echo - Never commit secrets to version control
echo ========================================

pause