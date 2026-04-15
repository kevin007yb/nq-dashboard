"use client";

import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, DollarSign } from 'lucide-react';
import quantData from '../data/quant_history.json';

export default function EquityCurveChart() {
  const data = useMemo(() => {
    let cumulative = 0;
    return quantData.map((d, index) => {
      cumulative += d.pnl_usd || 0;
      return {
        tradeId: index + 1,
        date: d.date,
        ticker: d.ticker,
        direction: d.direction,
        pnl: d.pnl_usd,
        cumulativePnl: cumulative,
        emotion: d.emotion_tag
      };
    });
  }, []);

  const totalReturn = data.length > 0 ? data[data.length - 1].cumulativePnl : 0;
  const isPositive = totalReturn >= 0;

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const p = payload[0].payload;
      return (
        <div className="glass-panel" style={{ padding: '12px', minWidth: '200px', zIndex: 10 }}>
          <div className="text-small" style={{ marginBottom: '8px' }}>Trade #{p.tradeId} • {p.date}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>標的</span>
            <span style={{ fontWeight: 600 }}>{p.ticker} ({p.direction})</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>單筆 PnL</span>
            <span style={{ fontWeight: 600, color: p.pnl >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
              ${p.pnl}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-secondary)' }}>累計 PnL</span>
            <span style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>
              ${p.cumulativePnl}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="glass-panel animate-fade-in" style={{ gridColumn: '1 / -1', height: '450px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
          <TrendingUp size={24} className="glow-text" /> 
          資金曲線 (Equity Curve)
        </h2>
        <div className="glow-box" style={{ 
          background: 'var(--bg-main)', padding: '8px 16px', borderRadius: '8px', 
          display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--border-light)'
        }}>
          <span className="text-small">總累計盈虧</span>
          <span className="gradient-text" style={{ fontSize: '1.25rem', fontWeight: 600 }}>
            {isPositive ? '+' : ''}${totalReturn}
          </span>
        </div>
      </div>
      
      <div style={{ flex: 1, width: '100%', minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorPnl" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--accent-primary)" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" vertical={false} />
            <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
            <Tooltip content={<CustomTooltip />} />
            <Area 
              type="monotone" 
              dataKey="cumulativePnl" 
              stroke="var(--accent-primary)" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorPnl)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
