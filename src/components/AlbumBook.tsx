'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/data/cards';
import { ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';

interface AlbumBookProps {
  cards: Card[];
  quantities: Record<string, number>;
  shinyCards: string[];
  cardDates: Record<string, string>;
}

const CARDS_PER_PAGE_SPREAD = 10; // 5 per page × 2 pages = 10 per spread

export function AlbumBook({ cards, quantities, shinyCards, cardDates }: AlbumBookProps) {
  const totalPages = Math.max(1, Math.ceil(cards.length / CARDS_PER_PAGE_SPREAD));
  const [currentSpread, setCurrentSpread] = useState(0);
  const [direction, setDirection] = useState(0);

  const spread = useMemo(() => {
    const start = currentSpread * CARDS_PER_PAGE_SPREAD;
    const pageCards = cards.slice(start, start + CARDS_PER_PAGE_SPREAD);
    const left = pageCards.slice(0, 5);
    const right = pageCards.slice(5, 10);
    return { left, right };
  }, [cards, currentSpread]);

  const goForward = () => {
    if (currentSpread < totalPages - 1) {
      setDirection(1);
      setCurrentSpread((p) => p + 1);
    }
  };

  const goBackward = () => {
    if (currentSpread > 0) {
      setDirection(-1);
      setCurrentSpread((p) => p - 1);
    }
  };

  const pageVariants = {
    enter: (dir: number) => ({
      rotateY: dir > 0 ? -90 : 90,
      opacity: 0,
    }),
    center: {
      rotateY: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      rotateY: dir > 0 ? 90 : -90,
      opacity: 0,
    }),
  };

  return (
    <div className="album-book">
      <div className="album-book-header">
        <BookOpen size={18} />
        <span>Pages {currentSpread * CARDS_PER_PAGE_SPREAD + 1}–{Math.min((currentSpread + 1) * CARDS_PER_PAGE_SPREAD, cards.length)} sur {cards.length} cartes</span>
      </div>

      <div className="album-book-spread">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentSpread}
            custom={direction}
            variants={pageVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
            className="album-book-pages"
            style={{ perspective: 1200 }}
          >
            {/* Left page */}
            <div className="album-book-page">
              {[0, 1, 2, 3, 4].map((i) => {
                const card = spread.left[i];
                if (!card) return <div key={`empty-${i}`} className="album-slot album-slot-empty" />;
                const qty = quantities[card.id] ?? 0;
                return (
                  <div key={card.id} className="album-slot">
                    {qty > 0 ? (
                      <>
                        <div className={`album-card-inner ${shinyCards.includes(card.id) ? 'album-shiny' : ''}`}>
                          <img src={card.imageUrl || card.photo} alt={card.firstName} className="album-card-img" />
                          {shinyCards.includes(card.id) && <div className="album-shiny-overlay" />}
                        </div>
                        <div className="album-card-meta">
                          <span className="album-card-name">{card.firstName} {card.lastName}</span>
                          <span className="album-card-number">#{card.number.toString().padStart(3, '0')}</span>
                          {qty > 1 && <span className="album-card-dupes">x{qty}</span>}
                        </div>
                      </>
                    ) : (
                      <div className="album-silhouette">
                        <div className="album-silhouette-inner">
                          <span className="album-silhouette-num">#{card.number.toString().padStart(3, '0')}</span>
                          <span className="album-silhouette-rarity">{card.rarity === 'LEGENDAIRE' ? 'L' : card.rarity === 'RARE' ? 'R' : 'C'}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Center spine */}
            <div className="album-book-spine" />

            {/* Right page */}
            <div className="album-book-page">
              {[0, 1, 2, 3, 4].map((i) => {
                const card = spread.right[i];
                if (!card) return <div key={`empty-${i}`} className="album-slot album-slot-empty" />;
                const qty = quantities[card.id] ?? 0;
                return (
                  <div key={card.id} className="album-slot">
                    {qty > 0 ? (
                      <>
                        <div className={`album-card-inner ${shinyCards.includes(card.id) ? 'album-shiny' : ''}`}>
                          <img src={card.imageUrl || card.photo} alt={card.firstName} className="album-card-img" />
                          {shinyCards.includes(card.id) && <div className="album-shiny-overlay" />}
                        </div>
                        <div className="album-card-meta">
                          <span className="album-card-name">{card.firstName} {card.lastName}</span>
                          <span className="album-card-number">#{card.number.toString().padStart(3, '0')}</span>
                          {qty > 1 && <span className="album-card-dupes">x{qty}</span>}
                        </div>
                      </>
                    ) : (
                      <div className="album-silhouette">
                        <div className="album-silhouette-inner">
                          <span className="album-silhouette-num">#{card.number.toString().padStart(3, '0')}</span>
                          <span className="album-silhouette-rarity">{card.rarity === 'LEGENDAIRE' ? 'L' : card.rarity === 'RARE' ? 'R' : 'C'}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="album-book-nav">
        <button onClick={goBackward} disabled={currentSpread === 0} className="album-book-nav-btn">
          <ChevronLeft size={20} />
        </button>
        <span className="album-book-page-indicator">
          {currentSpread + 1} / {totalPages}
        </span>
        <button onClick={goForward} disabled={currentSpread >= totalPages - 1} className="album-book-nav-btn">
          <ChevronRight size={20} />
        </button>
      </div>

      <style jsx>{`
        .album-book {
          display: flex;
          flex-direction: column;
          gap: 12px;
          width: 100%;
        }
        .album-book-header {
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--club-yellow-500);
          font-size: 0.85rem;
          font-weight: 600;
        }
        .album-book-spread {
          display: flex;
          justify-content: center;
          min-height: 360px;
          position: relative;
        }
        .album-book-pages {
          display: flex;
          gap: 0;
          width: 100%;
          max-width: 900px;
          background: linear-gradient(180deg, var(--club-blue-900), var(--club-blue-950));
          border: 1px solid var(--club-blue-700);
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        }
        .album-book-page {
          flex: 1;
          display: grid;
          grid-template-columns: 1fr 1fr;
          grid-template-rows: auto auto auto;
          gap: 8px;
          padding: 16px;
          min-height: 300px;
        }
        .album-book-spine {
          width: 4px;
          background: linear-gradient(180deg, transparent, var(--club-yellow-500), transparent);
          opacity: 0.3;
          flex-shrink: 0;
        }
        .album-slot {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          min-height: 120px;
        }
        .album-slot-empty {
          opacity: 0;
        }
        .album-card-inner {
          width: 100%;
          aspect-ratio: 3/2;
          border-radius: 6px;
          overflow: hidden;
          border: 1px solid var(--club-blue-700);
          position: relative;
          background: var(--club-blue-800);
        }
        .album-card-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .album-shiny .album-card-img {
          filter: brightness(1.1) saturate(1.2);
        }
        .album-shiny-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(105deg, transparent 30%, rgba(243,198,35,0.15) 45%, rgba(243,198,35,0.25) 50%, rgba(243,198,35,0.15) 55%, transparent 70%);
          background-size: 300% 100%;
          animation: shinySlide 3s ease-in-out infinite;
          pointer-events: none;
        }
        @keyframes shinySlide {
          0% { background-position: 100% 0; }
          60% { background-position: -100% 0; }
          100% { background-position: -100% 0; }
        }
        .album-card-meta {
          display: flex;
          gap: 4px;
          align-items: center;
          flex-wrap: wrap;
          justify-content: center;
        }
        .album-card-name {
          font-size: 0.65rem;
          color: var(--text-main);
          font-weight: 600;
          text-align: center;
          line-height: 1.1;
        }
        .album-card-number {
          font-size: 0.55rem;
          color: var(--text-soft);
        }
        .album-card-dupes {
          font-size: 0.55rem;
          background: var(--club-yellow-500);
          color: var(--club-blue-950);
          padding: 1px 5px;
          border-radius: 3px;
          font-weight: 700;
        }
        .album-silhouette {
          width: 100%;
          aspect-ratio: 3/2;
          border-radius: 6px;
          border: 2px dashed rgba(255,255,255,0.15);
          background: rgba(255,255,255,0.03);
          display: grid;
          place-items: center;
          position: relative;
        }
        .album-silhouette-inner {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
        }
        .album-silhouette-num {
          font-size: 0.8rem;
          color: rgba(255,255,255,0.25);
          font-weight: 800;
          font-family: monospace;
        }
        .album-silhouette-rarity {
          font-size: 0.6rem;
          color: rgba(255,255,255,0.15);
          font-weight: 600;
        }
        .album-book-nav {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
        }
        .album-book-nav-btn {
          background: var(--club-blue-800);
          border: 1px solid var(--club-blue-700);
          border-radius: 8px;
          padding: 8px 12px;
          cursor: pointer;
          color: var(--club-yellow-500);
          display: flex;
          align-items: center;
          transition: background 0.2s;
        }
        .album-book-nav-btn:hover:not(:disabled) {
          background: var(--club-blue-700);
        }
        .album-book-nav-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }
        .album-book-page-indicator {
          color: var(--text-soft);
          font-size: 0.85rem;
          font-weight: 600;
          font-family: monospace;
        }
        @media (max-width: 600px) {
          .album-book-page {
            grid-template-columns: 1fr;
            gap: 12px;
            padding: 12px;
          }
        }
      `}</style>
    </div>
  );
}
