---
name: x402-level2-survival-recon
description: 全球极端环境与野外探险决策系统外部数据微服务规范。定义 11 个独立 x402 付费 API 的功能、输入参数、输出指标与定价规格，指导自主 Agent 根据具体任务剖面按需选路、发起微支付与综合态势研判。
---

# x402 Level 2: 外部数据微服务能力库与智能决策技能规范

本 Skill 为 **Level 2 智能体决策系统** 的标准化外部数据服务知识库（Tool Reference Manual）。
服务端以 **x402 协议** 提供 11 个独立的微支付数据接口，每个接口调用费用均为 **0.001 USDC**（Base Sepolia 测试网）。

---

## 一、 11 个外部微服务能力清单 (API Toolset Catalog)

| 序号 | 接口 ID | 路由路径 | 数据源 | 参数需求 | 定价 | 服务能力与核心监测指标 |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- |
| 1 | **earthquake** | `/api/survival/earthquake` | USGS FDSN Event API | 需 `lat`, `lon` | 0.001 USDC | 监测目标周边 500km 半径内过去 7 天 M2.5+ 地震烈度、震源深度及断裂带活动，评估滑坡崩塌隐患。 |
| 2 | **storm** | `/api/survival/storm` | Open-Meteo Forecast | 需 `lat`, `lon` | 0.001 USDC | 提供实况与未来 24h 风速、极大阵风、雨雪累计、最低气温，评估强风掀顶与极寒失温威胁。 |
| 3 | **flood** | `/api/survival/flood` | Open-Meteo GloFAS | 需 `lat`, `lon` | 0.001 USDC | 提供未来 7 天流域河道径流比率、历史中位数比值与洪峰到达日，评估山洪暴发与低洼漫滩演进。 |
| 4 | **terrain** | `/api/survival/terrain` | Copernicus DEM 90m | 需 `lat`, `lon` | 0.001 USDC | 采样十字邻点高差，估算局部最大坡度与绝对高程，评估陡崖滑坠、泥石流临界角与高反阶梯爬升。 |
| 5 | **dust** | `/api/survival/dust` | Open-Meteo Air Quality | 需 `lat`, `lon` | 0.001 USDC | 监测大气沙尘颗粒物浓度、PM10/PM2.5 质量浓度与光学厚度，评估黑风暴肆虐与能见度骤降风险。 |
| 6 | **sunlight** | `/api/survival/sunlight` | Sunrise-Sunset.org | 需 `lat`, `lon` | 0.001 USDC | 计算日出日落时刻、民用黄昏终点与有效自然光照时长，评估天黑扎营时限与夜间行动窗口。 |
| 7 | **geomagnetic**| `/api/survival/geomagnetic`| NOAA SWPC K-index | 无需经纬度 (全局) | 0.001 USDC | 监测实时行星 K 指数 (0~9) 及 G1~G5 级地磁暴状态，评估对 GPS 卫星定位漂移与通信信标的影响。 |
| 8 | **forex** | `/api/market/forex` | Frankfurter API | 无需经纬度 (全局) | 0.001 USDC | 提供美元兑主要法定货币（CNY/EUR/JPY/GBP）实时外汇牌价与法币兑换结算比率。 |
| 9 | **catfact** | `/api/info/catfact` | Cat Facts Ninja | 无需经纬度 (全局) | 0.001 USDC | 提供猫科动物生物学解剖特征、生活生理习性与驯化历史科学知识。 |
| 10 | **crypto** | `/api/market/crypto` | CoinGecko API | 无需经纬度 (全局) | 0.001 USDC | 提供主流加密数字资产（BTC/ETH 等）在公开二级市场的实时美元行情与 24h 涨跌幅。 |
| 11 | **iss** | `/api/orbit/iss` | WhereTheISS.at | 无需经纬度 (全局) | 0.001 USDC | 提供国际空间站 (ISS) 实时星下点地表经纬度、近地轨道高度 (~420km) 与运行飞行时速。 |

---

## 二、 Agent 认知推理与自主选路原则

自主 Agent 面对具体的用户任务时，基于以下原则进行自主推理与选路：

### 1. 任务剖面驱动 (Mission-Driven Selection)
- 用户会为 Agent 指派具体的行动任务（包括任务名称、任务性质与目标地理坐标）。
- Agent 必须独立阅读上述 11 个微服务规范，自主评估每个服务与**当前任务的具体目标、地理地貌环境及实际行动**是否存在直接现实关联。
- 严禁预设任何固定答案或先验分类，完全由自主 Agent 依据任务实际需求进行推理并给出选路决策。

### 2. 预算与资源经济性 (Budget Economy)
- 遵循 x402 链上微支付经济学原则，Agent 仅筛选并批准调用对当前任务有实质支撑价值的必要端点 (`approvedApiIds`)；
- 对与当前任务无关的端点予以排除 (`rejectedApiIds`)，并输出具体的排除逻辑依据，杜绝不必要的资金消耗；
- 若用户选择“全量采购模式”或在无 Agent 介入的直接运行场景下，系统将直接购买全部 11 个微服务端点。

### 3. 真实交易与链上对账纯粹性 (Authentic Settlement Only)
- 每一笔微服务调用均通过 x402 协议在 Base Sepolia 上真实签名结算（单笔 0.001 USDC）；
- 严格杜绝任何伪造的随机交易哈希，必须以 Facilitator 回执中的真实交易哈希（Tx Hash）为准进行对账与存证。

### 4. 客观数据反馈 (Pure Data Delivery)
- 客户端 Agent 的职责是将通过 x402 协议真实购买到的各端点遥测数据原汁原味、清晰完整地打包并呈现给用户，不做多余的、臃肿的所谓主观风险评级或行动禁令脑补。
