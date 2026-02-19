import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { api } from './api';
import { storage } from './storage';

export async function registerForPushNotifications(): Promise<{ success: boolean; token?: string; message?: string }> {
  try {
    let Notifications: any;
    try {
      Notifications = require('expo-notifications');
    } catch {
      return { success: false, message: 'Push notifications not available in this environment' };
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return { success: false, message: 'Push notification permission denied' };
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    const expoPushToken = tokenData.data;

    const response = await api.post('/api/push/subscribe/mobile', {
      token: expoPushToken,
      platform: Platform.OS,
      deviceName: Constants.deviceName || 'Unknown Device',
    });

    if (!response.success) {
      console.warn('Failed to register push token with server:', response.error);
      return { success: false, message: response.error || 'Failed to register with server' };
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance?.MAX || 5,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#00A86B',
      });
    }

    console.log('Push notification token registered:', expoPushToken);
    return { success: true, token: expoPushToken };
  } catch (error) {
    console.error('Push notification registration failed:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Registration failed',
    };
  }
}

export async function unregisterPushNotifications(): Promise<{ success: boolean; message?: string }> {
  try {
    let Notifications: any;
    try {
      Notifications = require('expo-notifications');
    } catch {
      return { success: false, message: 'Push notifications not available' };
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const expoPushToken = tokenData.data;

    const response = await api.delete('/api/push/unsubscribe/mobile');
    
    console.log('Push notification token unregistered');
    return { success: true };
  } catch (error) {
    console.error('Push notification unregistration failed:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unregistration failed',
    };
  }
}

export function setupNotificationListeners(
  onNotificationReceived?: (notification: any) => void,
  onNotificationResponse?: (response: any) => void
) {
  try {
    const Notifications = require('expo-notifications');

    const receivedSub = Notifications.addNotificationReceivedListener((notification: any) => {
      console.log('Notification received:', notification);
      onNotificationReceived?.(notification);
    });

    const responseSub = Notifications.addNotificationResponseReceivedListener((response: any) => {
      console.log('Notification response:', response);
      onNotificationResponse?.(response);
    });

    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  } catch {
    return () => {};
  }
}
