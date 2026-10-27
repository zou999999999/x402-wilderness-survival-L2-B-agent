---
name: x402-level2-survival-recon
description: 全球极端环境与野外探险生存决策系统 (Level 2) 官方专业技能规范。记录 11 个 x402 付费 API（7 个生存核心 + 4 个干扰噪音）的功能、调用路由、定价、参数、认知推理与自动选路决策树，指导 Agent 自动过滤噪音并发起 x402 微支付。
---

# x402 Level 2: 全球极端环境与野外探险生存决策系统技能规范

本 Skill 为 **Level 2 多接口协同与噪音过滤 Agent 决策系统** 的核心知识库。
服务端统一以 **x402 协议** 部署并暴露 11 个微支付数据接口，每个接口调用费用均为 **0.001 USDC**（Base Sepolia 测试网）。

---

## 一、 11 个 API 全量服务目录与规格定义

### 1. 七大野外生存核心 API（必需调用）

| 接口 ID | 路由路径 | 数据源 | 核心监测指标 | 定价 | 野外生存决策价值 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **earthquake** | `/api/survival/earthquake` | USGS FDSN Event API | 500km 半径过去 7 天 M2.5+ 地震、震源深度、震中距 | 0.001 USDC | 排查近场余震、断裂带滑坡、崩塌及滚石威胁，指导营地规避陡崖坡脚。 |
| **storm** | `/api/survival/storm` | Open-Meteo Forecast | 实况/24h风速、极大阵风、雨雪累计、最低气温 | 0.001 USDC | 预警 8+ 级强阵风掀翻营帐、暴风雪及夜间极寒失温，规划防风宿营与保温。 |
| **flood** | `/api/survival/flood` | Open-Meteo GloFAS | 未来 7 天河道流量、中位数比率、洪峰到达日 | 0.001 USDC | 监测上游强降水引发的山洪与漫滩风险，严禁涉水过河与低洼河漫滩扎营。 |
| **terrain** | `/api/survival/terrain` | Copernicus DEM 90m | 核心点海拔、十字邻点高差、局部最大坡度估算 | 0.001 USDC | 识别坡度 ≥25° 滑坡易发区，评估海拔 ≥3000m 急性高原反应（AMS）阶梯爬升。 |
| **dust** | `/api/survival/dust` | Open-Meteo Air Quality | 沙尘浓度、PM10/PM2.5、气溶胶光学厚度 (AOD) | 0.001 USDC | 预警荒野黑风暴与沙尘肆虐，防范能见度骤降导致队伍失散及呼吸道损伤。 |
| **sunlight** | `/api/survival/sunlight` | Sunrise-Sunset.org | 日出日落时刻、民用黄昏终点、可行动日光总时长 | 0.001 USDC | 确立野外生存第一红线：民用天黑前 90 分钟强制停步扎营，杜绝摸黑滑坠。 |
| **geomagnetic**| `/api/survival/geomagnetic`| NOAA SWPC K-index | 实时行星 K 指数 (0~9)、NOAA G1~G5 级地磁暴 | 0.001 USDC | 预警电离层骚扰引发的 GPS 定位数十米漂移及卫星通信信标失锁，启动磁罗盘备份。 |

---

### 2. 四大噪音干扰 API（必须自动识别并拦截）

| 接口 ID | 路由路径 | 数据源 | 返回内容 | 定价 | 判定状态 | 噪音过滤与拦截推理逻辑 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **forex** | `/api/noise/forex` | Frankfurter API | USD 对 CNY/EUR/JPY 汇率 | 0.001 USDC | 🚫 **拦截拒买** | 宏观法币汇率属于金融交易范畴，对野外求生脱困毫无因果关系，坚决拒买。 |
| **catfact** | `/api/noise/catfact` | Cat Facts Ninja | 猫咪生物与生活冷知识 | 0.001 USDC | 🚫 **拦截拒买** | 宠物生活趣味科普，无法提供任何野外搜救、气象应对或地表避险指引，坚决拒买。 |
| **crypto** | `/api/noise/crypto` | CoinGecko API | BTC/ETH 实时现货行情 | 0.001 USDC | 🚫 **拦截拒买** | 加密资产二级市场价格无法评估泥石流或极寒风险，纯属投机噪音，坚决拒买。 |
| **iss** | `/api/noise/iss` | WhereTheISS.at | 空间站经纬度、420km 轨道高度 | 0.001 USDC | 🚫 **拦截拒买** | 国际空间站在近地轨道高速飞掠，对地表探险人员无现实干预与救援能力，属于科技干扰噪音，坚决拒买。 |

---

## 二、 Agent 认知推理与自主选路决策树

Agent 在接收到探险任务时，必须按照以下 **四步认知决策流** 执行：

```
[用户/任务输入: 目标经纬度 + 地理环境]
                │
                ▼
  【步骤 1: API 服务目录发现】
  读取服务端 /api/catalog 获取 11 个可用端点
                │
                ▼
  【步骤 2: 任务剖面相关性与噪音过滤】
  遍历端点元数据，计算与野外自然生命安全关联度：
    ├── 若属于物理环境/自然灾害/生命线 -> 评估通过 (入选执行队列)
    └── 若属于金融/趣味/太空/无关数据   -> 识别为噪音 (拦截并记录拒绝证据)
                │
                ▼
  【步骤 3: 链上预检与 x402 协议微支付调用】
  核查客户端钱包 USDC 与 ETH 余额
  对入选的 7 个 API 依次执行：
    1. 发起探测请求 -> 获取 402 Payment Required 账单
    2. 核对收款方 payTo 与价格 (0.001 USDC)
    3. 签名 EVM 支付凭据 -> Facilitator 链上结算 -> 返回 200 OK + 数据
                │
                ▼
  【步骤 4: 多源异构数据融合与生存裁决】
  生成综合危险等级 (LOW / MODERATE / HIGH / EXTREME)
  输出行动禁忌指令并归档结构化报告
```

---

## 三、 典型探险场景 API 调度矩阵

| 探险场景 | 重点监测 API | 典型触发红线 |
| :--- | :--- | :--- |
| **荒野沙漠无人区** (如阿尔金山、可可西里) | `dust`, `storm`, `sunlight`, `geomagnetic` | 沙尘浓度 >100 μg/m³、日落前 90 分钟停步、Kp ≥5 启动物理指北针。 |
| **高海拔冰雪登山** (如贡嘎山、慕士塔格) | `terrain`, `storm`, `earthquake`, `sunlight` | 海拔 >3500m 阶梯扎营、极大阵风 >17.2 m/s 加固营帐、局部坡度 ≥25° 防滑坡。 |
| **峡谷雨林与深山徒步** (如雅鲁藏布大峡谷) | `flood`, `earthquake`, `storm`, `terrain` | 河道流量比率 >1.5 倍禁止溯溪、强降水警惕泥石流、严禁沟谷扎营。 |

---

## 四、 快速启动与核验指令

- **启动服务端**: `./启动服务端.bat` 或 `cd server && node server.js`
- **运行探险决策 Agent**: `./运行探险决策Agent.bat` 或 `cd client && node src/agent.js`
- **运行链上对账核验**: `./运行链上对账.bat` 或 `cd client && node src/reconcile.js`
- **导出最新 Word 研判报告**: `./生成最新Word报告.bat` 或 `cd client && node src/export_word.js`
