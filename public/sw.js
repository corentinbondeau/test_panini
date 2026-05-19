self.addEventListener('push', function (event) {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || 'ECC Panini';
    const options = {
      body: data.body || '',
      icon: data.icon || '/logo-club.png',
      badge: '/logo-club.png',
    };
    event.waitUntil(self.registration.showNotification(title, options));
  } catch (e) {
    const title = 'ECC Panini';
    const options = {
      body: event.data.text(),
      icon: '/logo-club.png',
    };
    event.waitUntil(self.registration.showNotification(title, options));
  }
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  event.waitUntil(clients.openWindow('/'));
});
