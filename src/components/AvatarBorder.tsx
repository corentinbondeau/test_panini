import React from 'react';

interface Props {
  level: number;
  size?: number;
  children?: React.ReactNode;
}

export default function AvatarBorder({ level, size = 80, children }: Props) {
  // level thresholds: 0-9 basic, 10-49 silver, 50-99 gold, 100+ neon
  let ringClass = '';
  let ringStyle: React.CSSProperties = {};
  if (level >= 100) {
    ringClass = 'avatar-ring-neon';
    ringStyle = { boxShadow: '0 0 24px rgba(99,102,241,0.9), inset 0 0 8px rgba(236,72,153,0.6)' };
  } else if (level >= 50) {
    ringClass = 'avatar-ring-gold';
    ringStyle = { boxShadow: '0 0 18px rgba(250,204,21,0.9)' };
  } else if (level >= 10) {
    ringClass = 'avatar-ring-silver';
    ringStyle = { boxShadow: '0 0 10px rgba(148,163,184,0.8)' };
  } else {
    ringClass = 'avatar-ring-basic';
    ringStyle = { boxShadow: 'none' };
  }

  return (
    <div style={{ width: size, height: size, borderRadius: '9999px', padding: 4, display: 'inline-block' }} className={ringClass}>
      <div style={{ width: '100%', height: '100%', borderRadius: '9999px', overflow: 'hidden', ...ringStyle }}>
        {children}
      </div>
    </div>
  );
}
