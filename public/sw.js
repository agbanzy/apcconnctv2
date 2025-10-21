const CACHE_NAME = 'apc-connect-v1';
const urlsToCache = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// Install service worker and cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.log('Cache installation failed:', error);
      })
  );
  self.skipWaiting();
});

// Activate service worker and clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch strategy: Network first, falling back to cache
// For API calls, always try network first
// For static assets, use cache first with network fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // API requests: Network first, cache as fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone the response before caching
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Return offline page or error response
            return new Response(
              JSON.stringify({ 
                success: false, 
                error: 'You are offline. Please check your internet connection.' 
              }),
              {
                status: 503,
                headers: { 'Content-Type': 'application/json' }
              }
            );
          });
        })
    );
    return;
  }

  // Static assets: Cache first, network fallback
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached version and update cache in background
        fetch(request).then((response) => {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, response);
          });
        }).catch(() => {});
        return cachedResponse;
      }

      // Not in cache, fetch from network
      return fetch(request).then((response) => {
        // Check if valid response
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // Clone and cache the response
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache);
        });

        return response;
      });
    })
  );
});

// Background sync for offline actions (future enhancement)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-votes') {
    event.waitUntil(syncVotes());
  }
  if (event.tag === 'sync-rsvps') {
    event.waitUntil(syncRSVPs());
  }
});

async function syncVotes() {
  // Implement offline vote synchronization
  console.log('Syncing offline votes...');
}

async function syncRSVPs() {
  // Implement offline RSVP synchronization
  console.log('Syncing offline RSVPs...');
}

// ============================================================================
// PUSH NOTIFICATION HANDLING
// ============================================================================
// 
// PUSH NOTIFICATION INTEGRATION GUIDE
// ====================================
// 
// This service worker handles push notifications from multiple providers:
// 1. Firebase Cloud Messaging (FCM) - for mobile apps
// 2. OneSignal - for unified web + mobile
// 3. Web Push API (VAPID) - for web-only push
// 
// SETUP INSTRUCTIONS:
// -------------------
// 
// 1. WEB PUSH API (VAPID) - Native browser push notifications
//    --------------------------------------------------------
//    a) Generate VAPID keys on server:
//       npx web-push generate-vapid-keys
//    
//    b) Set environment variables on server:
//       PUSH_SERVICE_PROVIDER=web-push
//       VAPID_PUBLIC_KEY=your-public-key
//       VAPID_PRIVATE_KEY=your-private-key
//       VAPID_SUBJECT=mailto:admin@apcconnect.ng
//    
//    c) Request permission and subscribe user (see main.tsx):
//       ```javascript
//       const registration = await navigator.serviceWorker.ready;
//       const subscription = await registration.pushManager.subscribe({
//         userVisibleOnly: true,
//         applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
//       });
//       // Send subscription to server to store in database
//       await fetch('/api/push/subscribe', {
//         method: 'POST',
//         body: JSON.stringify(subscription)
//       });
//       ```
// 
// 2. FIREBASE CLOUD MESSAGING (FCM)
//    -------------------------------
//    a) Create Firebase project at https://console.firebase.google.com
//    
//    b) Add firebase-messaging-sw.js to public folder:
//       ```javascript
//       importScripts('https://www.gstatic.com/firebasejs/9.x.x/firebase-app-compat.js');
//       importScripts('https://www.gstatic.com/firebasejs/9.x.x/firebase-messaging-compat.js');
//       
//       firebase.initializeApp({
//         apiKey: "your-api-key",
//         projectId: "your-project-id",
//         messagingSenderId: "your-sender-id",
//         appId: "your-app-id"
//       });
//       
//       const messaging = firebase.messaging();
//       ```
//    
//    c) Set server environment variables:
//       PUSH_SERVICE_PROVIDER=fcm
//       FCM_SERVER_KEY=your-server-key
//       FCM_PROJECT_ID=your-project-id
// 
// 3. ONESIGNAL
//    ----------
//    a) Create account at https://onesignal.com
//    
//    b) Add OneSignal SDK to your app (web + mobile)
//       Web: https://documentation.onesignal.com/docs/web-push-quickstart
//       Mobile: https://documentation.onesignal.com/docs/mobile-sdk-setup
//    
//    c) Set server environment variables:
//       PUSH_SERVICE_PROVIDER=onesignal
//       ONESIGNAL_API_KEY=your-rest-api-key
//       ONESIGNAL_APP_ID=your-app-id
// 
// NOTIFICATION FLOW:
// ------------------
// 1. Server sends push notification via pushService.sendPushNotification()
// 2. Push provider delivers notification to user's device
// 3. Service worker receives 'push' event (this file)
// 4. Service worker displays notification to user
// 5. User clicks notification → 'notificationclick' event → navigate to URL
// ============================================================================

/**
 * Push Event Listener
 * 
 * Receives push notifications from the server and displays them to the user.
 * The notification payload should match the NotificationPayload interface
 * defined in server/push-service.ts
 * 
 * Expected payload format:
 * {
 *   title: "Notification Title",
 *   body: "Notification body text",
 *   icon: "/icon-192.png",
 *   badge: "/icon-192.png",
 *   tag: "notification-unique-id",
 *   requireInteraction: false,
 *   data: {
 *     type: "event_reminder",
 *     url: "/events?id=123",
 *     ...otherData
 *   },
 *   actions: [
 *     { action: "view", title: "View", icon: "/icon-192.png" },
 *     { action: "dismiss", title: "Dismiss" }
 *   ]
 * }
 */
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push notification received');
  
  let notificationData;
  
  // Parse the push notification payload
  try {
    if (event.data) {
      // Try to parse as JSON first (standard Web Push format)
      notificationData = event.data.json();
      console.log('[Service Worker] Push data:', notificationData);
    } else {
      // Fallback to default notification
      console.warn('[Service Worker] No push data received, using default');
      notificationData = {
        title: 'APC Connect',
        body: 'You have a new notification',
        icon: '/icon-192.png',
        badge: '/icon-192.png'
      };
    }
  } catch (error) {
    // If JSON parsing fails, try to get text
    console.error('[Service Worker] Failed to parse push data:', error);
    notificationData = {
      title: 'APC Connect',
      body: event.data ? event.data.text() : 'New notification',
      icon: '/icon-192.png',
      badge: '/icon-192.png'
    };
  }

  // Build notification options from the payload
  const options = {
    body: notificationData.body || 'New notification from APC Connect',
    icon: notificationData.icon || '/icon-192.png',
    badge: notificationData.badge || '/icon-192.png',
    image: notificationData.image, // Optional large image
    tag: notificationData.tag || 'apc-notification', // Groups similar notifications
    requireInteraction: notificationData.requireInteraction || false,
    vibrate: [200, 100, 200], // Vibration pattern: vibrate 200ms, pause 100ms, vibrate 200ms
    timestamp: Date.now(),
    data: {
      // Preserve all data from the notification for click handling
      dateOfArrival: Date.now(),
      ...notificationData.data
    },
    actions: notificationData.actions || [
      {
        action: 'view',
        title: 'View',
        icon: '/icon-192.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icon-192.png'
      }
    ]
  };

  // Display the notification
  event.waitUntil(
    self.registration.showNotification(
      notificationData.title || 'APC Connect',
      options
    ).then(() => {
      console.log('[Service Worker] Notification displayed successfully');
    }).catch((error) => {
      console.error('[Service Worker] Failed to display notification:', error);
    })
  );
});

/**
 * Notification Click Event Listener
 * 
 * Handles user interaction with notifications:
 * - Action button clicks (e.g., "View", "Dismiss")
 * - Notification body clicks (default action)
 * 
 * Routes user to appropriate page based on notification data.
 */
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked');
  console.log('[Service Worker] Action:', event.action);
  console.log('[Service Worker] Notification data:', event.notification.data);
  
  // Close the notification
  event.notification.close();

  // Handle different action buttons
  if (event.action === 'dismiss' || event.action === 'close') {
    // User dismissed the notification, do nothing
    console.log('[Service Worker] Notification dismissed by user');
    return;
  }

  // Determine the URL to open based on notification data
  let urlToOpen = '/';
  
  if (event.notification.data && event.notification.data.url) {
    urlToOpen = event.notification.data.url;
  }

  // Handle specific notification types with custom navigation
  if (event.notification.data && event.notification.data.type) {
    const notificationType = event.notification.data.type;
    console.log('[Service Worker] Notification type:', notificationType);

    switch (notificationType) {
      case 'event_reminder':
        // Navigate to event details
        if (event.notification.data.eventId) {
          urlToOpen = `/events?event=${event.notification.data.eventId}`;
        }
        break;

      case 'election_announcement':
        // Navigate to election voting page
        if (event.notification.data.electionId) {
          urlToOpen = `/elections?id=${event.notification.data.electionId}`;
        }
        break;

      case 'news_alert':
        // Navigate to news article
        if (event.notification.data.newsId) {
          urlToOpen = `/news/${event.notification.data.newsId}`;
        }
        break;

      case 'dues_reminder':
        // Navigate to dues payment page
        urlToOpen = '/dues';
        break;

      case 'task_assignment':
        // Navigate to task details
        if (event.notification.data.taskId) {
          urlToOpen = `/tasks?id=${event.notification.data.taskId}`;
        }
        break;

      case 'campaign_update':
        // Navigate to campaign page
        if (event.notification.data.campaignId) {
          urlToOpen = `/campaigns?id=${event.notification.data.campaignId}`;
        }
        break;

      case 'achievement_unlocked':
        // Navigate to rewards/badges page
        urlToOpen = '/rewards';
        break;

      case 'referral_reward':
        // Navigate to invite & earn page
        urlToOpen = '/invite-earn';
        break;

      case 'system_announcement':
        // Use URL from notification data
        urlToOpen = event.notification.data.url || '/';
        break;

      default:
        console.log('[Service Worker] Unknown notification type:', notificationType);
    }
  }

  // Handle specific action buttons
  if (event.action === 'view' || event.action === 'read' || event.action === 'explore') {
    // Default view action - use the determined URL
    console.log('[Service Worker] Opening URL:', urlToOpen);
  } else if (event.action === 'vote') {
    // Direct to voting for elections
    console.log('[Service Worker] Opening voting page');
  } else if (event.action === 'pay') {
    // Direct to payment for dues
    urlToOpen = '/dues';
    console.log('[Service Worker] Opening payment page');
  } else if (event.action === 'share') {
    // Handle share action (could open share dialog or navigate to content)
    console.log('[Service Worker] Share action triggered');
  } else if (event.action === 'join') {
    // Handle join campaign action
    console.log('[Service Worker] Join campaign action triggered');
  } else if (event.action === 'accept') {
    // Handle task acceptance
    console.log('[Service Worker] Accept task action triggered');
  } else if (event.action === 'later' || event.action === 'remind') {
    // Handle "remind me later" - could schedule another notification
    console.log('[Service Worker] Remind later action triggered');
    // TODO: Could make API call to schedule reminder
    return;
  }

  // Open the URL in a new tab or focus existing tab
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window/tab open with this URL
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url === urlToOpen && 'focus' in client) {
            console.log('[Service Worker] Focusing existing window');
            return client.focus();
          }
        }
        
        // No existing window found, open a new one
        if (clients.openWindow) {
          console.log('[Service Worker] Opening new window:', urlToOpen);
          return clients.openWindow(urlToOpen);
        }
      })
      .catch((error) => {
        console.error('[Service Worker] Error handling notification click:', error);
      })
  );
});

// ============================================================================
// PUSH SUBSCRIPTION MANAGEMENT
// ============================================================================
// 
// When using Web Push API, the frontend needs to:
// 1. Request notification permission from user
// 2. Get push subscription from service worker
// 3. Send subscription to backend to store in database
// 
// See client/src/main.tsx for the subscription flow implementation.
// ============================================================================
