'use client';

import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import styles from './Auth.module.css';

export function RegisterForm({ onSuccess }: { onSuccess?: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const { register, isLoading, error } = useAuthStore();
  const [validationError, setValidationError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (password !== passwordConfirm) {
      setValidationError('Les mots de passe ne correspondent pas');
      return;
    }

    if (password.length < 6) {
      setValidationError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    try {
      await register(email, password, name);
      onSuccess?.();
    } catch {
      // Error is handled by the store
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <h2>Inscription</h2>
      
      <div className={styles.formGroup}>
        <label htmlFor="name">Nom</label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isLoading}
        />
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
          required
        />
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="password">Mot de passe</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
          required
          minLength={6}
        />
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="passwordConfirm">Confirmer le mot de passe</label>
        <input
          id="passwordConfirm"
          type="password"
          value={passwordConfirm}
          onChange={(e) => setPasswordConfirm(e.target.value)}
          disabled={isLoading}
          required
          minLength={6}
        />
      </div>

      {error && <div className={styles.error}>{error}</div>}
      {validationError && <div className={styles.error}>{validationError}</div>}

      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Inscription en cours...' : 'S&apos;inscrire'}
      </button>
    </form>
  );
}
