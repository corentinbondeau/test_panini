'use client';

import { useEffect, useState } from 'react';
import { getActiveEvent, formatTimeRemaining, getEventTimeRemaining } from '@/lib/events';
import { Zap } from 'lucide-react';

interface HappyHourData {
  endTime: string;
  modification: {
    boosterBonusChance: number;
    recycleCostReduction: number;
  };
}

export function HappyHourBanner() {
  const [data, setData] = useState<HappyHourData | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      try {
        const res = await fetch('/api/events/active');
        const json = await res.json();
        if (!mounted) return;
        if (json.active) {
          setData(json);
          setTimeLeft(getEventTimeRemaining(new Date(json.endTime)));
        } else {
          setData(null);
        }
      } catch {
        // ignore
      }
    };
    check();
    const interval = setInterval(check, 30000); // refresh every 30s
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!data) return;
    const interval = setInterval(() => {
      setTimeLeft(getEventTimeRemaining(new Date(data.endTime)));
    }, 1000);
    return () => clearInterval(interval);
  }, [data]);

  if (!data || timeLeft <= 0) return null;

  return (
    <div className="happy-hour-bar">
      <Zap size={18} className="happy-hour-icon" />
      <span className="happy-hour-text">
        <strong>Happy Hour en cours !</strong>
        {' '}Bonus : +{Math.round((data.modification.boosterBonusChance || 0) * 100)}% chances rares
        {data.modification.recycleCostReduction ? `, -${Math.round(data.modification.recycleCostReduction * 100)}% recyclage` : ''}
      </span>
      <span className="happy-hour-timer">{formatTimeRemaining(timeLeft)}</span>
      <style jsx>{`
        .happy-hour-bar {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 8px 16px;
          background: linear-gradient(90deg, #f59e0b, #d97706, #f59e0b);
          background-size: 200% 100%;
          animation: shimmer 3s ease-in-out infinite;
          color: #1a1a2e;
          font-size: 0.9rem;
          font-weight: 500;
          position: sticky;
          top: 56px;
          z-index: 99;
        }
        .happy-hour-icon {
          animation: pulse 1.5s ease-in-out infinite;
          flex-shrink: 0;
        }
        .happy-hour-timer {
          background: rgba(0,0,0,0.2);
          padding: 2px 10px;
          border-radius: 999px;
          font-family: monospace;
          font-size: 0.85rem;
          font-weight: 700;
        }
        @keyframes shimmer {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.15); }
        }
      `}</style>
    </div>
  );
}
