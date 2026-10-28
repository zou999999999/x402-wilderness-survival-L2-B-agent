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
 * 保持业务通信代码与中立无剧透领域知识的 100% 物理文档解耦
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
 * 阶段 1：使用 DeepSeek 进行任务驱动自主选路研判（无偏见、零剧透中立 Skill）
 * 绝不向模型透露或预设“哪个必须选、哪个必须拒”，由模型依据任务具体目标自主裁决
 */
async function filterApisWithDeepSeek(mission, catalog) {
  const { apiKey, baseUrl, model } = getDeepSeekConfig();

  console.log(`🤖 [Server Agent] 正在调用 DeepSeek (${model}) 结合客观 Skill 规范执行任务驱动选路研判...`);
  const apiSkillSpec = loadApiSkillSpecification();

  const systemPrompt = `你是一名负责任务资源统筹与外部数据调度的专业参谋智能体 (Recon Broker Agent)。
你接收到以下具体任务委托：
- 任务名称: ${mission.name}
- 任务目标与性质: ${mission.profile}
- 地理坐标: 纬度 ${mission.lat}, 经度 ${mission.lon}

【外部可用微服务能力目录规范 (Skill: Available Microservices Catalog)】:
${apiSkillSpec}

【自主调度与选路决策要求】:
1. 【任务强因果关联分析】：请根据上述任务的具体目标、行动性质及所在地理环境，逐一评估上述 11 个微服务的数据能力与指标。
2. 【按需选路与预算经济性】：每个微服务端口调用均需消耗 0.001 USDC 链上微支付成本。你必须只挑选对“完成当前任务目标及确保行动安全”有实质帮助的服务端口，将其纳入 approvedApiIds；坚决排除对当前任务缺乏直接因果关联、无关或冗余的服务，将其纳入 rejectedApiIds，并阐明排除的具体逻辑依据。
3. 【输出格式】：严格以有效 JSON 格式输出决策结果：
{
  "approvedApiIds": ["<采纳的API_ID>", ...],
  "rejectedApiIds": ["<排除的API_ID>", ...],
  "reasoning": {
    "<API_ID>": "<具体入选或排除理由>"
  },
  "rationaleSummary": "<整体选路策略与裁决概述>"
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
          { role: 'system', content: 'You are an expert reconnaissance AI agent. Always reply in strict JSON.' },
          { role: 'user', content: systemPrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1
      }),
      signal: AbortSignal.timeout(20000)
    });
  } catch (err) {
    throw new Error(`DeepSeek 选路接口网络异常: ${err.message}`);
  }

  if (!res.ok) {
    throw new Error(`DeepSeek 选路返回异常: HTTP ${res.status}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || '{}';
  const cleaned = content.replace(/^```json/m, '').replace(/^```/m, '').replace(/```$/m, '').trim();
  const parsed = JSON.parse(cleaned);

  console.log(`✨ [Server Agent] DeepSeek 任务驱动选路完成 (入选: ${parsed.approvedApiIds?.length} 个，自主排除: ${parsed.rejectedApiIds?.length} 个)`);

  return {
    source: 'DeepSeek-V3 / Chat Completion',
    model,
    approvedIds: parsed.approvedApiIds || [],
    rejectedIds: parsed.rejectedApiIds || [],
    rejectionReasons: parsed.reasoning || {},
    rationaleSummary: parsed.rationaleSummary || '经大模型分析完成按需选路'
  };
}

/**
 * 阶段 2：服务端 Agent 并发内部调度入选的微服务（覆盖全部 11 种微服务驱动）
 */
async function dispatchInternalApis(approvedIds, mission) {
  const loc = { lat: mission.lat, lon: mission.lon, name: mission.name, source: 'mission_coordinates' };

  const fetchers = {
    earthquake: () => providers.fetchEarthquake(loc),
    storm: () => providers.fetchStorm(loc),
    flood: () => providers.fetchFlood(loc),
    terrain: () => providers.fetchTerrain(loc),
    dust: () => providers.fetchDust(loc),
    sunlight: () => providers.fetchSunlight(loc),
    geomagnetic: () => providers.fetchGeomagnetic(loc),
    forex: () => providers.fetchForex(loc),
    catfact: () => providers.fetchCatFact(loc),
    crypto: () => providers.fetchCrypto(loc),
    iss: () => providers.fetchIss(loc)
  };

  const tasks = approvedIds.filter(id => fetchers[id]).map(async id => {
    try {
      const data = await fetchers[id]();
      return { id, success: true, data };
    } catch (e) {
      console.error(`[Server Agent] 内部采集 ${id} 失败:`, e.message);
      return { id, success: false, error: e.message };
    }
  });

  const results = await Promise.all(tasks);
  return results;
}

/**
 * 阶段 3：多源数据态势综合研判与决策裁决
 * 严守【数据完整性与防伪报告红线】：
 * 1. 若有效遥测数据全盘为 0，绝对禁止调用大模型脑补，直接熔断触发 DATA_DEFICIENT 避险警报；
 * 2. 若存在部分端点缺失，强制为大模型注入盲区红线约束，综合评级审慎上调，严禁粉饰为正常报告！
 */
export async function synthesizeSurvivalDirectives(mission, results, filterResult) {
  const totalPlanned = filterResult.approvedIds.length;
  const successItems = results.filter(r => r.success);
  const failedItems = results.filter(r => !r.success);
  const successCount = successItems.length;
  const failedCount = failedItems.length;
  const completenessRate = Math.round((successCount / (totalPlanned || 1)) * 100);

  // ------------------------------------------------------------------------
  // 🛑 核心防线 1：全盘失败绝对熔断（成功数 = 0 时，绝不调用大模型臆造假研判）
  // ------------------------------------------------------------------------
  if (successCount === 0) {
    console.warn(`🚨 [Server Agent] 数据完备率为 0%，触发全盘熔断机制，拒绝大模型脑补假正常报告！`);
    return {
      expeditionTarget: mission,
      synthesisTimestamp: new Date().toISOString(),
      overallRisk: 'CRITICAL_DATA_DEFICIENCY',
      riskLabel: '⚠️ 致命情报盲区 (DATA_DEFICIENT)',
      dataCompletenessRate: '0%',
      isDegraded: true,
      hasBlindSpots: true,
      executiveSummary: `【最高避险禁令】规划调用的 ${totalPlanned} 项微服务全部采集失败（数据完备率 0%）。现场处于完全未知的致命情报盲区！在极端自然环境与战术行动中，没有数据绝不代表安全。严禁在无真实遥测数据的情况下假定安全或强行推进！`,
      keyThreats: [
        '【特级盲区】外部传感器通信全盘中断，现场真实物理环境完全不可知',
        '缺乏风暴、地貌、地质等一切数据支撑，盲目行动极易遭遇未预警致命灾害'
      ],
      actionDirectives: [
        '1. 【全线就地中止】探险队立即暂停向未知区域推进，在当前已知安全区就地设防待命；',
        '2. 【排查通信生命线】检查本地卫星信标、通信网络与外部服务链接状态；',
        '3. 【启动离线预案】切换至物理指北针、预存纸质地形图及团队预设紧急联络方案；',
        '4. 【保持最高警戒】严禁将零数据误判为安全，直至遥测链路恢复前维持最高戒备。'
      ],
      filterMeta: {
        engine: filterResult.source,
        model: filterResult.model,
        selectedCount: filterResult.approvedIds.length,
        filteredCount: filterResult.rejectedIds.length,
        noiseRejectionReasons: filterResult.rejectionReasons,
        rationaleSummary: filterResult.rationaleSummary
      },
      dataBlindSpots: failedItems.map(f => ({ id: f.id, error: f.error })),
      diagnosticsList: results.map(r => ({
        id: r.id,
        status: r.success ? 'SUCCESS' : 'FAILED',
        summary: r.success ? (r.data?.assessment?.summary || '数据已采集') : `❌ 采集失败 (${r.error || '未响应'})`
      })),
      rawEnvironmentalData: results
    };
  }

  // ------------------------------------------------------------------------
  // 核心防线 2：存在部分缺失时的“防伪紧箍咒”Prompt
  // ------------------------------------------------------------------------
  const isDegraded = failedCount > 0;
  const failedSummary = failedItems.map(f => `${f.id} (${f.error || '未响应'})`).join('、');

  const telemetryLines = [];
  const diagnosticsList = [];
  const collectedMap = {};

  for (const item of results) {
    if (item.success) {
      const summary = item.data?.assessment?.summary || JSON.stringify(item.data).slice(0, 100);
      telemetryLines.push(`- 【${item.id}】: ${summary}`);
      diagnosticsList.push({ id: item.id, status: 'SUCCESS', summary });
      collectedMap[item.id] = item.data;
    } else {
      telemetryLines.push(`- 【${item.id}】: ❌ 采集失败 (${item.error || '未响应'}) -> ⚠️ 形成情报盲区`);
      diagnosticsList.push({ id: item.id, status: 'FAILED', summary: `❌ 采集失败 (${item.error || '未响应'})` });
      collectedMap[item.id] = { error: item.error };
    }
  }

  const { apiKey, baseUrl, model } = getDeepSeekConfig();
  console.log(`🤖 [Server Agent] 正在调用 DeepSeek 进行多源环境态势融合与裁决 (完备率: ${completenessRate}%)...`);

  let systemDirective = `你是一名极端环境荒野求生战略参谋指挥官。
探险队伍正在执行任务：
- 目标：${mission.name} (${mission.lat}, ${mission.lon})
- 性质：${mission.profile}

以下是从入选微服务采集到的真实环境数据：
${telemetryLines.join('\n')}
`;

  if (isDegraded) {
    systemDirective += `
【🚨 关键警示：本次研判存在部分微服务数据缺失！】
以下数据源采集失败，现场遥测存在情报盲区：${failedSummary}。
【参谋长防伪报告铁律】：
1. 严禁凭空脑补或臆测上述缺失端点的具体数据！严禁生成掩盖缺失情况的“表面正常报告”！
2. 必须在 executiveSummary 中首句明确警示“当前研判处于部分遥测缺失的降级状态”；
3. 必须在 keyThreats 的第 1 条显式将“【情报盲区】对应数据缺失导致的不确定性风险”列为核心致命威胁；
4. 必须在 actionDirectives 中给出针对缺失维度的停步观察与被动防御指令；
5. 综合风险评级（overallRisk）必须因情报盲区带来的高度不确定性而审慎上调（绝不能在核心遥测缺失时评定为 LOW 或草率给出安全通行建议）！
`;
  }

  systemDirective += `
请基于上述真实遥测情况，以严格 JSON 格式输出指挥部决策报告：
{
  "overallRisk": "${isDegraded ? 'HIGH' : 'MODERATE'}", // 可选: LOW, MODERATE, HIGH, EXTREME, DATA_DEFICIENT
  "riskLabel": "图标 中文说明 (英文等级)",
  "executiveSummary": "战地指挥官两到三句话的核心态势裁决与行军建议（若有盲区必须首句警示）",
  "keyThreats": [
    "核心威胁1",
    "核心威胁2"
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
          { role: 'user', content: systemDirective }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1
      }),
      signal: AbortSignal.timeout(25000)
    });
  } catch (err) {
    throw new Error(`DeepSeek 决策研判接口异常: ${err.message}`);
  }

  if (!res.ok) {
    throw new Error(`DeepSeek 决策研判返回异常: HTTP ${res.status}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || '{}';
  const cleaned = content.replace(/^```json/m, '').replace(/^```/m, '').replace(/```$/m, '').trim();
  const parsed = JSON.parse(cleaned);

  console.log(`✨ [Server Agent] DeepSeek 战略态势融合决策生成成功！综合评级: ${parsed.riskLabel || parsed.overallRisk}`);

  return {
    expeditionTarget: mission,
    synthesisTimestamp: new Date().toISOString(),
    overallRisk: parsed.overallRisk || (isDegraded ? 'HIGH' : 'MODERATE'),
    riskLabel: parsed.riskLabel || (isDegraded ? '🟠 降级高度危险 (HIGH)' : '🟡 谨慎推进 (MODERATE)'),
    dataCompletenessRate: `${completenessRate}%`,
    isDegraded,
    hasBlindSpots: isDegraded,
    executiveSummary: parsed.executiveSummary || '',
    keyThreats: parsed.keyThreats || [],
    filterMeta: {
      engine: filterResult.source,
      model: filterResult.model,
      selectedCount: filterResult.approvedIds.length,
      filteredCount: filterResult.rejectedIds.length,
      noiseRejectionReasons: filterResult.rejectionReasons,
      rationaleSummary: filterResult.rationaleSummary
    },
    dataBlindSpots: failedItems.map(f => ({ id: f.id, error: f.error })),
    diagnosticsList,
    actionDirectives: parsed.actionDirectives || [],
    rawEnvironmentalData: collectedMap
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
  console.log(`🧗 任务性质: ${mission.profile}`);
  console.log(`=================================================================`);

  // 1. DeepSeek 依据中立 Skill 进行自主选路
  const filterResult = await filterApisWithDeepSeek(mission, API_CATALOG);

  // 2. 并发批量调用真实环境数据
  console.log(`⚡ [Server Agent] 正在内部调度 ${filterResult.approvedIds.length} 个入选服务...`);
  const results = await dispatchInternalApis(filterResult.approvedIds, mission);

  // 3. DeepSeek 终极态势融合与生成行动禁令 (内置数据完备性熔断防线)
  console.log(`🛡️  [Server Agent] 正在进行多源灾害融合决策与生存裁决...`);
  const decisionReport = await synthesizeSurvivalDirectives(mission, results, filterResult);

  console.log(`✅ [Server Agent] 任务处置完毕，综合评级: ${decisionReport.riskLabel}`);
  console.log(`=================================================================\n`);

  return decisionReport;
}
