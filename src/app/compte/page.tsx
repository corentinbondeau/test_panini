'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useCollectionSelectors } from '@/store/collectionStore';
import { CLUB_CARDS } from '@/data/clubCards';
import Image from 'next/image';
import AvatarBorder from '@/components/AvatarBorder';
import Link from 'next/link';
import { Eye, EyeOff, Package } from 'lucide-react';
import styles from './page.module.css';

interface BoosterHistoryEntry {
  id: string;
  createdAt: string;
  rarityCounts: Record<string, number>;
  cards: Array<{ id: string; firstName: string; lastName: string; photo: string; rarity: string }>;
}

export default function ComptePage() {
  const { user, isLoading, updateProfile, checkAuth, logout, token } = useAuthStore();
  const { quantities } = useCollectionSelectors();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Push notification state
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);

  // Public album state
  const [isPublicAlbum, setIsPublicAlbum] = useState(false);
  const [publicAlbumLoading, setPublicAlbumLoading] = useState(false);

  // Booster history state
  const [boosterHistory, setBoosterHistory] = useState<BoosterHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    checkAuth().finally(() => setIsInitialized(true));
  }, [checkAuth]);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setEmail(user.email || '');
      setIsPublicAlbum(user.isPublicAlbum ?? false);
    }
  }, [user]);

  useEffect(() => {
    if (showToast) {
      toastTimer.current = setTimeout(() => setShowToast(false), 3000);
      return () => clearTimeout(toastTimer.current);
    }
  }, [showToast]);

  // Fetch booster history
  useEffect(() => {
    if (!token) return;
    setHistoryLoading(true);
    fetch('/api/booster/history', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setBoosterHistory(data.logs || []))
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }, [token]);

  // Check push subscription status on mount + browser permission
  useEffect(() => {
    if (!user || !token) return;
    const perm = 'Notification' in window ? Notification.permission : 'denied';
    if (perm === 'denied') {
      setPushEnabled(false);
      return;
    }
    fetch('/api/notifications/unsubscribe', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setPushEnabled(data.subscribed && perm === 'granted'))
      .catch(() => {});
  }, [user, token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await updateProfile({ firstName, lastName, email });
      setToastMessage('Profil mis à jour avec succès.');
      setShowToast(true);
    } catch {
      setError('Erreur lors de la mise à jour.');
    }
  };

  const ownedCards = CLUB_CARDS.filter((c) => (quantities[c.id] ?? 0) > 0);

  const handleSelectAvatar = async (photoUrl: string) => {
    try {
      await updateProfile({ avatar: photoUrl });
      setShowAvatarPicker(false);
      setToastMessage('Avatar mis à jour avec succès.');
      setShowToast(true);
    } catch {
      setError("Erreur lors de la mise à jour de l'avatar.");
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    if (newPassword.length < 8) {
      setPasswordError('Le nouveau mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Les mots de passe ne correspondent pas.');
      return;
    }
    setPasswordLoading(true);
    try {
      const res = await fetch('/api/user/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setToastMessage('Mot de passe modifié avec succès.');
      setShowToast(true);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleTogglePush = useCallback(async () => {
    if (!token) return;
    setPushLoading(true);
    try {
      if (!pushEnabled) {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
          console.warn('🔔 Navigateur ne supporte pas les notifications');
          setToastMessage('Notifications non supportées par votre navigateur.');
          setShowToast(true);
          return;
        }
        if (!('Notification' in window)) {
          console.warn('🔔 Notification API indisponible');
          setToastMessage('API Notification indisponible sur ce navigateur.');
          setShowToast(true);
          return;
        }
        const permission = await Notification.requestPermission();
        console.log('🔔 Permission notification:', permission);
        if (permission !== 'granted') {
          console.warn('🔔 Permission refusée');
          setToastMessage('Permission de notification refusée.');
          setShowToast(true);
          return;
        }
        if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
          console.error('🔔 Clé VAPID publique manquante');
          setToastMessage('Erreur de configuration serveur.');
          setShowToast(true);
          return;
        }
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('🔔 Service Worker enregistré');
        const existingSub = await registration.pushManager.getSubscription();
        if (existingSub) {
          await existingSub.unsubscribe();
          console.log('🔔 Ancien abonnement résilié');
        }
        const applicationServerKey = urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
        );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const subscription = await (registration.pushManager as any).subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });
        console.log('🔔 Abonnement PushManager réussi');
        const res = await fetch('/api/notifications/subscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(subscription.toJSON()),
        });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Erreur serveur (${res.status}): ${text}`);
        }
        console.log('🔔 Abonnement envoyé au serveur');
        setPushEnabled(true);
        setToastMessage('Notifications activées.');
      } else {
        const registration = await navigator.serviceWorker.register('/sw.js');
        const sub = await registration.pushManager.getSubscription();
        const endpoint = sub?.toJSON().endpoint || '';
        const res = await fetch('/api/notifications/unsubscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ endpoint }),
        });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Erreur serveur (${res.status}): ${text}`);
        }
        if (sub) await sub.unsubscribe();
        console.log('🔔 Désabonnement réussi');
        setPushEnabled(false);
        setToastMessage('Notifications désactivées.');
      }
      setShowToast(true);
    } catch (err) {
      console.error('🔔 Erreur notification:', err);
      setToastMessage(`Erreur: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
      setShowToast(true);
    } finally {
      setPushLoading(false);
    }
  }, [pushEnabled, token]);

  if (!isInitialized) {
    return <p className={styles.loading}>Chargement...</p>;
  }

  if (!user) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
        <h2>Connectez-vous</h2>
        <p style={{ color: 'var(--text-soft)' }}>Vous devez etre connecte pour acceder a cette page.</p>
        <Link href="/auth" style={{
          display: 'inline-block', marginTop: '1rem', padding: '0.6rem 1.5rem',
          background: 'var(--club-yellow-500)', color: 'var(--club-blue-950)',
          borderRadius: '8px', fontWeight: 700, textDecoration: 'none'
        }}>
          Se connecter
        </Link>
      </div>
    );
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 text-base">
      <div className={styles.page}>
      <h1 className={styles.title}>Mon compte</h1>

      {/* Avatar */}
      <div className={styles.avatarSection}>
        <AvatarBorder level={user.totalCardsObtained ?? 0} size={96}>
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {user.avatar ? (
              <img src={user.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ fontSize: 28, fontWeight: 700 }}>
                {(user.firstName?.charAt(0) || user.email?.charAt(0) || '?').toUpperCase()}
              </div>
            )}
          </div>
        </AvatarBorder>
        <div style={{ marginLeft: 12 }}>
          <button onClick={() => setShowAvatarPicker(!showAvatarPicker)} className={styles.avatarBtn}>
            {showAvatarPicker ? 'Fermer' : 'Choisir une carte comme avatar'}
          </button>
        </div>
      </div>

      {/* Avatar picker */}
      {showAvatarPicker && (
        <div className={styles.pickerSection}>
          <p className={styles.pickerLabel}>
            Choisis une carte de ta collection :
          </p>
          {ownedCards.length === 0 ? (
            <p className={styles.pickerEmpty}>{"Tu n'as pas encore de cartes. Ouvre des boosters !"}</p>
          ) : (
            <div className={styles.pickerGrid}>
              {ownedCards.map((card) => (
                <button
                  key={card.id}
                  onClick={() => handleSelectAvatar(card.photo)}
                  className={user.avatar === card.photo ? styles.pickerCardActive : styles.pickerCard}
                >
                  <Image src={card.photo} alt={card.firstName} width={70} height={50}
                    style={{ width: '100%', height: 'auto', display: 'block' }} />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Showcase (vitrine) */}
      <section className={styles.section} style={{ marginTop: '1rem' }}>
        <h2 className={styles.sectionTitle}>Vitrine (5 emplacements)</h2>
        <p className={styles.toggleDesc}>Epinglez jusqu&apos;à 5 cartes visibles par tous.</p>
        <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          {Array.from({ length: 5 }).map((_, idx) => {
            const cardId = (user?.showcase && (user.showcase as string[])[idx]) || null;
            const cardMeta = CLUB_CARDS.find((c) => c.id === cardId);
            return (
              <div key={idx} style={{ width: 80, textAlign: 'center' }}>
                {cardMeta ? (
                  <div style={{ cursor: 'pointer' }}>
                    <img src={cardMeta.photo} alt="" style={{ width: 80, height: 60, borderRadius: 6 }} />
                    <div style={{ fontSize: '0.8rem' }}>{cardMeta.firstName}</div>
                    <button
                      onClick={async () => {
                        // remove this card from showcase
                        const next = (user.showcase as string[]).filter((id: string) => id !== cardMeta.id);
                        await fetch('/api/auth/update', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ showcase: next }) });
                        window.location.reload();
                      }}
                      className={styles.submitBtn}
                    >Retirer</button>
                  </div>
                ) : (
                  <div style={{ border: '1px dashed var(--border)', borderRadius: 6, padding: 8 }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-soft)' }}>Vide</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Quick pin from owned cards */}
        <div style={{ marginTop: 12 }}>
          <p className={styles.pickerLabel}>Épingler depuis vos cartes :</p>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingTop: 8 }}>
            {ownedCards.slice(0, 30).map((c) => (
              <button
                key={c.id}
                onClick={async () => {
                  const next = Array.from(new Set([...(user.showcase || []), c.id])).slice(0, 5);
                  await fetch('/api/auth/update', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ showcase: next }) });
                  window.location.reload();
                }}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
              >
                <img src={c.photo} alt="" style={{ width: 60, height: 44, borderRadius: 6 }} />
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Card backs */}
      <section className={styles.section} style={{ marginTop: '1rem' }}>
        <h2 className={styles.sectionTitle}>Dos de cartes</h2>
        <p className={styles.toggleDesc}>Choisissez un design pour l&apos;animation d&apos;ouverture.</p>
        <div className={styles.cardBackGrid}>
          {[
            { id: 'default', label: 'Classique', gradient: 'linear-gradient(135deg, #0b1f3f, #133566)', pattern: '⚽', border: '2px solid var(--club-yellow-500)' },
            { id: 'retro', label: 'Rétro', gradient: 'linear-gradient(135deg, #2d1b00, #8b4513)', pattern: '★', border: '2px solid #d4a574' },
            { id: 'neon', label: 'Néon', gradient: 'linear-gradient(135deg, #0a0a2e, #1a0a3e)', pattern: '✦', border: '2px solid #00ffff', boxShadow: '0 0 12px rgba(0,255,255,0.4)' },
            { id: 'gold', label: 'Doré', gradient: 'linear-gradient(135deg, #3d2b00, #8b7500)', pattern: '👑', border: '2px solid #ffd700', boxShadow: '0 0 12px rgba(255,215,0,0.4)' },
          ].map((back) => {
            const unlocked = (user.unlockedCardBacks || []).includes(back.id) || back.id === 'default';
            const active = user.activeCardBack === back.id;
            return (
              <div key={back.id} className={`${styles.cardBackItem} ${active ? styles.cardBackActive : ''}`}>
                <div
                  className={styles.cardBackPreview}
                  style={{
                    background: back.gradient,
                    border: active ? '2px solid var(--club-yellow-500)' : back.border,
                    boxShadow: active ? '0 0 16px rgba(243,198,35,0.4)' : back.boxShadow || 'none',
                  }}
                >
                  <span className={styles.cardBackPattern}>{back.pattern}</span>
                </div>
                <span className={styles.cardBackLabel}>{back.label}</span>
                <div style={{ marginTop: 6 }}>
                  {unlocked ? (
                    <button
                      onClick={async () => {
                        await fetch('/api/auth/update', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ activeCardBack: back.id }) });
                        window.location.reload();
                      }}
                      className={styles.smallBtn}
                    >{active ? 'Actif' : 'Appliquer'}</button>
                  ) : (
                    <button disabled className={styles.smallBtn} style={{ opacity: 0.5 }}>🔒 Verrouillé</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Edit form */}
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.field}>
          <label className={styles.label}>Prenom</label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            disabled={isLoading}
            className={styles.input}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Nom</label>
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            disabled={isLoading}
            className={styles.input}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            className={styles.input}
          />
        </div>

        {error && <div className={styles.errorBox}>{error}</div>}

        <button type="submit" disabled={isLoading} className={styles.submitBtn}>
          {isLoading ? 'Mise a jour...' : 'Enregistrer les modifications'}
        </button>
      </form>

      {/* Change password */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Sécurité</h2>
        <form onSubmit={handleChangePassword} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>Mot de passe actuel</label>
            <div className={styles.passwordWrapper}>
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={passwordLoading}
                className={styles.input}
                placeholder="Mot de passe actuel"
              />
              <button type="button" onClick={() => setShowCurrent(!showCurrent)} className={styles.eyeBtn} tabIndex={-1}>
                {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Nouveau mot de passe</label>
            <div className={styles.passwordWrapper}>
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={passwordLoading}
                className={styles.input}
                placeholder="Minimum 8 caractères"
              />
              <button type="button" onClick={() => setShowNew(!showNew)} className={styles.eyeBtn} tabIndex={-1}>
                {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Confirmer le nouveau mot de passe</label>
            <div className={styles.passwordWrapper}>
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={passwordLoading}
                className={styles.input}
                placeholder="Confirmer"
              />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} className={styles.eyeBtn} tabIndex={-1}>
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          {passwordError && <div className={styles.errorBox}>{passwordError}</div>}
          <button type="submit" disabled={passwordLoading} className={styles.submitBtn}>
            {passwordLoading ? 'Modification...' : 'Modifier le mot de passe'}
          </button>
        </form>
      </section>

      {/* Notifications */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Notifications</h2>
        <div className={styles.toggleRow}>
          <div>
            <p className={styles.toggleLabel}>Rappel quotidien pour les boosters</p>
            <p className={styles.toggleDesc}>Recevez une notification à 9h00 pour ouvrir vos boosters</p>
          </div>
          <button
            onClick={handleTogglePush}
            disabled={pushLoading}
            className={`${styles.toggleSwitch} ${pushEnabled ? styles.toggleActive : ''}`}
            role="switch"
            aria-checked={pushEnabled}
          >
            <span className={styles.toggleKnob} />
          </button>
        </div>
      </section>

      {/* Booster History */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Historique des boosters</h2>
        {historyLoading ? (
          <p className={styles.loading}>Chargement...</p>
        ) : boosterHistory.length === 0 ? (
          <p className={styles.pickerEmpty}>Aucun booster ouvert pour le moment.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {boosterHistory.slice(0, 10).map((entry) => (
              <div key={entry.id} className={styles.historyCard}>
                <div className={styles.historyHeader}>
                  <Package size={16} />
                  <span className={styles.historyDate}>
                    {new Date(entry.createdAt).toLocaleDateString('fr-FR', {
                      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </span>
                </div>
                <div className={styles.historyCardsRow}>
                  {entry.cards.map((card) => (
                    <div key={card.id} className={styles.historyCardItem}>
                      <Image src={card.photo} alt={card.firstName} width={50} height={70}
                        style={{ width: '100%', height: 'auto', borderRadius: '4px' }} />
                      <span className={styles.historyCardName}>{card.firstName} {card.lastName}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {boosterHistory.length > 10 && (
              <p style={{ color: 'var(--text-soft)', fontSize: '0.85rem', textAlign: 'center' }}>
                + {boosterHistory.length - 10} ouverture(s) plus ancienne(s)
              </p>
            )}
          </div>
        )}
      </section>

      {/* Public Album */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Album public</h2>
        <div className={styles.toggleRow}>
          <div>
            <p className={styles.toggleLabel}>Rendre mon album public</p>
            <p className={styles.toggleDesc}>
              Permets à n&apos;importe qui de consulter ta collection via un lien.
            </p>
          </div>
          <button
            onClick={async () => {
              if (!token) return;
              setPublicAlbumLoading(true);
              try {
                const res = await fetch('/api/auth/update', {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                  body: JSON.stringify({ isPublicAlbum: !isPublicAlbum }),
                });
                if (!res.ok) throw new Error('Erreur');
                setIsPublicAlbum(!isPublicAlbum);
                setToastMessage(isPublicAlbum ? 'Album rendu privé' : 'Album rendu public');
                setShowToast(true);
              } catch {
                setToastMessage('Erreur lors de la mise à jour');
                setShowToast(true);
              } finally {
                setPublicAlbumLoading(false);
              }
            }}
            disabled={publicAlbumLoading}
            className={`${styles.toggleSwitch} ${isPublicAlbum ? styles.toggleActive : ''}`}
            role="switch"
            aria-checked={isPublicAlbum}
          >
            <span className={styles.toggleKnob} />
          </button>
        </div>
      </section>

      {/* Logout */}
      <div className={styles.logoutSection}>
        <button onClick={logout} className={styles.logoutBtn}>
          Deconnexion
        </button>
      </div>

      {/* Toast */}
      {showToast && (
        <div className={styles.toast}>
          {toastMessage}
        </div>
      )}
      </div>
    </main>
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
