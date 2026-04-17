"use client";

import React, { useState, useEffect } from 'react';
import { ShieldAlert, RefreshCw, Loader2, MessageSquare, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function RiskDirector() {
  const [analysis, setAnalysis] = useState('');
  const [tradeCount, setTradeCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  async function fetchReview(refresh = false) {
    if (refresh) setIsRefreshing(true);
    else setLoading(true);
    setError(null);
    
    try {
      const res = await fetch('/api/risk-director', { cache: 'no-store' });
      if (!res.ok) throw new Error('無法取回風控檢討');
      const data = await res.json();
      setAnalysis(data.analysis);
      setTradeCount(data.count);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    fetchReview();
  }, []);

  return (
    <div className="glass-panel animate-fade-in" style={{ gridColumn: '1 / -1', borderLeft: '4px solid var(--color-danger)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: 'rgba(255, 59, 48, 0.1)', padding: '10px', borderRadius: '12px' }}>
            <ShieldAlert size={24} color="var(--color-danger)" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              AI 風控總監 <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400 }}>Risk Director</span>
            </h2>
            <div className="text-small" style={{ color: 'var(--text-muted)' }}>
              {tradeCount > 0 ? `今日已偵測到 ${tradeCount} 筆交易紀錄` : '今日尚無交易，正在執行賽前風控提醒'}
            </div>
          </div>
        </div>
        
        <button 
          onClick={() => fetchReview(true)}
          disabled={isRefreshing}
          className="refresh-btn"
          style={{
            display: 'flex', alignItems: 'center', gap: '8px', 
            background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-light)',
            padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', color: 'white'
          }}
        >
          {isRefreshing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          <span>手動點評</span>
        </button>
      </div>

      <div style={{ position: 'relative', minHeight: '120px' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', gap: '12px' }}>
            <Loader2 size={32} className="animate-spin" color="var(--accent-primary)" />
            <div className="text-small">風控總監正在審閱您的交易紀錄...</div>
          </div>
        ) : error ? (
          <div style={{ background: 'rgba(255,59,48,0.05)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,59,48,0.2)', color: 'var(--color-danger)', textAlign: 'center' }}>
            <AlertTriangle size={24} style={{ marginBottom: '8px' }} />
            <div>{error}</div>
            <button onClick={() => fetchReview()} style={{ marginTop: '12px', background: 'none', border: '1px solid var(--color-danger)', color: 'white', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer' }}>重試</button>
          </div>
        ) : (
          <div className="director-feedback" style={{ lineHeight: 1.8, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
            <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
              {analysis}
            </div>
            
            <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-light)', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: tradeCount > 5 ? 'var(--color-danger)' : 'var(--color-success)', fontSize: '0.85rem' }}>
                  {tradeCount > 5 ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
                  交易頻率：{tradeCount > 5 ? '過高 (請注意情緒控制)' : '正常'}
               </div>
               <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-secondary)', fontSize: '0.85rem' }}>
                  <MessageSquare size={14} />
                  核心建議：嚴格執行點位停損
               </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .director-feedback {
          animation: slideUp 0.4s ease-out;
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
