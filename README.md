# x402 Level 2-B: 全球极端环境与野外探险多源数据服务 (云端 AI 参谋版)

本项目为 **x402 协议高阶拓展项目（Level 2 方向 B）**，在 Level 2-A 开放技能集市的基础上完成了 **To-C 轻量化升级与云端 AI 调度参谋重构**：
- **云端 AI 选路参谋 (Cloud AI Dispatcher)**：由云端服务端托管接入 **DeepSeek 大模型** 并挂载 `POST /api/recommend` 端点。接收客户端高层探险诉求，在**客观中立且零剧透**的前提下，自主输出需要购买的 API 列表及**决策思考过程 (Thinking Process)**，不加任何臃肿的主观评级或硬性指令脑补。
- **客户端极简买手 Agent (Zero-AI-Token Client)**：**本地无需配置任何大模型 Key！** 普通用户只需持有 Web3 钱包，即可通过交互式控制台选择或自定义经纬度，自动向云端获取 AI 推荐方案，并在本地对入选微服务逐项完成 **0.001 USDC** 的真实 x402 链上微支付，实时交付专业 Word (.docx) 战地公文与 JSON 机器底稿。

---

## 一、 系统架构与物理解耦设计

严格遵循全局工作区规范与生产级物理隔离安全标准：

```
Level2_b/
├── server/                          # 【服务端 / 智能微服务与云端参谋】
│   ├── api/index.js                 # 挂载 x402 中间件与 /api/recommend 云端调度端点
│   ├── server.js                    # 本地调试 Express 监听入口 (PORT: 3001)
│   ├── package.json                 # 服务端独立依赖 (@x402/core, @x402/evm, express 等)
│   ├── vercel.json                  # 云端 Serverless 路由重写规则
│   ├── .env.example                 # 包含公开 PAY_TO 与 DEEPSEEK_API_KEY 预留配置
│   └── src/
│       ├── agent/                   # recommender.js (云端轻量化 DeepSeek 选路参谋)
│       ├── config/
│       │   ├── SKILL.md             # 客观中立技能规范文档
│       │   ├── catalog.js           # 11 个微服务路由与 x402 支付规格配置
│       │   ├── network.js           # Base Sepolia 链配置
│       │   └── payee.js             # 服务端收款钱包配置 (0xdcD7DAFafb0EF3d50bDdB480Dbd503Fa6D1B6C09)
│       ├── lib/                     # HTTP 统一容错超时、球面距离与地理编码 (location.js)
│       └── providers/               # 11 个真实上游数据源驱动（地质/气象/水文/地形/沙尘/日照/空间天气等）
│
├── client/                          # 【客户端 / 本地轻量化采购消费端 (0 大模型依赖)】
│   ├── package.json                 # 客户端独立依赖 (@x402/fetch, @x402/evm, docx, viem 等)
│   ├── .env.example                 # 客户端仅管理付款私钥 PAYER_PRIVATE_KEY，无需 AI Token！
│   ├── reports/                     # 结构化审计 JSON 与战地 Word (.docx) 报告归档目录
│   └── src/
│       ├── config/wallet.js         # 付款钱包安全加载器
│       ├── lib/docx_exporter.js     # 专业战地 Word 决策评估报告排版导出引擎
│       ├── cli.js                   # 统一跨平台交互控制器 (支持预设 1~5 与 6 自定义经纬度)
│       ├── export_word.js           # 独立转 Word 命令行工具
│       ├── agent.js                 # 核心：咨询云端参谋、逐项 EVM 结算并自动产出报告
│       └── reconcile.js             # 链上 USDC 交易哈希与余额自动化审计工具
│
├── 运行探险决策Agent.bat            # Windows 唯一一体化全能控制台 (纯 ASCII，直通 cli.js)
├── 运行探险决策Agent.sh             # macOS / Linux 唯一一体化全能控制台
├── vercel.json                      # 根目录 Vercel 一键直推部署配置
└── 项目交接与全流程上下文总结.md    # 核心交接档案
```

---

## 二、 11 个外部微服务能力清单 (API Toolset Catalog)

| 序号 | 接口 ID | 路由路径 | 数据源 | 坐标需求 | 单价 | 服务能力与核心监测指标 |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **earthquake** | `/api/survival/earthquake` | USGS FDSN Event API | 需 `lat`, `lon` | $0.001 | 监测 500km 半径过去 7 天 M2.5+ 地震烈度与震源距，评估地质活动与滑坡隐患。 |
| 2 | **storm** | `/api/survival/storm` | Open-Meteo Forecast | 需 `lat`, `lon` | $0.001 | 监测实况/24h风速、极大阵风、雨雪累计与最低气温，评估强风与极寒失温威胁。 |
| 3 | **flood** | `/api/survival/flood` | Open-Meteo GloFAS | 需 `lat`, `lon` | $0.001 | 预测未来 7 天河道径流比率与洪峰到达日，评估山洪暴发与漫滩演进。 |
| 4 | **terrain** | `/api/survival/terrain` | Copernicus DEM 90m | 需 `lat`, `lon` | $0.001 | 十字邻点高差估算局部最大坡度与绝对高程，评估地形陡度与高反阶梯。 |
| 5 | **dust** | `/api/survival/dust` | Open-Meteo Air Quality | 需 `lat`, `lon` | $0.001 | 监测沙尘浓度、PM10/PM2.5 质量浓度与光学厚度，评估沙尘暴肆虐程度。 |
| 6 | **sunlight** | `/api/survival/sunlight` | Sunrise-Sunset.org | 需 `lat`, `lon` | $0.001 | 计算日出日落时刻、民用黄昏终点与有效自然光照时长，评估有效行动窗口。 |
| 7 | **geomagnetic**| `/api/survival/geomagnetic`| NOAA SWPC K-index | 全局数据 | $0.001 | 监测实时行星 K 指数 (0~9) 及地磁暴，评估对 GPS 定位漂移与通信信标的影响。 |
| 8 | **forex** | `/api/market/forex` | Frankfurter API | 全局数据 | $0.001 | 提供美元兑主要法定货币（CNY/EUR/JPY/GBP）实时外汇中间牌价与兑换比率。 |
| 9 | **catfact** | `/api/info/catfact` | Cat Facts Ninja | 全局数据 | $0.001 | 提供猫科动物生物学解剖特征、生活生理习性与驯化历史科学知识。 |
| 10 | **crypto** | `/api/market/crypto` | CoinGecko API | 全局数据 | $0.001 | 提供主流加密资产（BTC/ETH 等）在公开交易所的实时现货价格与 24h 涨跌幅。 |
| 11 | **iss** | `/api/orbit/iss` | WhereTheISS.at | 全局数据 | $0.001 | 提供国际空间站 (ISS) 实时星下点地表经纬度、近地轨道高度 (~420km) 与飞行时速。 |

---

## 三、 使用指引

### 1. Windows 端一键启动
双击运行根目录下的：
👉 **[`运行探险决策Agent.bat`](运行探险决策Agent.bat)**

在交互菜单中输入：
- `[1]` 阿尔金山无人区 (默认)
- `[2]` 珠穆朗玛峰大本营
- `[3]` 塔克拉玛干沙漠腹地
- `[4]` 罗布泊大海道
- `[5]` 香港中环商业区
- `[6]` **自定义输入**（自主输入全球任意地名、纬度、经度与任务剖面）
- `[7]` 直接全量采购模式（购买全部 11 项微服务）
- `[8]` 运行链上对账与审计
- `[9]` 重新导出 Word 报告

### 2. 交付文件查阅
每次运行完成后，Word 报告与 JSON 底稿自动保存在：
👉 `client/reports/survival_recon_<时间戳>.docx`
可直接在电脑上双击打开阅读。
