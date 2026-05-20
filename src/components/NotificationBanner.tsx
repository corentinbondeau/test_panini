'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';

export default function NotificationBanner() {
  const { user, token } = useAuthStore();
  const [dismissed, setDismissed] = useState(false);
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | null>(null);

  useEffect(() => {
    setSupported('serviceWorker' in navigator && 'PushManager' in window);
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  // Ne jamais montrer la bannière si la permission est déjà accordée ou refusée
  const shouldShow = user && !dismissed && supported && permission === 'default';

  async function handleSubscribe() {
    if (!supported || !user) return;
    try {
      if (!('Notification' in window)) {
        console.warn('🔔 Le navigateur ne supporte pas les notifications');
        setDismissed(true);
        return;
      }
      const perm = await Notification.requestPermission();
      console.log('🔔 Permission notification:', perm);
      if (perm !== 'granted') {
        console.warn('🔔 Permission refusée');
        setPermission(perm);
        setDismissed(true);
        return;
      }
      setPermission('granted');

      if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
        console.error('🔔 Clé VAPID publique manquante');
        return;
      }
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('🔔 Service Worker enregistré');
      const applicationServerKey = urlBase64ToUint8Array(
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const subscription = await (registration.pushManager as any).subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
      console.log('🔔 Abonnement push réussi');

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
      setDismissed(true);
    } catch (err) {
      console.error('🔔 Échec de l\'abonnement notification:', err);
      alert(`Notification impossible: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
    }
  }

  if (!shouldShow) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-[var(--card-bg)] border border-[var(--club-yellow-500)] rounded-lg p-4 shadow-lg max-w-sm">
      <p className="text-sm text-gray-300 mb-3">
        Activez les notifications pour ne rien manquer !
      </p>
      <div className="flex gap-2">
        <button
          onClick={handleSubscribe}
          className="flex-1 px-3 py-2 bg-[var(--club-yellow-500)] text-black rounded-lg text-sm font-medium hover:brightness-110 transition-all"
        >
          Activer
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="px-3 py-2 text-gray-400 text-sm hover:text-white transition-colors"
        >
          Plus tard
        </button>
      </div>
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
