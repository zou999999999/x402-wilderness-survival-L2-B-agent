import 'dotenv/config';
import app from './api/index.js';
import { getPayToAddress } from './src/config/payee.js';
import { API_CATALOG } from './src/config/catalog.js';

const PORT = process.env.PORT || 3000;
const hasDeepSeekKey = !!(process.env.DEEPSEEK_API_KEY && process.env.DEEPSEEK_API_KEY.trim());

const server = app.listen(PORT, () => {
  console.log(`=================================================================`);
  console.log(`🧭 [Server] 极端环境生存决策系统 (Level 2_b: 双智能体 A2A 协同) 已启动`);
  console.log(`📡 运行端口: http://localhost:${PORT}`);
  console.log(`💚 健康检查: http://localhost:${PORT}/health`);
  console.log(`📋 服务目录: http://localhost:${PORT}/api/catalog`);
  console.log(`🤖 服务端 Agent: http://localhost:${PORT}/api/agent/consult (打包咨询 $0.005)`);
  console.log(`🧠 DeepSeek 状态: ${hasDeepSeekKey ? '已接入 DeepSeek API Key (纯大模型 Agent 决策)' : '未检测到 DEEPSEEK_API_KEY (请在 .env 中配置)'}`);
  console.log(`💰 收款地址: ${getPayToAddress()}`);
  console.log(`🧩 总挂载接口: ${API_CATALOG.length} 个数据微服务 + 1 个服务端参谋 Agent`);
  console.log(`=================================================================`);
});

export default server;
