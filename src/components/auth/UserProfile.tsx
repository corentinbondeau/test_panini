'use client';

import { useAuthStore } from '@/store/authStore';
import styles from './UserProfile.module.css';

export function UserProfile() {
  const { user, logout } = useAuthStore();

  if (!user) return null;

  return (
    <div className={styles.profile}>
      <div className={styles.info}>
        {user.avatar && (
          <img src={user.avatar} alt={user.name} className={styles.avatar} />
        )}
        <div className={styles.details}>
          <p className={styles.name}>{user.name}</p>
          <p className={styles.email}>{user.email}</p>
        </div>
      </div>
      <button onClick={logout} className={styles.logoutBtn}>
        Déconnexion
      </button>
    </div>
  );
}
