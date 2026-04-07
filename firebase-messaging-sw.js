// firebase-messaging-sw.js
// ملف Service Worker للتنبيهات - يجب أن يكون في جذر الموقع

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyC-CeTBjIWZnUaaNlrdyb3qO-VNsdHGpt4",
  authDomain: "teams-5365d.firebaseapp.com",
  projectId: "teams-5365d",
  storageBucket: "teams-5365d.firebasestorage.app",
  messagingSenderId: "742941957180",
  appId: "1:742941957180:web:b30056b3cdf9e6cefcf739"
});

const messaging = firebase.messaging();

// ── تنبيه في الخلفية (المتصفح مغلق أو مخفي) ──
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Background message:', payload);

  const { title, body, icon, data } = payload.notification || {};
  const isCritical = payload.data?.type === 'critical';

  const notificationTitle = title || '📡 MOTS — توجيه جديد';
  const notificationOptions = {
    body: body || 'لديك مهمة جديدة تنتظرك',
    icon: icon || '/icon-192.png',
    badge: '/badge-72.png',
    tag: payload.data?.taskId || 'mots-notification',
    renotify: true,
    requireInteraction: isCritical, // ← التنبيه الحرج لا يختفي تلقائياً
    vibrate: isCritical
      ? [200, 100, 200, 100, 400, 100, 400] // نمط اهتزاز حرج
      : [200, 100, 200],
    sound: isCritical ? '/critical-alert.wav' : '/notification.wav',
    data: payload.data || {},
    actions: isCritical
      ? [
          { action: 'acknowledge', title: '✅ تم الاستلام' },
          { action: 'open', title: '📖 فتح المهمة' }
        ]
      : [
          { action: 'open', title: '📖 فتح المهمة' }
        ],
    // iOS Critical Alert simulation
    silent: false,
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// ── معالجة الضغط على التنبيه ──
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const taskId = event.notification.data?.taskId;
  const action = event.action;
  const url = taskId ? `/?taskId=${taskId}` : '/';

  if (action === 'acknowledge') {
    // إرسال إقرار لـ Firestore
    event.waitUntil(
      clients.openWindow(url + '&action=acknowledge')
    );
  } else {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          for (const client of clientList) {
            if (client.url.includes(self.location.origin) && 'focus' in client) {
              client.focus();
              client.postMessage({ type: 'OPEN_TASK', taskId });
              return;
            }
          }
          return clients.openWindow(url);
        })
    );
  }
});

// ── تفعيل فوري ──
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});
