'use client';

import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import styles from './Auth.module.css';

export function LoginForm({ onSuccess }: { onSuccess?: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, error } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      onSuccess?.();
    } catch {
      // Error is handled by the store
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <h2>Connexion</h2>
      
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
        />
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Connexion en cours...' : 'Se connecter'}
      </button>
    </form>
  );
}
