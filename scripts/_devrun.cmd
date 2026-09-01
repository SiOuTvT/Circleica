@echo off
cd /d d:\Circleica
rmdir /s /q d:\Circleica\.next-dev
call npm run dev
