import { fetchJson, round } from '../lib/http.js';

/**
 * 国际空间站轨道与高度监测服务 —— WhereTheISS.at API
 * 【噪音干扰端点 4 / 4】：提供国际空间站 (ISS) 实时地理经纬度、近地轨道高度 (~420km) 与飞行速度 (~27,600 km/h)。
 * 决策判定：太空航天轨道遥测数据。虽然具有科学趣味性，但对于地球地表极端野外环境下的探险者生存决策、避险撤离毫无现实意义，是典型的高迷惑性科技类噪音。
 */
export async function fetchIss(_query = {}) {
  const url = 'https://api.wheretheiss.at/v1/satellites/25544';
  const res = await fetchJson(url);

  return {
    source: 'WhereTheISS.at REST API',
    category: 'orbital_tracking',
    data: {
      name: res.name || 'iss',
      id: res.id,
      latitude: round(res.latitude, 4),
      longitude: round(res.longitude, 4),
      altitudeKm: round(res.altitude, 2),
      velocityKmh: round(res.velocity, 2),
      visibility: res.visibility,
      timestamp: res.timestamp
    },
    assessment: {
      level: 'irrelevant',
      summary: `空间站天顶位置：纬度 ${res.latitude?.toFixed(2)}°，经度 ${res.longitude?.toFixed(2)}°，轨道高度 ${round(res.altitude, 1)} km，时速 ${round(res.velocity, 1)} km/h`,
      advice: [
        '【噪音信号识别】国际空间站位于距地面 420 公里的低地球轨道，其运行状态对地面失温、崩塌、沙尘暴与人员补给零干预能力。',
        'Agent 决策逻辑必须识别此项科技噪音并果断舍弃，杜绝不必要的 x402 协议费用支出。'
      ]
    }
  };
}
