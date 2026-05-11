'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { UserProfile } from '@/components/auth/UserProfile';
import styles from './header.module.css';

export function Header() {
  const { user, checkAuth } = useAuthStore();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    checkAuth().finally(() => setIsInitialized(true));
  }, [checkAuth]);

  return (
    <header className={styles.header}>
      <h1>ECC Panini</h1>
      <nav className={styles.nav}>
        <Link href="/">Accueil</Link>
        <Link href="/booster">Booster</Link>
        <Link href="/album">Album</Link>
        <Link href="/doubles">Mes Doubles</Link>
        {isInitialized && (
          <>
            {user ? (
              <div className={styles.authSection}>
                <UserProfile />
              </div>
            ) : (
              <Link href="/auth" className={styles.authLink}>
                Connexion
              </Link>
            )}
          </>
        )}
      </nav>
    </header>
  );
}
