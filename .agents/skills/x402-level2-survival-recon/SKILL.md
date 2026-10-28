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
| 8 | **forex** | `/api/noise/forex` | Frankfurter API | 无需经纬度 (全局) | 0.001 USDC | 提供美元兑主要法定货币（CNY/EUR/JPY/GBP）实时外汇牌价与法币兑换结算比率。 |
| 9 | **catfact** | `/api/noise/catfact` | Cat Facts Ninja | 无需经纬度 (全局) | 0.001 USDC | 提供猫科动物生物学解剖特征、生活生理习性与驯化历史科学知识。 |
| 10 | **crypto** | `/api/noise/crypto` | CoinGecko API | 无需经纬度 (全局) | 0.001 USDC | 提供主流加密数字资产（BTC/ETH 等）在公开二级市场的实时美元行情与 24h 涨跌幅。 |
| 11 | **iss** | `/api/noise/iss` | WhereTheISS.at | 无需经纬度 (全局) | 0.001 USDC | 提供国际空间站 (ISS) 实时星下点地表经纬度、近地轨道高度 (~420km) 与运行飞行时速。 |

---

## 二、 Agent 认知推理与自主决策原则

自主 Agent 面对具体的用户任务时，必须基于以下原则进行自主推理与选路：

### 1. 任务剖面驱动 (Mission-Driven Selection)
- 用户会为 Agent 指派具体的行动任务（包括任务名称、任务性质与目标地理坐标）。
- Agent 必须阅读上述 11 个微服务规范，逐一评估每个服务与**当前任务的具体目标及实际行动安全**是否存在直接因果关联。

### 2. 预算与资源经济性 (Budget Economy)
- 遵循 x402 链上微支付经济学原则，严禁无差别盲目调用所有端点。
- Agent 仅筛选并批准调用对当前任务有实质决策支撑价值的必要端点 (`approvedApiIds`)；
- 对与当前任务无关的端点予以排除 (`rejectedApiIds`)，并输出具体的排除逻辑依据，杜绝不必要的资金消耗。

### 3. 数据完整性与零伪安全红线 (Zero False-Safety Principle)
- **严禁“无数据默认安全”**：若网络超时、402 协议结算失败或服务不可用，导致有效遥测数据为 0 或关键数据缺失，Agent 必须将状态判定为 `DATA_DEFICIENT`（致命情报盲区 / 数据全盘缺失），严禁输出 `LOW`（安全适度）或默认正常报告！
- 在缺乏数据时，必须发出最高等级的避险警示：“严禁在缺乏真实遥测数据的情况下贸然行动！”
- 若部分端点数据缺失，必须在研判结论中显式指出“缺失情报形成的盲区隐患”，并在报告中显式呈现盲区警告。

---

## 三、 执行指令参考

- **运行 AaaS 客户端**: `node src/agent.js`
- **运行链上对账核验**: `node src/reconcile.js`
