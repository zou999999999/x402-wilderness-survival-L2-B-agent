/**
 * 链上结算网络常量（Base Sepolia 测试网）
 * 服务端只声明「收什么币、在哪条链、找谁结算」，不涉及任何私钥。
 */
export const NETWORK = 'eip155:84532';
export const USDC_ASSET = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
export const USDC_DECIMALS = 6;
export const FACILITATOR_URL = (process.env.FACILITATOR_URL || 'https://x402.org/facilitator').trim();
