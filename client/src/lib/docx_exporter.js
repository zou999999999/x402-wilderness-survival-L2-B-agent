import fs from 'node:fs';
import path from 'node:path';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  HeadingLevel,
  BorderStyle
} from 'docx';

const FONT_FAMILY = 'Microsoft YaHei';

const blackBorder = {
  style: BorderStyle.SINGLE,
  size: 6,
  color: '000000'
};

const lightBorder = {
  style: BorderStyle.SINGLE,
  size: 4,
  color: 'D0D0D0'
};

const tableBorders = {
  top: blackBorder,
  bottom: blackBorder,
  left: blackBorder,
  right: blackBorder,
  insideHorizontal: lightBorder,
  insideVertical: lightBorder
};

function createHeading(text, level = HeadingLevel.HEADING_2) {
  return new Paragraph({
    heading: level,
    spacing: { before: 240, after: 120 },
    children: [
      new TextRun({
        text,
        bold: true,
        font: FONT_FAMILY,
        size: 26,
        color: '003366'
      })
    ]
  });
}

function createText(text, options = {}) {
  return new Paragraph({
    spacing: { before: options.before ?? 60, after: options.after ?? 60 },
    alignment: options.alignment || AlignmentType.LEFT,
    children: [
      new TextRun({
        text,
        bold: options.bold ?? false,
        font: FONT_FAMILY,
        size: options.size ?? 21,
        color: options.color || '333333'
      })
    ]
  });
}

function createCell(text, options = {}) {
  const isHeader = options.isHeader ?? false;
  return new TableCell({
    width: options.width ? { size: options.width, type: WidthType.DXA } : undefined,
    shading: isHeader ? { fill: '003366' } : (options.fill ? { fill: options.fill } : undefined),
    margins: { top: 100, bottom: 100, left: 120, right: 120 },
    children: [
      new Paragraph({
        alignment: options.align || AlignmentType.LEFT,
        children: [
          new TextRun({
            text: text == null ? '—' : String(text),
            bold: isHeader || options.bold,
            font: FONT_FAMILY,
            size: isHeader ? 20 : 19,
            color: isHeader ? 'FFFFFF' : (options.color || '000000')
          })
        ]
      })
    ]
  });
}

/**
 * 导出多源数据服务交付 Word (.docx) 报告
 */
export async function exportReportToDocx({
  mission,
  purchaseAudit,
  collectedData,
  payerAddress,
  selectionEngine,
  rationaleSummary,
  timestamp,
  outputPath
}) {
  const auditList = purchaseAudit || [];
  const successList = auditList.filter(p => p.status === 'SUCCESS');
  const failedList = auditList.filter(p => p.status === 'FAILED');
  const totalCost = (successList.length * 0.001).toFixed(3);

  const sections = [];

  // 1. 文档大标题
  sections.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 120 },
      children: [
        new TextRun({
          text: 'x402 全球极端环境与野外探险多源数据服务交付报告',
          bold: true,
          font: FONT_FAMILY,
          size: 36,
          color: '002060'
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 240 },
      children: [
        new TextRun({
          text: 'Level 2-A: 外部数据微服务真实链上微支付与遥测数据交付凭据',
          font: FONT_FAMILY,
          size: 20,
          color: '666666'
        })
      ]
    })
  );

  // 2. 基础元数据信息表
  sections.push(createHeading('一、 探险任务参数与执行存证', HeadingLevel.HEADING_2));

  const metaRows = [
    new TableRow({
      children: [
        createCell('目标地名', { isHeader: true, width: 2000 }),
        createCell(mission.name || '未指定', { width: 3000, bold: true }),
        createCell('任务性质与剖面', { isHeader: true, width: 2200 }),
        createCell(mission.profile || '未指定', { width: 3300 })
      ]
    }),
    new TableRow({
      children: [
        createCell('目标区位经纬度', { isHeader: true }),
        createCell(`经度: ${mission.lon}°, 纬度: ${mission.lat}°`, { bold: true }),
        createCell('执行结算网络', { isHeader: true }),
        createCell('Base Sepolia (Chain ID: 84532)')
      ]
    }),
    new TableRow({
      children: [
        createCell('选路推理模式', { isHeader: true }),
        createCell(selectionEngine || '全量采购模式'),
        createCell('链上结算总支出', { isHeader: true }),
        createCell(`${totalCost} USDC (${successList.length} 笔成功)`, { bold: true, color: '008000' })
      ]
    }),
    new TableRow({
      children: [
        createCell('付款方钱包地址', { isHeader: true }),
        createCell(payerAddress || '本地托管钱包'),
        createCell('交付时间戳', { isHeader: true }),
        createCell(timestamp || new Date().toISOString())
      ]
    })
  ];

  sections.push(
    new Table({
      width: { size: 10500, type: WidthType.DXA },
      borders: tableBorders,
      rows: metaRows
    })
  );

  if (rationaleSummary) {
    sections.push(
      createText(`💡 选路策略依据: ${rationaleSummary}`, { before: 100, after: 120, color: '004080' })
    );
  }

  // 3. x402 链上微支付交易清单
  sections.push(createHeading('二、 x402 链上协议微支付采购流水', HeadingLevel.HEADING_2));

  const tableHeader = new TableRow({
    children: [
      createCell('序号', { isHeader: true, width: 800, align: AlignmentType.CENTER }),
      createCell('微服务名称', { isHeader: true, width: 2400 }),
      createCell('端点路由', { isHeader: true, width: 2300 }),
      createCell('金额', { isHeader: true, width: 1100, align: AlignmentType.CENTER }),
      createCell('状态', { isHeader: true, width: 1000, align: AlignmentType.CENTER }),
      createCell('Base Sepolia 交易哈希 (Tx Hash)', { isHeader: true, width: 2900 })
    ]
  });

  const auditRows = [tableHeader];

  auditList.forEach((item, index) => {
    const isSuccess = item.status === 'SUCCESS';
    const txDisplay = item.txHash ? `${item.txHash.slice(0, 18)}...${item.txHash.slice(-8)}` : (item.error ? `失败: ${item.error}` : '未生成Tx');
    
    auditRows.push(
      new TableRow({
        children: [
          createCell(index + 1, { align: AlignmentType.CENTER }),
          createCell(item.name, { bold: true }),
          createCell(item.path),
          createCell(item.price || '$0.001', { align: AlignmentType.CENTER }),
          createCell(isSuccess ? '✅ 成功' : '❌ 失败', {
            align: AlignmentType.CENTER,
            bold: true,
            color: isSuccess ? '008000' : 'C00000'
          }),
          createCell(txDisplay, { color: isSuccess ? '003366' : 'C00000' })
        ]
      })
    );
  });

  sections.push(
    new Table({
      width: { size: 10500, type: WidthType.DXA },
      borders: tableBorders,
      rows: auditRows
    })
  );

  // 4. 各微服务真实遥测数据矩阵
  sections.push(createHeading('三、 购买到的各微服务原始遥测数据交付', HeadingLevel.HEADING_2));

  sections.push(
    createText(`本次共成功获取 ${successList.length} 项外部微服务的实时遥测指标，原始数据清单如下：`, { before: 60, after: 120 })
  );

  for (const item of auditList) {
    if (item.status !== 'SUCCESS') continue;

    const dataObj = collectedData[item.id] || {};
    const sourceName = dataObj.source || '真实公网 API';
    const summaryText = item.summary || dataObj.summary || dataObj.assessment?.summary || '数据已采集';

    sections.push(
      new Paragraph({
        spacing: { before: 160, after: 60 },
        children: [
          new TextRun({ text: `📊 【${item.name}】`, bold: true, font: FONT_FAMILY, size: 22, color: '002060' }),
          new TextRun({ text: ` (${item.path})`, font: FONT_FAMILY, size: 18, color: '666666' })
        ]
      }),
      new Paragraph({
        spacing: { before: 20, after: 80 },
        children: [
          new TextRun({ text: `• 数据来源: `, bold: true, font: FONT_FAMILY, size: 20, color: '333333' }),
          new TextRun({ text: `${sourceName}`, font: FONT_FAMILY, size: 20, color: '004080' }),
          new TextRun({ text: `\n• 核心遥测摘要: `, bold: true, font: FONT_FAMILY, size: 20, color: '333333' }),
          new TextRun({ text: `${summaryText}`, font: FONT_FAMILY, size: 20, color: '111111' })
        ]
      })
    );

    // 格式化输出原始数据关键属性
    const rawData = dataObj.data;
    if (rawData && typeof rawData === 'object') {
      const detailRows = [
        new TableRow({
          children: [
            createCell('遥测指标项', { isHeader: true, width: 3500 }),
            createCell('实时监测数值 / 描述', { isHeader: true, width: 7000 })
          ]
        })
      ];

      for (const [k, v] of Object.entries(rawData)) {
        if (Array.isArray(v)) {
          detailRows.push(
            new TableRow({
              children: [
                createCell(k, { bold: true }),
                createCell(`列表共 ${v.length} 条记录 (${JSON.stringify(v.slice(0, 3))}...)`)
              ]
            })
          );
        } else if (typeof v === 'object' && v !== null) {
          detailRows.push(
            new TableRow({
              children: [
                createCell(k, { bold: true }),
                createCell(JSON.stringify(v, null, 1))
              ]
            })
          );
        } else {
          detailRows.push(
            new TableRow({
              children: [
                createCell(k, { bold: true }),
                createCell(String(v))
              ]
            })
          );
        }
      }

      sections.push(
        new Table({
          width: { size: 10500, type: WidthType.DXA },
          borders: tableBorders,
          rows: detailRows
        }),
        new Paragraph({ spacing: { after: 120 }, children: [] })
      );
    }
  }

  // 构建文档
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1200, bottom: 1200, left: 1200, right: 1200 }
          }
        },
        children: sections
      }
    ]
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outputPath, buffer);
  return outputPath;
}
