import { spawn, exec } from 'node:child_process';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function askQuestion(rl, prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer.trim());
    });
  });
}

function runSubprocess(scriptName, args = [], cwd = path.resolve(__dirname, '..')) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.resolve(__dirname, scriptName);
    const proc = spawn(process.execPath, [scriptPath, ...args], {
      stdio: 'inherit',
      cwd
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Subprocess exited with code ${code}`));
      }
    });

    proc.on('error', (err) => {
      reject(err);
    });
  });
}

async function isServerAlive(target = 'http://localhost:3001') {
  try {
    const res = await fetch(`${target}/health`, { signal: AbortSignal.timeout(1000) });
    return res.ok;
  } catch {
    return false;
  }
}

async function startLocalServer(openWindow = false) {
  const target = process.env.TARGET_URL || 'http://localhost:3001';
  if (!target.includes('localhost') && !target.includes('127.0.0.1')) {
    return true;
  }

  if (await isServerAlive(target)) {
    console.log(`✅ 本地微服务服务端已在运行中 (监听: ${target})`);
    return true;
  }

  console.log(`📡 正在为任务拉起本地微服务 AI 参谋服务端 (PORT: 3001)...`);
  const serverDir = path.resolve(__dirname, '../../server');
  const serverScript = path.resolve(serverDir, 'server.js');

  if (process.platform === 'win32' && openWindow) {
    exec(`start "x402 Level 2-B AI Broker Server (PORT: 3001)" "${process.execPath}" "${serverScript}"`, { cwd: serverDir });
  } else {
    const p = spawn(process.execPath, [serverScript], {
      detached: true,
      stdio: 'ignore',
      cwd: serverDir
    });
    p.unref();
  }

  for (let i = 0; i < 25; i++) {
    await new Promise(r => setTimeout(r, 200));
    if (await isServerAlive(target)) {
      console.log(`✅ 本地微服务 AI 参谋服务端已就绪 (端点: ${target})！\n`);
      return true;
    }
  }

  console.warn(`⚠️ 本地服务端启动响应稍慢，将尝试继续执行...\n`);
  return false;
}

async function main() {
  const target = process.env.TARGET_URL || 'http://localhost:3001';
  const isCloud = !target.includes('localhost') && !target.includes('127.0.0.1');
  const alive = await isServerAlive(target);
  const statusBadge = isCloud
    ? (alive ? '🌐 云端在线' : '⚠️ 云端未响应')
    : (alive ? '🟢 本地运行中' : '⚪ 本地待启动 (执行时自动就绪)');

  console.log('======================================================================');
  console.log('🤖 x402 Level 2-B: 全球极端环境与野外探险多源数据服务 (云端 AI 智能参谋模式)');
  console.log(`📡 服务节点状态: ${statusBadge} | 目标端点: ${target}`);
  console.log('======================================================================\n');
  console.log('请选择探险目标、自定义输入、全量购买、审计对账或启动服务端:');
  console.log('  [1] 阿尔金山无人区 (38.0, 88.5) - 高海拔荒漠戈壁徒步穿越 (默认)');
  console.log('  [2] 珠穆朗玛峰大本营 (27.9881, 86.9250) - 极高海拔极寒雪山攀登');
  console.log('  [3] 塔克拉玛干沙漠腹地 (39.0, 83.5) - 极端沙尘黑风暴穿越');
  console.log('  [4] 罗布泊大海道 (41.5, 90.3) - 雅丹地貌与无人区科考');
  console.log('  [5] 香港中环商业区 (22.3, 114.1) - 城市商业金融与法定货币兑换');
  console.log('  [6] 自定义输入（100% 自主指定地名、经度、纬度、任务性质）');
  console.log('  [7] 直接全量采购模式（不经 AI 推理，直接购买全部 11 项微服务）');
  console.log('  [8] 运行链上对账与审计（批量核对交易哈希与实时钱包余额）');
  console.log('  [9] 重新生成 Word (.docx) 报告（从最新 JSON 重新导出）');
  console.log('  [0] 独立启动本地服务端 (新窗口监听 3001 端口并显示网络日志)');
  console.log('  [Q] 退出程序\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const choice = (await askQuestion(rl, '请输入选项编号 [1-9, 0, Q] (直接按回车默认选择 [1]): ')).toUpperCase();

  if (choice === 'Q') {
    console.log('👋 已退出');
    rl.close();
    process.exit(0);
  }

  if (choice === '0') {
    rl.close();
    await startLocalServer(true);
    console.log('✅ 已在独立控制台窗口拉起本地微服务服务端 (PORT: 3001)');
    return;
  }

  if (choice === '8') {
    rl.close();
    await runSubprocess('reconcile.js');
    return;
  }

  if (choice === '9') {
    rl.close();
    await runSubprocess('export_word.js');
    return;
  }

  // 选项 1-7 均需要服务端就绪
  await startLocalServer(false);

  let args = [];

  if (choice === '6') {
    console.log('\n--- 100% 自定义探险任务参数输入 ---');
    const name = await askQuestion(rl, '请输入目标地名 (例如: 乞力马扎罗山 / 撒哈拉沙漠): ');
    const lat = await askQuestion(rl, '请输入目标纬度 (-90 到 90, 例如: -3.067): ');
    const lon = await askQuestion(rl, '请输入目标经度 (-180 到 180, 例如: 37.355): ');
    const profile = await askQuestion(rl, '请输入任务性质 (例如: 高海拔冰川攀登 / 热带荒漠穿越): ');
    rl.close();

    args = [
      '--lat', lat || '38.0',
      '--lon', lon || '88.5',
      '--place', name || '自定义探险区',
      '--profile', profile || '极端环境野外机动'
    ];
  } else if (choice === '7') {
    rl.close();
    console.log('\n📦 已启用【全量采购模式】：将跳过大模型筛选，直接购买全部 11 项微服务！');
    args = ['--all'];
  } else if (choice === '2') {
    rl.close();
    args = ['--lat', '27.9881', '--lon', '86.9250', '--place', '珠穆朗玛峰大本营', '--profile', '极高海拔极寒雪山攀登'];
  } else if (choice === '3') {
    rl.close();
    args = ['--lat', '39.0', '--lon', '83.5', '--place', '塔克拉玛干沙漠腹地', '--profile', '极端沙尘黑风暴穿越'];
  } else if (choice === '4') {
    rl.close();
    args = ['--lat', '41.5', '--lon', '90.3', '--place', '罗布泊大海道', '--profile', '雅丹地貌与无人区科考'];
  } else if (choice === '5') {
    rl.close();
    args = ['--lat', '22.3', '--lon', '114.1', '--place', '香港中环商业区', '--profile', '城市商业金融与法定货币兑换'];
  } else {
    // 默认或选项 1
    rl.close();
    args = ['--lat', '38.0', '--lon', '88.5', '--place', '阿尔金山无人区', '--profile', '高海拔荒漠戈壁徒步穿越'];
  }

  await runSubprocess('agent.js', args);
}

main().catch((err) => {
  console.error('\n❌ 控制器运行异常:', err.message);
  process.exit(1);
});
