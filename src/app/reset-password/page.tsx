'use client';

import { Suspense } from 'react';
import ResetPasswordForm from './ResetPasswordForm';

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-soft)' }}>
        Chargement...
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
