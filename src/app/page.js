import MarketRadar from '../components/MarketRadar';
import EquityCurveChart from '../components/EquityCurveChart';
import TradeReviewList from '../components/TradeReviewList';
import RiskDirector from '../components/RiskDirector';
import { ActivitySquare } from 'lucide-react';

export default function Home() {
  return (
    <main style={{ padding: '40px', maxWidth: '1400px', margin: '0 auto' }}>
      <header style={{ marginBottom: '40px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ background: 'var(--accent-primary)', padding: '12px', borderRadius: '12px', boxShadow: '0 0 20px var(--accent-glow)' }}>
          <ActivitySquare size={32} color="#000" />
        </div>
        <div>
          <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            小納斯達克 <span className="gradient-text">量化中樞</span>
          </h1>
          <p className="text-small" style={{ margin: '4px 0 0 0' }}>NQ Trading Core • AI-Driven Analytics & Automation</p>
        </div>
      </header>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '24px' }}>
        <RiskDirector />
        <MarketRadar />
        <EquityCurveChart />
        <TradeReviewList />
      </div>
      
    </main>
  );
}
