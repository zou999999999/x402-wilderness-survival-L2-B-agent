import { fetchJson, haversineKm, round } from '../lib/http.js';

/**
 * 近场地震活动监测 —— USGS Earthquake Hazards Program (FDSN Event API)
 * 查询目标点 500km 半径内、过去 7 天 M2.5+ 地震，评估余震/落石/崩塌风险。
 */
export async function fetchEarthquake(loc) {
  const radiusKm = 500;
  const start = new Date(Date.now() - 7 * 86400e3).toISOString().slice(0, 10);
  const url = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&latitude=${loc.lat}&longitude=${loc.lon}` +
    `&maxradiuskm=${radiusKm}&starttime=${start}&minmagnitude=2.5&orderby=time&limit=50`;
  const geo = await fetchJson(url, { timeoutMs: 20000 });

  const events = (geo.features || []).map(f => {
    const [eLon, eLat, depth] = f.geometry.coordinates;
    return {
      magnitude: f.properties.mag,
      place: f.properties.place,
      time: new Date(f.properties.time).toISOString(),
      depthKm: round(depth, 1),
      distanceKm: round(haversineKm(loc.lat, loc.lon, eLat, eLon), 1)
    };
  });

  const strongest = events.reduce((m, e) => (!m || e.magnitude > m.magnitude ? e : m), null);
  const nearest = events.reduce((m, e) => (!m || e.distanceKm < m.distanceKm ? e : m), null);

  let level = 'low';
  const advice = [];
  if (strongest) {
    const m = strongest.magnitude;
    const d = strongest.distanceKm;
    if ((m >= 6 && d <= 300) || (m >= 5 && d <= 100)) level = 'high';
    else if (m >= 5 || (m >= 4 && d <= 100)) level = 'moderate';
  }
  if (level !== 'low') {
    advice.push('远离陡崖、碎石坡与悬垂岩体，余震可能诱发落石和崩塌');
    advice.push('宿营点选择开阔平坦地带，避开河谷两侧松散堆积体');
  } else {
    advice.push('近 7 天周边无显著地震活动，地震不是当前主要威胁');
  }

  return {
    source: 'USGS Earthquake Hazards Program',
    data: {
      windowDays: 7,
      radiusKm,
      eventCount: events.length,
      strongest,
      nearest,
      recent: events.slice(0, 5)
    },
    assessment: {
      level,
      summary: strongest
        ? `7 天内 ${radiusKm}km 内共 ${events.length} 次 M2.5+ 地震，最强 M${strongest.magnitude}（距 ${strongest.distanceKm}km，${strongest.place}）`
        : `7 天内 ${radiusKm}km 内无 M2.5+ 地震记录`,
      advice
    }
  };
}
