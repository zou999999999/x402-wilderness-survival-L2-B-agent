@echo off
chcp 65001 >nul
title Level 2_b 极端环境探险生存决策 - 生成最新 Word 报告
echo ========================================================
echo 📄 正在将最新的决策分析数据转换为 Word (.docx) 格式...
echo ========================================================
cd /d "%~dp0client"
node src/export_word.js
echo.
pause
