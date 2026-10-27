# x402 Level 2_b: 极端环境生存决策系统 —— 使用者与 Agent 全流程操作指南

> **适用对象**：人类探险指挥官、终端开发者，以及接管本项目执行任务的第三方 AI Agent（如 Antigravity、Claude Code、Cursor Agent、Finch Marketplace Agent 等）。

---

## 目录
1. [系统简介与双智能体架构 (A2A)](#1-系统简介与双智能体架构-a2a)
2. [环境准备与依赖安装](#2-环境准备与依赖安装)
3. [钱包私钥与资产配置（安全铁律）](#3-钱包私钥与资产配置安全铁律)
4. [服务端 DeepSeek API 配置](#4-服务端-deepseek-api-配置)
5. [自定义探险目标地理点（4 种模式）](#5-自定义探险目标地理点4-种模式)
6. [大模型“技能书”热更新 (API_SKILL.md)](#6-大模型技能书热更新-api_skillmd)
7. [运行与报告交付 (JSON + Word)](#7-运行与报告交付-json--word)
8. [链上审计与对账核验](#8-链上审计与对账核验)
9. [面向 AI Agent 的调用参考规范 (Machine Reference)](#9-面向-ai-agent-的调用参考规范-machine-reference)

---

## 1. 系统简介与双智能体架构 (A2A)

本项目基于 **x402 协议** 构建，实现了「双智能体端到端物理隔离与协同 (Agent-to-Agent)」：
- **服务端 Agent (Server / 参谋商)**：常驻云端或本地，持有 11 个微服务数据能力规范（`API_SKILL.md`）。接收高层探险诉求，驱动 **DeepSeek 大模型** 自主完成 API 准入过滤，并发采集真实地质、气象、遥感数据，合成综合生存裁决。
- **客户端 Agent (Client / 探险方)**：探险人员的现场智能终端，只需向服务端发起一次一站式咨询，通过 Base Sepolia 链上自动支付 **0.005 USDC**，即可在本地秒级获取结构化决策与专业排版的 Word 报告。

```
[客户端终端 / 现场 Agent]
   │  1. 探测端点并获取 402 Payment Required 账单
   ├── 2. 使用本地私钥签名 0.005 USDC 付款凭证
   └── 3. 接收完整生存裁决 ────> 自动生成 JSON 与 Word (.docx) 报告
           ▲
           │ (x402 链上协议微支付，Base Sepolia)
           ▼
[服务端 / DeepSeek 参谋 Agent]
   ├── 读取本地 API_SKILL.md 技能规范 (100% 客观无偏见)
   ├── DeepSeek 大模型认知推理：自主选路并排除噪音服务
   ├── 并发调度入选微服务真实数据 (USGS 地震、Open-Meteo 气象与沙尘等)
   └── DeepSeek 终极态势研判与行动禁令合成
```

---

## 2. 环境准备与依赖安装

### 2.1 运行环境要求
- **操作系统**：Windows / macOS / Linux
- **运行环境**：Node.js v18.0.0 及以上（推荐 Node.js v20+）
- **包管理器**：npm (自带)

### 2.2 依赖一键安装
本项目采用服务端与客户端**物理分目录解耦**，首次运行需分别安装依赖：

```bash
# 1. 安装服务端依赖
cd server
npm install

# 2. 安装客户端依赖
cd ../client
npm install
```

---

## 3. 钱包私钥与资产配置（安全铁律）

### 3.1 核心安全隔离原则
- 🛑 **服务端** 仅配置收款地址 `PAY_TO`，**绝对不接触、不存储、不读取任何私钥**；
- 🔐 **客户端** 独立管理付款钱包私钥 `PAYER_PRIVATE_KEY`，该私钥仅在客户端本地用于签名 EVM 支付凭据，**绝不上传 GitHub，绝不传给服务端**。

### 3.2 客户端钱包私钥配置步骤
1. 进入 `client/` 目录；
2. 复制环境变量模版文件 `.env.example` 并重命名为 `.env`：
   ```bash
   cd client
   cp .env.example .env    # Linux / macOS
   copy .env.example .env  # Windows
   ```
3. 打开 `client/.env` 文件，填入您的测试网付款钱包私钥：
   ```env
   # 付款方私钥 (64 位 16 进制字符串，前缀 0x 可加可不加)
   PAYER_PRIVATE_KEY=0x你的测试网钱包私钥
   
   # 服务端收款地址 (用于防止中间人篡改账单，默认已配好)
   EXPECTED_PAY_TO=0xdcD7DAFafb0EF3d50bDdB480Dbd503Fa6D1B6C09
   
   # 目标服务端地址 (本地测试为 http://localhost:3000，云端为 Vercel 部署地址)
   TARGET_URL=http://localhost:3000
   ```

> 💡 **备用私钥路径**：客户端也支持在 `secrets/wallet.json` 或 `client/wallet.json` 中配置私钥，程序会自动优先读取 `client/.env`。

### 3.3 测试网水龙头与资产准备
本项目运行在 **Base Sepolia 测试网**（Chain ID: `84532`）：
1. **Gas 代币 (ETH)**：需要少量 Base Sepolia 测试 ETH（建议余额 ≥ 0.0005 ETH）；
   - 水龙头领水：[Superchain Faucet](https://console.optimism.io/faucet) 或 [Coinbase Faucet](https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet)
2. **结算代币 (USDC)**：需要测试网 USDC（官方合约地址：`0x036CbD53842c5426634e7929541eC2318f3dCF7e`，每次咨询消耗 0.005 USDC）；
   - 水龙头领水：[Circle USDC Faucet](https://faucet.circle.com/)（选择 Base Sepolia 网络）

---

## 4. 服务端 DeepSeek API 配置

1. 进入 `server/` 目录；
2. 复制环境变量模版文件 `.env.example` 并重命名为 `.env`：
   ```bash
   cd server
   cp .env.example .env    # Linux / macOS
   copy .env.example .env  # Windows
   ```
3. 打开 `server/.env` 文件，填入您的 DeepSeek 官方 API Key：
   ```env
   # 服务端公开收款地址
   PAY_TO=0xdcD7DAFafb0EF3d50bDdB480Dbd503Fa6D1B6C09
   PORT=3000
   
   # DeepSeek 官方 API Key (格式为 sk-...)
   DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   DEEPSEEK_BASE_URL=https://api.deepseek.com
   DEEPSEEK_MODEL=deepseek-chat
   ```
> ⚠️ **错误处理铁律**：如果未配置 API Key 或填错，系统会直接清晰报错 `API无效`，杜绝模糊系统堆栈。

---

## 5. 自定义探险目标地理点（4 种模式）

系统支持人类用户与自动化 Agent 以 4 种灵活方式自定义探险地点：

### 模式一：双击一键交互式菜单（人类用户最推荐）
在 Windows 上直接双击运行根目录下的 **`运行探险决策Agent.bat`**：
```text
======================================================================
🤖 Level 2_b 极端环境与荒野生存决策系统 (A2A 双智能体协同)
模式: 客户端向服务端 DeepSeek 参谋 Agent 发起一站式咨询 ($0.005 USDC)
======================================================================

请选择探险目标地理点:
  [1] 阿尔金山无人区 (38.0, 88.5) - 高海拔荒漠戈壁徒步 (默认)
  [2] 珠穆朗玛峰大本营 (27.9881, 86.9250) - 极高海拔极寒雪山攀登
  [3] 塔克拉玛干沙漠腹地 (39.0, 83.5) - 极端沙尘暴与高温干旱流动沙丘
  [4] 罗布泊大海道 (41.5, 90.3) - 强风雅丹地貌与无人区穿越
  [5] 神农架原始森林 (31.75, 110.48) - 复杂峡谷雨林与多雾失温环境
  [6] 自定义输入地理经纬度与探险性质

请输入选项编号 [直接回车默认 1]: 
```
- 输入 `1`~`5`：直接秒级加载对应极境；
- 输入 `6`：在控制台中直接敲入地名、纬度、经度与探险性质即可！

### 模式二：命令行传参模式（开发者 / 本地脚本）
进入 `client/` 目录，按顺序传入 4 个参数：
`node src/agent.js <纬度> <经度> "<地名>" "<探险性质>"`

示例：
```bash
# 测试 1: 珠峰雪山攀登
node src/agent.js 27.9881 86.9250 "珠穆朗玛峰大本营" "极高海拔极寒雪山攀登"

# 测试 2: 塔克拉玛干沙漠穿越
node src/agent.js 39.0 83.5 "塔克拉玛干沙漠腹地" "极端沙尘高温流动沙丘重装徒步穿越"

# 测试 3: 库布齐沙漠穿越
node src/agent.js 40.2 108.5 "库布齐沙漠" "沙漠腹地负重拉练"
```

### 模式三：配置文件模式（固定环境部署）
在 `client/.env` 中修改默认参数，后续运行 `node src/agent.js` 时将自动生效：
```env
EXPEDITION_LAT=27.9881
EXPEDITION_LON=86.9250
EXPEDITION_LOCATION=珠穆朗玛峰大本营
EXPEDITION_PROFILE=极高海拔极寒雪山攀登
```

### 模式四：Agent 直接 HTTP API 传参模式（跨网络 / 远程 Agent）
外部 Agent 可以直接向服务端发起 GET 请求（配合 x402 客户端库自动结算）：
```http
GET /api/agent/consult?lat=39.0&lon=83.5&place=塔克拉玛干沙漠腹地&profile=极端沙尘重装穿越 HTTP/1.1
Host: localhost:3000
```

---

## 6. 大模型“技能书”热更新 (API_SKILL.md)

在 `Level2_b` 中，大模型的知识库已与底层网络代码**100% 物理文档解耦**：
- 规范文件路径：[`server/src/config/API_SKILL.md`](server/src/config/API_SKILL.md)
- **零预置偏见**：11 个微服务全部以客观科学领域平铺，不带任何 `isNoise` 标签；
- **热更新维护**：如果您需要为某个 API 丰富描述、增减微服务或调整参谋长的考量权重，**无需修改任何一行 JavaScript 代码**，只需直接用记事本或 VS Code 编辑 `API_SKILL.md`，保存后下一次请求立即生效！

---

## 7. 运行与报告交付 (JSON + Word)

### 7.1 启动服务端
- Windows: 双击 `启动服务端.bat`
- 命令行: `cd server && npm start`
- 运行成功后将提示：
  `🧭 [Server] 极端环境生存决策系统 (Level 2_b: 双智能体 A2A 协同) 已启动`
  `📡 运行端口: http://localhost:3000`

### 7.2 运行客户端 Agent
- Windows: 双击 `运行探险决策Agent.bat`
- 命令行: `cd client && npm run agent`
- 运行完毕后，系统会自动在终端打印战地指挥部研判，并在 `client/reports/` 目录下同时交付两个关键文件：
  1. **审计 JSON 报告**（`survival_b_consult_<时间戳>.json`）：包含客户端付款地址、服务端端点、链上 Tx Hash、响应耗时与原始传感器数据，供区块链存证与自动化审计；
  2. **极简黑白 Word 战地报告**（`survival_b_consult_<时间戳>.docx`）：采用黑色细边框表格与标准纯黑文字，完整涵盖任务元数据表、参谋长核心裁决、致命威胁清单、七大物理遥感实测表与数据排除存证库，可直接用 Word、WPS 打开阅读或打印。

### 7.3 重新排版生成最新 Word 报告
如果您想将最近一次生成的对账 JSON 重新渲染排版为 Word：
- Windows: 双击 `生成最新Word报告.bat`
- 命令行: `cd client && npm run export-word`

---

## 8. 链上审计与对账核验

运行对账工具可以自动读取最新报告，比对链上智能合约与钱包资金：
- Windows: 双击 `运行链上对账.bat`
- 命令行: `cd client && npm run reconcile`
- 输出示例：
  ```text
  =========================================================
  🔍 [x402 Level 2 极端环境生存决策系统 链上审计与对账]
  🌐 链网络: Base Sepolia (Chain ID: 84532)
  💵 合约地址: 0x036CbD53842c5426634e7929541eC2318f3dCF7e
  👛 付款方钱包: 0x4830D4857AdA8b000aFC1C2702294B0999dEaFB3
  🏢 收款方钱包: 0xdcD7DAFafb0EF3d50bDdB480Dbd503Fa6D1B6C09
  =========================================================
  💰 付款方 USDC 当前余额: 19.956 USDC
  💰 收款方 USDC 当前余额: 30.046 USDC
  📂 正在读取最新决策报告: survival_b_consult_2026-10-27T04-02-21-593Z.json
  🤖 服务模式: Level 2_b 双智能体协同 (A2A 模式)
  💵 打包价格: 0.005 USDC
  🚨 综合风险评级: 🟠 高度危险 (HIGH)
  🎯 采纳核心 API: 6 个 | 🛡️ 排除无关 API: 5 个
  ✅ 对账核验流程完成
  ```

---

## 9. 面向 AI Agent 的调用参考规范 (Machine Reference)

如果您是接手本仓库的 AI Agent，请遵照以下机器可读契约进行自动化调度：

### 9.1 服务端 402 协议账单探测
```http
GET /api/agent/consult?lat=39.0&lon=83.5&place=Taklimakan HTTP/1.1
Host: server-three-nu-11.vercel.app (本地为 localhost:3001)

HTTP/1.1 402 Payment Required
payment-required: eyJ4NDAyVmVyc2lvbiI6Miwic2NoZW1lIjoiZXhhY3QiLCJuZXR3b3JrIjoiZWlwMTU1Ojg0NTMyIiwiYWNjZXB0cyI6W3sic2NoZW1lIjoiZXhhY3QiLCJwYXlUbyI6IjB4ZGNEN0RBRmFmYjBFRjNkNTBiRGRCNDgwRGJkNTAzRmE2RDFCNkMwOSIsInByaWNlIjoiMC4wMDUiLCJhc3NldCI6IjB4MDM2Q2JENTM4NDJjNTQyNjYzNGU3OTI5NTQxZUMyMzE4ZjNkQ0Y3ZSJ9XX0=
```

### 9.2 结算成功后服务端响应 JSON 契约
```json
{
  "success": true,
  "service": "x402-deepseek-survival-broker",
  "endpoint": "/api/agent/consult",
  "timestamp": "2026-10-27T04:02:21.000Z",
  "report": {
    "expeditionTarget": {
      "name": "塔克拉玛干沙漠腹地",
      "lat": 39.0,
      "lon": 83.5,
      "profile": "极端沙尘高温流动沙丘重装徒步穿越"
    },
    "overallRisk": "HIGH",
    "riskLabel": "🟠 高度危险 (HIGH)",
    "executiveSummary": "战地指挥官两到三句话核心态势裁决...",
    "keyThreats": [
      "核心致命威胁 1",
      "核心致命威胁 2"
    ],
    "filterMeta": {
      "engine": "DeepSeek-V3 / Chat Completion",
      "model": "deepseek-chat",
      "selectedCount": 6,
      "filteredNoiseCount": 5,
      "noiseRejectionReasons": {
        "flood": "极端干旱无常年河道，排除",
        "forex": "金融外汇与野外生存无关，排除"
      },
      "rationaleSummary": "选路策略与逻辑概述"
    },
    "dimensionDiagnostics": {
      "geologicalHazard": "地质实测结论",
      "stormColdHypothermia": "风暴极寒实测结论",
      "hydrologyFlood": "水文漫滩实测结论",
      "terrainSlopeAltitude": "地形高程实测结论",
      "dustSandstormVisibility": "沙尘能见度实测结论",
      "sunlightSurvivalWindow": "日照天光实测结论",
      "commsNavigationLifeline": "空间天气地磁实测结论"
    },
    "actionDirectives": [
      "行动指令/禁令 1",
      "行动指令/禁令 2"
    ]
  }
}
```

---

## 10. 故障排除与常见问题 (FAQ)

| 异常现象 | 核心原因 | 快速解决办法 |
| :--- | :--- | :--- |
| **启动时直接报错“API无效”** | `server/.env` 中未配置 `DEEPSEEK_API_KEY` 或填错 | 打开 `server/.env`，填入有效的 `DEEPSEEK_API_KEY=sk-...` 保存后重启 |
| **客户端提示“未找到付款钱包私钥”** | `client/.env` 未配置 `PAYER_PRIVATE_KEY` | 打开 `client/.env`，填入有效的 64 位 16 进制私钥 |
| **客户端结算时提示“insufficient funds”** | 付款钱包缺少 Base Sepolia 测试 ETH (Gas) 或 USDC | 使用水龙头向您的付款地址申领少量测试 ETH 与测试 USDC |
| **端口 3000 被占用** | 其他 Node.js 进程占用了 3000 端口 | 在 `server/.env` 中修改 `PORT=3001`，并同步修改 `client/.env` 中的 `TARGET_URL=http://localhost:3001` |
| **Word 报告生成失败** | 正在用 Microsoft Word 打开同名报告，文件被锁定 | 关闭电脑上正在查看的 `.docx` 文件，重新运行生成命令 |
