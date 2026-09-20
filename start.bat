@echo off
chcp 65001 >nul
echo ========================================
echo    Circleica 启动脚本
echo ========================================
echo.

echo [1/3] 清理残留进程...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 3 /nobreak >nul
echo    完成
echo.

echo [2/3] 启动开发服务器（内存 12GB）...
echo    首次启动编译需要 3-5 分钟，请耐心等待
echo    编译完成后浏览器访问 http://localhost:3000
echo.
node --max-old-space-size=8192 node_modules/next/dist/bin/next dev --webpack -p 3000 -H 0.0.0.0
pause
