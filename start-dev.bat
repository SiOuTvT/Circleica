@echo off
REM Circleica 本地开发一键启动器
REM 重要：请在「文件资源管理器」里双击本文件运行（不要通过 WorkBuddy 里的终端运行，
REM 因为 WorkBuddy 终端属于沙箱，沙箱无法访问你本机的数据库）。
REM 双击后会在你本机启动 dev server（端口 3000），并自动打开浏览器。
REM 前提：你本机的 Postgres 服务已启动（数据才能加载）。
cd /d D:\Circleica
echo Circleica dev server 正在启动（端口 3000，绕过沙箱）...
echo 若提示“数据加载失败”，请先确认本机 Postgres 已启动（服务里看 postgresql-x64-*）。
timeout /t 8 /nobreak >nul
start "" http://localhost:3000
node node_modules/next/dist/bin/next dev -p 3000
