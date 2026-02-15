import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { Platform, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SideDrawer } from '@/components/SideDrawer';

type IconName = 'home' | 'home-outline' | 'calendar' | 'calendar-outline' |
                'checkmark-circle' | 'checkmark-circle-outline' |
                'newspaper' | 'newspaper-outline' | 'person' | 'person-outline';

function TabBarIcon({ name, color, size }: { name: IconName; color: string; size: number }) {
  return <Ionicons name={name} size={size} color={color} />;
}

export default function TabLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <View style={styles.container}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#00A86B',
          tabBarInactiveTintColor: '#9CA3AF',
          tabBarStyle: {
            backgroundColor: '#FFFFFF',
            borderTopWidth: 1,
            borderTopColor: '#E5E7EB',
            paddingBottom: Platform.OS === 'ios' ? 20 : 8,
            paddingTop: 8,
            height: Platform.OS === 'ios' ? 88 : 64,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
          },
          headerStyle: {
            backgroundColor: '#00A86B',
          },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: {
            fontWeight: '600',
            fontSize: 18,
          },
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => setDrawerOpen(true)}
              style={styles.menuButton}
            >
              <Ionicons name="menu" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          ),
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            headerTitle: 'APC Connect',
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon
                name={focused ? 'home' : 'home-outline'}
                color={color}
                size={22}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="news"
          options={{
            title: 'News',
            headerTitle: 'Party News',
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon
                name={focused ? 'newspaper' : 'newspaper-outline'}
                color={color}
                size={22}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="events"
          options={{
            title: 'Events',
            headerTitle: 'Events',
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon
                name={focused ? 'calendar' : 'calendar-outline'}
                color={color}
                size={22}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="elections"
          options={{
            title: 'Elections',
            headerTitle: 'Elections',
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon
                name={focused ? 'checkmark-circle' : 'checkmark-circle-outline'}
                color={color}
                size={22}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            headerTitle: 'My Profile',
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon
                name={focused ? 'person' : 'person-outline'}
                color={color}
                size={22}
              />
            ),
          }}
        />
      </Tabs>

      <SideDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  menuButton: {
    marginLeft: 16,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
