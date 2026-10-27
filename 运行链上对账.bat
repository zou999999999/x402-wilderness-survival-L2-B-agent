@echo off
chcp 65001 >nul
title Level 2 链上对账与交易审计工具
echo ========================================================
echo 🔍 正在执行 Level 2 x402 链上结算与对账审计...
echo ========================================================
cd /d "%~dp0client"
node src/reconcile.js
pause
