import { fetchJson, round } from '../lib/http.js';

/**
 * 极端风暴与低温监测 —— Open-Meteo Forecast API
 * 实况风速/阵风/气温/降水 + 未来 24 小时最大阵风与累计降水。
 */
export async function fetchStorm(loc) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}` +
    `&current=temperature_2m,apparent_temperature,wind_speed_10m,wind_gusts_10m,precipitation,weather_code` +
    `&hourly=wind_gusts_10m,precipitation,temperature_2m&forecast_hours=24&wind_speed_unit=ms&timezone=auto`;
  const w = await fetchJson(url);
  const c = w.current || {};
  const h = w.hourly || {};

  const gusts = (h.wind_gusts_10m || []).filter(v => v != null);
  const precs = (h.precipitation || []).filter(v => v != null);
  const temps = (h.temperature_2m || []).filter(v => v != null);
  const maxGust24h = gusts.length ? Math.max(...gusts) : c.wind_gusts_10m;
  const precip24h = round(precs.reduce((a, b) => a + b, 0), 1);
  const minTemp24h = temps.length ? Math.min(...temps) : c.temperature_2m;

  let level = 'low';
  const advice = [];
  if (maxGust24h >= 24.5 || precip24h >= 50) level = 'extreme';
  else if (maxGust24h >= 17.2 || precip24h >= 25) level = 'high';
  else if (maxGust24h >= 10.8 || precip24h >= 10 || minTemp24h <= -10) level = 'moderate';

  if (maxGust24h >= 17.2) advice.push(`未来 24h 最大阵风 ${maxGust24h} m/s（≥8 级），加固帐篷或转移至背风岩壁/洼地`);
  if (precip24h >= 25) advice.push(`未来 24h 累计降水 ${precip24h} mm，警惕山洪与泥石流，禁止沟谷扎营`);
  if (minTemp24h <= 0) advice.push(`未来 24h 最低气温 ${minTemp24h}°C，夜间失温风险，保持衣物干燥并补充热量`);
  if (!advice.length) advice.push('风雨条件平稳，可按计划行进');

  return {
    source: 'Open-Meteo Forecast',
    data: {
      timezone: w.timezone,
      current: {
        time: c.time,
        temperatureC: c.temperature_2m,
        apparentTemperatureC: c.apparent_temperature,
        windSpeedMs: c.wind_speed_10m,
        windGustMs: c.wind_gusts_10m,
        precipitationMm: c.precipitation,
        weatherCode: c.weather_code
      },
      next24h: { maxGustMs: maxGust24h, precipitationMm: precip24h, minTemperatureC: minTemp24h }
    },
    assessment: {
      level,
      summary: `实况 ${c.temperature_2m}°C、风 ${c.wind_speed_10m} m/s（阵风 ${c.wind_gusts_10m}）；24h 最大阵风 ${maxGust24h} m/s、累计降水 ${precip24h} mm、最低 ${minTemp24h}°C`,
      advice
    }
  };
}
