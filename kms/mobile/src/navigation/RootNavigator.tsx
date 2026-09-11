import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '../api/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import ParentTabs from './ParentTabs';
import StaffTabs from './StaffTabs';
import { colors } from '../theme/colors';

const STAFF_ROLES = ['director', 'admin', 'accountant', 'teacher', 'medic'];

export default function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {!user ? <LoginScreen /> : user.role === 'parent' ? <ParentTabs /> : STAFF_ROLES.includes(user.role) ? <StaffTabs /> : <LoginScreen />}
    </NavigationContainer>
  );
}
