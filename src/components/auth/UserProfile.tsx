'use client';

import { useAuthStore } from '@/store/authStore';
import Link from 'next/link';
import styles from './UserProfile.module.css';

export function UserProfile() {
  const { user, logout } = useAuthStore();

  if (!user) return null;

  const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;

  return (
    <div className={styles.profile}>
      <Link href="/compte" className={styles.info}>
        {user.avatar && (
          <img src={user.avatar} alt={displayName} className={styles.avatar} />
        )}
        <div className={styles.details}>
          <p className={styles.name}>{displayName}</p>
          <p className={styles.email}>{user.email}</p>
        </div>
      </Link>
      <button onClick={logout} className={styles.logoutBtn}>Déconnexion</button>
    </div>
  );
}
