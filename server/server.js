import 'dotenv/config';
import app from './api/index.js';
import { getPayToAddress } from './src/config/payee.js';
import { API_CATALOG } from './src/config/catalog.js';

const PORT = process.env.PORT || 3000;
const hasDeepSeekKey = !!(process.env.DEEPSEEK_API_KEY && process.env.DEEPSEEK_API_KEY.trim());

const server = app.listen(PORT, () => {
  console.log(`=================================================================`);
  console.log(`🧭 [Server] 极端环境生存决策系统 (Level 2-B: 云端 AI 智能选路参谋) 已启动`);
  console.log(`📡 运行端口: http://localhost:${PORT}`);
  console.log(`💚 健康检查: http://localhost:${PORT}/health`);
  console.log(`📋 服务目录: http://localhost:${PORT}/api/catalog`);
  console.log(`📜 技能规范: http://localhost:${PORT}/api/skill`);
  console.log(`🤖 云端 AI 调度: POST http://localhost:${PORT}/api/recommend (纯粹选路与思考过程)`);
  console.log(`🧠 DeepSeek 状态: ${hasDeepSeekKey ? '已接入 DeepSeek API Key (云端自动决策)' : '未检测到 DEEPSEEK_API_KEY (自动启用启发式选路策略)'}`);
  console.log(`💰 收款钱包: ${getPayToAddress()}`);
  console.log(`🧩 总挂载接口: ${API_CATALOG.length} 个独立外部数据微服务 (每个 $0.001 USDC)`);
  console.log(`=================================================================`);
});

export default server;
