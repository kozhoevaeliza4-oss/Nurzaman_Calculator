import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Pressable, Text } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme';
import ParentDashboardScreen from '../screens/parent/ParentDashboardScreen';
import AssistantChatScreen from '../screens/parent/AssistantChatScreen';

export type ParentTabParamList = {
  Dashboard: undefined;
  Assistant: undefined;
};

const Tab = createBottomTabNavigator<ParentTabParamList>();

function LogoutButton() {
  const { logout } = useAuth();
  return (
    <Pressable onPress={() => logout()} hitSlop={10} style={{ marginRight: 14 }}>
      <Text style={{ color: colors.inkMuted, fontSize: 13, fontWeight: '600' }}>Выйти</Text>
    </Pressable>
  );
}

export default function ParentNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerRight: () => <LogoutButton />,
        tabBarActiveTintColor: colors.accentInk,
        tabBarInactiveTintColor: colors.inkMuted,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={ParentDashboardScreen}
        options={{ title: 'Личный кабинет', headerTitle: 'Асыл-Аманат', tabBarIcon: () => <Text style={{ fontSize: 18 }}>⌂</Text> }}
      />
      <Tab.Screen
        name="Assistant"
        component={AssistantChatScreen}
        options={{ title: 'Ассистент', tabBarIcon: () => <Text style={{ fontSize: 18 }}>💬</Text> }}
      />
    </Tab.Navigator>
  );
}
