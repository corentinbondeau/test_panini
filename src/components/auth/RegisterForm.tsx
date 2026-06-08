'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import styles from './Auth.module.css';

export function RegisterForm({ onSuccess }: { onSuccess?: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const { register, isLoading, error } = useAuthStore();
  const [validationError, setValidationError] = useState('');
  const [emailError, setEmailError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');
    setEmailError('');

    if (password !== passwordConfirm) {
      setValidationError('Les mots de passe ne correspondent pas');
      return;
    }

    if (password.length < 6) {
      setValidationError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    try {
      await register(email, password, firstName || undefined, lastName || undefined);
      onSuccess?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('déjà utilisée')) {
        setEmailError(msg);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <h2>Inscription</h2>

      <div className={styles.formGroup}>
        <label htmlFor="firstName">Prénom</label>
        <input
          id="firstName"
          type="text"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          disabled={isLoading}
        />
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="lastName">Nom</label>
        <input
          id="lastName"
          type="text"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          disabled={isLoading}
        />
      </div>

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
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            required
            minLength={6}
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
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="passwordConfirm">Confirmer le mot de passe</label>
        <div className={styles.passwordWrapper}>
          <input
            id="passwordConfirm"
            type={showPasswordConfirm ? 'text' : 'password'}
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            disabled={isLoading}
            required
            minLength={6}
          />
          <button
            type="button"
            className={styles.passwordToggle}
            onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
            tabIndex={-1}
            aria-label={showPasswordConfirm ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          >
            {showPasswordConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
      </div>

      {error && !emailError && <div className={styles.error}>{error}</div>}
      {validationError && <div className={styles.error}>{validationError}</div>}

      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Inscription en cours...' : "S'inscrire"}
      </button>
    </form>
  );
}
