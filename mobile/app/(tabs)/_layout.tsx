import { Tabs } from 'expo-router';
import { Platform } from 'react-native';

// Using simple text icons for now - you can replace with proper icon libraries
function TabBarIcon({ name, color }: { name: string; color: string }) {
  return null; // Icons can be added later with expo-vector-icons or similar
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#00A86B',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          paddingBottom: Platform.OS === 'ios' ? 20 : 8,
          height: Platform.OS === 'ios' ? 88 : 64,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        headerStyle: {
          backgroundColor: '#00A86B',
        },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          headerTitle: 'APC Connect',
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: 'Events',
          headerTitle: 'Events',
        }}
      />
      <Tabs.Screen
        name="elections"
        options={{
          title: 'Elections',
          headerTitle: 'Elections',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          headerTitle: 'My Profile',
        }}
      />
    </Tabs>
  );
}
