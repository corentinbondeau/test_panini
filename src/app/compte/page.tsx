'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useCollectionSelectors } from '@/store/collectionStore';
import { CLUB_CARDS } from '@/data/clubCards';
import Image from 'next/image';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import styles from './page.module.css';

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
    <div className={styles.page}>
      <h1 className={styles.title}>Mon compte</h1>

      {/* Avatar */}
      <div className={styles.avatarSection}>
        <div className={styles.avatarCircle}>
          {user.avatar ? (
            <img src={user.avatar} alt="" className={styles.avatarImg} />
          ) : (
            <div className={styles.avatarLetter}>
              {(user.firstName?.charAt(0) || user.email?.charAt(0) || '?').toUpperCase()}
            </div>
          )}
        </div>
        <button onClick={() => setShowAvatarPicker(!showAvatarPicker)} className={styles.avatarBtn}>
          {showAvatarPicker ? 'Fermer' : 'Choisir une carte comme avatar'}
        </button>
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
