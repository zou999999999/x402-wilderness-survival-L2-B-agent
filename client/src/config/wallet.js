import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientRoot = path.resolve(__dirname, '../../');

const candidatePaths = [
  path.resolve(clientRoot, '.env'),
  path.resolve(clientRoot, 'secrets/wallet.json'),
  path.resolve(clientRoot, '../secrets/wallet.json'),
  path.resolve(clientRoot, 'wallet.json'),
  path.resolve(clientRoot, '../wallet.json'),
  path.resolve(clientRoot, '../../Level 1/secrets/wallet.json'),
  path.resolve(clientRoot, '../../wallet/wallet.json')
];

function loadClientWalletJson() {
  for (const p of candidatePaths) {
    try {
      if (fs.existsSync(p) && p.endsWith('.json')) {
        const raw = fs.readFileSync(p, 'utf8');
        const json = JSON.parse(raw);
        if (json.payerPrivateKey || json.payerAddress || json.payToAddress) {
          return json;
        }
      }
    } catch {
      // 继续尝试下一候选路径
    }
  }
  return {};
}

/**
 * 获取付款方私钥（自动补齐 0x，确保私钥安全）
 */
export function getPayerPrivateKey() {
  let key = process.env.PAYER_PRIVATE_KEY;
  if (!key) {
    const json = loadClientWalletJson();
    key = json.payerPrivateKey;
  }
  if (!key || typeof key !== 'string') {
    return null;
  }
  key = key.trim();
  if (key && !key.startsWith('0x')) {
    key = `0x${key}`;
  }
  return key;
}

/**
 * 获取付款方公开地址
 */
export function getPayerAddress() {
  let addr = process.env.PAYER_ADDRESS;
  if (!addr) {
    const json = loadClientWalletJson();
    addr = json.payerAddress;
  }
  return addr ? addr.trim() : null;
}

/**
 * 获取预期的服务端收款地址 (用于 402 账单校验)
 */
export function getExpectedPayToAddress() {
  let addr = process.env.EXPECTED_PAY_TO || process.env.PAY_TO;
  if (!addr) {
    const json = loadClientWalletJson();
    addr = json.payToAddress;
  }
  return addr ? addr.trim() : '0xdcD7DAFafb0EF3d50bDdB480Dbd503Fa6D1B6C09';
}
