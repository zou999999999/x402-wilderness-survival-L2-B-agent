import { fetchJson, round } from '../lib/http.js';

/**
 * 国际外汇法币汇率服务 —— Frankfurter API
 * 提供美元兑主要法定货币（CNY/EUR/JPY/GBP）实时外汇中间牌价与兑换结算比率。
 */
export async function fetchForex(_query = {}) {
  const url = 'https://api.frankfurter.app/latest?from=USD&to=CNY,EUR,JPY,GBP';
  const res = await fetchJson(url);

  return {
    source: 'Frankfurter Financial API (ECB Reference Rates)',
    category: 'foreign_exchange',
    data: {
      base: res.base || 'USD',
      date: res.date,
      rates: {
        CNY: round(res.rates?.CNY, 4),
        EUR: round(res.rates?.EUR, 4),
        JPY: round(res.rates?.JPY, 2),
        GBP: round(res.rates?.GBP, 4)
      }
    },
    summary: `实时外汇中间牌价：1 USD = ${res.rates?.CNY} CNY / ${res.rates?.EUR} EUR / ${res.rates?.JPY} JPY / ${res.rates?.GBP} GBP`
  };
}

