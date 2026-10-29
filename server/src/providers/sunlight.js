import { fetchJson, round } from '../lib/http.js';

/**
 * 昼夜窗口与日光生存窗口监测 —— Sunrise-Sunset.org API
 * 精确计算日出、日落、民用黄昏（天光完全变黑）以及可行动的日照总时长。
 * 野外生存铁律：必须在民用黄昏结束前 1~2 小时建立庇护所，摸黑扎营事故率激增 80% 以上。
 */
export async function fetchSunlight(loc) {
  const url = `https://api.sunrise-sunset.org/json?lat=${loc.lat}&lng=${loc.lon}&formatted=0`;
  const res = await fetchJson(url);
  const r = res.results || {};

  const dayLengthHours = r.day_length ? round(r.day_length / 3600, 2) : null;
  const now = Date.now();
  const sunsetTs = r.sunset ? new Date(r.sunset).getTime() : null;
  const twilightEndTs = r.civil_twilight_end ? new Date(r.civil_twilight_end).getTime() : null;

  let level = 'low';
  const advice = [];

  if (dayLengthHours != null && dayLengthHours <= 8) {
    level = 'high';
    advice.push(`极端短昼季：日照仅 ${dayLengthHours} 小时，有效行进窗口极其狭窄，务必压紧作业节律`);
  } else if (dayLengthHours != null && dayLengthHours <= 10) {
    level = 'moderate';
    advice.push(`日照较短（${dayLengthHours} 小时），提前规划宿营点选址`);
  }

  advice.push(`日落时间: ${r.sunset}，民用天黑终点: ${r.civil_twilight_end}`);
  advice.push('铁律：在民用天黑前至少 90 分钟停止推进，完成避风宿营、取水与防潮保温层铺设');

  return {
    source: 'Sunrise-Sunset.org API',
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
      summary: `今日总日照 ${dayLengthHours ?? '—'} 小时，日出 ${r.sunrise?.slice(11, 19) ?? '—'}，日落 ${r.sunset?.slice(11, 19) ?? '—'}，民用昏影止于 ${r.civil_twilight_end?.slice(11, 19) ?? '—'}`,
      advice
    }
  };
}
