import { NextResponse } from 'next/server';

export const maxDuration = 60; // Vercel Hobby supports up to 60s

// ── Yahoo Finance REST helper ────────────────────────────────
async function fetchYahoo(symbol, interval, range) {
  const encoded = encodeURIComponent(symbol);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encoded}?interval=${interval}&range=${range}&includeTimestamps=true`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Accept': 'application/json',
    },
  });
  if (!res.ok) throw new Error(`Yahoo Finance error ${res.status} for ${symbol}`);
  const json = await res.json();
  const result = json.chart?.result?.[0];
  if (!result) throw new Error(`No data returned for ${symbol}`);

  const timestamps = result.timestamp || [];
  const quote = result.indicators?.quote?.[0] || {};
  const { open = [], high = [], low = [], close = [] } = quote;

  return timestamps.map((ts, i) => ({
    date: new Date(ts * 1000),
    open: open[i],
    high: high[i],
    low:  low[i],
    close: close[i],
  })).filter(q => q.close != null);
}

// ── Gemini REST helper ──────────────────────────────────────
const delay = ms => new Promise(res => setTimeout(res, ms));

async function callGemini(apiKey, prompt, maxRetries = 2) {
  // Strategy 1: Fallback (Degradation) - Try 2.5, then 2.0, then 2.0-lite if limited
  const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite'];
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const model = models[Math.min(attempt, models.length - 1)];
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const body = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.15 },
    };
    
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errText = await res.text();
        const status = res.status;
        
        // 429 Too Many Requests or 503 Overloaded
        if (status === 429 || status === 503) {
          const errMsg = `Gemini rate limit / overload (${status})`;
          if (attempt < maxRetries) {
            // Strategy 2: Exponential Backoff (2s, 4s, 8s)
            const waitTime = Math.pow(2, attempt + 1) * 1000;
            console.warn(`[Attempt ${attempt + 1}] failed with ${status}. Retrying in ${waitTime/1000}s...`);
            await delay(waitTime);
            continue;
          }
          throw new Error(`${errMsg}: ${errText.slice(0, 200)}`);
        }
        throw new Error(`Gemini error ${status}: ${errText.slice(0, 400)}`);
      }
      
      const data = await res.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    } catch (err) {
      lastError = err;
      // If it's a structural error (not API limit or fetch error), break immediately
      if (!err.message.includes('429') && !err.message.includes('503') && !err.message.includes('fetch')) {
        throw err; 
      }
    }
  }
  throw lastError;
}

// ── Math helpers ─────────────────────────────────────────────
function sma(arr, w) {
  return arr.map((_, i) =>
    i < w - 1 ? null : arr.slice(i - w + 1, i + 1).reduce((a, b) => a + b, 0) / w
  );
}
function r2(n) { return n != null ? Math.round(n * 100) / 100 : null; }

// ── Fetch AI history from GAS ────────────────────────────────
async function getAIHistory(gasUrl) {
  try {
    const res = await fetch(`${gasUrl}?action=getAIHistory`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data.slice(-10) : []; // last 10 records
  } catch {
    return [];
  }
}

// ── Save AI decision to GAS ──────────────────────────────────
async function saveAIDecision(gasUrl, decision) {
  try {
    await fetch(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'saveAIDecision', ...decision }),
    });
  } catch (e) {
    console.warn('saveAIDecision failed:', e.message);
  }
}

// ── Main ─────────────────────────────────────────────────────
export async function GET() {
  try {
    const gasUrl = process.env.NEXT_PUBLIC_SHEET_API_URL;
    const apiKey  = process.env.GOOGLE_API_KEY;

    // ── 1. Fetch all data in parallel ────────────────────────
    const [mnqDaily, vixDaily, mnq60m, aiHistory] = await Promise.all([
      fetchYahoo('MNQ=F', '1d',  '1y'),
      fetchYahoo('^VIX',  '1d',  '5d'),
      fetchYahoo('MNQ=F', '60m', '60d'),
      gasUrl ? getAIHistory(gasUrl) : Promise.resolve([]),
    ]);

    if (!mnqDaily.length || !vixDaily.length) {
      return NextResponse.json({ error: 'No market data' }, { status: 500 });
    }

    // ── 2. Daily calcs ───────────────────────────────────────
    const closes     = mnqDaily.map(d => d.close);
    const highs      = mnqDaily.map(d => d.high);
    const lows       = mnqDaily.map(d => d.low);
    const amplitudes = mnqDaily.map(d => d.high - d.low);

    const sma5d   = sma(closes, 5);
    const sma20d  = sma(closes, 20);
    const sma60d  = sma(closes, 60);
    const amp20d  = sma(amplitudes, 20);

    const n     = mnqDaily.length;
    const yIdx  = n - 2; // yesterday (last completed bar)
    const yHigh  = r2(highs[yIdx]);
    const yLow   = r2(lows[yIdx]);
    const yClose = r2(closes[yIdx]);
    const avgAmp = r2(amp20d[yIdx]);
    const dSma5  = r2(sma5d[yIdx]);
    const dSma20 = r2(sma20d[yIdx]);
    const dSma60 = r2(sma60d[yIdx]);
    const dateStr = mnqDaily[n-1].date.toISOString().split('T')[0];
    const vixClose = r2(vixDaily[vixDaily.length - 1].close);

    // Pivot points (based on yesterday)
    const pivot = r2((yHigh + yLow + yClose) / 3);
    const r1Val = r2(2 * pivot - yLow);
    const r2Val = r2(pivot + (yHigh - yLow));
    const s1Val = r2(2 * pivot - yHigh);
    const s2Val = r2(pivot - (yHigh - yLow));

    // Daily trend label
    let dailyTrend;
    if (yClose < dSma5 && dSma5 < dSma20 && dSma20 < dSma60)
      dailyTrend = '📉 日K 強勢空頭排列 (長線壓制)';
    else if (yClose > dSma5 && dSma5 > dSma20 && dSma20 > dSma60)
      dailyTrend = '📈 日K 強勢多頭排列 (長線支撐)';
    else if (yClose < dSma60 && dSma5 < dSma20)
      dailyTrend = '🐻 日K 偏空震盪';
    else if (yClose > dSma60 && dSma5 > dSma20)
      dailyTrend = '🐂 日K 偏多震盪';
    else
      dailyTrend = '⚖️ 日K 均線糾結';

    // ── 3. 60m calcs ─────────────────────────────────────────
    const h1closes = mnq60m.map(d => d.close);
    const h1sma5   = sma(h1closes, 5);
    const h1sma20  = sma(h1closes, 20);
    const h1sma60  = sma(h1closes, 60);
    const last60   = mnq60m.length - 1;
    const curPrice = r2(h1closes[last60]);
    const h1s5     = r2(h1sma5[last60]);
    const h1s20    = r2(h1sma20[last60]);
    const h1s60    = r2(h1sma60[last60]);

    let h1Trend;
    if (curPrice < h1s5 && h1s5 < h1s20 && h1s20 < h1s60)
      h1Trend = '🔻 60分K 強勢空頭排列 (日內強空)';
    else if (curPrice > h1s5 && h1s5 > h1s20 && h1s20 > h1s60)
      h1Trend = '🔺 60分K 強勢多頭排列 (日內強多)';
    else if (curPrice < h1s60 && h1s5 < h1s20)
      h1Trend = '↘️ 60分K 偏空震盪 (反彈偏空)';
    else if (curPrice > h1s60 && h1s5 > h1s20)
      h1Trend = '↗️ 60分K 偏多震盪 (回踩偏多)';
    else
      h1Trend = '⏸️ 60分K 均線糾結 (方向不明)';

    // Intraday stats
    const todayOpen = r2(mnqDaily[n-1].open);
    const todayHigh = r2(mnqDaily[n-1].high);
    const todayLow  = r2(mnqDaily[n-1].low);
    const intradayAmp   = r2(todayHigh - todayLow);
    const ampExhaustion = avgAmp > 0 ? r2((intradayAmp / avgAmp) * 100) : 0;

    // ── 4. AI History summary for prompt ─────────────────────
    let historySummary = '（暫無歷史決策記錄）';
    if (aiHistory.length > 0) {
      // Strategy 3: Filtration (只抽最近 3 筆，精簡屬性長度)
      const recent = aiHistory.slice(-3);
      historySummary = recent.map((h, i) =>
        `[${h.Date || h.date || '未知'}]方向:${h.AI_Direction || h.direction},防守:${h.Stop_Loss || h.stopLoss},結果:${h.Outcome || h.outcome || '無'}`
      ).join(' | ');
    }

    // ── 5. Build Gemini prompt ────────────────────────────────
    const prompt = `你是一位頂級量化交易戰略總監，擅長使用【多時間框架分析 (MTFA)】。請根據「日K大局」與「60分K當沖動能」為今日的【2 口單當沖策略】給出明確的【具體進出場價格計畫】。

【1. 雙時間框架均線濾網 (核心判斷依據！)】
- 🌍 日K大格局 (大環境)：${dailyTrend}
- 🎯 60分K當沖方向 (日內動能)：${h1Trend}
👉 (總監守則：做當沖時，請以【60分K當沖方向】為主要下單依據！如果60分K已是多頭排列，就算日K是空頭排列，今日也應以「短多」為主，但預期利潤不宜看太遠。)
👉 如果60分K 與 日K 方向相反，請說明這是一個【逆勢反彈單】，風控需更嚴格。)

【2. 盤中即時狀態與防守點位】
- 開盤價：${todayOpen}
- 最新即時價格：${curPrice}
- 今日盤中最高：${todayHigh} / 最低：${todayLow}
- 今日盤中已走振幅：${intradayAmp} 點 (已消耗均振 ${avgAmp} 點的 ${ampExhaustion}%)
- VIX 恐慌指數：${vixClose}
- 樞紐點參考 (Pivot Points)：
  壓力：R1=${r1Val}, R2=${r2Val}
  中軸：Pivot=${pivot}
  支撐：S1=${s1Val}, S2=${s2Val}

【3. 過去 AI 決策歷史參考 (請學習歷史決策的準確性，強化判斷！)】
${historySummary}
👉 請參考歷史決策，特別注意「結果驗證」欄位，如果過去預測方向與市場實際相符，請強化相同邏輯；如果預測錯誤，請修正思路。

【分析與定價任務】
請評估「60分K當沖方向」決定做多/做空，並確保進場點不會追高殺低（參考已耗振幅）。
給出 2 口單的具體分批進出策略。

【輸出格式要求】(純 JSON 格式輸出，不要有其他文字)
{
  "regime": "trend_following / counter_trend / consolidation",
  "reasoning": "說明定調理由。必須解釋【日K】與【60分K】的互動關係，以及為何定出此方向。",
  "trade_direction": "Long (做多) / Short (做空) / Neutral (觀望)",
  "suggested_entry_zone": "具體的進場價格區間 (需參考樞紐點與最新價格)",
  "stop_loss_price": "明確的停損價格 (防守60分K均線或Pivot)",
  "target_prices": {
    "base_1": "第一口單目標價",
    "base_2": "第二口單目標價"
  },
  "strategy_advice": "針對此盤勢，給出2口單的進場手法、移動停損與加碼建議。"
}`;

    // ── 6. Gemini call (graceful fallback if quota exceeded) ─
    let aiDecision = {};
    let aiError = null;
    try {
      const rawText = await callGemini(apiKey, prompt);
      try { aiDecision = JSON.parse(rawText); }
      catch { aiDecision = { reasoning: rawText }; }
    } catch (geminiErr) {
      console.warn('Gemini call failed:', geminiErr.message);
      // Check if it's a quota/rate-limit error
      if (geminiErr.message.includes('429') || geminiErr.message.includes('quota')) {
        aiError = '⚠️ Gemini API 今日配額已達上限（免費版每日限制）。市場資料仍正常顯示，明日配額重置後可再使用 AI 分析。';
      } else {
        aiError = geminiErr.message;
      }
      // Provide a basic analysis from the indicators so the radar is still useful
      const dir = h1Trend.includes('多頭') ? 'Long (做多)' :
                  h1Trend.includes('空頭') ? 'Short (做空)' : 'Neutral (觀望)';
      aiDecision = {
        trade_direction: dir,
        regime: 'technical_only',
        reasoning: `AI 分析暫時無法使用（配額限制）。根據技術指標：${dailyTrend} / ${h1Trend}。Pivot=${pivot}，請參考樞紐點自行判斷進出場。`,
        suggested_entry_zone: `參考 Pivot=${pivot}, R1=${r1Val}, S1=${s1Val}`,
        stop_loss_price: `參考 ${dir.includes('Long') ? `S1=${s1Val}` : `R1=${r1Val}`}`,
        target_prices: { base_1: `${dir.includes('Long') ? r1Val : s1Val}`, base_2: `${dir.includes('Long') ? r2Val : s2Val}` },
        strategy_advice: '⚠️ AI 配額限制中，此為純技術指標建議，請謹慎操作。',
      };
    }

    // ── 7. Save AI decision to GAS (fire & forget, only when AI responded) ─
    if (gasUrl && !aiError) {
      saveAIDecision(gasUrl, {
        date: dateStr,
        aiDirection: aiDecision.trade_direction || '',
        entryZone: aiDecision.suggested_entry_zone || '',
        stopLoss: aiDecision.stop_loss_price || '',
        target1: aiDecision.target_prices?.base_1 || '',
        target2: aiDecision.target_prices?.base_2 || '',
        reasoning: aiDecision.reasoning || '',
        regime: aiDecision.regime || '',
        vix: vixClose,
        dailyTrend,
        h1Trend,
      });
    }

    // ── 8. Response ──────────────────────────────────────────
    return NextResponse.json({
      target_date: dateStr,
      ai_error: aiError || null,
      market_context: {
        daily_trend: dailyTrend, h1_trend: h1Trend,
        current_price: curPrice, today_open: todayOpen,
        intraday_high: todayHigh, intraday_low: todayLow,
        intraday_amplitude: intradayAmp, amplitude_exhaustion_rate: ampExhaustion,
        avg_amplitude_20d: avgAmp, vix_close: vixClose,
        pivot_points: { r2: r2Val, r1: r1Val, pivot, s1: s1Val, s2: s2Val },
      },
      ai_prediction: aiDecision,
      ai_history_count: aiHistory.length,
    });

  } catch (err) {
    console.error('refresh-radar error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
