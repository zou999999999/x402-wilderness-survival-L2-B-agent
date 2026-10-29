import { fetchJson } from '../lib/http.js';

/**
 * 猫科生物学科普事实服务 —— Cat Facts Ninja API
 * 提供猫科动物生物学解剖特征、生活生理习性与驯化历史科学知识。
 */
export async function fetchCatFact(_query = {}) {
  const url = 'https://catfact.ninja/fact';
  const res = await fetchJson(url);

  return {
    source: 'Cat Facts Ninja API',
    category: 'zoology_facts',
    data: {
      fact: res.fact,
      length: res.length
    },
    summary: `猫科生物学特征与习性事实：${res.fact}`
  };
}

