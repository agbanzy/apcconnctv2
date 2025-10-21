import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { registerServiceWorker, setupInstallPrompt } from "./lib/registerServiceWorker";

// Register service worker for PWA functionality
registerServiceWorker();
setupInstallPrompt();

// ============================================================================
// PUSH NOTIFICATION PERMISSION & SUBSCRIPTION FLOW
// ============================================================================
//
// This is where you would request permission for push notifications and
// subscribe the user to receive push notifications.
//
// IMPLEMENTATION GUIDE:
// ---------------------
//
// 1. WEB PUSH API (VAPID) SETUP
//    ---------------------------
//    For native browser push notifications using Web Push API:
//
//    a) First, ensure service worker is registered (already done above)
//    
//    b) Request notification permission from the user:
//    
//       ```typescript
//       async function requestNotificationPermission() {
//         // Check if browser supports notifications
//         if (!('Notification' in window)) {
//           console.log('This browser does not support notifications');
//           return false;
//         }
//       
//         // Request permission
//         const permission = await Notification.requestPermission();
//         
//         if (permission === 'granted') {
//           console.log('Notification permission granted');
//           return true;
//         } else if (permission === 'denied') {
//           console.log('Notification permission denied');
//           return false;
//         } else {
//           console.log('Notification permission dismissed');
//           return false;
//         }
//       }
//       ```
//    
//    c) Subscribe user to push notifications:
//    
//       ```typescript
//       async function subscribeToPushNotifications() {
//         try {
//           // Wait for service worker to be ready
//           const registration = await navigator.serviceWorker.ready;
//           
//           // Get VAPID public key from server
//           const response = await fetch('/api/push/vapid-public-key');
//           const { publicKey } = await response.json();
//           
//           // Convert VAPID key from base64 to Uint8Array
//           function urlBase64ToUint8Array(base64String: string) {
//             const padding = '='.repeat((4 - base64String.length % 4) % 4);
//             const base64 = (base64String + padding)
//               .replace(/-/g, '+')
//               .replace(/_/g, '/');
//             
//             const rawData = window.atob(base64);
//             const outputArray = new Uint8Array(rawData.length);
//             
//             for (let i = 0; i < rawData.length; ++i) {
//               outputArray[i] = rawData.charCodeAt(i);
//             }
//             return outputArray;
//           }
//           
//           // Subscribe to push notifications
//           const subscription = await registration.pushManager.subscribe({
//             userVisibleOnly: true, // Required by browsers
//             applicationServerKey: urlBase64ToUint8Array(publicKey)
//           });
//           
//           // Send subscription to server to store in database
//           await fetch('/api/push/subscribe', {
//             method: 'POST',
//             headers: {
//               'Content-Type': 'application/json'
//             },
//             body: JSON.stringify(subscription)
//           });
//           
//           console.log('Successfully subscribed to push notifications');
//           return subscription;
//         } catch (error) {
//           console.error('Failed to subscribe to push notifications:', error);
//           return null;
//         }
//       }
//       ```
//    
//    d) Complete flow - call these functions at appropriate times:
//    
//       ```typescript
//       // Option 1: Request permission immediately after user logs in
//       // (Not recommended - can be intrusive)
//       // requestNotificationPermission().then(granted => {
//       //   if (granted) subscribeToPushNotifications();
//       // });
//       
//       // Option 2: Show a custom UI element first to explain benefits
//       // (Recommended - better UX)
//       // Display a banner/modal explaining push notifications
//       // When user clicks "Enable Notifications" button:
//       // handleEnableNotifications() {
//       //   requestNotificationPermission().then(granted => {
//       //     if (granted) subscribeToPushNotifications();
//       //   });
//       // }
//       
//       // Option 3: Request permission contextually
//       // (Best practice - request when relevant to user action)
//       // For example, when user RSVPs to an event:
//       // handleEventRSVP() {
//       //   // ... RSVP logic ...
//       //   // Then suggest enabling notifications for event reminders
//       //   if (Notification.permission === 'default') {
//       //     // Show custom prompt: "Get reminded about this event?"
//       //     requestNotificationPermission().then(granted => {
//       //       if (granted) subscribeToPushNotifications();
//       //     });
//       //   }
//       // }
//       ```
//
// 2. FIREBASE CLOUD MESSAGING (FCM) SETUP
//    -------------------------------------
//    For mobile apps and unified web/mobile push notifications:
//
//    a) Install Firebase SDK:
//       npm install firebase
//    
//    b) Initialize Firebase in your app:
//    
//       ```typescript
//       import { initializeApp } from 'firebase/app';
//       import { getMessaging, getToken, onMessage } from 'firebase/messaging';
//       
//       const firebaseConfig = {
//         apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
//         authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
//         projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
//         storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
//         messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
//         appId: import.meta.env.VITE_FIREBASE_APP_ID
//       };
//       
//       const app = initializeApp(firebaseConfig);
//       const messaging = getMessaging(app);
//       ```
//    
//    c) Request notification permission and get FCM token:
//    
//       ```typescript
//       async function requestFCMPermission() {
//         try {
//           const permission = await Notification.requestPermission();
//           
//           if (permission === 'granted') {
//             // Get FCM token
//             const token = await getToken(messaging, {
//               vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
//             });
//             
//             // Send token to your server
//             await fetch('/api/push/fcm-token', {
//               method: 'POST',
//               headers: { 'Content-Type': 'application/json' },
//               body: JSON.stringify({ token })
//             });
//             
//             console.log('FCM token:', token);
//             return token;
//           }
//         } catch (error) {
//           console.error('Failed to get FCM token:', error);
//         }
//       }
//       ```
//    
//    d) Listen for foreground messages:
//    
//       ```typescript
//       onMessage(messaging, (payload) => {
//         console.log('Foreground message received:', payload);
//         
//         // Display notification manually when app is in foreground
//         if (payload.notification) {
//           new Notification(payload.notification.title || 'APC Connect', {
//             body: payload.notification.body,
//             icon: '/icon-192.png'
//           });
//         }
//       });
//       ```
//
// 3. ONESIGNAL SETUP
//    ---------------
//    For the easiest setup with unified web + mobile support:
//
//    a) Install OneSignal SDK:
//       npm install react-onesignal
//    
//    b) Initialize OneSignal:
//    
//       ```typescript
//       import OneSignal from 'react-onesignal';
//       
//       async function initializeOneSignal() {
//         await OneSignal.init({
//           appId: import.meta.env.VITE_ONESIGNAL_APP_ID,
//           allowLocalhostAsSecureOrigin: true, // For development
//         });
//         
//         // Request notification permission
//         await OneSignal.Slidedown.promptPush();
//         
//         // Get user ID and send to your server
//         const userId = await OneSignal.getUserId();
//         console.log('OneSignal User ID:', userId);
//         
//         // Send userId to your server to associate with member
//         await fetch('/api/push/onesignal-user', {
//           method: 'POST',
//           headers: { 'Content-Type': 'application/json' },
//           body: JSON.stringify({ userId })
//         });
//       }
//       ```
//    
//    c) Set user tags for segmentation:
//    
//       ```typescript
//       // After user logs in, set tags for targeting
//       OneSignal.sendTags({
//         userId: member.id,
//         memberId: member.memberId,
//         role: member.role,
//         wardId: member.wardId,
//         status: member.status
//       });
//       ```
//
// 4. CHECKING CURRENT NOTIFICATION STATUS
//    -------------------------------------
//    Check if user has already granted permission:
//
//    ```typescript
//    function checkNotificationStatus() {
//      if (!('Notification' in window)) {
//        return 'unsupported';
//      }
//      return Notification.permission; // 'default', 'granted', or 'denied'
//    }
//    
//    // Check if user is subscribed to push
//    async function checkPushSubscription() {
//      const registration = await navigator.serviceWorker.ready;
//      const subscription = await registration.pushManager.getSubscription();
//      return subscription !== null;
//    }
//    ```
//
// 5. UNSUBSCRIBING FROM PUSH NOTIFICATIONS
//    --------------------------------------
//    Allow users to opt-out of notifications:
//
//    ```typescript
//    async function unsubscribeFromPush() {
//      try {
//        const registration = await navigator.serviceWorker.ready;
//        const subscription = await registration.pushManager.getSubscription();
//        
//        if (subscription) {
//          await subscription.unsubscribe();
//          
//          // Notify server to remove subscription
//          await fetch('/api/push/unsubscribe', {
//            method: 'POST',
//            headers: { 'Content-Type': 'application/json' },
//            body: JSON.stringify(subscription)
//          });
//          
//          console.log('Successfully unsubscribed from push notifications');
//        }
//      } catch (error) {
//        console.error('Failed to unsubscribe:', error);
//      }
//    }
//    ```
//
// 6. BEST PRACTICES
//    --------------
//    - Don't request permission immediately on page load
//    - Show a custom UI explaining benefits before requesting permission
//    - Request permission contextually (e.g., after RSVP, after joining campaign)
//    - Respect user's decision - don't repeatedly ask if they deny
//    - Allow users to easily unsubscribe in settings
//    - Test notifications thoroughly before deploying
//    - Handle permission states gracefully (granted/denied/default)
//    - Store subscription info securely on your server
//    - Implement proper error handling for subscription failures
//
// 7. TESTING PUSH NOTIFICATIONS
//    ---------------------------
//    Test notifications during development:
//
//    ```typescript
//    // Send a test notification (only works if permission granted)
//    async function sendTestNotification() {
//      if (Notification.permission === 'granted') {
//        new Notification('Test Notification', {
//          body: 'This is a test notification from APC Connect',
//          icon: '/icon-192.png',
//          badge: '/icon-192.png',
//          tag: 'test-notification'
//        });
//      }
//    }
//    ```
//
// INTEGRATION WITH APC CONNECT:
// ------------------------------
// Recommended integration points:
// - After user registers → Show notification opt-in prompt
// - After user RSVPs to event → "Get event reminders"
// - In user settings → Toggle for notifications with granular controls
// - After task assignment → "Get notified about new tasks"
// - On leadership board page → "Get election announcements"
//
// EXAMPLE: Add notification toggle in user settings page
// Create a NotificationSettings component that allows users to:
// - Enable/disable all notifications
// - Choose notification types (events, elections, news, tasks)
// - Test notifications
// - View notification history
//
// ============================================================================

createRoot(document.getElementById("root")!).render(<App />);
