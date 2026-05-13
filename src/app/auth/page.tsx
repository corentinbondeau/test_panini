'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { LoginForm } from '@/components/auth/LoginForm';
import { RegisterForm } from '@/components/auth/RegisterForm';
import Link from 'next/link';
import styles from './auth.module.css';

export default function AuthPage() {
  const { user, checkAuth } = useAuthStore();
  const [isRegister, setIsRegister] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    checkAuth().finally(() => setIsInitialized(true));
  }, [checkAuth]);

  if (!isInitialized) {
    return <div className={styles.loading}>Chargement...</div>;
  }

  if (user) {
    return (
      <div className={styles.container}>
        <h1>Mon Compte</h1>
        <p style={{ textAlign: 'center', color: 'var(--text-soft)' }}>
          Tu es connecté en tant que <strong>{user.name}</strong>.
        </p>
        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <Link href="/compte" style={{
            display: 'inline-block', padding: '0.6rem 1.5rem',
            background: 'var(--club-yellow-500)', color: 'var(--club-blue-950)',
            borderRadius: '8px', fontWeight: 700, textDecoration: 'none'
          }}>
            Gérer mon compte
          </Link>
        </div>
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
            <p>Pas encore de compte? <button onClick={() => setIsRegister(true)}>S&apos;inscrire</button></p>
          )}
        </div>
      </div>
    </div>
  );
}