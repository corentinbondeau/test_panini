'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { getCardsByCollection } from '@/data/clubCards';
import { CLUB_CARDS } from '@/data/clubCards';
import {
  Users, Shield, Trophy, Gift, Send, Plus, LogOut, HandHeart, ChevronRight, Loader2
} from 'lucide-react';
import Link from 'next/link';
import { CHEST_REWARD_LEVELS } from '@/lib/clan';
import Image from 'next/image';

interface ClanData {
  id: string;
  name: string;
  description: string | null;
  avatar: string | null;
  weeklyXP: number;
  maxMembers: number;
  memberCount: number;
  members: Array<{
    id: string;
    role: string;
    joinedAt: string;
    user: { id: string; firstName: string | null; lastName: string | null; avatar: string | null };
  }>;
  openRequestsCount: number;
}

interface Membership {
  id: string;
  role: string;
  joinedAt: string;
}

interface ClanRequest {
  id: string;
  userId: string;
  cardIdRequested: string;
  status: string;
  createdAt: string;
  user: { id: string; firstName: string | null; lastName: string | null; avatar: string | null };
}

export default function ClanPage() {
  const { user, token, checkAuth } = useAuthStore();
  const [clan, setClan] = useState<ClanData | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [chestReward, setChestReward] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [clanName, setClanName] = useState('');
  const [clanDesc, setClanDesc] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [requests, setRequests] = useState<ClanRequest[]>([]);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState('');

  const fetchClan = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/clan/my', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.clan) {
        setClan(data.clan);
        setMembership(data.membership);
        setChestReward(data.chestReward);
        // Fetch full clan details
        const detailRes = await fetch(`/api/clan/${data.clan.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const detail = await detailRes.json();
        if (detailRes.ok) {
          setClan(detail);
        }
      } else {
        setClan(null);
        setMembership(null);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchRequests = useCallback(async () => {
    if (!token || !membership) return;
    try {
      const res = await fetch('/api/clan/requests', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setRequests(data.requests || []);
    } catch {
      // ignore
    }
  }, [token, membership]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (token) fetchClan();
  }, [token, fetchClan]);

  useEffect(() => {
    if (token && membership) fetchRequests();
  }, [token, membership, fetchRequests]);

  const handleCreate = async () => {
    if (!token) return;
    setCreateLoading(true);
    setError('');
    try {
      const res = await fetch('/api/clan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: clanName, description: clanDesc }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur');
      }
      setShowCreate(false);
      setClanName('');
      setClanDesc('');
      fetchClan();
      setToast('Clan créé avec succès !');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!token || !joinCode) return;
    setJoinLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/clan/${joinCode}/join`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur');
      }
      setJoinCode('');
      fetchClan();
      setToast('Vous avez rejoint le clan !');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setJoinLoading(false);
    }
  };

  const handleLeave = async () => {
    if (!token || !clan) return;
    if (!confirm('Quitter le clan ?')) return;
    try {
      const res = await fetch(`/api/clan/${clan.id}/leave`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setClan(null);
        setMembership(null);
        setToast('Clan quitté.');
      }
    } catch {
      // ignore
    }
  };

  const handleClaimChest = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/clan/chest', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setToast(`+${data.tokensAwarded} tokens réclamés !`);
        setChestReward(0);
      } else {
        setToast(data.error || 'Erreur');
      }
    } catch {
      setToast('Erreur lors de la réclamation');
    }
  };

  const handleCreateRequest = async () => {
    if (!token || !selectedCardId) return;
    try {
      const res = await fetch('/api/clan/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ cardIdRequested: selectedCardId }),
      });
      if (res.ok) {
        setShowRequestForm(false);
        setSelectedCardId('');
        setToast('Demande envoyée dans le clan !');
        fetchRequests();
      } else {
        const data = await res.json();
        setToast(data.error || 'Erreur');
      }
    } catch {
      setToast('Erreur');
    }
  };

  const handleDonate = async (requestId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/clan/requests/${requestId}/donate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setToast(`Don effectué ! +${data.tokensRewarded} tokens gagnés`);
        fetchRequests();
        fetchClan();
      } else {
        setToast(data.error || 'Erreur');
      }
    } catch {
      setToast('Erreur lors du don');
    }
  };

  const cards = getCardsByCollection('s25-26');
  const requestableCards = cards.filter((c) => c.rarity === 'COMMUNE' || c.rarity === 'RARE');

  if (!user) {
    return (
      <section style={{ textAlign: 'center', padding: '3rem 1rem', maxWidth: 500, margin: '0 auto' }}>
        <Users size={48} style={{ color: 'var(--club-yellow-500)', marginBottom: '1rem' }} />
        <h2>Clans</h2>
        <p style={{ color: 'var(--text-soft)' }}>Connectez-vous pour accéder aux clans.</p>
        <Link href="/auth" style={{
          display: 'inline-block', marginTop: '1rem', padding: '0.6rem 1.5rem',
          background: 'var(--club-yellow-500)', color: 'var(--club-blue-950)',
          borderRadius: '8px', fontWeight: 700, textDecoration: 'none'
        }}>
          Se connecter
        </Link>
      </section>
    );
  }

  return (
    <section style={{ maxWidth: 700, margin: '0 auto', display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Users size={22} style={{ color: 'var(--club-yellow-500)' }} />
          Clans
        </h2>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-soft)' }}>
          <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto' }} />
        </div>
      )}

      {/* Not in a clan */}
      {!loading && !clan && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{
            background: 'linear-gradient(180deg, var(--club-blue-800), var(--club-blue-900))',
            border: '1px solid var(--club-blue-700)', borderRadius: 12, padding: '1.5rem',
            textAlign: 'center', display: 'grid', gap: 16,
          }}>
            <Users size={40} style={{ color: 'var(--club-yellow-500)', margin: '0 auto' }} />
            <div>
              <p style={{ fontWeight: 700, margin: 0 }}>Vous n&apos;êtes dans aucun clan</p>
              <p style={{ color: 'var(--text-soft)', fontSize: '0.85rem', margin: '4px 0 0' }}>
                Rejoignez ou créez un clan pour débloquer le coffre hebdomadaire et les dons de cartes.
              </p>
            </div>
          </div>

          {/* Create clan */}
          <div style={{
            background: 'linear-gradient(180deg, var(--club-blue-800), var(--club-blue-900))',
            border: '1px solid var(--club-blue-700)', borderRadius: 12, padding: '1.5rem',
          }}>
            <button onClick={() => setShowCreate(!showCreate)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'none', border: 'none', color: 'var(--club-yellow-500)',
                cursor: 'pointer', fontSize: '1rem', fontWeight: 700, padding: 0,
                fontFamily: 'inherit',
              }}
            >
              <Plus size={18} />
              Créer un clan
            </button>
            {showCreate && (
              <div style={{ marginTop: 16, display: 'grid', gap: 10 }}>
                <input
                  value={clanName}
                  onChange={(e) => setClanName(e.target.value)}
                  placeholder="Nom du clan (min. 3 caractères)"
                  style={{
                    background: 'var(--club-blue-900)', border: '1px solid var(--club-blue-700)',
                    borderRadius: 8, padding: '10px 12px', color: 'var(--text-main)',
                    fontFamily: 'inherit', fontSize: '0.9rem',
                  }}
                />
                <input
                  value={clanDesc}
                  onChange={(e) => setClanDesc(e.target.value)}
                  placeholder="Description (optionnelle)"
                  style={{
                    background: 'var(--club-blue-900)', border: '1px solid var(--club-blue-700)',
                    borderRadius: 8, padding: '10px 12px', color: 'var(--text-main)',
                    fontFamily: 'inherit', fontSize: '0.9rem',
                  }}
                />
                {error && <p style={{ color: '#ff6b6b', fontSize: '0.85rem', margin: 0 }}>{error}</p>}
                <button onClick={handleCreate} disabled={createLoading || clanName.length < 3}
                  style={{
                    background: 'var(--club-yellow-500)', color: 'var(--club-blue-950)',
                    border: 'none', borderRadius: 8, padding: '10px', fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  {createLoading ? 'Création...' : 'Créer le clan'}
                </button>
              </div>
            )}
          </div>

          {/* Join clan */}
          <div style={{
            background: 'linear-gradient(180deg, var(--club-blue-800), var(--club-blue-900))',
            border: '1px solid var(--club-blue-700)', borderRadius: 12, padding: '1.5rem',
          }}>
            <p style={{ fontWeight: 700, margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Send size={16} />
              Rejoindre un clan
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="ID du clan"
                style={{
                  flex: 1, background: 'var(--club-blue-900)', border: '1px solid var(--club-blue-700)',
                  borderRadius: 8, padding: '10px 12px', color: 'var(--text-main)',
                  fontFamily: 'inherit', fontSize: '0.9rem',
                }}
              />
              <button onClick={handleJoin} disabled={joinLoading || !joinCode}
                style={{
                  background: 'var(--club-yellow-500)', color: 'var(--club-blue-950)',
                  border: 'none', borderRadius: 8, padding: '10px 16px', fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                {joinLoading ? '...' : 'Rejoindre'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In a clan */}
      {!loading && clan && membership && (
        <>
          {/* Clan header */}
          <div style={{
            background: 'linear-gradient(180deg, var(--club-blue-800), var(--club-blue-900))',
            border: '1px solid var(--club-blue-700)', borderRadius: 12, padding: '1.25rem',
            display: 'grid', gap: 8,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12,
                background: 'var(--club-yellow-500)', display: 'grid', placeItems: 'center',
                fontSize: '1.2rem', fontWeight: 900, color: 'var(--club-blue-950)',
                flexShrink: 0,
              }}>
                {clan.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{clan.name}</h3>
                {clan.description && (
                  <p style={{ margin: '2px 0 0', color: 'var(--text-soft)', fontSize: '0.8rem' }}>
                    {clan.description}
                  </p>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 16, fontSize: '0.85rem', color: 'var(--text-soft)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Users size={14} /> {clan.memberCount}/{clan.maxMembers}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Trophy size={14} style={{ color: 'var(--club-yellow-500)' }} />
                {clan.weeklyXP} XP cette semaine
              </span>
              {membership.role === 'leader' && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--club-yellow-500)' }}>
                  <Shield size={14} /> Leader
                </span>
              )}
            </div>
          </div>

          {/* Chest */}
          <div style={{
            background: 'linear-gradient(180deg, var(--club-blue-800), var(--club-blue-900))',
            border: '1px solid var(--club-yellow-500)', borderRadius: 12, padding: '1rem 1.25rem',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Gift size={24} style={{ color: 'var(--club-yellow-500)' }} />
              <div>
                <p style={{ margin: 0, fontWeight: 700 }}>Coffre hebdomadaire</p>
                <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-soft)' }}>
                  {clan.weeklyXP} XP — Récompense : {chestReward} tokens
                </p>
              </div>
            </div>
            <button onClick={handleClaimChest} disabled={chestReward <= 0}
              style={{
                background: chestReward > 0 ? 'var(--club-yellow-500)' : 'var(--club-blue-700)',
                color: chestReward > 0 ? 'var(--club-blue-950)' : 'var(--text-soft)',
                border: 'none', borderRadius: 8, padding: '8px 14px', fontWeight: 700,
                cursor: chestReward > 0 ? 'pointer' : 'not-allowed', fontFamily: 'inherit', fontSize: '0.85rem',
              }}
            >
              Réclamer
            </button>
          </div>

          {/* Chest levels progress */}
          <div style={{
            background: 'linear-gradient(180deg, var(--club-blue-800), var(--club-blue-900))',
            border: '1px solid var(--club-blue-700)', borderRadius: 12, padding: '1rem 1.25rem',
          }}>
            <p style={{ margin: '0 0 8px', fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Trophy size={16} /> Palier du coffre
            </p>
            {CHEST_REWARD_LEVELS.map((level) => {
              const reached = clan.weeklyXP >= level.xpRequired;
              return (
                <div key={level.xpRequired} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '4px 0', fontSize: '0.8rem',
                  color: reached ? 'var(--club-yellow-500)' : 'var(--text-soft)',
                  opacity: reached ? 1 : 0.5,
                }}>
                  <div style={{
                    width: 12, height: 12, borderRadius: '50%', flexShrink: 0,
                    background: reached ? 'var(--club-yellow-500)' : 'var(--club-blue-700)',
                  }} />
                  <span style={{ flex: 1 }}>{level.description}</span>
                  {reached && <ChevronRight size={14} />}
                </div>
              );
            })}
          </div>

          {/* Members */}
          <div style={{
            background: 'linear-gradient(180deg, var(--club-blue-800), var(--club-blue-900))',
            border: '1px solid var(--club-blue-700)', borderRadius: 12, padding: '1rem 1.25rem',
          }}>
            <p style={{ margin: '0 0 10px', fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Users size={16} /> Membres ({clan.memberCount})
            </p>
            <div style={{ display: 'grid', gap: 6 }}>
              {clan.members?.map((m) => (
                <div key={m.id} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 8px', borderRadius: 8,
                  background: 'rgba(255,255,255,0.03)',
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', overflow: 'hidden',
                    background: 'var(--club-blue-700)', display: 'grid', placeItems: 'center',
                    flexShrink: 0,
                  }}>
                    {m.user.avatar ? (
                      <img src={m.user.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontWeight: 700, fontSize: '0.8rem' }}>
                        {(m.user.firstName?.charAt(0) || '?').toUpperCase()}
                      </span>
                    )}
                  </div>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                    {m.user.firstName} {m.user.lastName}
                    {m.role === 'leader' && (
                      <span style={{ color: 'var(--club-yellow-500)', marginLeft: 4, fontSize: '0.75rem' }}>(Leader)</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Requests / Donations */}
          <div style={{
            background: 'linear-gradient(180deg, var(--club-blue-800), var(--club-blue-900))',
            border: '1px solid var(--club-blue-700)', borderRadius: 12, padding: '1rem 1.25rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                <HandHeart size={16} /> Demandes de dons
              </p>
              <button onClick={() => setShowRequestForm(!showRequestForm)}
                style={{
                  background: 'none', border: '1px solid var(--club-yellow-500)', borderRadius: 6,
                  padding: '4px 10px', color: 'var(--club-yellow-500)', cursor: 'pointer',
                  fontSize: '0.8rem', fontWeight: 600, fontFamily: 'inherit',
                }}
              >
                + Demander
              </button>
            </div>

            {/* Request form */}
            {showRequestForm && (
              <div style={{ marginBottom: 12, display: 'grid', gap: 8 }}>
                <select
                  value={selectedCardId}
                  onChange={(e) => setSelectedCardId(e.target.value)}
                  style={{
                    background: 'var(--club-blue-900)', border: '1px solid var(--club-blue-700)',
                    borderRadius: 8, padding: '8px 10px', color: 'var(--text-main)',
                    fontFamily: 'inherit', fontSize: '0.85rem',
                  }}
                >
                  <option value="">Choisir une carte...</option>
                  {requestableCards.map((c) => (
                    <option key={c.id} value={c.id}>{c.firstName} {c.lastName} ({c.rarity})</option>
                  ))}
                </select>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={handleCreateRequest} disabled={!selectedCardId}
                    style={{
                      flex: 1, background: 'var(--club-yellow-500)', color: 'var(--club-blue-950)',
                      border: 'none', borderRadius: 8, padding: '8px', fontWeight: 700,
                      cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.85rem',
                    }}
                  >
                    Envoyer la demande
                  </button>
                  <button onClick={() => setShowRequestForm(false)}
                    style={{
                      background: 'none', border: '1px solid var(--club-blue-700)',
                      borderRadius: 8, padding: '8px 12px', color: 'var(--text-soft)',
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}

            {/* Request list */}
            {requests.length === 0 ? (
              <p style={{ color: 'var(--text-soft)', fontSize: '0.85rem', margin: 0 }}>
                Aucune demande en cours.
              </p>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {requests.map((req) => {
                  const card = cards.find((c) => c.id === req.cardIdRequested);
                  return (
                    <div key={req.id} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 10px', borderRadius: 8,
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid var(--club-blue-800)',
                    }}>
                      {card && (
                        <Image src={card.photo} alt="" width={32} height={24}
                          style={{ borderRadius: 4, flexShrink: 0, objectFit: 'cover' }} />
                      )}
                      <div style={{ flex: 1 }}>
                        <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                          {card ? `${card.firstName} ${card.lastName}` : req.cardIdRequested}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-soft)', marginLeft: 6 }}>
                          par {req.user.firstName} {req.user.lastName}
                        </span>
                      </div>
                      {req.userId !== user.id && (
                        <button onClick={() => handleDonate(req.id)}
                          style={{
                            background: 'var(--club-yellow-500)', color: 'var(--club-blue-950)',
                            border: 'none', borderRadius: 6, padding: '4px 10px',
                            fontWeight: 700, cursor: 'pointer', fontSize: '0.75rem',
                            fontFamily: 'inherit',
                          }}
                        >
                          Donner
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Leave clan */}
          <div style={{ textAlign: 'center' }}>
            <button onClick={handleLeave}
              style={{
                background: 'none', border: '1px solid rgba(255,80,80,0.3)',
                color: '#ff8080', borderRadius: 8, padding: '8px 16px',
                cursor: 'pointer', fontSize: '0.85rem', fontFamily: 'inherit',
              }}
            >
              <LogOut size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
              Quitter le clan
            </button>
          </div>
        </>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--club-yellow-500)', color: 'var(--club-blue-950)',
          fontWeight: 700, padding: '10px 20px', borderRadius: 10,
          fontSize: '0.9rem', zIndex: 999, boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        }}>
          {toast}
        </div>
      )}
    </section>
  );
}
