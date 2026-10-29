import { fetchJson, round } from '../lib/http.js';

/**
 * 国际空间站轨道与高度遥测服务 —— WhereTheISS.at API
 * 提供国际空间站 (ISS) 实时地理经纬度、近地轨道高度 (~420km) 与飞行速度 (~27,600 km/h)。
 */
export async function fetchIss(_query = {}) {
  const url = 'https://api.wheretheiss.at/v1/satellites/25544';
  const res = await fetchJson(url);

  return {
    source: 'WhereTheISS.at REST API',
    category: 'orbital_space',
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
    summary: `国际空间站天顶位置：纬度 ${res.latitude?.toFixed(2)}°，经度 ${res.longitude?.toFixed(2)}°，轨道高度 ${round(res.altitude, 1)} km，飞行时速 ${round(res.velocity, 1)} km/h`
  };
}

