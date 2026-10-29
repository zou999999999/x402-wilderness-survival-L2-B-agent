import dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPublicClient, http, formatUnits } from 'viem';
import { baseSepolia } from 'viem/chains';
import { getPayerAddress, getExpectedPayToAddress } from './config/wallet.js';

// 若环境有代理，自动配置 undici 全局分发器
try {
  const { ProxyAgent, setGlobalDispatcher } = await import('undici');
  const proxyUrl = process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy || 'http://127.0.0.1:7897';
  setGlobalDispatcher(new ProxyAgent(proxyUrl));
} catch {}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const reportsDir = path.resolve(__dirname, '../reports');

const USDC_CONTRACT = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
const ERC20_BALANCE_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }]
  }
];

function cleanAddress(topic) {
  if (!topic) return '';
  return ('0x' + topic.slice(26)).toLowerCase();
}

async function verifyTx(client, txHash, expectedPayTo) {
  console.log(`\n---------------------------------------------------------`);
  console.log(`🔍 正在核验链上交易: ${txHash}`);
  try {
    const receipt = await client.getTransactionReceipt({ hash: txHash });
    if (!receipt) {
      console.log(`⚠️ 链上尚未查到该交易回执（可能处于 Facilitator 批处理池中或尚未确认）`);
      return false;
    }

    const isSuccess = receipt.status === 'success';
    console.log(`📊 执行状态: ${isSuccess ? '✅ 成功 (success)' : '❌ 失败 (reverted)'}`);
    console.log(`📦 区块高度: #${receipt.blockNumber}`);
    console.log(`⛽ Gas 消耗: ${receipt.gasUsed.toString()} (Facilitator 代付免 Gas)`);

    const transferTopic = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
    const logs = (receipt.logs || []).filter(
      l => l.address.toLowerCase() === USDC_CONTRACT.toLowerCase() && l.topics[0] === transferTopic
    );

    if (logs.length > 0) {
      const log = logs[0];
      const fromAddr = cleanAddress(log.topics[1]);
      const toAddr = cleanAddress(log.topics[2]);
      const rawAmount = BigInt(log.data);
      console.log(`💸 USDC 转账详情:`);
      console.log(`   From:   ${fromAddr}`);
      console.log(`   To:     ${toAddr} ${toAddr === (expectedPayTo || '').toLowerCase() ? '✅ (收款方地址核验一致)' : ''}`);
      console.log(`   Amount: ${formatUnits(rawAmount, 6)} USDC`);
    }
    return isSuccess;
  } catch (err) {
    console.log(`⚠️ 链上查询提示: ${err.message}`);
    return false;
  }
}

async function main() {
  const argTx = process.argv[2];
  const payerAddr = getPayerAddress();
  const payToAddr = getExpectedPayToAddress();

  console.log(`=========================================================`);
  console.log(`🔍 [x402 Level 2-A 多源数据服务采购 链上审计与对账]`);
  console.log(`🌐 链网络: Base Sepolia (Chain ID: 84532)`);
  console.log(`💵 合约地址: ${USDC_CONTRACT}`);
  console.log(`👛 付款方钱包: ${payerAddr || '未配置'}`);
  console.log(`🏢 收款方钱包: ${payToAddr || '未配置'}`);
  console.log(`=========================================================\n`);

  const client = createPublicClient({
    chain: baseSepolia,
    transport: http(undefined, { timeout: 15000, retryCount: 2 })
  });

  // 1. 检查付款方与收款方即时余额
  if (payerAddr) {
    try {
      const payerBal = await client.readContract({
        address: USDC_CONTRACT,
        abi: ERC20_BALANCE_ABI,
        functionName: 'balanceOf',
        args: [payerAddr]
      });
      console.log(`💰 付款方 USDC 当前余额: ${formatUnits(payerBal, 6)} USDC`);
    } catch (e) {
      console.warn(`查询付款方余额提示: ${e.message}`);
    }
  }

  if (payToAddr) {
    try {
      const payeeBal = await client.readContract({
        address: USDC_CONTRACT,
        abi: ERC20_BALANCE_ABI,
        functionName: 'balanceOf',
        args: [payToAddr]
      });
      console.log(`💰 收款方 USDC 当前余额: ${formatUnits(payeeBal, 6)} USDC\n`);
    } catch (e) {
      console.warn(`查询收款方余额提示: ${e.message}\n`);
    }
  }

  // 2. 如果传入了特定交易哈希，进行单笔核查
  if (argTx && argTx.startsWith('0x')) {
    await verifyTx(client, argTx, payToAddr);
    return;
  }

  // 3. 否则读取最新的探险决策报告并核对全部账单
  if (fs.existsSync(reportsDir)) {
    const files = fs.readdirSync(reportsDir).filter(f => f.startsWith('survival_recon_') && f.endsWith('.json'));
    if (files.length > 0) {
      files.sort();
      const latestFile = files[files.length - 1];
      const fullPath = path.resolve(reportsDir, latestFile);
      console.log(`📂 正在读取最新交付报告: ${latestFile}`);
      const rep = JSON.parse(fs.readFileSync(fullPath, 'utf8'));

      const auditList = rep.purchaseAudit || [];
      console.log(`🎯 探险目标: ${rep.expedition?.name || '未知'} (经度: ${rep.expedition?.lon}, 纬度: ${rep.expedition?.lat})`);
      console.log(`📋 采购端点数: ${auditList.length} 个`);

      console.log(`\n🧾 账单交易清单 (${auditList.length} 笔):`);
      for (const item of auditList) {
        console.log(` - [${item.status}] ${item.name} (${item.price}): ${item.txHash ? 'Tx=' + item.txHash : (item.error || '未生成Tx')} | 耗时=${item.latencyMs || 0}ms`);
      }

      // 对报告中存在的有效交易哈希执行真实链上逐笔核验
      const validTxs = auditList.filter(item => item.txHash && item.txHash.startsWith('0x'));
      if (validTxs.length > 0) {
        console.log(`\n⛓️ 正在向 Base Sepolia 链上请求逐笔核验 (${validTxs.length} 笔)...`);
        for (const item of validTxs) {
          await verifyTx(client, item.txHash, payToAddr);
        }
      }
    }
  }

  console.log(`\n=========================================================`);
  console.log(`✅ 对账核验流程完成`);
  console.log(`=========================================================\n`);
}

main().catch(err => {
  console.error('对账脚本异常:', err);
  process.exit(1);
});
