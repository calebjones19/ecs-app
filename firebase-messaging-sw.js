// Firebase Cloud Messaging Service Worker
// This runs in the background and handles push notifications even when the app is closed

importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyB_QvTPS5u5RxGEvzOaKwE_yDnaH67i26w",
  authDomain: "essence-cleaning-a2ad5.firebaseapp.com",
  projectId: "essence-cleaning-a2ad5",
  storageBucket: "essence-cleaning-a2ad5.firebasestorage.app",
  messagingSenderId: "148166726555",
  appId: "1:148166726555:web:f63a403a90aa1db6dbc73e",
  measurementId: "G-PJW0FR1LKF"
});

const messaging = firebase.messaging();

// Handle background push messages (when app is not in focus)
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Background message received:', payload);

  const { title, body, icon, badge, tag, data } = payload.notification || {};
  const notifTitle = title || payload.data?.title || 'Essence Cleaning';
  const notifBody = body || payload.data?.body || 'You have a new notification';
  const notifTag = tag || payload.data?.tag || 'essence-default';

  const options = {
    body: notifBody,
    icon: icon || '/ecs-app/icons/icon-192.png',
    badge: badge || '/ecs-app/icons/icon-192.png',
    tag: notifTag,
    renotify: true,
    vibrate: [200, 100, 200],
    data: data || payload.data || {},
    actions: []
  };

  // Add contextual actions based on notification type
  const type = (payload.data && payload.data.type) || '';
  if (type === 'chat') {
    options.actions = [
      { action: 'reply', title: 'Reply' },
      { action: 'dismiss', title: 'Dismiss' }
    ];
  } else if (type === 'shift_swap') {
    options.actions = [
      { action: 'view', title: 'View Request' },
      { action: 'dismiss', title: 'Dismiss' }
    ];
  } else if (type === 'schedule') {
    options.actions = [
      { action: 'view', title: 'View Schedule' }
    ];
  }

  return self.registration.showNotification(notifTitle, options);
});

// Handle notification click — open/focus the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action;
  const data = event.notification.data || {};
  let targetUrl = '/ecs-app/';

  // Route to the right page based on notification type
  if (data.type === 'chat') targetUrl = '/ecs-app/#chat';
  else if (data.type === 'shift_swap') targetUrl = '/ecs-app/#shifts';
  else if (data.type === 'schedule') targetUrl = '/ecs-app/#schedule';
  else if (data.type === 'timesheet') targetUrl = '/ecs-app/#timesheets';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If the app is already open, focus it
      for (const client of windowClients) {
        if (client.url.includes('/ecs-app') && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      return clients.openWindow(targetUrl);
    })
  );
});

// Cache the app shell for offline support
const CACHE_NAME = 'essence-v1';
const OFFLINE_URLS = [
  '/ecs-app/',
  '/ecs-app/index.html',
  '/ecs-app/icons/icon-192.png',
  '/ecs-app/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_URLS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

// Network-first strategy for HTML, cache-first for static assets
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
