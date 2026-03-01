@echo off
echo Stopping EquiMind services...

echo Stopping Python processes...
taskkill /F /IM python.exe /T 2>nul

echo Stopping Node processes...
taskkill /F /IM node.exe /T 2>nul

echo.
echo EquiMind services stopped.
pause
