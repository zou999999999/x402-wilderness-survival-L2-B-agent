import { fetchJson, round } from '../lib/http.js';

/**
 * 加密货币现货行情服务 —— CoinGecko Simple Price API
 * 【噪音干扰端点 3 / 4】：提供比特币与以太坊的美元现货行情。
 * 决策判定：二级市场代币波动行情，与荒野脱困、避灾求生与地理勘察零相关，属于金融投机干扰数据。
 */
export async function fetchCrypto(_query = {}) {
  const url = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd';
  const res = await fetchJson(url);

  const btc = res.bitcoin?.usd;
  const eth = res.ethereum?.usd;

  return {
    source: 'CoinGecko Crypto API',
    category: 'cryptocurrency',
    data: {
      bitcoinUsd: round(btc, 2),
      ethereumUsd: round(eth, 2)
    },
    assessment: {
      level: 'irrelevant',
      summary: `加密资产行情：BTC = $${btc ?? '—'}，ETH = $${eth ?? '—'}`,
      advice: [
        '【噪音信号识别】加密资产二级市场行情与野外地质水文、极端温差、暴雪沙尘等生死决策无任何因果链条。',
        'Agent 决策逻辑应将其识别为噪音干扰项，避免浪费链上 micro-USDC 付款预算。'
      ]
    }
  };
}
