import { fetchJson, round } from '../lib/http.js';

/**
 * 国际外汇法币汇率服务 —— Frankfurter API
 * 【噪音干扰端点 1 / 4】：提供美元兑主要法定货币（CNY/EUR/JPY）牌价。
 * 决策判定：纯金融外汇数据，与荒野探险、野外求生与极端气候决策毫无因果关联，Agent 决策层应将其作为无效噪音过滤。
 */
export async function fetchForex(_query = {}) {
  const url = 'https://api.frankfurter.app/latest?from=USD&to=CNY,EUR,JPY';
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
        JPY: round(res.rates?.JPY, 2)
      }
    },
    assessment: {
      level: 'irrelevant',
      summary: `法币汇率：1 USD = ${res.rates?.CNY} CNY / ${res.rates?.EUR} EUR / ${res.rates?.JPY} JPY`,
      advice: [
        '【噪音信号识别】该数据属于宏观金融范畴，对野外失温、山洪、滑坡、断粮与导航失联等生存危机无任何指导价值。',
        '建议 Agent 调度器在野外生存决策场景下剔除该接口，节省 x402 资金。'
      ]
    }
  };
}
