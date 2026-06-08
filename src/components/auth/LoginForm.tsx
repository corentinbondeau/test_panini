'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import Link from 'next/link';
import styles from './Auth.module.css';

export function LoginForm({ onSuccess }: { onSuccess?: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoading, error } = useAuthStore();
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');
    setPasswordError('');

    try {
      await login(email, password);
      onSuccess?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('Aucun compte')) {
        setEmailError(msg);
      } else if (msg.includes('incorrect')) {
        setPasswordError(msg);
      }
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
          onChange={(e) => {
            setEmail(e.target.value);
            if (emailError) setEmailError('');
          }}
          disabled={isLoading}
          required
        />
        {emailError && <div className={styles.fieldError}>{emailError}</div>}
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="password">Mot de passe</label>
        <div className={styles.passwordWrapper}>
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (passwordError) setPasswordError('');
            }}
            disabled={isLoading}
            required
          />
          <button
            type="button"
            className={styles.passwordToggle}
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
            aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
        <div className={styles.forgotLink}>
          <Link href="/forgot-password">Mot de passe oublié ?</Link>
        </div>
      </div>

      {error && !emailError && !passwordError && <div className={styles.error}>{error}</div>}

      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Connexion en cours...' : 'Se connecter'}
      </button>
    </form>
  );
}
