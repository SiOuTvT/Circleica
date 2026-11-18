@echo off
rem Check and fix Chinese IME
reg query "HKCU\Keyboard Layout\Preload" /v 1
reg query "HKCU\Software\Microsoft\CTF\TIP\{81D4E9C9-1D3B-41BC-9E6C-4B40BF79E35E}" /v Enable
tasklist | findstr /i "ctfmon ChsIME"