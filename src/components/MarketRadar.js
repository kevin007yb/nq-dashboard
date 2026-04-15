"use client";

import React, { useState, useEffect } from 'react';
import { Activity, Crosshair, Target, RefreshCw, Loader2, TrendingDown, TrendingUp, BarChart2 } from 'lucide-react';
import staticData from '../data/ai_history.json';
import './MarketRadar.css';

export default function MarketRadar() {
  const [radarData, setRadarData] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  // Load static data on mount as default
  useEffect(() => {
    if (staticData && staticData.length > 0) {
      setRadarData(staticData[staticData.length - 1]); // latest entry
    }
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      const res = await fetch('/api/refresh-radar');
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setRadarData(data);
      setLastRefreshed(new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err) {
      setError(err.message);
    } finally {
      setIsRefreshing(false);
    }
  };

  if (!radarData) return (
    <div className="glass-panel animate-fade-in" style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
      <Loader2 size={24} className="animate-spin" style={{ margin: 'auto' }} />
    </div>
  );

  const { market_context, ai_prediction } = radarData;
  const isHighVix = (market_context?.vix_close || 0) > 25;
  const exhaustion = market_context?.amplitude_exhaustion_rate || 0;
  const isExhausted = exhaustion > 70;

  return (
    <div className="glass-panel animate-fade-in" style={{ gridColumn: '1 / -1' }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
          <Activity size={24} className="glow-text" />
          AI 行情預測雷達
        </h2>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {lastRefreshed && (
            <span className="text-small" style={{ color: 'var(--color-success)' }}>
              ✓ 已於 {lastRefreshed} 即時刷新
            </span>
          )}
          <span className="badge badge-accent" style={{ fontSize: '0.7rem' }}>
            Auto Refresh: 21:35 (TPE)
          </span>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: 'var(--accent-primary)', color: '#000',
              border: 'none', borderRadius: '8px', padding: '8px 16px',
              fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
              opacity: isRefreshing ? 0.7 : 1, transition: 'opacity 0.2s',
            }}
          >
            {isRefreshing
              ? <><Loader2 size={16} className="animate-spin" /> 分析中...</>
              : <><RefreshCw size={16} /> 即時刷新 AI</>
            }
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: 'var(--color-danger-bg)', border: '1px solid var(--color-danger)', borderRadius: '8px', padding: '12px', marginBottom: '16px', color: 'var(--color-danger)', fontSize: '0.85rem' }}>
          ⚠️ 刷新失敗：{error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        {/* ── Left Column ── */}
        <div style={{ flex: '1 1 400px' }}>
          {/* Trend badges */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <span className="badge" style={{ background: 'var(--bg-main)', border: '1px solid var(--border-light)', gap: '4px' }}>
              {market_context?.daily_trend || market_context?.trend_structure}
            </span>
            <span className="badge" style={{ background: 'var(--bg-main)', border: '1px solid var(--border-light)' }}>
              {market_context?.h1_trend}
            </span>
            <span className={`badge ${isHighVix ? 'badge-danger' : 'badge-success'}`}>
              VIX: {market_context?.vix_close}
            </span>
          </div>

          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
            {[
              { label: '開盤價', value: market_context?.today_open || market_context?.current_price || '--', sub: 'Open' },
              { label: '目前即時價', value: market_context?.current_price || '--', sub: 'Live Price' },
              { label: '當日振幅', value: market_context?.intraday_amplitude || '--', sub: `H:${market_context?.intraday_high || '--'} L:${market_context?.intraday_low || '--'}` },
              {
                label: '振幅消耗',
                value: `${exhaustion}%`,
                sub: `均振 ${market_context?.avg_amplitude_20d || '--'}`,
                color: isExhausted ? 'var(--color-danger)' : 'var(--color-success)',
              },
            ].map((item, i) => (
              <div key={i} style={{ background: 'rgba(255,107,0,0.05)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                <div className="text-small">{item.label}</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: item.color || 'var(--text-primary)', margin: '4px 0 2px' }}>{item.value}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{item.sub}</div>
              </div>
            ))}
          </div>

          {/* AI Reasoning */}
          <div style={{ background: 'var(--bg-main)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Target size={18} className="glow-text" />
              <span style={{ fontWeight: 600 }}>AI 大腦思路</span>
            </div>
            <p className="text-small" style={{ lineHeight: '1.7' }}>{ai_prediction?.reasoning || '尚無預測，請點擊「即時刷新 AI」取得分析'}</p>
          </div>
        </div>

        {/* ── Right Column: Strategy ── */}
        <div style={{ flex: '1 1 300px' }}>
          <div style={{ background: 'rgba(255, 107, 0, 0.05)', border: '1px solid var(--border-accent)', padding: '20px', borderRadius: '12px', height: '100%' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '20px', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Crosshair size={18} /> 戰略目標位階
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div>
                <div className="text-small">方向建議</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, marginTop: '4px' }}>
                  {ai_prediction?.trade_direction || '--'}
                </div>
              </div>
              <div>
                <div className="text-small">進場區間 (Zone)</div>
                <div style={{ fontSize: '1rem', fontWeight: 600, marginTop: '4px', lineHeight: 1.4 }}>
                  {ai_prediction?.suggested_entry_zone || '--'}
                </div>
              </div>
              <div>
                <div className="text-small">一壘目標 (Base 1)</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--accent-secondary)', marginTop: '4px' }}>
                  {ai_prediction?.target_prices?.base_1 || ai_prediction?.base_1_points || '--'}
                </div>
              </div>
              <div>
                <div className="text-small">二壘目標 (Base 2)</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--accent-secondary)', marginTop: '4px' }}>
                  {ai_prediction?.target_prices?.base_2 || ai_prediction?.base_2_points || '--'}
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-accent)', paddingTop: '16px', marginBottom: '16px' }}>
              <div className="text-small">🛑 防守點位 (Stop Loss)</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-danger)', marginTop: '4px' }}>
                {ai_prediction?.stop_loss_price || '--'}
              </div>
            </div>

            {/* Pivot Points */}
            <div style={{ background: 'var(--bg-main)', borderRadius: '8px', padding: '12px' }}>
              <div className="text-small" style={{ marginBottom: '8px' }}>📐 樞紐點位 (Pivot)</div>
              {(() => {
                const pp = market_context?.pivot_points;
                if (!pp) return <div className="text-small" style={{ color: 'var(--text-muted)' }}>刷新後顯示</div>;
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', fontSize: '0.75rem', textAlign: 'center' }}>
                    {[
                      { label: 'R2', value: pp.r2, color: 'var(--color-danger)' },
                      { label: 'R1', value: pp.r1, color: 'var(--color-danger)' },
                      { label: 'Pivot', value: pp.pivot, color: 'var(--accent-primary)' },
                      { label: 'S1', value: pp.s1, color: 'var(--color-success)' },
                      { label: 'S2', value: pp.s2, color: 'var(--color-success)' },
                      { label: '', value: '', color: '' },
                    ].filter(x => x.label).map(item => (
                      <div key={item.label} style={{ background: 'var(--bg-card)', padding: '4px 6px', borderRadius: '4px' }}>
                        <div style={{ color: 'var(--text-muted)' }}>{item.label}</div>
                        <div style={{ fontWeight: 600, color: item.color }}>{item.value}</div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
