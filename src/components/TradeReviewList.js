"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { BookOpen, CheckCircle, BrainCircuit, Maximize2, Calendar, ChevronLeft, ChevronRight, Loader2, Target, AlertCircle } from 'lucide-react';

export default function TradeReviewList() {
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [cycleFilter, setCycleFilter] = useState('all'); // 'all', 'early', 'mid', 'late'
  const itemsPerPage = 5;

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch('/api/ai-history');
        if (!res.ok) throw new Error('API error');
        const data = await res.json();
        setHistoryData(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to fetch AI history:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, []);

  // 1. Filter by Cycle (旬)
  const filteredData = useMemo(() => {
    return historyData.filter(item => {
      if (cycleFilter === 'all') return true;
      const dateStr = item.Date || item.date || '';
      const dayStr = dateStr.split('T')[0].split('-')[2];
      if (!dayStr) return true;
      const day = parseInt(dayStr);
      if (cycleFilter === 'early') return day <= 10;
      if (cycleFilter === 'mid') return day > 10 && day <= 20;
      if (cycleFilter === 'late') return day > 20;
      return true;
    });
  }, [historyData, cycleFilter]);

  // 2. Pagination Logic (Max 30 pages)
  const totalItems = Math.min(filteredData.length, 30 * itemsPerPage);
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="glass-panel animate-fade-in" style={{ gridColumn: '1 / -1' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
          <BookOpen size={24} className="glow-text" /> 
          AI 智能交易覆盤
          {loading && <Loader2 size={16} className="animate-spin" style={{ opacity: 0.6 }} />}
        </h2>
        
        {/* Cycle Filter */}
        <div style={{ display: 'flex', gap: '8px', background: 'var(--bg-main)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
          {[
            { id: 'all', label: '全部' },
            { id: 'early', label: '上旬' },
            { id: 'mid', label: '中旬' },
            { id: 'late', label: '下旬' }
          ].map(btn => (
            <button 
              key={btn.id}
              onClick={() => { setCycleFilter(btn.id); setCurrentPage(1); setExpandedIndex(null); }}
              style={{ 
                padding: '6px 12px', fontSize: '0.8rem', borderRadius: '6px', border: 'none', cursor: 'pointer',
                background: cycleFilter === btn.id ? 'var(--accent-primary)' : 'transparent',
                color: cycleFilter === btn.id ? '#000' : 'var(--text-secondary)',
                transition: 'all 0.2s'
              }}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minHeight: '400px' }}>
        {loading && historyData.length === 0 ? (
          <div style={{ padding: '100px', textAlign: 'center', color: 'var(--text-muted)' }}>載入覆盤紀錄中...</div>
        ) : paginatedData.length > 0 ? paginatedData.map((trade, idx) => {
          const isExpanded = expandedIndex === idx;
          const outcome = trade.Outcome || trade.outcome || '';
          const isWin = outcome.includes('命中') || outcome.includes('達標');
          const isLoss = outcome.includes('未命中') || outcome.includes('止損');
          const dateLabel = (trade.Date || trade.date || '').split('T')[0];
          const aiDir = trade.AI_Direction || trade.aiDirection || '未知';
          
          let badgeClass = 'badge-accent';
          let badgeIcon = '📝';
          if (isWin) { badgeClass = 'badge-success'; badgeIcon = '🎯'; }
          else if (isLoss) { badgeClass = 'badge-danger'; badgeIcon = '🛑'; }

          return (
            <div key={idx} className="review-card" style={{ 
              background: 'var(--bg-main)', 
              borderRadius: '12px', 
              border: `1px solid ${isExpanded ? 'var(--accent-primary)' : 'var(--border-light)'}`,
              overflow: 'hidden'
            }}>
              <div 
                onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                  <Calendar size={20} color="var(--text-muted)" />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {dateLabel}
                      <span style={{ fontSize: '0.85rem', color: 'var(--accent-secondary)' }}>{aiDir}</span>
                    </div>
                    <div className="text-small" style={{ display: 'flex', gap: '12px' }}>
                       <span>VIX: {trade.VIX || trade.vix || '-'}</span>
                       <span>環境: {trade.Daily_Trend || trade.dailyTrend || '-'}</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <span className={`badge ${badgeClass}`}>
                        {badgeIcon} {outcome || '尚未驗證'}
                    </span>
                    <Maximize2 size={16} />
                </div>
              </div>

              {isExpanded && (
                <div style={{ padding: '20px', borderTop: '1px solid var(--border-light)', background: 'rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                   <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                     <div>
                       <div className="text-small" style={{ color: 'var(--text-secondary)' }}>進場區間</div>
                       <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{trade.Entry_Zone || trade.entryZone || '-'}</div>
                     </div>
                     <div>
                       <div className="text-small" style={{ color: 'var(--text-secondary)' }}>停損防守</div>
                       <div style={{ fontWeight: 600, color: 'var(--color-danger)' }}>{trade.Stop_Loss || trade.stopLoss || '-'}</div>
                     </div>
                     <div>
                       <div className="text-small" style={{ color: 'var(--text-secondary)' }}>一壘目標</div>
                       <div style={{ fontWeight: 600, color: 'var(--accent-secondary)' }}>{trade.Target1 || trade.target1 || '-'}</div>
                     </div>
                   </div>

                   <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', color: 'var(--accent-primary)', fontSize: '0.9rem' }}>
                      <BrainCircuit size={16} /> 戰略思路與決策 (Reasoning)
                    </div>
                    <p className="text-small" style={{ lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                      {trade.Reasoning || trade.reasoning || '-'}
                    </p>
                   </div>
                </div>
              )}
            </div>
          );
        }) : (
            <div style={{ textAlign: 'center', padding: '100px', color: 'var(--text-muted)' }}>此時段尚無數據紀錄或尚未產生歷史分析。</div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '32px' }}>
          <button 
            disabled={currentPage === 1}
            onClick={() => { setCurrentPage(p => p - 1); setExpandedIndex(null); }}
            style={{ background: 'none', border: '1px solid var(--border-light)', color: 'white', padding: '8px', borderRadius: '50%', cursor: 'pointer', opacity: currentPage === 1 ? 0.3 : 1 }}
          >
            <ChevronLeft size={20} />
          </button>
          
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button 
                    key={page}
                    onClick={() => { setCurrentPage(page); setExpandedIndex(null); }}
                    style={{ 
                        width: '32px', height: '32px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                        background: currentPage === page ? 'var(--border-accent)' : 'transparent',
                        color: currentPage === page ? 'var(--accent-primary)' : 'var(--text-muted)',
                        fontWeight: currentPage === page ? 700 : 400
                    }}
                >
                    {page}
                </button>
            ))}
          </div>

          <button 
            disabled={currentPage === totalPages}
            onClick={() => { setCurrentPage(p => p + 1); setExpandedIndex(null); }}
            style={{ background: 'none', border: '1px solid var(--border-light)', color: 'white', padding: '8px', borderRadius: '50%', cursor: 'pointer', opacity: currentPage === totalPages ? 0.3 : 1 }}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}
    </div>
  );
}
