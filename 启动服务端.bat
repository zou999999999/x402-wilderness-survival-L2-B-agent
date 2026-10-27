@echo off
chcp 65001 >nul
title Level 2_b 极端环境探险生存决策系统 - 服务端 (DeepSeek Agent)
echo ========================================================
echo 🧭 正在启动 x402 Level 2_b 服务端 (含 DeepSeek 参谋 Agent)...
echo ========================================================
cd /d "%~dp0server"
node server.js
pause
