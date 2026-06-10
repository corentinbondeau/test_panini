'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuthStore } from '@/store/authStore';
import { ThemeToggle } from './ThemeToggle';
import { TokenBalance } from './TokenBalance';
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
        <div className={styles.headerActions}>
          <TokenBalance />
          <ThemeToggle />
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
          <button className={styles.burger} onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
            <span></span><span></span><span></span>
          </button>
        </div>
        <nav className={`${styles.nav} ${menuOpen ? styles.navOpen : ''}`}>
          <Link href="/" onClick={() => setMenuOpen(false)}>Accueil</Link>
          <Link href="/booster" onClick={() => setMenuOpen(false)}>Booster</Link>
          <Link href="/album" onClick={() => setMenuOpen(false)}>Album</Link>
          <Link href="/doubles" onClick={() => setMenuOpen(false)}>Mes doubles</Link>
          <Link href="/echange" onClick={() => setMenuOpen(false)}>Échanges</Link>
          <Link href="/marketplace" onClick={() => setMenuOpen(false)}>Marché</Link>
          <Link href="/leaderboard" onClick={() => setMenuOpen(false)}>Classement</Link>
          <Link href="/quests" onClick={() => setMenuOpen(false)}>Quêtes</Link>
          <Link href="/clan" onClick={() => setMenuOpen(false)}>Clans</Link>
          {isInitialized && user?.role === 'admin' && (
            <>
              <Link href="/admin/stats" onClick={() => setMenuOpen(false)}>Statistiques</Link>
              <Link href="/admin/add-card" onClick={() => setMenuOpen(false)}>Ajouter une carte</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}