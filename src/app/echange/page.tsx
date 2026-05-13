"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { CardTile } from "@/components/cards/CardTile";
import { CLUB_CARDS } from "@/data/clubCards";
import { useCollectionSelectors, useCollectionStore } from "@/store/collectionStore";
import { useAuthStore } from "@/store/authStore";
import styles from "./page.module.css";

type PageMode = "menu" | "create" | "join" | "waiting" | "success";

export default function EchangePage() {
  const { quantities, doublesCards } = useCollectionSelectors();
  const loadCollection = useCollectionStore((state) => state.loadFromServer);
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);

  const [mode, setMode] = useState<PageMode>("menu");
  const [error, setError] = useState<string | null>(null);

  const [selectedOfferCardId, setSelectedOfferCardId] = useState<string>("");
  const [createdCode, setCreatedCode] = useState<string>("");

  const [joinCode, setJoinCode] = useState<string>("");
  const [fetchedCardId, setFetchedCardId] = useState<string | null>(null);
  const [selectedGiveCardId, setSelectedGiveCardId] = useState<string>("");

  const [successOfferCard, setSuccessOfferCard] = useState<string>("");
  const [tradesRemaining, setTradesRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (token) {
      loadCollection(token);
    }
  }, [token, loadCollection]);

  useEffect(() => {
    if (!token) { setTradesRemaining(null); return; }
    fetch("/api/user/quotas", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setTradesRemaining(d.tradesRemainingToday))
      .catch(() => {});
  }, [token]);

  const cardById = useMemo(
    () => CLUB_CARDS.reduce<Record<string, (typeof CLUB_CARDS)[number]>>((acc, card) => ({ ...acc, [card.id]: card }), {}),
    []
  );

  const sortedDoubles = useMemo(
    () => [...doublesCards].sort((a, b) => (quantities[b.id] ?? 0) - (quantities[a.id] ?? 0)),
    [doublesCards, quantities]
  );

  const resetToMenu = useCallback(() => {
    setMode("menu");
    setError(null);
    setSelectedOfferCardId("");
    setCreatedCode("");
    setJoinCode("");
    setFetchedCardId(null);
    setSelectedGiveCardId("");
    setSuccessOfferCard("");
  }, []);

  // --- Create flow ---
  const generateCode = async () => {
    if (!selectedOfferCardId || !token) return;
    setError(null);
    try {
      const res = await fetch("/api/trade-sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ cardOfferedId: selectedOfferCardId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCreatedCode(data.code);
      setMode("waiting");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur lors de la création";
      setError(message);
    }
  };

  // Poll session status while waiting
  useEffect(() => {
    if (mode !== "waiting" || !createdCode || !token) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/trade-sessions/${createdCode}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.session?.status === "COMPLETED") {
          clearInterval(interval);
          await loadCollection(token);
          const card = cardById[data.session.cardOfferedId];
          if (card) {
            setSuccessOfferCard(`${card.firstName} ${card.lastName}`);
          }
          setMode("success");
        }
      } catch {
        // Silently retry
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [mode, createdCode, token, loadCollection, cardById]);

  // --- Join flow ---
  const fetchSession = async () => {
    if (!joinCode.trim() || !token) return;
    setError(null);
    setFetchedCardId(null);
    try {
      const res = await fetch(`/api/trade-sessions/${joinCode.trim()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Code invalide");
      if (data.session.status !== "OPEN") throw new Error("Cette session n'est plus ouverte");
      if (data.session.creatorId === user?.id) throw new Error("Vous ne pouvez pas rejoindre votre propre échange");
      setFetchedCardId(data.session.cardOfferedId);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur lors de la récupération";
      setError(message);
      setFetchedCardId(null);
    }
  };

  const joinSession = async () => {
    if (!selectedGiveCardId || !createdCode || !token) return;
    setError(null);
    try {
      const res = await fetch(`/api/trade-sessions/${createdCode}/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ cardGivenId: selectedGiveCardId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await loadCollection(token);
      if (data.offeredCard) {
        setSuccessOfferCard(`${data.offeredCard.firstName} ${data.offeredCard.lastName}`);
      }
      setMode("success");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur lors de l'échange";
      setError(message);
    }
  };

  const offeredCard = fetchedCardId ? cardById[fetchedCardId] : null;

  if (!token) {
    return (
      <section className={styles.page}>
        <p className={styles.notice}>Connecte-toi pour accéder aux échanges.</p>
      </section>
    );
  }

  return (
    <section className={styles.page}>
      <div className={styles.headerRow}>
        <h2 className={styles.title}>Échanges</h2>
        {tradesRemaining !== null && (
          <span className={styles.tradeCount}>
            {tradesRemaining} échange{tradesRemaining > 1 ? "s" : ""} restant{tradesRemaining > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {error && (
        <div className={styles.error}>
          {error}
          <button className={styles.errorClose} onClick={() => setError(null)}>×</button>
        </div>
      )}

      {mode === "menu" && (
        <div className={styles.menuButtons}>
          <button className={styles.bigBtn} onClick={() => { setMode("create"); setError(null); }}>
            <span className={styles.bigBtnIcon}>⊕</span>
            <span className={styles.bigBtnLabel}>Créer un échange</span>
            <span className={styles.bigBtnDesc}>Propose une carte à échanger</span>
          </button>
          <button className={styles.bigBtn} onClick={() => { setMode("join"); setError(null); }}>
            <span className={styles.bigBtnIcon}>↘</span>
            <span className={styles.bigBtnLabel}>Rejoindre un échange</span>
            <span className={styles.bigBtnDesc}>Utilise un code pour échanger</span>
          </button>
        </div>
      )}

      {mode === "create" && (
        <>
          {!selectedOfferCardId ? (
            <div className={styles.step}>
              <h3>1. Choisis la carte que tu veux donner</h3>
              {sortedDoubles.length === 0 ? (
                <p className={styles.notice}>Aucun double disponible. Ouvre des boosters !</p>
              ) : (
                <div className={styles.cardGrid}>
                  {sortedDoubles.map((card) => (
                    <button
                      key={card.id}
                      className={`${styles.cardOption} ${selectedOfferCardId === card.id ? styles.cardOptionSelected : ""}`}
                      onClick={() => setSelectedOfferCardId(card.id)}
                    >
                      <CardTile card={card} quantity={quantities[card.id] ?? 0} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className={styles.step}>
              <h3>Carte choisie :</h3>
              <div className={styles.selectedCardPreview}>
                <CardTile card={cardById[selectedOfferCardId]!} quantity={quantities[selectedOfferCardId] ?? 0} />
              </div>
              <div className={styles.stepActions}>
                <button className={styles.secondaryBtn} onClick={() => setSelectedOfferCardId("")}>
                  Changer de carte
                </button>
                <button className={styles.primaryBtn} onClick={generateCode}>
                  Générer un code d&apos;échange
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {mode === "waiting" && (
        <div className={styles.waitingContainer}>
          <h3>Code d&apos;échange</h3>
          <div className={styles.bigCode}>{createdCode}</div>
          <p className={styles.waitingText}>
            En attente qu&apos;un autre joueur rejoigne...
          </p>
          <p className={styles.waitingHint}>
            Donne ce code à un ami pour qu&apos;il puisse échanger avec toi.
          </p>
          <div className={styles.spinner} />
          <button className={styles.secondaryBtn} onClick={resetToMenu}>
            Annuler
          </button>
        </div>
      )}

      {mode === "join" && (
        <>
          {!fetchedCardId ? (
            <div className={styles.step}>
              <h3>Entre le code d&apos;échange</h3>
              <input
                className={styles.codeInput}
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="ex: TR4582"
                maxLength={6}
                autoFocus
              />
              <button
                className={styles.primaryBtn}
                onClick={fetchSession}
                disabled={joinCode.trim().length < 4}
              >
                Voir la carte proposée
              </button>
            </div>
          ) : (
            <>
              <div className={styles.step}>
                <h3>Carte proposée par l&apos;autre joueur</h3>
                {offeredCard && (
                  <div className={styles.selectedCardPreview}>
                    <CardTile card={offeredCard} quantity={0} />
                  </div>
                )}
              </div>

              {!selectedGiveCardId ? (
                <div className={styles.step}>
                  <h3>2. Quelle carte donnes-tu en échange ?</h3>
                  {sortedDoubles.length === 0 ? (
                    <p className={styles.notice}>Aucun double disponible pour échanger.</p>
                  ) : (
                    <div className={styles.cardGrid}>
                      {sortedDoubles.map((card) => (
                        <button
                          key={card.id}
                          className={`${styles.cardOption} ${selectedGiveCardId === card.id ? styles.cardOptionSelected : ""}`}
                          onClick={() => setSelectedGiveCardId(card.id)}
                        >
                          <CardTile card={card} quantity={quantities[card.id] ?? 0} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className={styles.step}>
                  <h3>Tu donnes :</h3>
                  <div className={styles.selectedCardPreview}>
                    <CardTile card={cardById[selectedGiveCardId]!} quantity={quantities[selectedGiveCardId] ?? 0} />
                  </div>
                  <div className={styles.stepActions}>
                    <button className={styles.secondaryBtn} onClick={() => setSelectedGiveCardId("")}>
                      Changer de carte
                    </button>
                    <button
                      className={styles.primaryBtn}
                      onClick={() => {
                        setCreatedCode(joinCode.trim().toUpperCase());
                        joinSession();
                      }}
                    >
                      Valider l&apos;échange
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {mode === "success" && (
        <div className={styles.successContainer}>
          <div className={styles.successIcon}>✓</div>
          <h3>Échange réussi !</h3>
          {successOfferCard && <p>Tu as récupéré <strong>{successOfferCard}</strong>.</p>}
          <button className={styles.primaryBtn} onClick={resetToMenu}>
            Retour aux échanges
          </button>
        </div>
      )}
    </section>
  );
}
