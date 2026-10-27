@echo off
chcp 65001 >nul
title Level 2_b 客户端 Agent (A2A 双智能体协同探险决策系统)

echo ======================================================================
echo 🤖 Level 2_b 极端环境与荒野生存决策系统 (A2A 双智能体协同)
echo 模式: 客户端向服务端 DeepSeek 参谋 Agent 发起一站式咨询 ($0.005 USDC)
echo ======================================================================
echo.
echo 请选择探险目标地理点:
echo   [1] 阿尔金山无人区 (38.0, 88.5) - 高海拔荒漠戈壁徒步 (默认)
echo   [2] 珠穆朗玛峰大本营 (27.9881, 86.9250) - 极高海拔极寒雪山攀登
echo   [3] 塔克拉玛干沙漠腹地 (39.0, 83.5) - 极端沙尘暴与高温干旱流动沙丘
echo   [4] 罗布泊大海道 (41.5, 90.3) - 强风雅丹地貌与无人区穿越
echo   [5] 神农架原始森林 (31.75, 110.48) - 复杂峡谷雨林与多雾失温环境
echo   [6] 自定义输入地理经纬度与探险性质
echo.
set /p choice="请输入选项编号 [直接回车默认 1]: "

if "%choice%"=="" set choice=1

cd /d "%~dp0client"

if "%choice%"=="1" (
  node src/agent.js 38.0 88.5 "阿尔金山无人区" "高海拔荒漠重装徒步穿越"
  goto done
)
if "%choice%"=="2" (
  node src/agent.js 27.9881 86.9250 "珠穆朗玛峰大本营" "极高海拔极寒雪山攀登"
  goto done
)
if "%choice%"=="3" (
  node src/agent.js 39.0 83.5 "塔克拉玛干沙漠腹地" "极端沙尘高温流动沙丘穿越"
  goto done
)
if "%choice%"=="4" (
  node src/agent.js 41.5 90.3 "罗布泊大海道" "强风蚀雅丹地貌与极度干旱穿越"
  goto done
)
if "%choice%"=="5" (
  node src/agent.js 31.75 110.48 "神农架原始森林" "复杂峡谷雨林与高湿失温徒步"
  goto done
)
if "%choice%"=="6" (
  echo.
  echo [自定义目标地理点设置]
  set /p custom_name="请输入探险目标地名 (例如: 库布齐沙漠): "
  set /p custom_lat="请输入纬度 Latitude (例如: 40.2): "
  set /p custom_lon="请输入经度 Longitude (例如: 108.5): "
  set /p custom_profile="请输入探险性质 (例如: 沙漠越野重装穿越): "
  echo.
  node src/agent.js %custom_lat% %custom_lon% "%custom_name%" "%custom_profile%"
  goto done
)

echo 无效选项，使用默认配置执行...
node src/agent.js

:done
echo.
echo ========================================================
echo ✅ 执行完毕！报告已自动保存为 JSON 与 Word (.docx) 格式。
echo 报告保存目录: Level2_b\client\reports\
echo ========================================================
pause

