import { fetchJson, round } from '../lib/http.js';

/**
 * 加密数字货币现货行情服务 —— CoinGecko Simple Price API
 * 提供主流加密资产（BTC / ETH 等）在公开交易所的实时现货交易均价与 24h 涨跌行情。
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
    summary: `主流加密资产现货行情：BTC = $${btc ?? '—'}，ETH = $${eth ?? '—'}`
  };
}

