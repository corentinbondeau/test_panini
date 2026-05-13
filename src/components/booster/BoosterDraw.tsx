"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./BoosterDraw.module.css";
import { useAuthStore } from "@/store/authStore";

const MAX_BOOSTERS = 25;

export function BoosterDraw() {
  const { user, token } = useAuthStore();
  const [boostersRemaining, setBoostersRemaining] = useState<number | null>(null);

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
        </>
      ) : (
        <p className={styles.loginPrompt}>Connectez-vous pour ouvrir vos boosters.</p>
      )}
    </section>
  );
}
