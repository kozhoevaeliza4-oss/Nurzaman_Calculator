import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import DashboardScreen from '../screens/parent/DashboardScreen';
import ChatScreen from '../screens/parent/ChatScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { colors } from '../theme/colors';

const Tab = createBottomTabNavigator();

const ICONS: Record<string, string> = {
  Кабинет: '🏠',
  Ассистент: '💬',
  Профиль: '👤',
};

export default function ParentTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: { color: colors.ink, fontWeight: '800' },
        tabBarActiveTintColor: colors.accentInk,
        tabBarInactiveTintColor: colors.inkMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarIcon: () => <Text style={{ fontSize: 18 }}>{ICONS[route.name]}</Text>,
      })}
    >
      <Tab.Screen name="Кабинет" component={DashboardScreen} options={{ title: 'Личный кабинет' }} />
      <Tab.Screen name="Ассистент" component={ChatScreen} options={{ title: 'AI-ассистент' }} />
      <Tab.Screen name="Профиль" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
