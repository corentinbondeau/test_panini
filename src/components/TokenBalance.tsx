'use client';

import { useAuthStore } from '@/store/authStore';
import { Coins } from 'lucide-react';
import styles from './header.module.css';

export function TokenBalance() {
  const user = useAuthStore((s) => s.user);
  const isInitialized = useAuthStore((s) => s.isInitialized);

  if (!isInitialized || !user) return null;

  return (
    <span className={styles.tokenBadge}>
      <Coins size={14} />
      {user.tokens ?? 0}
    </span>
  );
}
