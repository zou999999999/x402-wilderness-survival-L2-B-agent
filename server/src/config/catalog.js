import { NETWORK } from './network.js';
import { getPayToAddress } from './payee.js';

/**
 * Level 2 外部数据微服务全量目录 (11 个独立端点)
 * 每个 API 定价 0.001 USDC (1000 micro-units on Base Sepolia)
 * 遵循中立客观原则，不包含任何预设立场或主观过滤标记
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
    description: '基于 USGS FDSN Event API，监测 500km 半径内过去 7 天 M2.5+ 地震烈度与震源深度，评估地质活动与滑坡隐患',
    sampleParams: { lat: 38.0, lon: 88.5 }
  },
  {
    id: 'storm',
    path: '/api/survival/storm',
    name: '极端风暴与温温雨雪气象监测',
    category: 'meteorology',
    price: PRICE_USDC,
    requiresLocation: true,
    description: '基于 Open-Meteo 高清数值预报，监测实况风速/阵风/气温/降水及未来 24h 暴雪极寒失温预警',
    sampleParams: { lat: 38.0, lon: 88.5 }
  },
  {
    id: 'flood',
    path: '/api/survival/flood',
    name: '流域水文与径流漫滩监测',
    category: 'hydrology',
    price: PRICE_USDC,
    requiresLocation: true,
    description: '基于 Open-Meteo GloFAS 全球水文洪水系统，预测未来 7 天河道径流比率与洪峰到达日，评估水文漫滩演进',
    sampleParams: { lat: 38.0, lon: 88.5 }
  },
  {
    id: 'terrain',
    path: '/api/survival/terrain',
    name: '数字高程与局部坡度勘察',
    category: 'topography',
    price: PRICE_USDC,
    requiresLocation: true,
    description: '基于 Copernicus DEM 90m 高程模型，采样十字邻点计算局部最大坡度与绝对高程，评估地形起伏与高反阶梯',
    sampleParams: { lat: 38.0, lon: 88.5 }
  },
  {
    id: 'dust',
    path: '/api/survival/dust',
    name: '沙尘暴与大气颗粒物浓度监测',
    category: 'air_quality',
    price: PRICE_USDC,
    requiresLocation: true,
    description: '基于 Open-Meteo Air Quality，监测沙尘浓度、PM10/PM2.5 与光学厚度，评估大气沙尘肆虐与能见度',
    sampleParams: { lat: 38.0, lon: 88.5 }
  },
  {
    id: 'sunlight',
    path: '/api/survival/sunlight',
    name: '昼夜天光与日光有效窗口',
    category: 'astronomy',
    price: PRICE_USDC,
    requiresLocation: true,
    description: '基于 Sunrise-Sunset API，计算日出日落、民用晨昏蒙影与有效日照时长，评估有效行动与宿营窗口',
    sampleParams: { lat: 38.0, lon: 88.5 }
  },
  {
    id: 'geomagnetic',
    path: '/api/survival/geomagnetic',
    name: '空间天气与地磁暴监测',
    category: 'space_weather',
    price: PRICE_USDC,
    requiresLocation: false,
    description: '基于 NOAA SWPC 全球行星 K 指数，提供实时地磁指数及 G1~G5 级地磁暴对无线电通信与卫星定位影响',
    sampleParams: {}
  },
  {
    id: 'forex',
    path: '/api/market/forex',
    name: '国际外汇法定货币汇率牌价',
    category: 'foreign_exchange',
    price: PRICE_USDC,
    requiresLocation: false,
    description: '基于 Frankfurter 汇率数据，提供美元兑主要法定货币（CNY/EUR/JPY/GBP）实时外汇中间牌价与兑换结算比率',
    sampleParams: {}
  },
  {
    id: 'catfact',
    path: '/api/info/catfact',
    name: '猫科动物科普与生物事实',
    category: 'feline_zoology',
    price: PRICE_USDC,
    requiresLocation: false,
    description: '基于 Cat Facts Ninja API，提供猫科动物的生物学解剖特征、生活生理习性与驯化历史科学知识',
    sampleParams: {}
  },
  {
    id: 'crypto',
    path: '/api/market/crypto',
    name: '加密数字货币现货行情走势',
    category: 'cryptocurrency',
    price: PRICE_USDC,
    requiresLocation: false,
    description: '基于 CoinGecko API，提供主流加密数字资产（BTC/ETH 等）在公开交易所的实时现货交易均价与 24h 涨跌幅',
    sampleParams: {}
  },
  {
    id: 'iss',
    path: '/api/orbit/iss',
    name: '国际空间站轨道天顶轨迹监测',
    category: 'orbital_space',
    price: PRICE_USDC,
    requiresLocation: false,
    description: '基于 WhereTheISS.at API，提供国际空间站 (ISS) 实时星下点地表经纬度、近地轨道高度 (~420km) 与运行飞行时速',
    sampleParams: {}
  }
];

/**
 * 构造用于 x402 paymentMiddleware 的 routesConfig 字典
 * 同时注册规范路径与历史别名路径，确保 100% 兼容
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

  // 注册历史别名路由兼容
  const aliasMap = {
    '/api/noise/forex': '/api/market/forex',
    '/api/noise/catfact': '/api/info/catfact',
    '/api/noise/crypto': '/api/market/crypto',
    '/api/noise/iss': '/api/orbit/iss'
  };
  for (const [legacyPath, standardPath] of Object.entries(aliasMap)) {
    if (routesConfig[standardPath]) {
      routesConfig[legacyPath] = routesConfig[standardPath];
    }
  }

  return routesConfig;
}

