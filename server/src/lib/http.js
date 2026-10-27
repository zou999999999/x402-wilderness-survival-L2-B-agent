/**
 * 上游 HTTP 工具：统一超时、UA 与错误语义
 * 任何上游失败都抛出带 status 的错误 → 路由返回 ≥400 → x402 中间件取消结算（不扣用户的钱）。
 */
const UA = 'x402-survival-recon/1.0 (+https://github.com/zou999999999)';

export class HttpError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.status = status;
  }
}

export async function fetchJson(url, { timeoutMs = 15000 } = {}) {
  const host = new URL(url).host;
  let res;
  try {
    res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      signal: AbortSignal.timeout(timeoutMs)
    });
  } catch (err) {
    throw new HttpError(`上游 ${host} 无法连接: ${err.message}`, 504);
  }
  if (!res.ok) {
    throw new HttpError(`上游 ${host} 返回 HTTP ${res.status}`, 502);
  }
  return res.json();
}

/** 海伦公式计算两点球面距离（km） */
export function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = d => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export const round = (n, d = 2) => (n == null || Number.isNaN(n) ? null : Math.round(n * 10 ** d) / 10 ** d);
