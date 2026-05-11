'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { LoginForm } from '@/components/auth/LoginForm';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { UserProfile } from '@/components/auth/UserProfile';
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
        <UserProfile />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.authContainer}>
        {isRegister ? (
          <RegisterForm
            onSuccess={() => {
              setIsRegister(false);
            }}
          />
        ) : (
          <LoginForm />
        )}

        <div className={styles.toggle}>
          {isRegister ? (
            <p>
              Vous avez déjà un compte?{' '}
              <button onClick={() => setIsRegister(false)}>Se connecter</button>
            </p>
          ) : (
            <p>
              Pas encore de compte?{' '}
              <button onClick={() => setIsRegister(true)}>S&apos;inscrire</button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
