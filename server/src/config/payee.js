/**
 * 服务端收款地址 (PAY_TO)
 *
 * 【架构铁律】服务端只允许感知公开收款地址：
 *  - 只读取环境变量 PAY_TO（本地来自 server/.env，云端来自 Vercel 环境变量）；
 *  - 不读取任何 wallet.json —— 因为该文件里同时存放着付款私钥，服务端连"打开它"都不应该。
 */
const DEFAULT_PAY_TO = '0xdcD7DAFafb0EF3d50bDdB480Dbd503Fa6D1B6C09';

export function getPayToAddress() {
  const addr = (process.env.PAY_TO || DEFAULT_PAY_TO).trim();
  if (!/^0x[0-9a-fA-F]{40}$/.test(addr)) {
    throw new Error(`PAY_TO 不是合法的 EVM 地址: ${addr}`);
  }
  return addr;
}
