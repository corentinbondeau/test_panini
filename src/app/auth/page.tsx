'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useCollectionSelectors, useCollectionStore } from '@/store/collectionStore';
import { CLUB_CARDS } from '@/data/clubCards';
import { LoginForm } from '@/components/auth/LoginForm';
import { RegisterForm } from '@/components/auth/RegisterForm';
import Image from 'next/image';
import styles from './auth.module.css';

export default function AuthPage() {
  const { user, isLoading, updateProfile, checkAuth, logout, token } = useAuthStore();
  const { quantities } = useCollectionSelectors();
  const loadCollection = useCollectionStore((s) => s.loadFromServer);
  const [isRegister, setIsRegister] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    checkAuth().finally(() => setIsInitialized(true));
  }, [checkAuth]);

  useEffect(() => {
    if (token) {
      loadCollection(token);
    }
  }, [token, loadCollection]);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setEmail(user.email || '');
    }
  }, [user]);

  useEffect(() => {
    if (showToast) {
      toastTimer.current = setTimeout(() => setShowToast(false), 3000);
      return () => clearTimeout(toastTimer.current);
    }
  }, [showToast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await updateProfile({ firstName, lastName, email });
      setShowToast(true);
    } catch {
      setError('Erreur lors de la mise a jour.');
    }
  };

  const ownedCards = CLUB_CARDS.filter((c) => (quantities[c.id] ?? 0) > 0);

  const handleSelectAvatar = async (photoUrl: string) => {
    try {
      await updateProfile({ avatar: photoUrl });
      setShowAvatarPicker(false);
      setShowToast(true);
    } catch {
      setError("Erreur lors de la mise a jour de l'avatar.");
    }
  };

  if (!isInitialized) {
    return <div className={styles.loading}>Chargement...</div>;
  }

  if (user) {
    return (
      <div className={styles.container}>
        <h1>Mon Compte</h1>

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
            <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)}
              disabled={isLoading} className={styles.input} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Nom</label>
            <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)}
              disabled={isLoading} className={styles.input} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading} className={styles.input} />
          </div>
          {error && <div className={styles.errorBox}>{error}</div>}
          <button type="submit" disabled={isLoading} className={styles.submitBtn}>
            {isLoading ? 'Mise a jour...' : 'Enregistrer les modifications'}
          </button>
        </form>

        {/* Logout */}
        <div className={styles.logoutSection}>
          <button onClick={logout} className={styles.logoutBtn}>
            Deconnexion
          </button>
        </div>

        {showToast && <div className={styles.toast}>Profil mis a jour avec succes.</div>}
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.authContainer}>
        {isRegister ? (
          <RegisterForm onSuccess={() => { setIsRegister(false); }} />
        ) : (
          <LoginForm />
        )}
        <div className={styles.toggle}>
          {isRegister ? (
            <p>Vous avez déjà un compte? <button onClick={() => setIsRegister(false)}>Se connecter</button></p>
          ) : (
            <p>Pas encore de compte? <button onClick={() => setIsRegister(true)}>{"S'inscrire"}</button></p>
          )}
        </div>
      </div>
    </div>
  );
}