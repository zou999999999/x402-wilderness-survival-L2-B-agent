import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { API_CATALOG } from '../config/catalog.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

const SKILL_FILE = path.resolve(__dirname, '../config/SKILL.md');

function loadSkillSpec() {
  try {
    if (fs.existsSync(SKILL_FILE)) {
      return fs.readFileSync(SKILL_FILE, 'utf8');
    }
  } catch {}
  return JSON.stringify(API_CATALOG, null, 2);
}

/**
 * 云端 DeepSeek 智能微服务选路参谋
 * 纯粹由 DeepSeek 官方大模型驱动，输出 API 选路结果与决策思考过程。
 * 若 API Key 未配置或调用失败，直接抛出明确错误，绝不做伪装或多余规则脑补。
 */
export async function recommendApis(mission) {
  const apiKey = (process.env.DEEPSEEK_API_KEY || '').trim();
  const baseUrl = (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/+$/, '');
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

  // 1. 若未配置 API Key，直接返回明确错误，不搞任何伪装兜底
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY 未配置！请在服务端环境变量中添加 DEEPSEEK_API_KEY。');
  }

  const skillSpec = loadSkillSpec();
  const systemPrompt = `你是一个专业的外部数据微服务调度智能体 (API Dispatcher)。
用户受命执行以下具体任务：
- 任务名称: ${mission.name || '未命名任务'}
- 任务性质: ${mission.profile || '常规探险与行动'}
- 目标坐标: 纬度 ${mission.lat}, 经度 ${mission.lon}

【外部可用的 11 个微服务工具集规范 (Skill Toolset Catalog)】:
${skillSpec}

【选路要求】:
1. 根据任务的地理区位、环境地貌与行动性质，客观评估上述 11 个微服务。
2. 每个端点调用都需要消耗 0.001 USDC 链上微支付。你必须挑选对当前任务有实质帮助的端口 (approvedApiIds)，排除与当前任务缺乏现实关联的端口 (rejectedApiIds) 以节省预算。
3. 【极简中立原则】：不需要做任何主观风险等级评定（如 MODERATE/HIGH）或行动禁令脑补，只需给出选择哪些 API 需要购买的判断原因与整体思考过程。
4. 严格返回有效 JSON 格式：
{
  "approvedApiIds": ["入选的API_ID", ...],
  "rejectedApiIds": ["排除的API_ID", ...],
  "thinkingProcess": "<整体选路的思考过程与判断逻辑>",
  "reasons": {
    "<API_ID>": "<该端点入选或排除的具体判断原因>"
  }
}`;

  let decision = null;

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You are an objective API selection AI assistant. Always reply in strict JSON.' },
          { role: 'user', content: systemPrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1
      }),
      signal: AbortSignal.timeout(25000)
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`DeepSeek API 请求失败 (HTTP ${res.status}): ${errBody || res.statusText}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '{}';
    const cleaned = content.replace(/^```json/m, '').replace(/^```/m, '').replace(/```$/m, '').trim();
    const parsed = JSON.parse(cleaned);

    if (!Array.isArray(parsed.approvedApiIds)) {
      throw new Error('DeepSeek 返回内容缺少 approvedApiIds 数组');
    }

    decision = {
      approvedIds: parsed.approvedApiIds,
      rejectedIds: parsed.rejectedApiIds || [],
      thinkingProcess: parsed.thinkingProcess || parsed.rationaleSummary || '经大模型分析完成按需选路',
      reasons: parsed.reasons || parsed.reasoning || {}
    };
  } catch (err) {
    throw new Error(`[DeepSeek 调度服务异常]: ${err.message}`);
  }

  // 组装详细的推荐清单对象，提供给客户端直接调用
  const approvedApis = [];
  const rejectedApis = [];

  for (const item of API_CATALOG) {
    if (decision.approvedIds.includes(item.id)) {
      approvedApis.push({
        id: item.id,
        path: item.path,
        name: item.name,
        category: item.category,
        price: item.price,
        requiresLocation: item.requiresLocation,
        reason: decision.reasons[item.id] || '任务环境高度关联'
      });
    } else {
      rejectedApis.push({
        id: item.id,
        path: item.path,
        name: item.name,
        price: item.price,
        reason: decision.reasons[item.id] || '与当前任务无直接现实关联，排除以节省预算'
      });
    }
  }

  const estimatedBudget = `${(approvedApis.length * 0.001).toFixed(3)} USDC`;

  return {
    success: true,
    service: 'x402-extreme-survival-ai-dispatcher',
    engine: `DeepSeek (${model})`,
    mission: {
      name: mission.name,
      lat: mission.lat,
      lon: mission.lon,
      profile: mission.profile
    },
    thinkingProcess: decision.thinkingProcess,
    approvedApis,
    rejectedApis,
    estimatedBudget,
    totalApproved: approvedApis.length,
    totalRejected: rejectedApis.length
  };
}
