'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useCollectionSelectors } from '@/store/collectionStore';
import { CLUB_CARDS } from '@/data/clubCards';
import Image from 'next/image';
import Link from 'next/link';

export default function ComptePage() {
  const { user, isLoading, updateProfile, checkAuth, logout } = useAuthStore();
  const { quantities } = useCollectionSelectors();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    checkAuth().finally(() => setIsInitialized(true));
  }, [checkAuth]);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess('');
    setError('');
    try {
      await updateProfile({ name, email });
      setSuccess('Profil mis à jour avec succès.');
    } catch {
      setError('Erreur lors de la mise à jour.');
    }
  };

  const ownedCards = CLUB_CARDS.filter((c) => (quantities[c.id] ?? 0) > 0);

  const handleSelectAvatar = async (photoUrl: string) => {
    try {
      await updateProfile({ avatar: photoUrl });
      setShowAvatarPicker(false);
      setSuccess('Avatar mis à jour avec succès.');
    } catch {
      setError('Erreur lors de la mise à jour de l\'avatar.');
    }
  };

  if (!isInitialized) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-soft)' }}>
        Chargement...
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
        <h2>Connectez-vous</h2>
        <p style={{ color: 'var(--text-soft)' }}>Vous devez être connecté pour accéder à cette page.</p>
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
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '0 1rem' }}>
      <h1 style={{ color: 'var(--club-yellow-500)', textAlign: 'center' }}>Mon compte</h1>

      {/* Avatar */}
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <div style={{
          width: 96, height: 96, borderRadius: '50%', overflow: 'hidden',
          border: '3px solid var(--club-yellow-500)', margin: '0 auto 0.5rem',
          background: 'var(--club-blue-800)'
        }}>
          {user.avatar ? (
            <img src={user.avatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{
              width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '2rem', color: 'var(--club-yellow-500)'
            }}>
              {user.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
          )}
        </div>
        <button onClick={() => setShowAvatarPicker(!showAvatarPicker)} style={{
          background: 'none', border: '1px solid var(--club-blue-700)',
          color: 'var(--text-soft)', borderRadius: '8px', padding: '0.4rem 1rem',
          cursor: 'pointer', fontSize: '0.85rem'
        }}>
          {showAvatarPicker ? 'Fermer' : 'Choisir une carte comme avatar'}
        </button>
      </div>

      {/* Avatar picker */}
      {showAvatarPicker && (
        <div style={{
          marginBottom: '1.5rem', padding: '1rem', borderRadius: '12px',
          border: '1px solid var(--club-blue-700)', background: 'var(--club-blue-900)',
          maxHeight: 300, overflowY: 'auto'
        }}>
          <p style={{ margin: '0 0 0.75rem', color: 'var(--text-soft)', fontSize: '0.85rem' }}>
            Choisis une carte de ta collection :
          </p>
          {ownedCards.length === 0 ? (
            <p style={{ color: 'var(--text-soft)' }}>{"Tu n'as pas encore de cartes. Ouvre des boosters !"}</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))', gap: 8 }}>
              {ownedCards.map((card) => (
                <button key={card.id} onClick={() => handleSelectAvatar(card.photo)}
                  style={{
                    border: user.avatar === card.photo ? '2px solid var(--club-yellow-500)' : '2px solid transparent',
                    borderRadius: 8, overflow: 'hidden', cursor: 'pointer', padding: 0,
                    background: 'var(--club-blue-800)'
                  }}>
                  <Image src={card.photo} alt={card.firstName} width={70} height={50}
                    style={{ width: '100%', height: 'auto', display: 'block' }} />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Edit form */}
      <form onSubmit={handleSubmit} style={{
        padding: '1.5rem', borderRadius: '12px',
        border: '1px solid var(--club-blue-700)',
        background: 'linear-gradient(180deg, var(--club-blue-800), var(--club-blue-900))'
      }}>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.3rem', color: 'var(--text-soft)', fontSize: '0.9rem', fontWeight: 600 }}>
            Nom
          </label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)}
            disabled={isLoading}
            style={{
              width: '100%', padding: '0.65rem 0.75rem', borderRadius: '8px',
              border: '1px solid var(--club-blue-700)', background: 'var(--club-blue-950)',
              color: 'var(--text-main)', fontSize: '0.95rem', boxSizing: 'border-box'
            }} />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.3rem', color: 'var(--text-soft)', fontSize: '0.9rem', fontWeight: 600 }}>
            Email
          </label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            style={{
              width: '100%', padding: '0.65rem 0.75rem', borderRadius: '8px',
              border: '1px solid var(--club-blue-700)', background: 'var(--club-blue-950)',
              color: 'var(--text-main)', fontSize: '0.95rem', boxSizing: 'border-box'
            }} />
        </div>

        {success && <div style={{
          padding: '0.6rem 0.75rem', marginBottom: '1rem', borderRadius: '8px',
          background: 'rgba(0, 200, 100, 0.15)', border: '1px solid rgba(0, 200, 100, 0.3)',
          color: '#80d0a0', fontSize: '0.9rem'
        }}>{success}</div>}

        {error && <div style={{
          padding: '0.6rem 0.75rem', marginBottom: '1rem', borderRadius: '8px',
          background: 'rgba(255, 80, 80, 0.15)', border: '1px solid rgba(255, 80, 80, 0.3)',
          color: '#ff8080', fontSize: '0.9rem'
        }}>{error}</div>}

        <button type="submit" disabled={isLoading} style={{
          width: '100%', padding: '0.7rem', background: 'var(--club-yellow-500)',
          color: 'var(--club-blue-950)', border: 'none', borderRadius: '8px',
          fontSize: '1rem', fontWeight: 700, cursor: 'pointer', opacity: isLoading ? 0.6 : 1
        }}>
          {isLoading ? 'Mise à jour...' : 'Enregistrer'}
        </button>
      </form>

      <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
        <button onClick={logout} style={{
          background: 'none', border: '1px solid rgba(255,80,80,0.3)',
          color: '#ff8080', borderRadius: '8px', padding: '0.5rem 1.5rem',
          cursor: 'pointer', fontSize: '0.9rem'
        }}>
          Déconnexion
        </button>
      </div>
    </div>
  );
}