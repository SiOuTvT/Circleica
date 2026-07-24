@echo off
cd /d D:\Circleica
start "" http://localhost:3000
node node_modules/next/dist/bin/next dev -p 3000
