import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Pressable, Text } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { StaffTabParamList } from './types';
import { BROADCAST_ROLES, colors, EXPENSES_ROLES, REPORTS_ROLES, ROLE_LABELS } from '../theme';
import OverviewScreen from '../screens/staff/OverviewScreen';
import MenuScreen from '../screens/staff/MenuScreen';
import ExpensesScreen from '../screens/staff/ExpensesScreen';
import ReportsScreen from '../screens/staff/ReportsScreen';
import NotificationsScreen from '../screens/staff/NotificationsScreen';

const Tab = createBottomTabNavigator<StaffTabParamList>();

const ICONS: Record<keyof StaffTabParamList, string> = {
  Overview: '⌂',
  Menu: '🍽',
  Expenses: '💳',
  Reports: '📊',
  Notifications: '🔔',
};

function LogoutButton() {
  const { logout } = useAuth();
  return (
    <Pressable onPress={() => logout()} hitSlop={10} style={{ marginRight: 14 }}>
      <Text style={{ color: colors.inkMuted, fontSize: 13, fontWeight: '600' }}>Выйти</Text>
    </Pressable>
  );
}

export default function StaffTabs() {
  const { user } = useAuth();
  const role = user?.role ?? '';

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerRight: () => <LogoutButton />,
        headerTitle: user ? `${ROLE_LABELS[role] ?? role}` : 'Асыл-Аманат',
        tabBarActiveTintColor: colors.accentInk,
        tabBarInactiveTintColor: colors.inkMuted,
        tabBarIcon: () => <Text style={{ fontSize: 18 }}>{ICONS[route.name as keyof StaffTabParamList]}</Text>,
      })}
    >
      <Tab.Screen name="Overview" component={OverviewScreen} options={{ title: 'Обзор' }} />
      <Tab.Screen name="Menu" component={MenuScreen} options={{ title: 'Меню' }} />
      {EXPENSES_ROLES.includes(role) && (
        <Tab.Screen name="Expenses" component={ExpensesScreen} options={{ title: 'Расходы' }} />
      )}
      {REPORTS_ROLES.includes(role) && (
        <Tab.Screen name="Reports" component={ReportsScreen} options={{ title: 'Отчёты' }} />
      )}
      {BROADCAST_ROLES.includes(role) && (
        <Tab.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Уведомления' }} />
      )}
    </Tab.Navigator>
  );
}
