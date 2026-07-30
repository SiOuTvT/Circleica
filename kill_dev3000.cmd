@echo off
echo 正在结束占用 3000 端口的旧开发进程 (PID 27188)...
taskkill /F /PID 27188
if "%errorlevel%"=="0" (
  echo 已结束。干净的 webpack 开发服务将在几秒内自动接管 3000 端口。
  echo 之后请到浏览器对 localhost:3000 硬刷 (Ctrl+F5)。
) else (
  echo 结束失败或进程已不在，请忽略。
)
pause
