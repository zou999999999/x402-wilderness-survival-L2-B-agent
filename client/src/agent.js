import dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { wrapFetchWithPaymentFromConfig, decodePaymentResponseHeader } from '@x402/fetch';
import { ExactEvmScheme } from '@x402/evm';
import { privateKeyToAccount } from 'viem/accounts';
import { createPublicClient, http, formatUnits } from 'viem';
import { baseSepolia } from 'viem/chains';

import { getPayerPrivateKey, getExpectedPayToAddress } from './config/wallet.js';
import { exportReportToDocx } from './lib/docx_exporter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const reportsDir = path.resolve(__dirname, '../reports');

// 加载环境变量 (优先 client/.env)
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

// Base Sepolia USDC 合约
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

/**
 * 客观中立的 11 个微服务备用目录 (Fallback Catalog)
 */
const NEUTRAL_TOOLSET_CATALOG = [
  { id: 'earthquake', path: '/api/survival/earthquake', name: '近场地震与断裂带活动监测', category: 'geology', price: '$0.001', requiresLocation: true },
  { id: 'storm', path: '/api/survival/storm', name: '极端风暴与温温雨雪气象监测', category: 'meteorology', price: '$0.001', requiresLocation: true },
  { id: 'flood', path: '/api/survival/flood', name: '流域水文与径流漫滩监测', category: 'hydrology', price: '$0.001', requiresLocation: true },
  { id: 'terrain', path: '/api/survival/terrain', name: '数字高程与局部坡度勘察', category: 'topography', price: '$0.001', requiresLocation: true },
  { id: 'dust', path: '/api/survival/dust', name: '沙尘暴与大气颗粒物浓度监测', category: 'air_quality', price: '$0.001', requiresLocation: true },
  { id: 'sunlight', path: '/api/survival/sunlight', name: '昼夜天光与日光有效窗口', category: 'astronomy', price: '$0.001', requiresLocation: true },
  { id: 'geomagnetic', path: '/api/survival/geomagnetic', name: '空间天气与地磁暴监测', category: 'space_weather', price: '$0.001', requiresLocation: false },
  { id: 'forex', path: '/api/market/forex', name: '国际外汇法定货币汇率牌价', category: 'foreign_exchange', price: '$0.001', requiresLocation: false },
  { id: 'catfact', path: '/api/info/catfact', name: '猫科动物科普与生物事实', category: 'zoology_facts', price: '$0.001', requiresLocation: false },
  { id: 'crypto', path: '/api/market/crypto', name: '加密数字货币现货行情走势', category: 'cryptocurrency', price: '$0.001', requiresLocation: false },
  { id: 'iss', path: '/api/orbit/iss', name: '国际空间站轨道天顶轨迹监测', category: 'orbital_space', price: '$0.001', requiresLocation: false }
];

async function run() {
  const targetHost = (process.env.TARGET_URL || 'http://localhost:3001').replace(/\/+$/, '');
  const isForceAll = process.argv.includes('--all') || process.env.FORCE_ALL === 'true';

  let lat = parseFloat(process.env.EXPEDITION_LAT || '38.0');
  let lon = parseFloat(process.env.EXPEDITION_LON || '88.5');
  let placeName = process.env.EXPEDITION_LOCATION || '阿尔金山无人区';
  let profile = process.env.EXPEDITION_PROFILE || '极端荒野重装徒步穿越';

  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg === '--lat' && process.argv[i + 1]) lat = parseFloat(process.argv[++i]);
    else if (arg === '--lon' && process.argv[i + 1]) lon = parseFloat(process.argv[++i]);
    else if (arg === '--place' && process.argv[i + 1]) placeName = process.argv[++i];
    else if (arg === '--profile' && process.argv[i + 1]) profile = process.argv[++i];
  }

  const mission = { name: placeName, lat, lon, profile };

  console.log(`\n=================================================================`);
  console.log(`🧭 [x402 Level 2-B] 云端智能参谋与按需采购 Agent`);
  console.log(`📍 【探险任务参数】目标地: <${mission.name}> | 经度: <${mission.lon}> | 纬度: <${mission.lat}> | 任务性质: <${mission.profile}>`);
  console.log(`🎯 服务中介节点: ${targetHost}`);
  console.log(`=================================================================\n`);

  // 1. 验证客户端付款钱包私钥
  const payerPrivateKey = getPayerPrivateKey();
  if (!payerPrivateKey) {
    console.error('❌ 未找到付款钱包私钥！请在 client/.env 中配置 PAYER_PRIVATE_KEY。');
    process.exit(1);
  }

  const account = privateKeyToAccount(payerPrivateKey);
  console.log(`👛 付款方钱包地址: ${account.address}`);

  // 2. 检查链上余额
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(undefined, { timeout: 25000, retryCount: 1 })
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
    console.log(`💵 链上余额 (USDC): ${formatUnits(usdcBal, 6)} USDC\n`);
  } catch (err) {
    console.warn(`⚠️ 查询链上余额提示: ${err.message}（继续推进执行）\n`);
  }

  let approved = [];
  let rejected = [];
  let thinkingProcess = '';
  let selectionEngine = '';

  // 3. 选路阶段：如果强制全量，则直接全买；否则向云端 AI Dispatcher 咨询精准推荐
  if (isForceAll) {
    console.log(`📦 【全量采购模式】用户指定购买全部可用微服务 API (共 ${NEUTRAL_TOOLSET_CATALOG.length} 项)`);
    approved = NEUTRAL_TOOLSET_CATALOG.map(c => ({ ...c, reason: '用户指定全量采购模式' }));
    rejected = [];
    thinkingProcess = '用户指定全量采购模式，直接购买全部 11 个微服务端点。';
    selectionEngine = 'Direct All-Inclusive';
  } else {
    console.log(`🤖 正在向云端智能参谋发起咨询 (${targetHost}/api/recommend)...`);
    try {
      const recRes = await fetch(`${targetHost}/api/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mission),
        signal: AbortSignal.timeout(30000)
      });

      if (!recRes.ok) {
        throw new Error(`云端返回 HTTP ${recRes.status}`);
      }

      const recData = await recRes.json();
      approved = recData.approvedApis || [];
      rejected = recData.rejectedApis || [];
      thinkingProcess = recData.thinkingProcess || '云端 AI 结合任务剖面完成按需选路';
      selectionEngine = `Cloud AI Dispatcher (${recData.engine || 'DeepSeek'})`;

      console.log(`\n✨ [云端参谋选路完成] 精准入选: ${approved.length} 项，主动排除: ${rejected.length} 项`);
      console.log(`🧠 【选路思考过程】:`);
      console.log(`   ${thinkingProcess}\n`);

      console.log(`📋 采购计划: 准备购买 ${approved.length} 项微服务 | 预估总额: ${recData.estimatedBudget || (approved.length * 0.001).toFixed(3) + ' USDC'}`);
      approved.forEach((a, i) => {
        console.log(`   [${i + 1}] ${a.name} (${a.path})`);
        console.log(`       └ 理由: ${a.reason || '任务高度关联'}`);
      });

      if (rejected.length > 0) {
        console.log(`\n   (主动排除 ${rejected.length} 项无关端点，节省 ${(rejected.length * 0.001).toFixed(3)} USDC):`);
        rejected.forEach((r, i) => {
          console.log(`   [${i + 1}] ${r.name} - 理由: ${r.reason || '无现实关联'}`);
        });
      }
    } catch (err) {
      console.warn(`⚠️ 咨询云端推荐异常: ${err.message}，自动回退至本地标准微服务工具集`);
      approved = NEUTRAL_TOOLSET_CATALOG.slice(0, 7).map(c => ({ ...c, reason: '本地启发式规则备用推荐' }));
      rejected = NEUTRAL_TOOLSET_CATALOG.slice(7).map(c => ({ ...c, reason: '启发式规则排除非环境端点' }));
      thinkingProcess = '网络回退模式：优先采购环境类微服务，排除金融与科普端点。';
      selectionEngine = 'Local Fallback Heuristics';
    }
  }

  // 4. 初始化 x402 客户端付款执行器
  const paymentFetch = wrapFetchWithPaymentFromConfig(fetch, {
    schemes: [
      {
        network: 'eip155:84532',
        client: new ExactEvmScheme(account)
      }
    ]
  });

  // 5. 执行真实 x402 链上微支付购买与数据采集
  console.log(`\n⚡ ================ [开始执行 x402 真实微支付采购] ================`);
  const collectedData = {};
  const purchaseAudit = [];

  for (let i = 0; i < approved.length; i++) {
    const api = approved[i];
    const queryParams = new URLSearchParams();
    if (api.requiresLocation) {
      queryParams.set('lat', mission.lat);
      queryParams.set('lon', mission.lon);
      queryParams.set('place', mission.name);
    }
    const fullUrl = `${targetHost}${api.path}${queryParams.toString() ? '?' + queryParams.toString() : ''}`;

    console.log(`\n[${i + 1}/${approved.length}] 🛒 正在购买: ${api.name} (${api.path})`);

    const t0 = Date.now();
    try {
      // 1. 发起探测请求
      const probeRes = await fetch(fullUrl, { signal: AbortSignal.timeout(35000) });
      if (probeRes.status === 402) {
        const paymentReqHeader = probeRes.headers.get('payment-required') || probeRes.headers.get('x-payment-required');
        let billInfo = 'HTTP 402 Payment Required';
        if (paymentReqHeader) {
          try {
            const bill = JSON.parse(Buffer.from(paymentReqHeader, 'base64').toString('utf8'));
            const accept = bill.accepts?.[0] || {};
            billInfo = `账单金额: ${accept.price || '0.001 USDC'} | 收款方: ${accept.payTo}`;
          } catch {}
        }
        console.log(`   📋 账单回执: ${billInfo}`);
      }

      // 2. 执行真实 EIP-3009 授权签名并完成结算 (自动重试 3 次以应对网络或 RPC 抖动)
      let paidRes = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        paidRes = await paymentFetch(fullUrl);
        if (paidRes.ok) break;
        if (paidRes.status === 402 && attempt < 3) {
          await new Promise(r => setTimeout(r, 1200));
        }
      }
      const latencyMs = Date.now() - t0;

      if (!paidRes.ok) {
        throw new Error(`HTTP ${paidRes.status} ${paidRes.statusText}`);
      }

      // 提取真实链上交易哈希（Tx Hash）—— 绝对不伪造假哈希！
      const paymentResHeader = paidRes.headers.get('payment-response') || paidRes.headers.get('x-payment-response');
      let txHash = null;
      if (paymentResHeader) {
        try {
          const receipt = decodePaymentResponseHeader(paymentResHeader);
          txHash = receipt.transaction || receipt.transactionHash || receipt.txHash || receipt.hash || null;
        } catch (err) {
          console.warn('   ⚠️ payment-response 头解析警告:', err.message);
        }
      }

      const body = await paidRes.json();
      collectedData[api.id] = body;

      const summaryText = body.summary || body.assessment?.summary || '数据已成功采集';

      purchaseAudit.push({
        id: api.id,
        name: api.name,
        path: api.path,
        price: api.price || '$0.001',
        status: 'SUCCESS',
        latencyMs,
        txHash,
        summary: summaryText
      });

      console.log(`   ✨ 购买成功! 状态: 200 OK | 耗时: ${latencyMs}ms`);
      console.log(`   ⛓️ 真实结算凭证 (Tx): ${txHash ? txHash : '链上批处理暂未立即返回哈希'}`);
      console.log(`   📑 遥测内容: ${summaryText}`);

    } catch (err) {
      console.error(`   ❌ 购买失败: ${err.message}`);
      purchaseAudit.push({
        id: api.id,
        name: api.name,
        path: api.path,
        price: api.price || '$0.001',
        status: 'FAILED',
        txHash: null,
        error: err.message
      });
    }

    await new Promise(r => setTimeout(r, 400));
  }

  // 6. 汇总交付
  console.log(`\n=================================================================`);
  console.log(`📦 [数据交付汇总] 探险任务: ${mission.name} (${mission.lon}°E, ${mission.lat}°N)`);
  console.log(`📊 采购统计: 计划购买 ${approved.length} 项 | 成功交付 ${purchaseAudit.filter(p => p.status === 'SUCCESS').length} 项`);
  console.log(`💰 实际支出: ${(purchaseAudit.filter(p => p.status === 'SUCCESS').length * 0.001).toFixed(3)} USDC`);
  console.log(`=================================================================`);

  console.log(`\n【各微服务真实遥测数据反馈清单】:`);
  purchaseAudit.forEach((item, i) => {
    if (item.status === 'SUCCESS') {
      console.log(` ${i + 1}. ✅ [${item.name}] (${item.path})`);
      console.log(`    • 交易哈希: ${item.txHash || '已结算'}`);
      console.log(`    • 数据摘要: ${item.summary}`);
    } else {
      console.log(` ${i + 1}. ❌ [${item.name}] 购买失败 (${item.error || '未响应'})`);
    }
  });

  // 7. 归档结构化报告 (JSON 与 Word .docx 报告)
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.resolve(reportsDir, `survival_recon_${timestamp}.json`);
  const docxPath = path.resolve(reportsDir, `survival_recon_${timestamp}.docx`);

  const reportData = {
    expedition: mission,
    timestamp: new Date().toISOString(),
    payerAddress: account.address,
    selectionEngine,
    thinkingProcess,
    purchaseCount: approved.length,
    successCount: purchaseAudit.filter(p => p.status === 'SUCCESS').length,
    purchaseAudit,
    collectedData
  };

  fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2), 'utf8');
  console.log(`\n💾 结构化审计 JSON 数据已归档: ${reportPath}`);

  // 自动生成专业排版的 Word (.docx) 交付报告
  try {
    await exportReportToDocx({
      mission,
      purchaseAudit,
      collectedData,
      payerAddress: account.address,
      selectionEngine,
      rationaleSummary: thinkingProcess,
      timestamp: new Date().toISOString(),
      outputPath: docxPath
    });
    console.log(`📄 专业 Word 交付报告已生成:   ${docxPath}`);
    console.log(`💡 您可直接双击上述 .docx 文件，用 Microsoft Word 或 WPS Office 阅读！`);
  } catch (err) {
    console.warn(`⚠️ 导出 Word 报告异常: ${err.message}`);
  }

  console.log(`=================================================================\n`);
}

run().catch(err => {
  console.error('Agent 运行致命异常:', err);
  process.exit(1);
});
