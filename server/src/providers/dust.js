import { fetchJson, round } from '../lib/http.js';

/**
 * 沙尘暴与空气颗粒物威胁监测 —— Open-Meteo Air Quality API
 * 监测荒野下风向沙尘、PM10/PM2.5 及气溶胶光学厚度（AOD），评估能见度骤降与呼吸道窒息风险。
 */
export async function fetchDust(loc) {
  const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${loc.lat}&longitude=${loc.lon}` +
    `&current=dust,pm10,pm2_5,aerosol_optical_depth&hourly=dust,pm10&forecast_days=1&timezone=auto`;
  const a = await fetchJson(url);
  const c = a.current || {};
  const h = a.hourly || {};

  const dustList = (h.dust || []).filter(v => v != null);
  const maxDust24h = dustList.length ? Math.max(...dustList) : c.dust ?? 0;
  const currentDust = c.dust ?? 0;
  const currentPm10 = c.pm10 ?? 0;
  const currentPm25 = c.pm2_5 ?? 0;
  const aod = round(c.aerosol_optical_depth, 2);

  let level = 'low';
  const advice = [];
  if (currentDust >= 200 || maxDust24h >= 250 || currentPm10 >= 300) {
    level = 'extreme';
    advice.push('遭遇强沙尘暴/黑风暴：能见度极低（<50m），立即原地固定帐篷避风，戴防风沙护目镜与高密面巾，严防失散');
  } else if (currentDust >= 100 || maxDust24h >= 120 || currentPm10 >= 150) {
    level = 'high';
    advice.push('中重度扬沙沙尘：佩戴防尘面巾与护目镜，关闭电子设备舱门，减缓行进步频防沙尘迷眼');
  } else if (currentDust >= 40 || maxDust24h >= 50 || currentPm10 >= 80) {
    level = 'moderate';
    advice.push('轻度浮尘扬沙：注意呼吸道防护，定时清理帐篷拉链与光学镜头');
  } else {
    advice.push('空气洁净、沙尘指数低，能见度良好');
  }

  return {
    source: 'Open-Meteo Air Quality API',
    data: {
      timezone: a.timezone,
      current: {
        time: c.time,
        dustUgM3: round(currentDust, 1),
        pm10UgM3: round(currentPm10, 1),
        pm25UgM3: round(currentPm25, 1),
        aerosolOpticalDepth: aod
      },
      next24h: {
        maxDustUgM3: round(maxDust24h, 1)
      }
    },
    assessment: {
      level,
      summary: `实况沙尘 ${currentDust} μg/m³、PM10 ${currentPm10} μg/m³、AOD ${aod ?? '—'}；24h 最大沙尘 ${maxDust24h} μg/m³`,
      advice
    }
  };
}
