"use client";

import { useMemo, useState } from "react";
import { CardTile } from "@/components/cards/CardTile";
import { CLUB_CARDS } from "@/data/clubCards";
import { decodeSharedCollection, shareCollection } from "@/lib/shareCollection";
import { useCollectionSelectors, useCollectionStore } from "@/store/collectionStore";
import styles from "./page.module.css";

export default function DoublesPage() {
  const { quantities, doublesCards } = useCollectionSelectors();
  const addCard = useCollectionStore((state) => state.addCard);
  const removeCard = useCollectionStore((state) => state.removeCard);
  const [importValue, setImportValue] = useState("");
  const [partnerDoubles, setPartnerDoubles] = useState<Record<string, number> | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [selectedGiveId, setSelectedGiveId] = useState<string>("");
  const [selectedReceiveId, setSelectedReceiveId] = useState<string>("");

  const sorted = [...doublesCards].sort(
    (a, b) => (quantities[b.id] ?? 0) - (quantities[a.id] ?? 0)
  );
  const cardById = useMemo(
    () => CLUB_CARDS.reduce<Record<string, (typeof CLUB_CARDS)[number]>>((acc, card) => ({ ...acc, [card.id]: card }), {}),
    []
  );

  const myTradeable = useMemo(
    () => CLUB_CARDS.filter((card) => (quantities[card.id] ?? 0) >= 2),
    [quantities]
  );

  const partnerTradeable = useMemo(() => {
    if (!partnerDoubles) return [];
    return CLUB_CARDS.filter((card) => (partnerDoubles[card.id] ?? 0) >= 2);
  }, [partnerDoubles]);

  const cardsTheyNeedFromMe = useMemo(() => {
    if (!partnerDoubles) return [];
    return myTradeable.filter((card) => (partnerDoubles[card.id] ?? 0) === 0);
  }, [myTradeable, partnerDoubles]);

  const cardsIWantFromThem = useMemo(() => {
    if (!partnerDoubles) return [];
    return partnerTradeable.filter((card) => (quantities[card.id] ?? 0) === 0);
  }, [partnerTradeable, quantities, partnerDoubles]);

  const suggestedTrades = useMemo(() => {
    const limit = Math.min(cardsTheyNeedFromMe.length, cardsIWantFromThem.length, 8);
    return Array.from({ length: limit }, (_, i) => ({
      give: cardsTheyNeedFromMe[i],
      receive: cardsIWantFromThem[i]
    }));
  }, [cardsTheyNeedFromMe, cardsIWantFromThem]);

  const myShareData = useMemo(
    () => shareCollection(CLUB_CARDS, quantities),
    [quantities]
  );

  const copyMyShareCode = async () => {
    await navigator.clipboard.writeText(myShareData.shareCode);
    alert("Code de partage copié.");
  };

  const importPartnerCollection = () => {
    try {
      const payload = decodeSharedCollection(importValue);
      setPartnerDoubles(payload.doubles);
      setImportError(null);
    } catch {
      setPartnerDoubles(null);
      setImportError("Code invalide. Vérifie le texte partagé.");
    }
  };

  const executeTrade = () => {
    if (!selectedGiveId || !selectedReceiveId) return;
    const giveQty = quantities[selectedGiveId] ?? 0;
    if (giveQty < 2) {
      alert("Tu dois garder au moins 1 exemplaire. Choisis une vraie carte en double.");
      return;
    }
    removeCard(selectedGiveId, 1);
    addCard(selectedReceiveId, 1);
    alert("Échange appliqué à ta collection locale.");
  };

  return (
    <section>
      <h2>Mes doubles</h2>
      <p className={styles.note}>Cartes possédées au moins en 2 exemplaires.</p>

      <div className={styles.exchangeBox}>
        <h3>Échange avec un autre utilisateur</h3>
        <div className={styles.shareVisible}>
          <p>Ton code de partage (8 caractères max) :</p>
          <textarea className={styles.codeArea} value={myShareData.shareCode} readOnly />
        </div>
        <div className={styles.exchangeActions}>
          <button onClick={copyMyShareCode}>Copier mon code de partage</button>
          <div className={styles.importArea}>
            <textarea
              value={importValue}
              onChange={(event) => setImportValue(event.target.value)}
              placeholder="Colle le code court (8 max), le lien direct ou le code complet"
            />
            <button onClick={importPartnerCollection}>Analyser le code</button>
          </div>
        </div>
        {importError ? <p className={styles.error}>{importError}</p> : null}

        {partnerDoubles ? (
          <div className={styles.tradeSummary}>
            <p>Le partenaire propose {partnerTradeable.length} cartes différentes en double.</p>
            <p>Il te manque {cardsIWantFromThem.length} cartes que le partenaire peut échanger.</p>
            <p>Le partenaire n&apos;a pas {cardsTheyNeedFromMe.length} de tes cartes échangeables.</p>
          </div>
        ) : null}

        {partnerDoubles && suggestedTrades.length > 0 ? (
          <div className={styles.suggestionList}>
            <h4>Suggestions d&apos;échange</h4>
            {suggestedTrades.map((trade, index) => (
              <p key={`${trade.give.id}-${trade.receive.id}`}>
                {index + 1}. Donner <strong>{trade.give.firstName} {trade.give.lastName}</strong> contre <strong>{trade.receive.firstName} {trade.receive.lastName}</strong>
              </p>
            ))}
          </div>
        ) : null}

        {partnerDoubles ? (
          <div className={styles.manualTrade}>
            <h4>Appliquer un échange manuel (1 pour 1)</h4>
            <div className={styles.selectRow}>
              <select value={selectedGiveId} onChange={(event) => setSelectedGiveId(event.target.value)}>
                <option value="">Je donne...</option>
                {myTradeable.map((card) => (
                  <option key={card.id} value={card.id}>
                    {card.firstName} {card.lastName} (x{quantities[card.id]})
                  </option>
                ))}
              </select>
              <select value={selectedReceiveId} onChange={(event) => setSelectedReceiveId(event.target.value)}>
                <option value="">Je reçois...</option>
                {partnerTradeable.map((card) => (
                  <option key={card.id} value={card.id}>
                    {card.firstName} {card.lastName} (partenaire x{partnerDoubles[card.id]})
                  </option>
                ))}
              </select>
              <button onClick={executeTrade} disabled={!selectedGiveId || !selectedReceiveId}>
                Valider l&apos;échange
              </button>
            </div>
            {selectedGiveId && selectedReceiveId ? (
              <p className={styles.preview}>
                Tu donnes <strong>{cardById[selectedGiveId]?.firstName} {cardById[selectedGiveId]?.lastName}</strong> et tu reçois{" "}
                <strong>{cardById[selectedReceiveId]?.firstName} {cardById[selectedReceiveId]?.lastName}</strong>.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      {sorted.length === 0 ? (
        <p className={styles.empty}>Aucun double pour l&apos;instant. Ouvre quelques boosters !</p>
      ) : (
        <div className={styles.grid}>
          {sorted.map((card) => (
            <CardTile key={card.id} card={card} quantity={quantities[card.id] ?? 0} />
          ))}
        </div>
      )}
    </section>
  );
}
