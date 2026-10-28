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
  size: 6, // 约 0.75pt 标准黑色细实线
  color: '000000'
};

const redBorder = {
  style: BorderStyle.SINGLE,
  size: 12,
  color: 'C00000'
};

const standardTableBorders = {
  top: blackBorder,
  bottom: blackBorder,
  left: blackBorder,
  right: blackBorder,
  insideHorizontal: blackBorder,
  insideVertical: blackBorder
};

const alertTableBorders = {
  top: redBorder,
  bottom: redBorder,
  left: redBorder,
  right: redBorder,
  insideHorizontal: redBorder,
  insideVertical: redBorder
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
        size: 26, // 13pt 四号字
        color: '000000'
      })
    ]
  });
}

function createTextParagraph(text, { bold = false, spacingAfter = 100 } = {}) {
  return new Paragraph({
    spacing: { after: spacingAfter },
    children: [
      new TextRun({
        text,
        bold,
        color: '000000',
        font: FONT_FAMILY,
        size: 21 // 10.5pt 五号字
      })
    ]
  });
}

function createTableCell(content, { bold = false, fill = undefined, widthPercent = undefined, align = AlignmentType.LEFT, textColor = '000000' } = {}) {
  const children = Array.isArray(content)
    ? content
    : [
        new Paragraph({
          alignment: align,
          spacing: { before: 60, after: 60 },
          children: [
            new TextRun({
              text: String(content ?? ''),
              bold,
              font: FONT_FAMILY,
              size: 21,
              color: textColor
            })
          ]
        })
      ];

  const cellConfig = {
    children,
    margins: { top: 100, bottom: 100, left: 140, right: 140 }
  };

  if (fill) {
    cellConfig.shading = { fill };
  }
  if (widthPercent != null) {
    cellConfig.width = { size: widthPercent, type: WidthType.PERCENTAGE };
  }

  return new TableCell(cellConfig);
}

/**
 * 导出简约黑白专业排版的 Word (.docx) 极端环境探险生存决策研判报告
 * 严格包含数据完备率校验与情报盲区显式告警
 */
export async function exportReportToDocx({
  mission,
  report,
  payerAddress,
  consultUrl,
  txHash,
  latencyMs,
  outputPath
}) {
  const meta = report.filterMeta || {};
  const threats = Array.isArray(report.keyThreats) ? report.keyThreats : [];
  const directives = Array.isArray(report.actionDirectives) ? report.actionDirectives : [];
  const noiseReasons = meta.noiseRejectionReasons || {};
  const isDegraded = report.isDegraded || report.overallRisk === 'CRITICAL_DATA_DEFICIENCY';
  const completeness = report.dataCompletenessRate || (isDegraded ? '降级' : '100%');

  // 1. 标题区（简约居中黑字）
  const titleParagraph = new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 100 },
    children: [
      new TextRun({
        text: '全球极端环境与野外探险决策研判报告',
        bold: true,
        font: FONT_FAMILY,
        size: 36, // 18pt 小二
        color: '000000'
      })
    ]
  });

  const subtitleParagraph = new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 240 },
    children: [
      new TextRun({
        text: '基于 x402 协议与双智能体协同 (Level 2-B: DeepSeek Recon Commander)',
        font: FONT_FAMILY,
        size: 21,
        color: '333333'
      })
    ]
  });

  // 2. 基础元数据表格（简约黑色边框，表头淡灰底色）
  const metaRows = [
    new TableRow({
      children: [
        createTableCell('探险任务目标', { bold: true, fill: 'F2F2F2', widthPercent: 20 }),
        createTableCell(`${mission.name || '阿尔金山无人区'} ([${mission.lat}°N, ${mission.lon}°E])`, { widthPercent: 30 }),
        createTableCell('综合风险评级', { bold: true, fill: 'F2F2F2', widthPercent: 20 }),
        createTableCell(report.riskLabel || report.overallRisk || 'HIGH', { bold: true, widthPercent: 30, textColor: isDegraded ? 'C00000' : '000000' })
      ]
    }),
    new TableRow({
      children: [
        createTableCell('任务环境剖面', { bold: true, fill: 'F2F2F2', widthPercent: 20 }),
        createTableCell(mission.profile || '极端荒野重装徒步穿越', { widthPercent: 30 }),
        createTableCell('决策大模型', { bold: true, fill: 'F2F2F2', widthPercent: 20 }),
        createTableCell(`${meta.engine || 'DeepSeek-V3'} (${meta.model || 'deepseek-chat'})`, { widthPercent: 30 })
      ]
    }),
    new TableRow({
      children: [
        createTableCell('遥测完备率', { bold: true, fill: 'F2F2F2', widthPercent: 20 }),
        createTableCell(completeness, { bold: true, widthPercent: 30, textColor: isDegraded ? 'C00000' : '000000' }),
        createTableCell('情报置信状态', { bold: true, fill: 'F2F2F2', widthPercent: 20 }),
        createTableCell(isDegraded ? '⚠️ 存在情报盲区 (降级状态)' : '✅ 遥测完整闭环', { bold: true, widthPercent: 30, textColor: isDegraded ? 'C00000' : '006600' })
      ]
    }),
    new TableRow({
      children: [
        createTableCell('x402 服务定价', { bold: true, fill: 'F2F2F2', widthPercent: 20 }),
        createTableCell('0.005 USDC (Base Sepolia)', { widthPercent: 30 }),
        createTableCell('结算响应耗时', { bold: true, fill: 'F2F2F2', widthPercent: 20 }),
        createTableCell(`${latencyMs ? latencyMs + 'ms' : '即时清算'}`, { widthPercent: 30 })
      ]
    }),
    new TableRow({
      children: [
        createTableCell('付款方钱包地址', { bold: true, fill: 'F2F2F2', widthPercent: 20 }),
        createTableCell(payerAddress || '0x...', { widthPercent: 30 }),
        createTableCell('链上结算凭证 (Tx)', { bold: true, fill: 'F2F2F2', widthPercent: 20 }),
        createTableCell(txHash ? txHash.slice(0, 24) + '...' : '0x' + Array(40).fill('f').join(''), { widthPercent: 30 })
      ]
    }),
    new TableRow({
      children: [
        createTableCell('自主采纳微服务', { bold: true, fill: 'F2F2F2', widthPercent: 20 }),
        createTableCell(`${meta.selectedCount || 0} 个必要数据源`, { widthPercent: 30 }),
        createTableCell('自主排除微服务', { bold: true, fill: 'F2F2F2', widthPercent: 20 }),
        createTableCell(`${meta.filteredCount || Object.keys(noiseReasons).length || 0} 个无关服务（节省预算）`, { widthPercent: 30 })
      ]
    })
  ];

  const metaTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: standardTableBorders,
    rows: metaRows
  });

  // -------------------------------------------------------------
  // 🚨 核心防线：情报盲区特级警示专区（如果存在缺失或降级，醒目高亮置顶）
  // -------------------------------------------------------------
  const alertSection = isDegraded ? [
    new Paragraph({ spacing: { before: 180, after: 80 } }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: alertTableBorders,
      rows: [
        new TableRow({
          children: [
            createTableCell([
              new Paragraph({
                spacing: { before: 80, after: 60 },
                children: [
                  new TextRun({
                    text: '【🚨 关键环境遥测缺失与数据盲区特级警示】',
                    bold: true,
                    font: FONT_FAMILY,
                    size: 24,
                    color: 'C00000'
                  })
                ]
              }),
              new Paragraph({
                spacing: { before: 40, after: 80 },
                children: [
                  new TextRun({
                    text: `警示说明：本次战地参谋研判是在部分或全部环境遥测微服务采集失败的状态下生成的（数据完备率仅为 ${completeness}）！\n失联/缺失微服务：${Array.isArray(report.dataBlindSpots) && report.dataBlindSpots.length > 0 ? report.dataBlindSpots.map(b => `${b.id} (${b.error || '未响应'})`).join('、') : '多项关键服务失联'}\n指挥官红线红牌：严禁将本报告视为全面安全的行动通行许可！盲区代表不可预知的未知致命风险，探险全队必须提高戒备，在未获得实测数据前严禁冒进！`,
                    font: FONT_FAMILY,
                    size: 20,
                    color: '333333'
                  })
                ]
              })
            ], { widthPercent: 100, fill: 'FFF5F5' })
          ]
        })
      ]
    })
  ] : [];

  // 3. 战地参谋长核心态势裁决
  const executiveSection = [
    createHeading('一、 战地参谋长核心态势裁决'),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: standardTableBorders,
      rows: [
        new TableRow({
          children: [
            createTableCell([
              new Paragraph({
                spacing: { before: 80, after: 80 },
                children: [
                  new TextRun({
                    text: report.executiveSummary || '根据多源环境数据综合推演，已完成战地态势研判。',
                    font: FONT_FAMILY,
                    size: 21,
                    bold: true,
                    color: '000000'
                  })
                ]
              })
            ], { widthPercent: 100 })
          ]
        })
      ]
    })
  ];

  // 4. 前线致命威胁与次生风险清单
  const threatsSection = [
    createHeading('二、 前线核心致命威胁与次生风险清单'),
    ...threats.map((threat, idx) =>
      new Paragraph({
        spacing: { after: 80 },
        children: [
          new TextRun({
            text: `【威胁 ${idx + 1}】 `,
            bold: true,
            color: (idx === 0 && isDegraded) ? 'C00000' : '000000',
            font: FONT_FAMILY,
            size: 21
          }),
          new TextRun({
            text: threat,
            font: FONT_FAMILY,
            color: '000000',
            size: 21
          })
        ]
      })
    )
  ];

  // 5. 探险指挥部核心行动指令
  const directivesSection = [
    createHeading('三、 探险指挥部核心行动禁令与指南'),
    ...directives.map((directive, idx) =>
      new Paragraph({
        spacing: { after: 80 },
        children: [
          new TextRun({
            text: `【指令 ${idx + 1}】 `,
            bold: true,
            color: '000000',
            font: FONT_FAMILY,
            size: 21
          }),
          new TextRun({
            text: directive,
            font: FONT_FAMILY,
            color: '000000',
            size: 21
          })
        ]
      })
    )
  ];

  // 6. 微服务遥测与实测环境诊断表格
  const apiNameMap = {
    earthquake: '近场地震与断裂带活动监测 [地质/geology]',
    storm: '极端气象与温风雨雪监测 [气象/meteorology]',
    flood: '流域水文与洪涝漫滩预测 [水文/hydrology]',
    terrain: '数字高程与地形坡度勘测 [地形/topography]',
    dust: '大气沙尘与颗粒物浓度监测 [环境/air_quality]',
    sunlight: '天文日照与晨昏蒙影窗口 [天文/astronomy]',
    geomagnetic: '空间天气与地磁暴监测 [空间天气/space_weather]',
    forex: '国际外汇法定货币汇率牌价 [金融外汇/foreign_exchange]',
    catfact: '猫科动物科普与生物事实 [生物科普/feline_zoology]',
    crypto: '加密数字货币行情走势 [数字资产/cryptocurrency]',
    iss: '国际空间站轨道天顶轨迹 [航天轨道/orbital_tracking]'
  };

  let diagRows = [];
  if (Array.isArray(report.diagnosticsList) && report.diagnosticsList.length > 0) {
    diagRows = [
      new TableRow({
        children: [
          createTableCell('微服务标识', { bold: true, fill: 'F2F2F2', widthPercent: 20 }),
          createTableCell('服务名称与专业领域', { bold: true, fill: 'F2F2F2', widthPercent: 32 }),
          createTableCell('遥测实测结论与采集状态', { bold: true, fill: 'F2F2F2', widthPercent: 48 })
        ]
      }),
      ...report.diagnosticsList.map(item => {
        const isFailed = item.status === 'FAILED';
        return new TableRow({
          children: [
            createTableCell(item.id, { bold: true, widthPercent: 20 }),
            createTableCell(apiNameMap[item.id] || item.id, { widthPercent: 32 }),
            createTableCell(item.summary, {
              widthPercent: 48,
              bold: isFailed,
              textColor: isFailed ? 'C00000' : '000000',
              fill: isFailed ? 'FFF5F5' : undefined
            })
          ]
        });
      })
    ];
  } else {
    // 兼容历史老结构
    const diag = report.dimensionDiagnostics || {};
    const dimensionData = [
      { name: '1. 地壳活动与崩塌', service: '/api/survival/earthquake (USGS)', desc: diag.geologicalHazard || '未采集' },
      { name: '2. 极端风暴气象', service: '/api/survival/storm (Open-Meteo)', desc: diag.stormColdHypothermia || '未采集' },
      { name: '3. 水文流域漫滩', service: '/api/survival/flood (GloFAS)', desc: diag.hydrologyFlood || '未采集' },
      { name: '4. 地形高程与坡度', service: '/api/survival/terrain (Copernicus DEM)', desc: diag.terrainSlopeAltitude || '未采集' },
      { name: '5. 沙尘黑风暴浓度', service: '/api/survival/dust (Air Quality)', desc: diag.dustSandstormVisibility || '未采集' },
      { name: '6. 日照天光生存窗口', service: '/api/survival/sunlight (Sunrise-Sunset)', desc: diag.sunlightSurvivalWindow || '未采集' },
      { name: '7. 空间天气通信生命', service: '/api/survival/geomagnetic (NOAA SWPC)', desc: diag.commsNavigationLifeline || '未采集' }
    ];

    diagRows = [
      new TableRow({
        children: [
          createTableCell('监测维度', { bold: true, fill: 'F2F2F2', widthPercent: 22 }),
          createTableCell('微服务数据源', { bold: true, fill: 'F2F2F2', widthPercent: 30 }),
          createTableCell('遥测诊断与状态', { bold: true, fill: 'F2F2F2', widthPercent: 48 })
        ]
      }),
      ...dimensionData.map(d =>
        new TableRow({
          children: [
            createTableCell(d.name, { bold: true, widthPercent: 22 }),
            createTableCell(d.service, { widthPercent: 30 }),
            createTableCell(d.desc, { widthPercent: 48 })
          ]
        })
      )
    ];
  }

  const diagSection = [
    createHeading('四、 微服务遥测与实测环境诊断详情'),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: standardTableBorders,
      rows: diagRows
    })
  ];

  // 7. 服务端智能体数据筛选与排除存证库（黑色边框）
  const rejectedIds = Object.keys(noiseReasons);
  const noiseRows = [
    new TableRow({
      children: [
        createTableCell('服务 ID', { bold: true, fill: 'F2F2F2', widthPercent: 18 }),
        createTableCell('微服务名称与领域', { bold: true, fill: 'F2F2F2', widthPercent: 32 }),
        createTableCell('参谋智能体自主排除逻辑与因果剖析', { bold: true, fill: 'F2F2F2', widthPercent: 50 })
      ]
    }),
    ...(rejectedIds.length > 0
      ? rejectedIds.map(id =>
          new TableRow({
            children: [
              createTableCell(id, { bold: true, widthPercent: 18 }),
              createTableCell(apiNameMap[id] || id, { widthPercent: 32 }),
              createTableCell(noiseReasons[id] || '经任务剖面因果分析，与当前目标缺乏现实关联，排除以节省预算。', { widthPercent: 50 })
            ]
          })
        )
      : [
          new TableRow({
            children: [
              createTableCell('无', { widthPercent: 18 }),
              createTableCell('未排除任何数据源', { widthPercent: 32 }),
              createTableCell('所有可用微服务数据源均已采纳。', { widthPercent: 50 })
            ]
          })
        ])
  ];

  const noiseSection = [
    createHeading('五、 参谋智能体微服务自主排除与预算节约存证'),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: standardTableBorders,
      rows: noiseRows
    })
  ];

  // 8. 链上合规与声明
  const footerSection = [
    createHeading('六、 链上结算与合规审计说明'),
    createTextParagraph('1. 本报告由客户端自主调用服务端 `/api/agent/consult` 端点生成，符合 x402 开放微支付协议标准规范。'),
    createTextParagraph('2. 结算网络采用 Base Sepolia 测试网 (Chain ID: 84532)，USDC 智能合约地址为 0x036CbD53842c5426634e7929541eC2318f3dCF7e。'),
    createTextParagraph('3. 客户端付款钱包私钥独立管理，服务端严格物理单向解耦，实现敏感凭证零泄露安全规范。'),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 180 },
      children: [
        new TextRun({
          text: `报告出具时间: ${new Date().toLocaleString('zh-CN')} | 状态: 已清算`,
          font: FONT_FAMILY,
          size: 18,
          color: '333333'
        })
      ]
    })
  ];

  // 组装文档
  const doc = new Document({
    creator: 'DeepSeek Recon Broker Agent',
    title: '极端环境决策研判报告',
    description: 'Level 2-B 双智能体协同探险决策报告',
    sections: [
      {
        properties: {},
        children: [
          titleParagraph,
          subtitleParagraph,
          metaTable,
          ...alertSection,
          ...executiveSection,
          ...threatsSection,
          ...directivesSection,
          ...diagSection,
          ...noiseSection,
          ...footerSection
        ]
      }
    ]
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outputPath, buffer);
  return outputPath;
}
