import { fetchJson, HttpError, round } from './http.js';

/**
 * 解析请求中的位置：优先 lat/lon，其次 city（Open-Meteo 地理编码，免 Key）。
 * 参数非法时抛 400 —— 付费请求会因此被取消结算。
 */
export async function resolveLocation(query = {}) {
  const lat = parseFloat(query.lat);
  const lon = parseFloat(query.lon);

  if (Number.isFinite(lat) && Number.isFinite(lon)) {
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      throw new HttpError('经纬度越界：lat ∈ [-90, 90]，lon ∈ [-180, 180]', 400);
    }
    return { lat: round(lat, 4), lon: round(lon, 4), name: query.place || null, source: 'coordinates' };
  }

  if (query.city) {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query.city)}&count=1&language=zh&format=json`;
    const geo = await fetchJson(url);
    const hit = geo.results?.[0];
    if (!hit) throw new HttpError(`无法解析地名 "${query.city}"，请改用 lat/lon`, 400);
    return {
      lat: round(hit.latitude, 4),
      lon: round(hit.longitude, 4),
      name: `${hit.name}${hit.admin1 ? ' · ' + hit.admin1 : ''}${hit.country ? ' · ' + hit.country : ''}`,
      source: 'geocoding'
    };
  }

  throw new HttpError('缺少位置参数：请提供 lat 与 lon（或 city）', 400);
}
