import { fetchJson, round } from '../lib/http.js';

/**
 * 空间天气与地磁暴监测 —— NOAA SWPC Planetary K-index API
 * 监测地磁行星 K 指数 (0~9)。
 * 野外生存意义：
 *  - Kp ≥ 5（G1~G5 级地磁暴）会诱发电离层扰动，导致 GPS/北斗卫星定位产生数十米漂移、手持卫星通信终端（海事卫星/天通/inReach）丢包甚至中断。
 *  - 此时必须切换至传统磁罗盘 + 纸质地形图双重航位推算。
 */
export async function fetchGeomagnetic(_loc) {
  const url = 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json';
  const raw = await fetchJson(url);

  // NOAA 返回的是表头 + 数据数组：[["time_tag","Kp","a_running","station_count"], ...]
  const rows = Array.isArray(raw) ? raw.slice(1) : [];
  const validRows = rows.filter(r => r && r[1] != null);
  const latestRow = validRows[validRows.length - 1] || [];
  const latestTime = latestRow[0] || null;
  const latestKp = latestRow[1] != null ? parseFloat(latestRow[1]) : 0;

  // 统计最近 24 小时（约 8 个点）的最大 Kp
  const recent24h = validRows.slice(-8);
  const maxKp24h = recent24h.length
    ? Math.max(...recent24h.map(r => parseFloat(r[1]) || 0))
    : latestKp;

  let stormScale = 'G0 (Normal)';
  let level = 'low';
  const advice = [];

  if (maxKp24h >= 8) {
    stormScale = 'G4/G5 (Severe/Extreme)';
    level = 'extreme';
    advice.push('发生严重地磁暴！高频无线电与卫星通讯大概率中断，GPS/北斗单点定位误差显著增大');
    advice.push('严禁仅依靠手持 GPS 导航！强制启用物理指北针与 1:50000 纸质等高线地图校准航线');
  } else if (maxKp24h >= 6) {
    stormScale = 'G2/G3 (Moderate/Strong)';
    level = 'high';
    advice.push('发生中强地磁暴：卫星导航定位可能出现漂移，卫星求救信标呼叫可能延迟');
    advice.push('保持与后方基地定点守听通信，穿越复杂峡谷/冰川前校准磁偏角与物理地标');
  } else if (maxKp24h >= 5) {
    stormScale = 'G1 (Minor)';
    level = 'moderate';
    advice.push('轻度地磁暴（Kp=5）：卫星通讯偶发抖动，注意记录航迹关键转折点真实方位');
  } else {
    advice.push('地磁活动处于宁静状态，电离层稳定，GPS 与卫星通讯工作正常');
  }

  return {
    source: 'NOAA Space Weather Prediction Center (Planetary K-index)',
    data: {
      latestTimestamp: latestTime,
      currentKp: round(latestKp, 2),
      maxKp24h: round(maxKp24h, 2),
      noaaStormScale: stormScale
    },
    assessment: {
      level,
      summary: `当前地磁 Kp=${latestKp}，近 24h 峰值 Kp=${maxKp24h}（${stormScale}）`,
      advice
    }
  };
}
