import { fetchJson, round } from '../lib/http.js';

/**
 * 河流洪涝与山洪风险 —— Open-Meteo Flood API (GloFAS)
 * 未来 7 天河道流量 vs 历史中位数，判断涨水/漫滩风险。
 */
export async function fetchFlood(loc) {
  const url = `https://flood-api.open-meteo.com/v1/flood?latitude=${loc.lat}&longitude=${loc.lon}` +
    `&daily=river_discharge,river_discharge_median,river_discharge_max&forecast_days=7`;
  const f = await fetchJson(url);
  const d = f.daily || {};
  const days = (d.time || []).map((t, i) => ({
    date: t,
    dischargeM3s: d.river_discharge?.[i] ?? null,
    medianM3s: d.river_discharge_median?.[i] ?? null
  }));

  const valid = days.filter(x => x.dischargeM3s != null);
  const peak = valid.reduce((m, x) => (!m || x.dischargeM3s > m.dischargeM3s ? x : m), null);
  const noRiver = !peak || valid.every(x => x.dischargeM3s === 0);

  let level = 'low';
  let ratio = null;
  const advice = [];
  if (noRiver) {
    advice.push('GloFAS 网格内无显著河道径流（干旱区/无河网），大河洪水风险低；但局地暴雨仍可形成沟谷山洪');
  } else {
    ratio = peak.medianM3s > 0 ? round(peak.dischargeM3s / peak.medianM3s, 2) : null;
    if (ratio != null && ratio >= 3) level = 'high';
    else if (ratio != null && ratio >= 1.5) level = 'moderate';
    if (level !== 'low') {
      advice.push(`预计 ${peak.date} 流量达中位数的 ${ratio} 倍，禁止涉水渡河，营地需高出河床 5m 以上`);
    } else {
      advice.push('河道流量处于常态区间，渡河前仍需目测水色与流速');
    }
  }

  return {
    source: 'Open-Meteo Flood API (GloFAS)',
    data: { forecastDays: days.length, peak, peakToMedianRatio: ratio, riverDetected: !noRiver, daily: days },
    assessment: {
      level,
      summary: noRiver
        ? '7 天内网格河道流量为 0，未检测到可漫滩的河流'
        : `7 天峰值流量 ${peak.dischargeM3s} m³/s（${peak.date}），为中位数的 ${ratio ?? '—'} 倍`,
      advice
    }
  };
}
