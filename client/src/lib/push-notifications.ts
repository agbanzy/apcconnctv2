import { apiRequest } from './queryClient';

export async function registerPushNotifications(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push notifications not supported');
    return false;
  }

  // Check for HTTPS (required for service workers except localhost)
  if (location.protocol !== 'https:' && !location.hostname.includes('localhost')) {
    console.error('Push notifications require HTTPS');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Notification permission denied');
      return false;
    }

    // Check if service worker already registered
    let registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      registration = await navigator.serviceWorker.register('/service-worker.js');
    }
    
    await navigator.serviceWorker.ready;

    const vapidResponse = await fetch('/api/push/vapid-key');
    const { publicKey } = await vapidResponse.json();

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey)
    });

    await apiRequest('POST', '/api/push/subscribe', subscription);

    console.log('Push notifications registered successfully');
    return true;
  } catch (error) {
    console.error('Failed to register push notifications:', error);
    return false;
  }
}

export async function unregisterPushNotifications(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return false;

    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return false;

    await subscription.unsubscribe();

    await apiRequest('DELETE', '/api/push/unsubscribe', { endpoint: subscription.endpoint });

    console.log('Push notifications unregistered');
    return true;
  } catch (error) {
    console.error('Failed to unregister push notifications:', error);
    return false;
  }
}

export async function isPushNotificationsEnabled(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return false;

    const subscription = await registration.pushManager.getSubscription();
    return subscription !== null;
  } catch {
    return false;
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
