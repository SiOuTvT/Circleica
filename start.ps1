# Circleica 一键启动脚本
# 用法：在 PowerShell 中运行 .\start.ps1

Write-Host "=== Circleica 启动脚本 ===" -ForegroundColor Cyan

# 1. 杀掉所有残留的 node 进程
Write-Host "[1/4] 清理残留进程..." -ForegroundColor Yellow
$nodes = Get-Process -Name node -ErrorAction SilentlyContinue
if ($nodes) {
    $nodes | Stop-Process -Force
    Start-Sleep -Seconds 3
    Write-Host "  已杀掉 $($nodes.Count) 个 node 进程" -ForegroundColor Green
} else {
    Write-Host "  无残留进程" -ForegroundColor Green
}

# 2. 清理旧构建
Write-Host "[2/4] 清理旧构建..." -ForegroundColor Yellow
if (Test-Path ".next") {
    Remove-Item -Path ".next" -Recurse -Force -ErrorAction SilentlyContinue
}
if (Test-Path "build-output") {
    Remove-Item -Path "build-output" -Recurse -Force -ErrorAction SilentlyContinue
}
Write-Host "  清理完成" -ForegroundColor Green

# 3. 构建
Write-Host "[3/4] 构建生产包（约 5-10 分钟，请耐心等待）..." -ForegroundColor Yellow
$env:NODE_OPTIONS = "--max-old-space-size=16384"
$buildResult = & node --require "scripts/patch-cpus.js" --max-old-space-size=16384 node_modules/next/dist/bin/next build --webpack 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "构建失败！" -ForegroundColor Red
    Write-Host $buildResult
    exit 1
}
Write-Host "  构建成功" -ForegroundColor Green

# 4. 启动服务器
Write-Host "[4/4] 启动生产服务器..." -ForegroundColor Yellow
Write-Host "=== 站点将在 http://localhost:3000 启动 ===" -ForegroundColor Cyan
npm run start
