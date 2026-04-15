import { NextResponse } from 'next/server';

// Direct Gemini REST call to avoid SDK endpoint resolution issues
async function callGemini(apiKey, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: 'application/json', temperature: 0.1 },
  };
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${errText.slice(0, 300)}`);
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
}

// ── helpers ─────────────────────────────────────────────────
function sma(arr, window) {
  const result = new Array(arr.length).fill(null);
  for (let i = window - 1; i < arr.length; i++) {
    const slice = arr.slice(i - window + 1, i + 1);
    result[i] = slice.reduce((a, b) => a + b, 0) / window;
  }
  return result;
}
function round2(n) { return n != null ? Math.round(n * 100) / 100 : null; }

// ── main ────────────────────────────────────────────────────
export async function GET() {
  try {
    const YFClass = (await import('yahoo-finance2')).default;
    const yf = new YFClass({ suppressNotices: ['ripHistorical'] });
    const now = new Date();

    // ── 1. Fetch all data in parallel ────────────────────
    const [mnqChartDaily, vixChartDaily, mnqChart60m] = await Promise.all([
      // Daily chart for SMA / pivot calcs – 300 days back
      yf.chart('MNQ=F', { period1: new Date(Date.now() - 300 * 86400000), period2: now, interval: '1d' }),
      // VIX daily for latest close
      yf.chart('^VIX',  { period1: new Date(Date.now() -   5 * 86400000), period2: now, interval: '1d' }),
      // 60m chart, ~120 days back (enough for SMA 60)
      yf.chart('MNQ=F', { period1: new Date(Date.now() - 120 * 86400000), period2: now, interval: '60m' }),
    ]);

    // Extract quotes (filter out nulls)
    const mnqDaily = (mnqChartDaily.quotes || []).filter(q => q.close != null);
    const vixDaily = (vixChartDaily.quotes  || []).filter(q => q.close != null);
    const mnq60m   = (mnqChart60m.quotes    || []).filter(q => q.close != null);

    if (!mnqDaily.length || !vixDaily.length || !mnq60m.length) {
      return NextResponse.json({ error: 'No market data returned' }, { status: 500 });
    }

    // ── 2. Daily calcs ────────────────────────────────────
    const closes     = mnqDaily.map(d => d.close);
    const highs      = mnqDaily.map(d => d.high);
    const lows       = mnqDaily.map(d => d.low);
    const amplitudes = mnqDaily.map(d => d.high - d.low);

    const sma5d  = sma(closes, 5);
    const sma20d = sma(closes, 20);
    const sma60d = sma(closes, 60);
    const amp20d = sma(amplitudes, 20);

    const n = mnqDaily.length;
    // "yesterday" = second-to-last completed bar
    const yIdx    = n - 2;
    const yHigh   = round2(highs[yIdx]);
    const yLow    = round2(lows[yIdx]);
    const yClose  = round2(closes[yIdx]);
    const yAmp    = round2(amplitudes[yIdx]);
    const avgAmp  = round2(amp20d[yIdx]);
    const d_sma5  = round2(sma5d[yIdx]);
    const d_sma20 = round2(sma20d[yIdx]);
    const d_sma60 = round2(sma60d[yIdx]);
    const dateStr = mnqDaily[n - 1].date?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0];
    const vixClose = round2(vixDaily[vixDaily.length - 1].close);

    // Pivot
    const pivot = round2((yHigh + yLow + yClose) / 3);
    const r1 = round2(2 * pivot - yLow);
    const r2 = round2(pivot + (yHigh - yLow));
    const s1 = round2(2 * pivot - yHigh);
    const s2 = round2(pivot - (yHigh - yLow));

    // Daily trend
    let dailyTrend;
    if (yClose < d_sma5 && d_sma5 < d_sma20 && d_sma20 < d_sma60)
      dailyTrend = '📉 日K 強勢空頭排列 (長線壓制)';
    else if (yClose > d_sma5 && d_sma5 > d_sma20 && d_sma20 > d_sma60)
      dailyTrend = '📈 日K 強勢多頭排列 (長線支撐)';
    else if (yClose < d_sma60 && d_sma5 < d_sma20)
      dailyTrend = '🐻 日K 偏空震盪';
    else if (yClose > d_sma60 && d_sma5 > d_sma20)
      dailyTrend = '🐂 日K 偏多震盪';
    else
      dailyTrend = '⚖️ 日K 均線糾結';

    // ── 3. 60m calcs ─────────────────────────────────────
    const h1closes = mnq60m.map(d => d.close);
    const h1sma5   = sma(h1closes, 5);
    const h1sma20  = sma(h1closes, 20);
    const h1sma60  = sma(h1closes, 60);
    const last60   = mnq60m.length - 1;
    const curPrice = round2(h1closes[last60]);
    const h1s5     = round2(h1sma5[last60]);
    const h1s20    = round2(h1sma20[last60]);
    const h1s60    = round2(h1sma60[last60]);

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

    // Intraday stats from latest daily bar
    const todayOpen = round2(mnqDaily[n - 1].open);
    const todayHigh = round2(mnqDaily[n - 1].high);
    const todayLow  = round2(mnqDaily[n - 1].low);
    const intradayAmp = round2(todayHigh - todayLow);
    const ampExhaustion = avgAmp > 0 ? round2((intradayAmp / avgAmp) * 100) : 0;

    // ── 4. Gemini prompt ──────────────────────────────────
    const prompt = `你是一位頂級量化交易戰略總監，擅長使用【多時間框架分析 (MTFA)】。請根據「日K大局」與「60分K當沖動能」為今日的【2 口單當沖策略】給出明確的【具體進出場價格計畫】。

【1. 雙時間框架均線濾網 (核心判斷依據！)】
- 🌍 日K大格局：${dailyTrend}
- 🎯 60分K當沖方向：${h1Trend}
👉 (總監守則：以【60分K當沖方向】為主要依據)

【2. 盤中即時狀態與防守點位】
- 開盤價：${todayOpen}
- 最新即時價格：${curPrice}
- 今日盤中最高：${todayHigh} / 最低：${todayLow}
- 今日盤中已走振幅：${intradayAmp} 點 (已消耗均振 ${avgAmp} 點的 ${ampExhaustion}%)
- VIX 恐慌指數：${vixClose}
- 樞紐點：R2=${r2}, R1=${r1}, Pivot=${pivot}, S1=${s1}, S2=${s2}

【輸出格式要求】(純 JSON，不要有其他文字)
{
  "regime": "trend_following / counter_trend / consolidation",
  "reasoning": "說明定調理由，必須解釋日K與60分K互動關係",
  "trade_direction": "Long (做多) / Short (做空) / Neutral (觀望)",
  "suggested_entry_zone": "具體的進場價格區間",
  "stop_loss_price": "明確的停損價格",
  "target_prices": { "base_1": "第一口單目標價", "base_2": "第二口單目標價" },
  "strategy_advice": "針對此盤勢，給出 2 口單的進場手法與移動停損建議"
}`;

    // ── 5. Gemini call ────────────────────────────────────
    const rawText = await callGemini(process.env.GOOGLE_API_KEY, prompt);
    let aiDecision = null;
    try { aiDecision = JSON.parse(rawText); }
    catch { aiDecision = { reasoning: rawText }; }


    // ── 6. Response ───────────────────────────────────────
    return NextResponse.json({
      target_date: dateStr,
      market_context: {
        daily_trend: dailyTrend, h1_trend: h1Trend,
        current_price: curPrice, today_open: todayOpen,
        intraday_high: todayHigh, intraday_low: todayLow,
        intraday_amplitude: intradayAmp, amplitude_exhaustion_rate: ampExhaustion,
        avg_amplitude_20d: avgAmp, vix_close: vixClose,
        yesterday_amplitude: yAmp,
        pivot_points: { r2, r1, pivot, s1, s2 },
      },
      ai_prediction: aiDecision,
    });

  } catch (err) {
    console.error('refresh-radar error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
