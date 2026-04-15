"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { PlusCircle, Search, PieChart as PieIcon, Table, Loader2, Lock } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip, Legend } from 'recharts';

export default function TradingLog() {
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState(false);

  // App State
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form State
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    direction: 'Long',
    quantity: 1,
    entryPrice: '',
    exitPrice: '',
    fees: 5.0,
    reason: '',
    isImpulsive: false
  });

  useEffect(() => {
    // Check auth on mount
    const authStatus = localStorage.getItem('tradingLogAuth');
    if (authStatus === 'bobo007yb') {
      setIsAuthenticated(true);
      fetchTrades();
    }
  }, []);

  const handleAuth = (e) => {
    e.preventDefault();
    if (password === 'bobo007yb') {
      localStorage.setItem('tradingLogAuth', 'bobo007yb');
      setIsAuthenticated(true);
      setAuthError(false);
      fetchTrades();
    } else {
      setAuthError(true);
    }
  };

  const fetchTrades = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/sheet-trades');
      const data = await res.json();
      if (Array.isArray(data)) {
        // Sort by date desc
        setTrades(data.sort((a, b) => new Date(b.date) - new Date(a.date)));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    // NQ Calculation logic
    const priceDiff = formData.direction === 'Long' 
      ? Number(formData.exitPrice) - Number(formData.entryPrice)
      : Number(formData.entryPrice) - Number(formData.exitPrice);
    const profit = (priceDiff * 20 * Number(formData.quantity)) - Number(formData.fees);

    const payload = { ...formData, profit };

    try {
      const res = await fetch('/api/sheet-trades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setFormData({ ...formData, reason: '', isImpulsive: false, entryPrice: '', exitPrice: '' });
        fetchTrades();
      }
    } catch (err) {
      alert('Save failed');
    } finally {
      setSaving(false);
    }
  };

  // Filter and Stats
  const filteredTrades = useMemo(() => {
    if (!searchTerm) return trades;
    return trades.filter(t => (t.date && t.date.includes(searchTerm)));
  }, [trades, searchTerm]);

  const stats = useMemo(() => {
    const totalPnL = trades.reduce((sum, t) => sum + (Number(t.profit) || 0), 0);
    const wins = trades.filter(t => (Number(t.profit) || 0) > 0).length;
    const winRate = trades.length > 0 ? (wins / trades.length * 100).toFixed(1) : 0;
    const expectancy = trades.length > 0 ? (totalPnL / trades.length).toFixed(2) : 0;

    return { totalPnL, winRate, totalTrades: trades.length, expectancy };
  }, [trades]);

  // Pie Chart Data Logic
  const plannedData = useMemo(() => {
    const planned = trades.filter(t => t.isImpulsive !== "true" && t.isImpulsive !== true && t.isImpulsive !== "TRUE");
    const wins = planned.filter(t => (Number(t.profit) || 0) > 0).length;
    const losses = planned.length - wins;
    return [
      { name: '獲利 (Win)', value: wins, color: 'var(--color-success)' },
      { name: '虧損 (Loss)', value: losses, color: 'var(--color-danger)' }
    ];
  }, [trades]);

  const impulsiveData = useMemo(() => {
    const impulsive = trades.filter(t => t.isImpulsive === "true" || t.isImpulsive === true || t.isImpulsive === "TRUE");
    const wins = impulsive.filter(t => (Number(t.profit) || 0) > 0).length;
    const losses = impulsive.length - wins;
    return [
      { name: '幸運 (Win)', value: wins, color: 'var(--color-success)' },
      { name: '懲罰 (Loss)', value: losses, color: 'var(--color-danger)' }
    ];
  }, [trades]);

  // ------------------------------------
  // Authentication Screen
  // ------------------------------------
  if (!isAuthenticated) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)' }}>
        <div className="glass-panel animate-fade-in" style={{ padding: '40px', width: '380px', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', background: 'var(--border-accent)', padding: '16px', borderRadius: '50%', marginBottom: '24px' }}>
             <Lock size={32} color="var(--accent-primary)" />
          </div>
          <h2 style={{ marginBottom: '8px' }}>權限驗證</h2>
          <p className="text-small" style={{ marginBottom: '24px' }}>Trading Log 僅限管理員使用</p>
          
          <form onSubmit={handleAuth}>
            <div className="input-group" style={{ textAlign: 'left' }}>
              <label className="input-label" style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>提示詞：波波是什麼？</label>
              <input 
                type="password" 
                className="input-field" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="輸入密碼..."
                autoFocus
              />
            </div>
            {authError && <div style={{ color: 'var(--color-danger)', fontSize: '0.8rem', marginBottom: '16px', textAlign: 'left' }}>密碼錯誤，請重新輸入。</div>}
            <button type="submit" className="btn-primary" style={{ width: '100%' }}>解鎖</button>
          </form>
        </div>
      </div>
    );
  }

  // ------------------------------------
  // Main Trading Log Screen
  // ------------------------------------
  return (
    <div style={{ padding: '40px', maxWidth: '1400px', margin: '0 auto' }}>
      <header style={{ marginBottom: '40px' }}>
        <h1 className="gradient-text">交易紀錄系統 v2</h1>
        <p className="text-small">Connecting to Google Sheets Real-time Log</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) minmax(400px, 2fr)', gap: '32px', marginBottom: '40px' }}>
        {/* Form Column */}
        <div className="glass-panel animate-fade-in" style={{ alignSelf: 'start' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PlusCircle size={20} className="glow-text" /> 新增交易
          </h2>
          <form onSubmit={handleSave} style={{ marginTop: '24px' }}>
            <div className="input-group">
              <label className="input-label">日期</label>
              <input type="date" className="input-field" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="input-group">
                <label className="input-label">方向</label>
                <select className="input-field" value={formData.direction} onChange={e => setFormData({...formData, direction: e.target.value})}>
                  <option value="Long">做多 Long</option>
                  <option value="Short">做空 Short</option>
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">口數</label>
                <input type="number" className="input-field" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="input-group">
                <label className="input-label">進場價</label>
                <input type="number" step="0.25" className="input-field" value={formData.entryPrice} onChange={e => setFormData({...formData, entryPrice: e.target.value})} required />
              </div>
              <div className="input-group">
                <label className="input-label">出場價</label>
                <input type="number" step="0.25" className="input-field" value={formData.exitPrice} onChange={e => setFormData({...formData, exitPrice: e.target.value})} required />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">進場理由</label>
              <textarea className="input-field" rows="3" value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} placeholder="為什麼在此處進場？" />
            </div>

            <div className="input-group" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input type="checkbox" style={{ width: '18px', height: '18px' }} checked={formData.isImpulsive} onChange={e => setFormData({...formData, isImpulsive: e.target.checked})} id="impulse-check" />
              <label htmlFor="impulse-check" style={{ color: formData.isImpulsive ? 'var(--color-danger)' : 'var(--text-secondary)' }}>
                🚨 是否為衝動交易？
              </label>
            </div>

            <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '12px' }} disabled={saving}>
              {saving ? <Loader2 className="animate-spin" /> : '同步至 Google Sheets'}
            </button>
          </form>
        </div>

        {/* Analytics Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Top Metric Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            <div className="glass-panel" style={{ textAlign: 'center', padding: '16px' }}>
              <div className="text-small">總淨利</div>
              <div className="gradient-text" style={{ fontSize: '1.4rem', fontWeight: 700 }}>${stats.totalPnL.toFixed(2)}</div>
            </div>
            <div className="glass-panel" style={{ textAlign: 'center', padding: '16px' }}>
              <div className="text-small">勝率</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-success)' }}>{stats.winRate}%</div>
            </div>
            <div className="glass-panel" style={{ textAlign: 'center', padding: '16px' }}>
              <div className="text-small">總筆數</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{stats.totalTrades}</div>
            </div>
             <div className="glass-panel" style={{ textAlign: 'center', padding: '16px' }}>
              <div className="text-small">期望值(次)</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: stats.expectancy >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                ${stats.expectancy}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', flex: 1 }}>
            {/* Planned Trades Pie */}
            <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem', color: 'var(--accent-primary)', marginBottom: '8px' }}>
                <PieIcon size={16} /> 計畫內交易 (狀態分佈)
              </h3>
              <div style={{ flex: 1, minHeight: '180px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={plannedData} innerRadius={40} outerRadius={65} paddingAngle={5} dataKey="value">
                      {plannedData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} opacity={entry.value === 0 ? 0 : 1} />
                      ))}
                    </Pie>
                    <ReTooltip />
                    <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '0.8rem' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Impulsive Trades Pie */}
            <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', border: '1px solid rgba(255, 61, 0, 0.4)' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem', color: 'var(--color-danger)', marginBottom: '8px' }}>
                <PieIcon size={16} /> 衝動交易 (狀態分佈)
              </h3>
              <div style={{ flex: 1, minHeight: '180px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={impulsiveData} innerRadius={40} outerRadius={65} paddingAngle={5} dataKey="value">
                      {impulsiveData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} opacity={entry.value === 0 ? 0 : 1} />
                      ))}
                    </Pie>
                    <ReTooltip />
                    <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '0.8rem' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="glass-panel animate-fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Table size={20} className="glow-text" /> 歷史紀錄
          </h2>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="搜尋日期 (YYYY-MM-DD)..." 
              className="input-field" 
              style={{ paddingLeft: '36px', width: '260px' }} 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>日期</th>
                <th>方向</th>
                <th>價格</th>
                <th>淨利</th>
                <th>理由</th>
                <th>狀態</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}><Loader2 className="animate-spin" style={{ margin: 'auto' }} /></td></tr>
              ) : filteredTrades.map((t, i) => (
                <tr key={i} style={{ borderLeft: t.isImpulsive === "true" || t.isImpulsive === true ? '4px solid var(--color-danger)' : 'none' }}>
                  <td>{t.date}</td>
                  <td>
                    <span className={`badge ${t.direction === 'Long' ? 'badge-success' : 'badge-danger'}`}>
                      {t.direction}
                    </span>
                  </td>
                  <td>{t.entryPrice} → {t.exitPrice}</td>
                  <td style={{ fontWeight: 600, color: Number(t.profit) >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                    ${Number(t.profit).toFixed(2)}
                  </td>
                  <td style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={t.reason}>
                    {t.reason || '--'}
                  </td>
                  <td>
                    {t.isImpulsive === "true" || t.isImpulsive === true ? (
                      <span className="badge badge-danger">衝動</span>
                    ) : (
                      <span className="badge badge-accent">計畫</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
