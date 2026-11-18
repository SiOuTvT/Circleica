@echo off
REM Auto-fix Chinese IME on startup/login
REM Place this in shell:startup folder to run automatically

REM Wait for system to fully initialize
timeout /t 10 /nobreak >nul

REM Fix IME registry settings
reg add "HKCU\Software\Microsoft\CTF\TIP\{81D4E9C9-1D3B-41BC-9E6C-4B40BF79E35E}" /f /v Enable /t REG_DWORD /d 1 /v Layout /t REG_DWORD /d 2052 /v "Hide Tray" /t REG_DWORD /d 0 >nul 2>&1

REM Restart IME services
taskkill /f /im ctfmon.exe /im ChsIME.exe 2>nul
timeout /t 2 /nobreak >nul
start ctfmon.exe

exit