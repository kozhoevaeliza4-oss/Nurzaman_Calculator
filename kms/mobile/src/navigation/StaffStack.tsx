import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import OverviewScreen from '../screens/staff/OverviewScreen';
import ChildDetailScreen from '../screens/staff/ChildDetailScreen';
import { colors } from '../theme/colors';

export type StaffStackParamList = {
  Overview: undefined;
  ChildDetail: { childId: string; fullName: string };
};

const Stack = createNativeStackNavigator<StaffStackParamList>();

export default function StaffStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: { color: colors.ink, fontWeight: '800' },
        headerTintColor: colors.accentInk,
      }}
    >
      <Stack.Screen name="Overview" component={OverviewScreen} options={{ title: 'Обзор' }} />
      <Stack.Screen
        name="ChildDetail"
        component={ChildDetailScreen}
        options={({ route }) => ({ title: route.params.fullName })}
      />
    </Stack.Navigator>
  );
}
