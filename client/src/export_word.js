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
    const files = fs.readdirSync(reportsDir).filter(f => f.startsWith('survival_recon_') && f.endsWith('.json'));
    if (files.length === 0) {
      console.log('未找到任何 survival_recon_*.json 报告文件');
      process.exit(1);
    }
    files.sort((a, b) => fs.statSync(path.join(reportsDir, a)).mtimeMs - fs.statSync(path.join(reportsDir, b)).mtimeMs);
    targetPath = path.join(reportsDir, files[files.length - 1]);
  }

  console.log(`📂 正在读取 JSON 报告: ${path.basename(targetPath)}`);
  const raw = JSON.parse(fs.readFileSync(targetPath, 'utf8'));

  const docxPath = targetPath.replace(/\.json$/, '.docx');
  console.log(`⏳ 正在排版并生成 Word (.docx) 交付报告...`);

  await exportReportToDocx({
    mission: raw.expedition || { name: '探险任务', lat: 0, lon: 0, profile: '任务' },
    purchaseAudit: raw.purchaseAudit || [],
    collectedData: raw.collectedData || {},
    payerAddress: raw.payerAddress || '0x4830D4857AdA8b000aFC1C2702294B0999dEaFB3',
    selectionEngine: raw.selectionEngine || '全量采购',
    rationaleSummary: raw.rationaleSummary || '',
    timestamp: raw.timestamp || new Date().toISOString(),
    outputPath: docxPath
  });

  const stats = fs.statSync(docxPath);
  console.log(`=================================================================`);
  console.log(`✅ 成功生成 Word (.docx) 数据交付报告！`);
  console.log(`📄 文件路径: ${docxPath}`);
  console.log(`📦 文件大小: ${(stats.size / 1024).toFixed(1)} KB`);
  console.log(`💡 说明: 您可直接在电脑上双击该文件，用 Microsoft Word 或 WPS Office 打开阅读。`);
  console.log(`=================================================================`);
}

main().catch(err => {
  console.error('导出 Word 报告失败:', err);
  process.exit(1);
});
