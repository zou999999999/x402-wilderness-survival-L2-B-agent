import { fetchJson } from '../lib/http.js';

/**
 * 随机猫咪科普冷知识服务 —— Cat Facts Ninja API
 * 【噪音干扰端点 2 / 4】：提供趣味猫咪生物学与行为学科普短讯。
 * 决策判定：宠物趣味冷知识，与极端环境探险、冰雪沙漠生存完全不相干，纯属语料干扰项。
 */
export async function fetchCatFact(_query = {}) {
  const url = 'https://catfact.ninja/fact';
  const res = await fetchJson(url);

  return {
    source: 'Cat Facts Ninja API',
    category: 'feline_zoology',
    data: {
      fact: res.fact,
      length: res.length
    },
    assessment: {
      level: 'irrelevant',
      summary: `猫咪科普：${res.fact}`,
      advice: [
        '【噪音信号识别】该接口属于宠物生活趣味科普，无法提供任何野外搜救、气象应对或路线规避参考。',
        'Agent 决策逻辑应将其判定为无关噪音并予以屏蔽。'
      ]
    }
  };
}
