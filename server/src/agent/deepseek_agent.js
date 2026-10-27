import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

import * as providers from '../providers/index.js';
import { API_CATALOG, getApiSkillSpecification } from '../config/catalog.js';

/**
 * 从本地独立文档 (API_SKILL.md) 动态加载技能规范
 * 实现业务通信代码与领域知识/提示词的 100% 物理文档解耦
 */
function loadApiSkillSpecification() {
  const skillPath = path.resolve(__dirname, '../config/API_SKILL.md');
  try {
    if (fs.existsSync(skillPath)) {
      return fs.readFileSync(skillPath, 'utf8');
    }
  } catch (err) {
    console.warn(`[Server Agent] 读取本地技能文档提示: ${err.message}，回退至内置配置`);
  }
  return getApiSkillSpecification();
}

/**
 * Level 2_b 服务端智能体 (Server-side DeepSeek Recon Broker Agent)
 *
 * 职责定位：
 * 作为常驻服务端的「极端环境生存决策参谋智能体」：
 * 1. 接收客户端高层探险诉求（经纬度、地貌类型、探险目标）；
 * 2. 驱动 DeepSeek 大模型执行意图理解与多 API 认知筛选，主动剔除无关噪音接口；
 * 3. 内部自动调度入选的核心生存微服务并发采集真实多源数据；
 * 4. 驱动 DeepSeek 大模型对全量遥感与传感器数据进行战地态势研判与终极生存裁决；
 * 5. 将大模型生成的完整决策方案打包交付给客户端，完成 x402 商业结算。
 * 
 * 架构纯粹性：
 * 移除所有硬编码规则树与模拟兜底，所有选路与研判均 100% 由 DeepSeek 智能体自主决策。
 */

function getDeepSeekConfig() {
  const apiKey = (process.env.DEEPSEEK_API_KEY || '').trim();
  const baseUrl = (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/+$/, '');
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

  if (!apiKey) {
    throw new Error('API无效: DEEPSEEK_API_KEY 未配置');
  }

  return { apiKey, baseUrl, model };
}

/**
 * 阶段 1：使用 DeepSeek 进行 API 意图甄别与数据服务筛选（无偏见客观 Skill 提示）
 */
async function filterApisWithDeepSeek(mission, catalog) {
  const { apiKey, baseUrl, model } = getDeepSeekConfig();

  console.log(`🤖 [Server Agent] 正在调用 DeepSeek (${model}) 执行 API 意图分析与自主选路研判...`);
  const apiSkillSpec = loadApiSkillSpecification();

  const systemPrompt = `你是一名专业级极端自然环境与野外探险生存安全决策参谋 AI。
探险队伍正在筹备一项野外探险任务：
- 任务名称: ${mission.name}
- 地理坐标: 纬度 ${mission.lat}, 经度 ${mission.lon}
- 探险性质: ${mission.profile}

【外部数据微服务能力库技能规范 (Skill: External API Toolset Specification)】:
${apiSkillSpec}

【参谋决策与选路要求】:
1. 请根据目标地点的地理区位、自然地貌、极端气候威胁与探险生存安全需求，逐一评估上述 11 个微服务数据源。
2. 做出严谨的决策过滤：自主判断哪些 API 能够为探险队的生存安全和战地行动提供实质支撑，哪些 API 与当前任务目标无关或缺乏应用价值。
3. 将真正有助于探险任务的 API 纳入批准调用列表 (approvedApiIds)，将无关或非必要的 API 纳入排除列表 (rejectedApiIds)。
4. 对每个被排除的 API，客观给出排除该项服务的具体逻辑依据；并给出整体选路策略概述。

请严格以 JSON 格式输出决策结果，结构如下：
{
  "approvedApiIds": ["<选择采纳的API_ID>", ...],
  "rejectedApiIds": ["<决定排除的API_ID>", ...],
  "reasoning": {
    "<被排除的API_ID>": "<具体的排除理由与关联度分析>",
    ...
  },
  "rationaleSummary": "<整体选路策略与裁决理由概述>"
}`;

  let res;
  try {
    res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You are an expert reconnaissance AI agent. Always reply in valid JSON.' },
          { role: 'user', content: systemPrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1
      }),
      signal: AbortSignal.timeout(20000)
    });
  } catch (err) {
    throw new Error('API无效');
  }

  if (!res.ok) {
    throw new Error('API无效');
  }

  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error('API无效');
  }

  const content = data.choices?.[0]?.message?.content || '{}';
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    try {
      const cleaned = content.replace(/^```json/m, '').replace(/^```/m, '').replace(/```$/m, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      throw new Error('API无效');
    }
  }

  console.log(`✨ [Server Agent] DeepSeek 认知推理与噪音甄别完成 (入选核心: ${parsed.approvedApiIds?.length} 个，拦截噪音: ${parsed.rejectedApiIds?.length} 个)`);

  return {
    source: 'DeepSeek-V3 / Chat Completion',
    model,
    approvedIds: parsed.approvedApiIds || [],
    rejectedIds: parsed.rejectedApiIds || [],
    rejectionReasons: parsed.reasoning || {},
    rationaleSummary: parsed.rationaleSummary || '经 DeepSeek 大模型分析完成选路与噪音拦截'
  };
}

/**
 * 阶段 2：服务端 Agent 并发内部调度入选的核心 API 采集多源数据
 */
async function dispatchInternalApis(approvedIds, mission) {
  const loc = { lat: mission.lat, lon: mission.lon, name: mission.name, source: 'mission_coordinates' };
  const collected = {};

  const fetchers = {
    earthquake: () => providers.fetchEarthquake(loc),
    storm: () => providers.fetchStorm(loc),
    flood: () => providers.fetchFlood(loc),
    terrain: () => providers.fetchTerrain(loc),
    dust: () => providers.fetchDust(loc),
    sunlight: () => providers.fetchSunlight(loc),
    geomagnetic: () => providers.fetchGeomagnetic(loc)
  };

  const tasks = approvedIds.filter(id => fetchers[id]).map(async id => {
    try {
      const data = await fetchers[id]();
      return { id, data };
    } catch (e) {
      console.error(`[Server Agent] 内部采集 ${id} 失败:`, e.message);
      return { id, data: { error: e.message } };
    }
  });

  const results = await Promise.all(tasks);
  for (const item of results) {
    collected[item.id] = item.data;
  }

  return collected;
}

/**
 * 阶段 3：驱动 DeepSeek 进行多源数据态势研判与终极生存裁决
 */
async function synthesizeSurvivalDirectives(mission, collected, filterResult) {
  const eq = collected.earthquake?.assessment || {};
  const storm = collected.storm?.assessment || {};
  const flood = collected.flood?.assessment || {};
  const terrain = collected.terrain?.assessment || {};
  const dust = collected.dust?.assessment || {};
  const sunlight = collected.sunlight?.assessment || {};
  const geo = collected.geomagnetic?.assessment || {};

  const diagnostics = {
    geologicalHazard: eq.summary || '无数据',
    stormColdHypothermia: storm.summary || '无数据',
    hydrologyFlood: flood.summary || '无数据',
    terrainSlopeAltitude: terrain.summary || '无数据',
    dustSandstormVisibility: dust.summary || '无数据',
    sunlightSurvivalWindow: sunlight.summary || '无数据',
    commsNavigationLifeline: geo.summary || '无数据'
  };

  const { apiKey, baseUrl, model } = getDeepSeekConfig();

  console.log(`🤖 [Server Agent] 正在调用 DeepSeek 进行多源环境态势融合与前线指挥决策...`);
  const prompt = `你是一名极端环境荒野求生战略参谋指挥官。
探险队伍正在执行任务：
- 目标：${mission.name} (${mission.lat}, ${mission.lon})
- 性质：${mission.profile}

以下是从 7 大核心生存与遥感微服务采集到的真实环境数据：
1. 近场地质监测: ${diagnostics.geologicalHazard}
2. 极端风暴气象: ${diagnostics.stormColdHypothermia}
3. 水文流域漫滩: ${diagnostics.hydrologyFlood}
4. 地形高程坡度: ${diagnostics.terrainSlopeAltitude}
5. 沙尘颗粒物: ${diagnostics.dustSandstormVisibility}
6. 日照天光窗口: ${diagnostics.sunlightSurvivalWindow}
7. 空间天气地磁: ${diagnostics.commsNavigationLifeline}

请基于上述综合态势研判，以严格 JSON 格式输出指挥部决策报告：
{
  "overallRisk": "HIGH", // 可选: LOW, MODERATE, HIGH, EXTREME
  "riskLabel": "🟠 高度危险 (HIGH)", // 格式: 图标 中文说明 (英文等级)
  "executiveSummary": "战地指挥官两到三句话的核心态势裁决与行军建议",
  "keyThreats": [
    "核心致命威胁1",
    "核心致命威胁2"
  ],
  "actionDirectives": [
    "行动禁令/指令1",
    "行动禁令/指令2",
    "行动禁令/指令3",
    "行动禁令/指令4"
  ]
}`;

  let res;
  try {
    res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You are an elite wilderness survival commander. Always reply in valid JSON.' },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2
      }),
      signal: AbortSignal.timeout(25000)
    });
  } catch (err) {
    throw new Error('API无效');
  }

  if (!res.ok) {
    throw new Error('API无效');
  }

  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error('API无效');
  }

  const content = data.choices?.[0]?.message?.content || '{}';
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    try {
      const cleaned = content.replace(/^```json/m, '').replace(/^```/m, '').replace(/```$/m, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      throw new Error('API无效');
    }
  }

  console.log(`✨ [Server Agent] DeepSeek 战略态势融合决策生成成功！综合评级: ${parsed.riskLabel || parsed.overallRisk}`);

  return {
    expeditionTarget: mission,
    synthesisTimestamp: new Date().toISOString(),
    overallRisk: parsed.overallRisk || 'MODERATE',
    riskLabel: parsed.riskLabel || '🟡 谨慎推进 (MODERATE)',
    executiveSummary: parsed.executiveSummary || '',
    keyThreats: parsed.keyThreats || [],
    filterMeta: {
      engine: filterResult.source,
      model: filterResult.model,
      selectedCount: filterResult.approvedIds.length,
      filteredNoiseCount: filterResult.rejectedIds.length,
      noiseRejectionReasons: filterResult.rejectionReasons,
      rationaleSummary: filterResult.rationaleSummary
    },
    dimensionDiagnostics: diagnostics,
    actionDirectives: parsed.actionDirectives || [],
    rawEnvironmentalData: collected
  };
}

/**
 * 服务端 Agent 主入口：端到端执行全流程
 */
export async function runServerAgent(missionQuery = {}) {
  const mission = {
    name: missionQuery.place || missionQuery.mission || missionQuery.city || '阿尔金山无人区',
    lat: parseFloat(missionQuery.lat || '38.0'),
    lon: parseFloat(missionQuery.lon || '88.5'),
    profile: missionQuery.profile || '极端荒野重装徒步穿越'
  };

  console.log(`\n=================================================================`);
  console.log(`🤖 [Server Agent] 服务端探险参谋智能体开始处理探险咨询任务`);
  console.log(`🎯 目标: ${mission.name} (${mission.lat}, ${mission.lon})`);
  console.log(`=================================================================`);

  // 1. DeepSeek 认知筛选与噪音过滤
  const filterResult = await filterApisWithDeepSeek(mission, API_CATALOG);

  // 2. 并发批量调用真实环境数据
  console.log(`⚡ [Server Agent] 正在并发采集 ${filterResult.approvedIds.length} 个入选核心服务...`);
  const collected = await dispatchInternalApis(filterResult.approvedIds, mission);

  // 3. DeepSeek 终极态势融合与生成行动禁令
  console.log(`🛡️  [Server Agent] 正在交由 DeepSeek 生成多源灾害融合决策与生存裁决...`);
  const decisionReport = await synthesizeSurvivalDirectives(mission, collected, filterResult);

  console.log(`✅ [Server Agent] 任务处置完毕，综合评级: ${decisionReport.riskLabel}`);
  console.log(`=================================================================\n`);

  return decisionReport;
}
