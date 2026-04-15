"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Loader2, AlertCircle } from 'lucide-react';

export default function EquityCurveChart() {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchTrades() {
      try {
        const res = await fetch('/api/sheet-trades', { cache: 'no-store' });
        if (!res.ok) throw new Error(`API error ${res.status}`);
        const data = await res.json();
        setTrades(Array.isArray(data) ? data : []);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    fetchTrades();
  }, []);

  const chartData = useMemo(() => {
    // Accept both field name formats (Chinese headers or English keys)
    const pnlKey = Object.keys(trades[0] || {}).find(k =>
      k === 'profit' || k === 'pnl' || k === '損益' || k === 'pnl_usd'
    ) || 'profit';
    const dateKey = Object.keys(trades[0] || {}).find(k =>
      k === 'date' || k === '日期'
    ) || 'date';
    const dirKey = Object.keys(trades[0] || {}).find(k =>
      k === 'direction' || k === '方向'
    ) || 'direction';

    let cumulative = 0;
    return trades
      .filter(t => t[pnlKey] !== '' && t[pnlKey] != null)
      .map((t, i) => {
        const pnl = parseFloat(t[pnlKey]) || 0;
        cumulative += pnl;
        return {
          tradeId: i + 1,
          date: String(t[dateKey] || '').slice(0, 10),
          direction: t[dirKey] || '',
          pnl: Math.round(pnl * 100) / 100,
          cumulativePnl: Math.round(cumulative * 100) / 100,
        };
      });
  }, [trades]);

  const totalReturn = chartData.length > 0 ? chartData[chartData.length - 1].cumulativePnl : 0;
  const isPositive = totalReturn >= 0;
  const winCount  = chartData.filter(d => d.pnl > 0).length;
  const lossCount = chartData.filter(d => d.pnl < 0).length;
  const winRate   = chartData.length > 0 ? Math.round((winCount / chartData.length) * 100) : 0;

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const p = payload[0].payload;
      return (
        <div className="glass-panel" style={{ padding: '12px', minWidth: '200px', zIndex: 10 }}>
          <div className="text-small" style={{ marginBottom: '8px' }}>Trade #{p.tradeId} • {p.date}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>方向</span>
            <span style={{ fontWeight: 600 }}>{p.direction}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>單筆損益</span>
            <span style={{ fontWeight: 600, color: p.pnl >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
              {p.pnl >= 0 ? '+' : ''}{p.pnl}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-secondary)' }}>累計損益</span>
            <span style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>{p.cumulativePnl}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="glass-panel animate-fade-in" style={{ gridColumn: '1 / -1', height: '460px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
          <TrendingUp size={24} className="glow-text" />
          資金曲線 (Equity Curve)
          {loading && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite', opacity: 0.6 }} />}
        </h2>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div className="text-small" style={{ opacity: 0.7 }}>
            勝率 <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>{winRate}%</span>
            &nbsp;({winCount}勝 / {lossCount}敗)
          </div>
          <div className="glow-box" style={{
            background: 'var(--bg-main)', padding: '8px 16px', borderRadius: '8px',
            display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--border-light)'
          }}>
            <span className="text-small">總累計損益</span>
            <span className="gradient-text" style={{ fontSize: '1.25rem', fontWeight: 600, color: isPositive ? 'var(--color-success)' : 'var(--color-danger)' }}>
              {isPositive ? '+' : ''}{totalReturn}
            </span>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, width: '100%', minHeight: 0 }}>
        {error ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '8px', opacity: 0.7 }}>
            <AlertCircle size={18} />
            <span>無法載入交易資料：{error}</span>
          </div>
        ) : loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.6 }}>
            載入交易紀錄中...
          </div>
        ) : chartData.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.6 }}>
            尚無交易紀錄
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorPnl" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={isPositive ? 'var(--color-success)' : 'var(--color-danger)'} stopOpacity={0.4}/>
                  <stop offset="95%" stopColor={isPositive ? 'var(--color-success)' : 'var(--color-danger)'} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" vertical={false} />
              <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false}
                tickFormatter={v => v.slice(5)} // show MM-DD only
              />
              <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false}
                tickFormatter={v => v >= 0 ? `+${v}` : `${v}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="cumulativePnl"
                stroke={isPositive ? 'var(--color-success)' : 'var(--color-danger)'}
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorPnl)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
