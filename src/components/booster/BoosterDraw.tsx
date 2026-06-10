"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./BoosterDraw.module.css";
import { useAuthStore } from "@/store/authStore";

const MAX_BOOSTERS = 25;

export function BoosterDraw() {
  const { user, token } = useAuthStore();
  const [boostersRemaining, setBoostersRemaining] = useState<number | null>(null);
  const [charms, setCharms] = useState(0);
  const [charmActive, setCharmActive] = useState(false);
  const [charmMsg, setCharmMsg] = useState('');

  useEffect(() => {
    if (!token) return;
    fetch('/api/user/quotas', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data) setBoostersRemaining(data.boostersRemainingToday);
      })
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    if (user) {
      setCharms(user.charms ?? 0);
      setCharmActive(user.charmReserved ?? false);
    }
  }, [user]);

  const handleBuyCharm = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/economy/charms/buy', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setCharms((c) => c + 1);
        setCharmMsg('Amulette achetée ! (20 tokens)');
      } else {
        setCharmMsg(data.error || 'Erreur');
      }
    } catch {
      setCharmMsg('Erreur');
    }
    setTimeout(() => setCharmMsg(''), 3000);
  };

  const handleActivateCharm = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/economy/charms/activate', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setCharmActive(true);
        setCharmMsg('Amulette activée pour le prochain booster !');
      } else {
        const data = await res.json();
        setCharmMsg(data.error || 'Erreur');
      }
    } catch {
      setCharmMsg('Erreur');
    }
    setTimeout(() => setCharmMsg(''), 3000);
  };

  return (
    <section className={styles.booster}>
      <h2>Ouverture de Booster</h2>
      <p className={styles.helper}>Un booster contient 5 cartes révélées une par une.</p>
      {user ? (
        <>
          <Link className={styles.openLink} href="/booster">
            Ouvrir un booster
          </Link>
          {boostersRemaining !== null && (
            <p className={styles.quotaText}>
              Boosters disponibles aujourd&apos;hui : {boostersRemaining} / {MAX_BOOSTERS}
            </p>
          )}

          {/* Charm section */}
          <div className={styles.charmSection}>
            <div className={styles.charmInfo}>
              <span className={styles.charmIcon}>🍀</span>
              <span className={styles.charmCount}>Amulettes : {charms}</span>
              {charmActive && <span className={styles.charmActiveBadge}>Active</span>}
            </div>
            <div className={styles.charmActions}>
              <button onClick={handleBuyCharm} className={styles.charmBtn} title="Acheter une amulette (20 tokens)">
                Acheter (20🪙)
              </button>
              {charms > 0 && !charmActive && (
                <button onClick={handleActivateCharm} className={styles.charmBtnActive} title="Activer pour +5% de chance légendaire">
                  Activer
                </button>
              )}
            </div>
            {charmMsg && <p className={styles.charmMsg}>{charmMsg}</p>}
          </div>
        </>
      ) : (
        <p className={styles.loginPrompt}>Connectez-vous pour ouvrir vos boosters.</p>
      )}
    </section>
  );
}
