import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exportReportToDocx } from './lib/docx_exporter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const reportsDir = path.resolve(__dirname, '../reports');

async function main() {
  const jsonArg = process.argv[2];
  let targetPath;

  if (jsonArg) {
    targetPath = path.resolve(process.cwd(), jsonArg);
  } else {
    if (!fs.existsSync(reportsDir)) {
      console.error('未找到 reports 目录');
      process.exit(1);
    }
    const files = fs.readdirSync(reportsDir).filter(f => f.startsWith('survival_b_consult_') && f.endsWith('.json'));
    if (files.length === 0) {
      console.log('未找到任何 survival_b_consult_*.json 报告文件');
      process.exit(1);
    }
    files.sort((a, b) => fs.statSync(path.join(reportsDir, a)).mtimeMs - fs.statSync(path.join(reportsDir, b)).mtimeMs);
    targetPath = path.join(reportsDir, files[files.length - 1]);
  }

  console.log(`📂 正在读取 JSON 报告: ${path.basename(targetPath)}`);
  const raw = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
  const report = raw.responseBody?.report || {};
  const mission = report.expeditionTarget || {
    name: '阿尔金山无人区',
    lat: 38.0,
    lon: 88.5,
    profile: '极端荒野重装徒步穿越'
  };

  const docxPath = targetPath.replace(/\.json$/, '.docx');
  console.log(`⏳ 正在排版并生成 Word (.docx) 极端环境探险生存决策研判报告...`);

  await exportReportToDocx({
    mission,
    report,
    payerAddress: raw.clientPayer,
    consultUrl: raw.serverConsultEndpoint,
    txHash: raw.txHash,
    latencyMs: raw.latencyMs,
    outputPath: docxPath
  });

  const stats = fs.statSync(docxPath);
  console.log(`=================================================================`);
  console.log(`✅ 成功生成 Word (.docx) 战地专业研判报告！`);
  console.log(`📄 文件路径: ${docxPath}`);
  console.log(`📦 文件大小: ${(stats.size / 1024).toFixed(1)} KB`);
  console.log(`💡 说明: 您可直接在电脑上双击该文件，用 Microsoft Word、WPS Office 或 LibreOffice 打开阅读。`);
  console.log(`=================================================================`);
}

main().catch(err => {
  console.error('导出 Word 报告失败:', err);
  process.exit(1);
});
