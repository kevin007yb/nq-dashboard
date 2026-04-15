"use client";

import React, { useState, useEffect } from 'react';
import { Activity, AlertTriangle, Crosshair, Target } from 'lucide-react';
import aiData from '../data/ai_history.json';
import './MarketRadar.css';

export default function MarketRadar() {
  const [latestData, setLatestData] = useState(null);

  useEffect(() => {
    if (aiData && aiData.length > 0) {
      // Pick the last one in the array (Assuming it's the latest based on index from JSON)
      setLatestData(aiData[0]); 
    }
  }, []);

  if (!latestData) return <div className="glass-panel">Loading Radar...</div>;

  const { market_context, ai_prediction } = latestData;
  const isHighVix = market_context.vix_close > 25;

  return (
    <div className="glass-panel animate-fade-in" style={{ gridColumn: '1 / -1', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
      <div style={{ flex: '1 1 400px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <Activity size={24} className="glow-text" /> 
            AI 行情預測雷達
          </h2>
          <div className="badge badge-accent" style={{ fontSize: '0.7rem' }}>
            Next Refresh: Today 21:35 (TPE)
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
          <span className="badge" style={{ background: 'var(--bg-main)', border: '1px solid var(--border-light)' }}>
            {market_context.trend_structure || market_context.daily_trend}
          </span>
          <span className={`badge ${isHighVix ? 'badge-danger' : 'badge-success'}`}>
            VIX: {market_context.vix_close}
          </span>
        </div>
        
        {/* Real-time stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
          <div style={{ background: 'rgba(255,107,0,0.05)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
            <div className="text-small">開盤價 Open</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{market_context.current_price || '--'}</div>
          </div>
          <div style={{ background: 'rgba(255,107,0,0.05)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
            <div className="text-small">已耗振幅</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-primary)' }}>{market_context.intraday_amplitude}</div>
          </div>
          <div style={{ background: 'rgba(255,107,0,0.05)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
            <div className="text-small">振幅消耗 %</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: market_context.amplitude_exhaustion_rate > 70 ? 'var(--color-danger)' : 'var(--color-success)' }}>
              {market_context.amplitude_exhaustion_rate}%
            </div>
          </div>
        </div>

        <div style={{ background: 'var(--bg-main)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
             <Target size={18} className="glow-text" />
             <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>AI 大腦思路</span>
          </div>
          <p className="text-small" style={{ lineHeight: '1.6' }}>{ai_prediction?.reasoning}</p>
        </div>
      </div>

      <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div className="status-card" style={{ background: 'rgba(255, 107, 0, 0.05)', border: '1px solid var(--border-accent)', padding: '16px', borderRadius: '12px', height: '100%' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '16px', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Crosshair size={20} /> 戰略目標位階
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <div className="text-small">方向建議</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '4px' }}>
                {ai_prediction?.trade_direction || 'Short'}
              </div>
            </div>
            <div>
              <div className="text-small">進場區間 (Zone)</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '4px' }}>
                {ai_prediction?.suggested_entry_zone || '等待反彈'}
              </div>
            </div>
            <div>
              <div className="text-small">一壘目標 (Base 1)</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--accent-secondary)', marginTop: '4px' }}>
                {ai_prediction?.target_prices?.base_1 || ai_prediction?.base_1_points || '--'}
              </div>
            </div>
            <div>
              <div className="text-small">二壘目標 (Base 2)</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--accent-secondary)', marginTop: '4px' }}>
                {ai_prediction?.target_prices?.base_2 || ai_prediction?.base_2_points || '--'}
              </div>
            </div>
          </div>
          
          <hr style={{ borderColor: 'var(--border-accent)', opacity: 0.3, margin: '16px 0' }} />
          <div className="text-small" style={{ color: 'var(--text-muted)' }}>
            防守點位 (Stop Loss): <span style={{ color: 'var(--color-danger)' }}>{ai_prediction?.stop_loss_price || '--'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
