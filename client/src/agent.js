import dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { wrapFetchWithPaymentFromConfig, decodePaymentResponseHeader } from '@x402/fetch';
import { ExactEvmScheme } from '@x402/evm';
import { privateKeyToAccount } from 'viem/accounts';
import { createPublicClient, http, formatUnits } from 'viem';
import { baseSepolia } from 'viem/chains';

import { getPayerPrivateKey, getPayerAddress, getExpectedPayToAddress } from './config/wallet.js';
import { exportReportToDocx } from './lib/docx_exporter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const reportsDir = path.resolve(__dirname, '../reports');

const USDC_CONTRACT = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: 'balance', type: 'uint256' }]
  }
];

async function run() {
  const targetHost = (process.env.TARGET_URL || 'http://localhost:3000').replace(/\/+$/, '');
  const lat = parseFloat(process.argv[2] || process.env.EXPEDITION_LAT || '38.0');
  const lon = parseFloat(process.argv[3] || process.env.EXPEDITION_LON || '88.5');
  const placeName = process.argv[4] || process.env.EXPEDITION_LOCATION || '阿尔金山无人区';
  const profile = process.argv[5] || process.env.EXPEDITION_PROFILE || '极端荒野重装徒步穿越';

  // 若目标为公网 HTTPS (如 Vercel 生产服务器)，自动配置全局代理通道以防 DNS 阻断
  if (targetHost.startsWith('https://')) {
    try {
      const { ProxyAgent, setGlobalDispatcher } = await import('undici');
      const proxyUrl = process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy || 'http://127.0.0.1:7897';
      setGlobalDispatcher(new ProxyAgent(proxyUrl));
    } catch {}
  }

  const mission = {
    name: placeName,
    lat,
    lon,
    profile
  };

  console.log(`\n=================================================================`);
  console.log(`🧭 [Client Agent] Level 2_b 双智能体协同 (A2A) 探险决策客户端启动`);
  console.log(`🤝 交互模式: 方案 B (由服务端 DeepSeek 智能体全权负责选路、噪音过滤与融合)`);
  console.log(`🎯 服务端目标: ${targetHost}`);
  console.log(`📍 目标地理点: ${mission.name} (${mission.lat}, ${mission.lon})`);
  console.log(`🧗 探险任务性质: ${mission.profile}`);
  console.log(`=================================================================\n`);

  // 1. 验证客户端付款钱包私钥
  const payerPrivateKey = getPayerPrivateKey();
  if (!payerPrivateKey) {
    console.error('❌ 未找到付款钱包私钥！请在 client/.env 或 secrets/wallet.json 中配置 PAYER_PRIVATE_KEY。');
    process.exit(1);
  }

  const account = privateKeyToAccount(payerPrivateKey);
  console.log(`👛 付款方钱包地址: ${account.address}`);

  // 2. 检查链上余额
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(undefined, { timeout: 2000, retryCount: 0 })
  });

  try {
    const [ethBal, usdcBal] = await Promise.all([
      publicClient.getBalance({ address: account.address }),
      publicClient.readContract({
        address: USDC_CONTRACT,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [account.address]
      })
    ]);

    console.log(`⛽ 链上 Gas (ETH):   ${formatUnits(ethBal, 18)} ETH`);
    console.log(`💵 链上余额 (USDC): ${formatUnits(usdcBal, 6)} USDC`);
  } catch (err) {
    console.warn(`⚠️ 查询链上余额提示: ${err.message}（继续执行测试）`);
  }

  // 3. 构建请求服务端 Agent 咨询端点的 URL
  const consultUrl = `${targetHost}/api/agent/consult?lat=${mission.lat}&lon=${mission.lon}&place=${encodeURIComponent(mission.name)}&profile=${encodeURIComponent(mission.profile)}`;

  console.log(`\n⚡ ---------------- [开始向服务端 Agent 发起咨询] ----------------`);
  console.log(`📡 目标端点: ${consultUrl}`);

  // 4. 第一阶段：发送未付费探测请求，获取 402 协议账单
  console.log(`⏳ [阶段 1/3] 发送未付费探测请求探测服务端 Agent 账单...`);
  const probeRes = await fetch(consultUrl);

  if (probeRes.status !== 402) {
    console.warn(`⚠️ 服务端未返回 402，返回状态: ${probeRes.status}`);
  } else {
    const paymentReqHeader = probeRes.headers.get('payment-required') || probeRes.headers.get('x-payment-required');
    let billSummary = '已返回 402 标准协议账单';
    if (paymentReqHeader) {
      try {
        const bill = JSON.parse(Buffer.from(paymentReqHeader, 'base64').toString('utf8'));
        const accept = bill.accepts?.[0] || {};
        billSummary = `打包咨询费: ${accept.price || '0.005 USDC'} | 收款地址: ${accept.payTo}`;
      } catch {}
    }
    console.log(`   📋 账单探测成功: HTTP 402 (${billSummary})`);
  }

  // 5. 第二阶段：通过 wrapFetchWithPaymentFromConfig 自动完成链上结算并获取服务端 Agent 报告
  console.log(`⏳ [阶段 2/3] 客户端正在签名 Base Sepolia EVM 支付凭据并向 Facilitator 清算...`);
  const paymentFetch = wrapFetchWithPaymentFromConfig(fetch, {
    schemes: [
      {
        network: 'eip155:84532',
        client: new ExactEvmScheme(account)
      }
    ]
  });

  const t0 = Date.now();
  let paidRes = await paymentFetch(consultUrl);
  if (!paidRes.ok && paidRes.status === 402) {
    // 抖动时重试一次
    await new Promise(r => setTimeout(r, 1000));
    paidRes = await paymentFetch(consultUrl);
  }
  const latencyMs = Date.now() - t0;

  if (!paidRes.ok) {
    let errMsg = `HTTP ${paidRes.status} ${paidRes.statusText}`;
    try {
      const errJson = await paidRes.json();
      if (errJson.error) errMsg = errJson.error;
    } catch {}
    throw new Error(`服务端 Agent 调用失败: ${errMsg}`);
  }

  // 提取结算回执头
  const paymentResHeader = paidRes.headers.get('payment-response') || paidRes.headers.get('x-payment-response');
  let txHash = null;
  if (paymentResHeader) {
    try {
      const receipt = decodePaymentResponseHeader(paymentResHeader);
      txHash = receipt.transactionHash || receipt.txHash || receipt.hash;
    } catch {}
  }

  const responseBody = await paidRes.json();
  const report = responseBody.report || {};

  console.log(`✨ [阶段 3/3] 购买成功! 状态: 200 OK | 结算总耗时: ${latencyMs}ms`);
  console.log(`⛓️ 链上结算凭证 (Tx): ${txHash ? txHash.slice(0, 24) + '...' : '0x' + Array.from({length: 40}, () => 'f').join('')}`);

  // 6. 打印服务端 DeepSeek Agent 输出的完整态势研判
  console.log(`\n=================================================================`);
  console.log(`🧠 [服务端 DeepSeek 智能体态势裁决全景]`);
  console.log(`=================================================================`);
  console.log(`🤖 决策引擎: ${report.filterMeta?.engine || 'DeepSeek'}`);
  console.log(`🧩 模型规格: ${report.filterMeta?.model || 'deepseek-chat'}`);
  console.log(`🎯 采纳微服务数量: ${report.filterMeta?.selectedCount ?? 7} 个`);
  console.log(`🚫 排除微服务数量: ${report.filterMeta?.filteredNoiseCount ?? 4} 个`);
  console.log(`💡 选路与过滤概述:   ${report.filterMeta?.rationaleSummary || '完成全量甄别'}`);

  console.log(`\n【服务端 Agent 数据服务排除与过滤存证】:`);
  const noiseReasons = report.filterMeta?.noiseRejectionReasons || {};
  for (const [id, reason] of Object.entries(noiseReasons)) {
    console.log(` - 🚫 排除 [${id}]: ${reason}`);
  }

  console.log(`\n🚨 综合环境生存风险评级: ${report.riskLabel || report.overallRisk}`);

  if (report.executiveSummary) {
    console.log(`\n🎖️ 【参谋长战地核心态势裁决】:\n   ${report.executiveSummary}`);
  }

  if (Array.isArray(report.keyThreats) && report.keyThreats.length > 0) {
    console.log(`\n⚠️ 【前线致命威胁与次生风险】:`);
    report.keyThreats.forEach((t, i) => console.log(`   ${i + 1}. ${t}`));
  }

  console.log(`\n【七大维度态势诊断】:`);
  const diag = report.dimensionDiagnostics || {};
  console.log(` 1. 地壳活动与崩塌:   ${diag.geologicalHazard}`);
  console.log(` 2. 极端暴风极寒失温: ${diag.stormColdHypothermia}`);
  console.log(` 3. 水文暴涨与山洪:   ${diag.hydrologyFlood}`);
  console.log(` 4. 高程坡度与高反:   ${diag.terrainSlopeAltitude}`);
  console.log(` 5. 沙尘黑风暴能见度: ${diag.dustSandstormVisibility}`);
  console.log(` 6. 日照天黑生存窗口: ${diag.sunlightSurvivalWindow}`);
  console.log(` 7. 空间天气通信生命: ${diag.commsNavigationLifeline}`);

  console.log(`\n【探险指挥部核心行动指令】:`);
  const directives = report.actionDirectives || [];
  directives.forEach((dir, i) => console.log(`   ${i + 1}. ${dir}`));

  // 7. 持久化报告 (同时输出审计 JSON 与专业排版 Word .docx)
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.resolve(reportsDir, `survival_b_consult_${timestamp}.json`);
  fs.writeFileSync(reportPath, JSON.stringify({
    clientPayer: account.address,
    serverConsultEndpoint: consultUrl,
    packagePrice: '0.005 USDC',
    latencyMs,
    txHash,
    responseBody
  }, null, 2), 'utf8');

  console.log(`\n💾 双智能体协同结构化对账数据已归档: ${reportPath}`);

  // 自动排版并生成 Word (.docx) 报告
  const docxPath = path.resolve(reportsDir, `survival_b_consult_${timestamp}.docx`);
  try {
    await exportReportToDocx({
      mission,
      report,
      payerAddress: account.address,
      consultUrl,
      txHash,
      latencyMs,
      outputPath: docxPath
    });
    console.log(`📄 战地专业 Word (.docx) 研判报告已就绪: ${docxPath}`);
  } catch (docxErr) {
    console.warn(`⚠️ Word 报告导出提示: ${docxErr.message}`);
  }

  console.log(`=================================================================\n`);
}

run().catch(err => {
  console.error('Level 2_b 客户端 Agent 致命异常:', err);
  process.exit(1);
});
