"use client";

import React, { useState, useMemo } from 'react';
import { BookOpen, CheckCircle, XCircle, BrainCircuit, Maximize2, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import aiData from '../data/ai_history.json';

export default function TradeReviewList() {
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [cycleFilter, setCycleFilter] = useState('all'); // 'all', 'early', 'mid', 'late'
  const itemsPerPage = 5;

  // 1. Deduplicate by date (keep first occurrence assume it's newest)
  const uniqueData = useMemo(() => {
    const seen = new Set();
    return aiData.filter(item => {
      const date = item.target_date;
      if (seen.has(date)) return false;
      seen.add(date);
      return true;
    });
  }, []);

  // 2. Filter by Cycle (旬)
  const filteredData = useMemo(() => {
    return uniqueData.filter(item => {
      if (cycleFilter === 'all') return true;
      const day = parseInt(item.target_date.split('-')[2]);
      if (cycleFilter === 'early') return day <= 10;
      if (cycleFilter === 'mid') return day > 10 && day <= 20;
      if (cycleFilter === 'late') return day > 20;
      return true;
    });
  }, [uniqueData, cycleFilter]);

  // 3. Pagination Logic (Max 30 pages)
  const totalItems = Math.min(filteredData.length, 30 * itemsPerPage);
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="glass-panel animate-fade-in" style={{ gridColumn: '1 / -1' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
          <BookOpen size={24} className="glow-text" /> 
          AI 智能交易覆盤
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
              onClick={() => { setCycleFilter(btn.id); setCurrentPage(1); }}
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
        {paginatedData.length > 0 ? paginatedData.map((trade, idx) => {
          const isExpanded = expandedIndex === idx;
          const hitBase1 = trade.actual_result?.base_1_hit;
          const isWin = hitBase1 || trade.actual_result?.base_2_hit;

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
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <Calendar size={20} color="var(--text-muted)" />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{trade.target_date}</div>
                    <div className="text-small">
                      振幅: {trade.actual_result?.actual_amplitude} • AI 預期: {trade.ai_prediction?.regime}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <span className={`badge ${isWin ? 'badge-success' : 'badge-danger'}`}>
                        {isWin ? '🎯 達標' : '🚫 未及'}
                    </span>
                    <Maximize2 size={16} />
                </div>
              </div>

              {isExpanded && (
                <div style={{ padding: '20px', borderTop: '1px solid var(--border-light)', background: 'rgba(0,0,0,0.2)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                   <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', color: 'var(--accent-primary)', fontSize: '0.9rem' }}>
                      <BrainCircuit size={16} /> 戰略思路
                    </div>
                    <p className="text-small" style={{ lineHeight: 1.6 }}>{trade.ai_prediction?.reasoning}</p>
                   </div>
                   <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', color: 'var(--accent-primary)', fontSize: '0.9rem' }}>
                      <CheckCircle size={16} /> 執行建議
                    </div>
                    <p className="text-small" style={{ lineHeight: 1.6 }}>{trade.ai_prediction?.strategy_advice}</p>
                   </div>
                </div>
              )}
            </div>
          );
        }) : (
            <div style={{ textAlign: 'center', padding: '100px', color: 'var(--text-muted)' }}>此時段尚無數據紀錄</div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '32px' }}>
          <button 
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => p - 1)}
            style={{ background: 'none', border: '1px solid var(--border-light)', color: 'white', padding: '8px', borderRadius: '50%', cursor: 'pointer', opacity: currentPage === 1 ? 0.3 : 1 }}
          >
            <ChevronLeft size={20} />
          </button>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button 
                    key={page}
                    onClick={() => setCurrentPage(page)}
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
            onClick={() => setCurrentPage(p => p + 1)}
            style={{ background: 'none', border: '1px solid var(--border-light)', color: 'white', padding: '8px', borderRadius: '50%', cursor: 'pointer', opacity: currentPage === totalPages ? 0.3 : 1 }}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}
    </div>
  );
}
