import { fetchJson, round } from '../lib/http.js';

/**
 * 地形高程与坡度风险 —— Open-Meteo Elevation API (Copernicus DEM 90m)
 * 一次请求取中心点 + 东南西北 4 个邻点（间距 ≈330m），用最大高差估算局部坡度。
 */
export async function fetchTerrain(loc) {
  const step = 0.003;
  const pts = [
    [loc.lat, loc.lon],
    [loc.lat + step, loc.lon],
    [loc.lat - step, loc.lon],
    [loc.lat, loc.lon + step],
    [loc.lat, loc.lon - step]
  ];
  const url = `https://api.open-meteo.com/v1/elevation?latitude=${pts.map(p => p[0]).join(',')}&longitude=${pts.map(p => p[1]).join(',')}`;
  const e = await fetchJson(url);
  const [c, n, s, east, w] = e.elevation;

  const dyM = 111320 * step;
  const dxM = 111320 * Math.cos((loc.lat * Math.PI) / 180) * step;
  const slopes = [
    Math.abs(n - c) / dyM, Math.abs(s - c) / dyM,
    Math.abs(east - c) / dxM, Math.abs(w - c) / dxM
  ].map(r => (Math.atan(r) * 180) / Math.PI);
  const maxSlopeDeg = round(Math.max(...slopes), 1);

  let level = 'low';
  const advice = [];
  if (maxSlopeDeg >= 25) level = 'high';
  else if (maxSlopeDeg >= 15) level = 'moderate';
  if (c >= 4500 && level === 'low') level = 'moderate';

  if (maxSlopeDeg >= 25) advice.push(`局部坡度约 ${maxSlopeDeg}°，处于滑坡/泥石流易发区间，雨后禁止通行坡脚`);
  else if (maxSlopeDeg >= 15) advice.push(`局部坡度约 ${maxSlopeDeg}°，负重行进需之字形路线并注意落石`);
  if (c >= 3000) advice.push(`海拔 ${c}m，存在急性高原反应风险：控制每日爬升 ≤500m，出现头痛呕吐立即下撤`);
  if (!advice.length) advice.push('地形平缓、海拔适中，地形不是主要威胁');

  return {
    source: 'Open-Meteo Elevation (Copernicus DEM)',
    data: {
      elevationM: c,
      neighborsM: { north: n, south: s, east, west: w },
      sampleSpacingM: Math.round(dyM),
      maxSlopeDeg
    },
    assessment: {
      level,
      summary: `海拔 ${c}m，约 330m 尺度最大坡度 ${maxSlopeDeg}°`,
      advice
    }
  };
}
