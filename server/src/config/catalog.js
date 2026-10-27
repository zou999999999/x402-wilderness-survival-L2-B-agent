import { NETWORK } from './network.js';
import { getPayToAddress } from './payee.js';

/**
 * Level 2 全球极端环境与野外探险生存决策系统 —— 11 个 API 全量服务目录
 * 包含 7 个核心野外生存与极端气候监测 API + 4 个干扰噪音 API
 * 每个 API 定价 0.001 USDC (1000 micro-units on Base Sepolia)
 */
export const PRICE_USDC = '$0.001';

export const API_CATALOG = [
  {
    id: 'earthquake',
    path: '/api/survival/earthquake',
    name: '近场地震与断裂带活动监测',
    category: 'geology',
    price: PRICE_USDC,
    requiresLocation: true,
    description: '基于 USGS FDSN Event API，监测目标半径 500km 内过去 7 天 M2.5+ 地震烈度、震源深度及断裂带活动',
    sampleParams: { lat: 38.0, lon: 88.5 }
  },
  {
    id: 'storm',
    path: '/api/survival/storm',
    name: '极端气象与温风雨雪监测',
    category: 'meteorology',
    price: PRICE_USDC,
    requiresLocation: true,
    description: '基于 Open-Meteo 数值天气预报，提供实况风速、极大阵风、雨雪累计、气温及体感失温危险指数',
    sampleParams: { lat: 38.0, lon: 88.5 }
  },
  {
    id: 'flood',
    path: '/api/survival/flood',
    name: '流域水文与洪涝漫滩预测',
    category: 'hydrology',
    price: PRICE_USDC,
    requiresLocation: true,
    description: '基于 Open-Meteo GloFAS 全球水文洪水预测系统，提供未来 7 天河道径流比率、洪峰到达日与漫滩趋势',
    sampleParams: { lat: 38.0, lon: 88.5 }
  },
  {
    id: 'terrain',
    path: '/api/survival/terrain',
    name: '数字高程与地形坡度勘测',
    category: 'topography',
    price: PRICE_USDC,
    requiresLocation: true,
    description: '基于 Copernicus DEM 90m 高程模型，采样十字邻点计算地表海拔、局部最大坡度与地貌起伏',
    sampleParams: { lat: 38.0, lon: 88.5 }
  },
  {
    id: 'dust',
    path: '/api/survival/dust',
    name: '大气沙尘与颗粒物浓度监测',
    category: 'air_quality',
    price: PRICE_USDC,
    requiresLocation: true,
    description: '基于 Open-Meteo Air Quality，监测大气沙尘颗粒物浓度、PM10/PM2.5 质量浓度与地表光学厚度',
    sampleParams: { lat: 38.0, lon: 88.5 }
  },
  {
    id: 'sunlight',
    path: '/api/survival/sunlight',
    name: '天文日照与晨昏蒙影窗口',
    category: 'astronomy',
    price: PRICE_USDC,
    requiresLocation: true,
    description: '基于 Sunrise-Sunset API，计算目标点日出日落时刻、民用晨昏蒙影（微光）时间段与白天有效日照窗口',
    sampleParams: { lat: 38.0, lon: 88.5 }
  },
  {
    id: 'geomagnetic',
    path: '/api/survival/geomagnetic',
    name: '空间天气与地磁暴监测',
    category: 'space_weather',
    price: PRICE_USDC,
    requiresLocation: false,
    description: '基于 NOAA SWPC 全球行星 K 指数，提供实时地磁指数及 G1~G5 级地磁暴对无线电与卫星信号影响',
    sampleParams: {}
  },
  {
    id: 'forex',
    path: '/api/noise/forex',
    name: '国际外汇法定货币汇率牌价',
    category: 'foreign_exchange',
    price: PRICE_USDC,
    requiresLocation: false,
    description: '基于 Frankfurter 汇率数据，提供美元兑主要法定货币（CNY/EUR/JPY/GBP）实时外汇中间牌价',
    sampleParams: {}
  },
  {
    id: 'catfact',
    path: '/api/noise/catfact',
    name: '猫科动物科普与生物事实',
    category: 'feline_zoology',
    price: PRICE_USDC,
    requiresLocation: false,
    description: '基于 Cat Facts Ninja API，提供猫科动物的生物学特征、生理习性与驯化历史科普事实',
    sampleParams: {}
  },
  {
    id: 'crypto',
    path: '/api/noise/crypto',
    name: '加密数字货币行情走势',
    category: 'cryptocurrency',
    price: PRICE_USDC,
    requiresLocation: false,
    description: '基于 CoinGecko API，提供主流加密数字资产（如 BTC、ETH）实时现货交易均价与 24h 涨跌幅',
    sampleParams: {}
  },
  {
    id: 'iss',
    path: '/api/noise/iss',
    name: '国际空间站轨道天顶轨迹',
    category: 'orbital_tracking',
    price: PRICE_USDC,
    requiresLocation: false,
    description: '基于 WhereTheISS.at API，提供国际空间站 (ISS) 实时星下点地表经纬度、近地轨道高度与运行飞行速度',
    sampleParams: {}
  }
];

/**
 * 生成提供给 AI Agent 的无偏见客观 API 能力规范 (Skill Specification)
 */
export function getApiSkillSpecification() {
  return API_CATALOG.map((item, index) => {
    return `[服务 ${index + 1}] ID: ${item.id} | 名称: ${item.name} | 专业领域: ${item.category}
  - 路由路径: ${item.path}
  - 定价规格: ${item.price} USDC
  - 参数需求: ${item.requiresLocation ? '需要目标地理坐标 (lat, lon)' : '全局或无需地理坐标'}
  - 核心数据能力: ${item.description}`;
  }).join('\n\n');
}

/**
 * 构造用于 x402 paymentMiddleware 的 routesConfig 字典
 */
export function buildX402RoutesConfig() {
  const payTo = getPayToAddress();
  const routesConfig = {};

  for (const item of API_CATALOG) {
    routesConfig[item.path] = {
      accepts: {
        scheme: 'exact',
        payTo,
        price: item.price,
        network: NETWORK
      },
      description: `${item.name} (${item.price} USDC on Base Sepolia)`
    };
  }

  // ================= 方案 B：服务端 DeepSeek 参谋 Agent 咨询端点 =================
  routesConfig['/api/agent/consult'] = {
    accepts: {
      scheme: 'exact',
      payTo,
      price: '$0.005',
      network: NETWORK
    },
    description: 'DeepSeek 探险决策参谋 Agent 一站式咨询与噪音过滤研判 ($0.005 USDC on Base Sepolia)'
  };

  return routesConfig;
}
