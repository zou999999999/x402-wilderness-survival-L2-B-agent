# x402 Level 2_b: 双智能体协同 (A2A) 极端环境探险生存决策系统

本项目为 **x402 协议高阶拓展项目（Level 2 方向 B）**，在原子级单 API 结算基础上实现了 **A2A（Agent-to-Agent，双智能体协同与智能体即服务 AaaS）模式**：
- **服务端智能体 (Server Agent / Recon Broker)**：常驻服务端的「极端环境探险决策参谋」，通过 **100% 本地文档驱动 (`API_SKILL.md`)** 接入 **DeepSeek 大模型**。接收客户端高层探险诉求，在**零人工提前标注噪音**的前提下，自主完成 11 个微服务数据源的认知选路与无关干扰服务排除，并发调度遥感微服务采集数据，深度融合生成结构化态势裁决与战地行动禁令。
- **客户端智能体 (Client Agent / Expedition Consumer)**：轻量级探险消费端，只需发起一站式咨询请求，通过 x402 协议一口价支付打包费用（**0.005 USDC** on Base Sepolia），自动在本地输出结构化审计 JSON 与**极简黑白专业 Word (.docx) 战地研判报告**。

> 📘 **新手与 Agent 必读**：请参阅 [《使用者与 Agent 全流程操作指南》](操作指南与Agent调用手册.md)，包含详细的测试网领水、钱包私钥配置、4 种自定义探险位置模式与常见问题排查。

---

## 一、 系统架构与双智能体物理解耦设计

严格遵循全局工作区规范与生产级物理隔离安全标准：

```
Level2_b/
├── server/                          # 【服务端 / 智能体即服务 (AaaS)】
│   ├── api/index.js                 # 挂载 x402 中间件与 /api/agent/consult 咨询端点
│   ├── server.js                    # 本地调试 Express 监听入口 (PORT: 3000)
│   ├── package.json                 # 服务端独立依赖 (@x402/core, @x402/evm, express 等)
│   ├── vercel.json                  # 云端 Serverless 路由重写规则
│   ├── .env.example                 # 包含公开 PAY_TO 与 DEEPSEEK_API_KEY 预留配置
│   └── src/
│       ├── agent/                   # 核心：deepseek_agent.js (服务端 DeepSeek 参谋智能体)
│       ├── config/
│       │   ├── API_SKILL.md         # ★ 核心解耦：独立 Markdown 技能规范文档 (热加载)
│       │   ├── catalog.js           # 微服务路由与 x402 支付规格配置
│       │   ├── network.js           # Base Sepolia 链配置
│       │   └── payee.js             # 服务端收款钱包配置
│       ├── lib/                     # 高可用自愈 Facilitator 客户端、HTTP 容错与地理编码
│       └── providers/               # 11 个真实上游数据源驱动（地质/气象/水文/地形/沙尘/日照/空间天气等）
│
├── client/                          # 【客户端 / 探险决策 Agent 消费端】
│   ├── package.json                 # 客户端独立依赖 (@x402/fetch, @x402/evm, docx 等)
│   ├── .env.example                 # 客户端独立管理付款私钥 PAYER_PRIVATE_KEY
│   ├── reports/                     # 结构化审计 JSON 与战地 Word (.docx) 报告归档目录
│   └── src/
│       ├── config/wallet.js         # 付款钱包安全加载器
│       ├── lib/docx_exporter.js     # 专业战地 Word 决策评估报告排版导出引擎 (极简黑白公文风)
│       ├── export_word.js           # 独立转 Word 命令行与脚本工具
│       ├── agent.js                 # 客户端 Agent：发起咨询、EVM 结算并自动产出报告
│       └── reconcile.js             # 链上 USDC 交易哈希与余额自动化审计工具
│
├── 启动服务端.bat                   # Windows 一键启动服务端
├── 运行探险决策Agent.bat            # Windows 一键运行客户端 Agent (集成交互式选点菜单与 Word 导出)
├── 运行链上对账.bat                 # Windows 一键运行链上审计对账
├── 生成最新Word报告.bat             # Windows 一键将最新对账数据转为 Word 报告
├── 操作指南与Agent调用手册.md       # ★ 核心文档：面向使用者与 AI Agent 的完整使用手册
└── 项目交接与全流程上下文总结.md    # 核心交接档案
```

---

## 二、 核心技术创新与设计亮点

### 1. 业务通信与领域知识 100% 物理文档解耦 (API_SKILL.md 驱动)
- 将 11 个微服务的数据能力规范、参数与评估准则彻底抽离到独立的本地文档 [`server/src/config/API_SKILL.md`](server/src/config/API_SKILL.md)；
- 服务端代码中仅保留纯粹的网络收发与调度逻辑，大模型调用前通过 Node.js 原生 `fs.readFileSync` 动态装载；
- **热更新维护**：后续增减微服务或微调提示词时，无需修改任何 JavaScript 代码，直接编辑 Markdown 保存即可实时生效。

### 2. 彻底解除噪音预标注，环境自适应 Agent 认知
- 彻底移除代码与文档中所有的 `isNoise: true/false` 与 `noise_*` 分类，所有 11 个微服务均以客观科学领域平铺展现；
- DeepSeek 依据目标地貌特征自主分析威胁并进行准入裁决：
  - **珠峰雪山场景**：自主保留冰湖溃决洪涝风险，主动排除洁净大气下的沙尘接口；
  - **塔克拉玛干沙漠场景**：自主保留强风蚀沙尘暴监测，主动排除无常年河道的流域洪涝接口；
  - 稳定排除与野外生存毫无因果关系的金融外汇、猫咪科普、代币行情与空间站轨迹。

### 3. 多模式灵活自定义探险目标
- **交互式控制台菜单**：双击 `运行探险决策Agent.bat` 可按数字选择预置全球极境（阿尔金山、珠峰大本营、塔克拉玛干腹地、罗布泊大海道、神农架原始森林），或输入 `6` 自由输入任意经纬度、地名与探险性质；
- **命令行传参模式**：支持 `node src/agent.js <lat> <lon> <地名> <探险性质>`；
- **环境变量配置模式**：支持在 `client/.env` 中直接修改 `EXPEDITION_LAT` 与 `EXPEDITION_LOCATION`。

### 4. 极简黑白专业 Word (.docx) 战地研判报告自动排版
- 集成纯 JavaScript 的 `docx` 排版引擎，全流程自动化生成；
- 遵循极简公文/专业技术报告风格，**仅使用干净的黑色细边框表格与标准纯黑文字**，彻底去除花哨色彩底色，极简素雅、适宜打印存档；
- 涵盖任务元数据汇总表、参谋长核心态势裁决、前线致命威胁清单、核心物理遥感实测表、微服务筛选排除存证库及链上 Tx 结算凭证。

---

## 三、 快速启动与本地验证

### 1. 启动服务端
双击 `启动服务端.bat` 或在终端运行：
```bash
cd server
npm start
```
服务将在 `http://localhost:3000` 启动，暴露 `/api/agent/consult` 端点。

### 2. 运行客户端 Agent 发起咨询
双击 `运行探险决策Agent.bat`，根据终端菜单选择或输入目标地理点：
```bash
cd client
# 示例：以命令行直接调用珠穆朗玛峰大本营
node src/agent.js 27.9881 86.9250 "珠穆朗玛峰大本营" "极高海拔极寒雪山攀登"
```
客户端将：
1. 向服务端 Agent 发起探测，获取 `402 Payment Required` 账单（一口价 `0.005 USDC`）；
2. 自动签名 EVM 支付凭据并向 Facilitator 链上清算；
3. 获取完整战地生存裁决，自动生成 `client/reports/*.json` 与 `client/reports/*.docx` 报告。

### 3. 运行链上对账核验
双击 `运行链上对账.bat` 或运行：
```bash
cd client
npm run reconcile
```

### 4. 重新排版生成最新 Word 报告
双击 `生成最新Word报告.bat` 或运行：
```bash
cd client
npm run export-word
```

---

## 四、 云端部署说明 (Vercel Serverless)

服务端已完整配置 `server/vercel.json`，可直接一键部署至 Vercel：
1. 在 Vercel 控制台导入 `Level2_b/server` 目录；
2. 在环境变量中添加：
   - `PAY_TO`: 你的服务端收款钱包地址；
   - `DEEPSEEK_API_KEY`: 你的 DeepSeek 官方 API 密钥；
3. 部署成功后，将生成的云端域名填入客户端 `client/.env` 的 `TARGET_URL` 即可实现全球远程调用。

