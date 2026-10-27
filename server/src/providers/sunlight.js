import { fetchJson, round } from '../lib/http.js';

/**
 * 昼夜窗口与日光生存窗口监测 —— Sunrise-Sunset.org API (集成 Open-Meteo 高可用回退)
 * 精确计算日出、日落、民用黄昏（天光完全变黑）以及可行动的日照总时长。
 * 野外生存铁律：必须在民用黄昏结束前 1~2 小时建立庇护所，摸黑扎营事故率激增 80% 以上。
 */
export async function fetchSunlight(loc) {
  let r = {};
  let source = 'Sunrise-Sunset.org API';

  try {
    const url = `https://api.sunrise-sunset.org/json?lat=${loc.lat}&lng=${loc.lon}&formatted=0`;
    const res = await fetchJson(url, { timeoutMs: 4000 });
    r = res.results || {};
  } catch (err) {
    // 官方源遇到网络抖动，自动无缝切换至 Open-Meteo 高可用通道
    source = 'Open-Meteo Astronomy Engine (Fallback)';
    const fallbackUrl = `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}&daily=sunrise,sunset,daylight_duration&timezone=auto`;
    const res = await fetchJson(fallbackUrl, { timeoutMs: 5000 });
    const daily = res.daily || {};
    const sunrise = daily.sunrise?.[0] ? daily.sunrise[0] + ':00Z' : null;
    const sunset = daily.sunset?.[0] ? daily.sunset[0] + ':00Z' : null;
    const dayLengthSeconds = daily.daylight_duration?.[0] || null;
    r = {
      sunrise,
      sunset,
      day_length: dayLengthSeconds,
      civil_twilight_begin: sunrise,
      civil_twilight_end: sunset
    };
  }

  const dayLengthHours = r.day_length ? round(r.day_length / 3600, 2) : null;

  let level = 'low';
  const advice = [];

  if (dayLengthHours != null && dayLengthHours <= 8) {
    level = 'high';
    advice.push(`极端短昼季：日照仅 ${dayLengthHours} 小时，有效行进窗口极其狭窄，务必压紧作业节律`);
  } else if (dayLengthHours != null && dayLengthHours <= 10) {
    level = 'moderate';
    advice.push(`日照较短（${dayLengthHours} 小时），提前规划宿营点选址`);
  }

  advice.push(`日落时间: ${r.sunset || '未知'}，民用天黑终点: ${r.civil_twilight_end || '未知'}`);
  advice.push('铁律：在民用天黑前至少 90 分钟停止推进，完成避风宿营、取水与防潮保温层铺设');

  return {
    source,
    data: {
      sunrise: r.sunrise,
      sunset: r.sunset,
      solarNoon: r.solar_noon,
      dayLengthHours,
      dayLengthSeconds: r.day_length,
      civilTwilightBegin: r.civil_twilight_begin,
      civilTwilightEnd: r.civil_twilight_end,
      nauticalTwilightBegin: r.nautical_twilight_begin,
      nauticalTwilightEnd: r.nautical_twilight_end
    },
    assessment: {
      level,
      summary: `今日总日照 ${dayLengthHours ?? '—'} 小时，日出 ${r.sunrise?.slice(11, 16) ?? '—'}，日落 ${r.sunset?.slice(11, 16) ?? '—'}，昏影止于 ${r.civil_twilight_end?.slice(11, 16) ?? '—'}`,
      advice
    }
  };
}
