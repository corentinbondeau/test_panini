'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuthStore } from '@/store/authStore';
import styles from './header.module.css';

export function Header() {
  const { user, checkAuth } = useAuthStore();
  const [isInitialized, setIsInitialized] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    checkAuth().finally(() => setIsInitialized(true));
  }, [checkAuth]);

  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Link href="/" className={styles.logo}>
          <Image src="/logo-club.png" alt="ECC" width={28} height={28} className={styles.logoImg} />
          ECC Panini
        </Link>
        <button className={styles.burger} onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
          <span></span><span></span><span></span>
        </button>
        <nav className={`${styles.nav} ${menuOpen ? styles.navOpen : ''}`}>
          <Link href="/" onClick={() => setMenuOpen(false)}>Accueil</Link>
          <Link href="/booster" onClick={() => setMenuOpen(false)}>Booster</Link>
          <Link href="/album" onClick={() => setMenuOpen(false)}>Album</Link>
          <Link href="/doubles" onClick={() => setMenuOpen(false)}>Mes doubles</Link>
          <Link href="/echange" onClick={() => setMenuOpen(false)}>Échanges</Link>
          {isInitialized && (
            user ? (
              <Link href="/compte" className={styles.authLink} onClick={() => setMenuOpen(false)}>
                Mon compte
              </Link>
            ) : (
              <Link href="/auth" className={styles.authLink} onClick={() => setMenuOpen(false)}>
                Connexion
              </Link>
            )
          )}
        </nav>
      </div>
    </header>
  );
}