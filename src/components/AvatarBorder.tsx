import React from 'react';

interface Props {
  level: number;
  size?: number;
  children?: React.ReactNode;
}

export default function AvatarBorder({ level, size = 80, children }: Props) {
  const ringStyle: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: '9999px',
    padding: 4,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  };

  const innerStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    borderRadius: '9999px',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  if (level >= 100) {
    // Neon animated border
    ringStyle.background = 'linear-gradient(135deg, #6366f1, #ec4899, #6366f1)';
    ringStyle.backgroundSize = '300% 300%';
    innerStyle.boxShadow = '0 0 24px rgba(99,102,241,0.9), inset 0 0 8px rgba(236,72,153,0.6)';
    return (
      <div style={ringStyle} className="avatar-ring-neon" data-level="neon">
        <div style={{ ...innerStyle, animation: 'pulseGlow 2s ease-in-out infinite' }}>
          {children}
        </div>
      </div>
    );
  }

  if (level >= 50) {
    // Gold animated border
    ringStyle.background = 'linear-gradient(135deg, #fbbf24, #f59e0b, #fbbf24)';
    ringStyle.backgroundSize = '200% 200%';
    innerStyle.boxShadow = '0 0 18px rgba(250,204,21,0.9)';
    return (
      <div style={ringStyle} className="avatar-ring-gold" data-level="gold">
        <div style={innerStyle}>
          {children}
        </div>
      </div>
    );
  }

  if (level >= 10) {
    // Silver border
    ringStyle.background = 'linear-gradient(135deg, #94a3b8, #cbd5e1, #94a3b8)';
    innerStyle.boxShadow = '0 0 10px rgba(148,163,184,0.8)';
    return (
      <div style={ringStyle} className="avatar-ring-silver" data-level="silver">
        <div style={innerStyle}>
          {children}
        </div>
      </div>
    );
  }

  // Basic border
  ringStyle.background = 'var(--club-blue-700)';
  return (
    <div style={ringStyle} className="avatar-ring-basic" data-level="basic">
      <div style={innerStyle}>
        {children}
      </div>
    </div>
  );
}
