import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Gemini Helper
const delay = ms => new Promise(res => setTimeout(res, ms));

async function callGemini(apiKey, prompt, maxRetries = 2) {
  const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite'];
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const model = models[Math.min(attempt, models.length - 1)];
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const body = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7 }, // Higher temperature for more "personality"
    };
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const status = res.status;
        if (status === 429 || status === 503) {
          if (attempt < maxRetries) {
            await delay(Math.pow(2, attempt + 1) * 1000);
            continue;
          }
        }
        const errText = await res.text();
        throw new Error(`Gemini error ${status}: ${errText.slice(0, 200)}`);
      }
      const data = await res.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || '風控長正在休息中...';
    } catch (err) {
      lastError = err;
      if (!err.message.includes('429') && !err.message.includes('503')) throw err;
    }
  }
  throw lastError;
}

export async function GET() {
  const apiKey = process.env.GOOGLE_API_KEY;
  const gasUrl = process.env.NEXT_PUBLIC_SHEET_API_URL;

  if (!apiKey || !gasUrl) {
    return NextResponse.json({ error: 'Missing configuration' }, { status: 500 });
  }

  try {
    // 1. Fetch trades
    const resTrades = await fetch(gasUrl, { cache: 'no-store' });
    if (!resTrades.ok) throw new Error('Failed to fetch trades from Sheet');
    const allTrades = await resTrades.json();

    // 2. Filter today's trades (TPE Time)
    const todayStr = new Date().toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');
    const todayTrades = allTrades.filter(t => {
        const tDate = (t.date || t['日期'] || '').split('T')[0];
        return tDate === todayStr;
    });

    // 3. Prepare prompt
    const systemInstruction = `
你現在是一位華爾街頂級量化基金的「風控長兼頂級超盤手」。
你的任務是審查交易員（我）今天的交易紀錄，並給出理性的檢討。
請根據以下三個維度進行分析，語氣要專業、犀利且帶點嚴厲的長官口吻：
1. 停損紀律：是否有移動停損、放任虧損擴大的「凹單」行為？
2. 情緒控管：是否有在短時間內連續下單的「報復性交易 (Revenge Trading)」或衝動進場？
3. 風控結論：總結今天的表現，並給出一句嚴厲的警告或明日操作守則。

輸出格式：請使用 Markdown 格式，適當使用加粗、列表，讓排版看起來像正式的複盤報告。
`;

    let prompt = "";
    if (todayTrades.length === 0) {
      prompt = `${systemInstruction}\n\n目前今天還沒有任何交易紀錄。請給出一段針對「NQ 納斯達克期貨」開盤前的心理建設與風控提醒，這是一個「賽前鼓勵」，但依然要保持嚴肅的專業形象。`;
    } else {
      const tradesSummary = todayTrades.map(t => ({
        方向: t.direction || t['方向'],
        口數: t.quantity || t['口數'],
        進場: t.entryPrice || t['進場'],
        出場: t.exitPrice || t['出場'],
        損益: t.profit || t['損益'],
        理由: t.reason || t['理由'],
        衝動交易: t.isImpulsive || t['衝動交易'] ? '是' : '否'
      }));
      prompt = `${systemInstruction}\n\n以下是今天的當沖交易紀錄：\n${JSON.stringify(tradesSummary, null, 2)}\n\n請開始你的風控檢討與點評。`;
    }

    // 4. Call AI
    const analysis = await callGemini(apiKey, prompt);

    return NextResponse.json({ analysis, count: todayTrades.length });
  } catch (err) {
    console.error('Risk Director API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
