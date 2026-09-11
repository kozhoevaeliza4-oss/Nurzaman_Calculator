import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StaffStackParamList } from './types';
import { colors } from '../theme';
import StaffTabs from './StaffTabs';
import ChildDetailScreen from '../screens/staff/ChildDetailScreen';
import AddGroupScreen from '../screens/staff/AddGroupScreen';
import AddChildScreen from '../screens/staff/AddChildScreen';
import AddParentScreen from '../screens/staff/AddParentScreen';
import AddStaffScreen from '../screens/staff/AddStaffScreen';
import AddChargeScreen from '../screens/staff/AddChargeScreen';
import AddPaymentScreen from '../screens/staff/AddPaymentScreen';
import AddMenuItemScreen from '../screens/staff/AddMenuItemScreen';
import AddCategoryScreen from '../screens/staff/AddCategoryScreen';
import SetPlanScreen from '../screens/staff/SetPlanScreen';
import AddFactScreen from '../screens/staff/AddFactScreen';
import ScannerScreen from '../screens/staff/ScannerScreen';

const Stack = createNativeStackNavigator<StaffStackParamList>();

export default function StaffNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerTintColor: colors.ink }}>
      <Stack.Screen name="MainTabs" component={StaffTabs} options={{ headerShown: false }} />
      <Stack.Screen name="ChildDetail" component={ChildDetailScreen} options={{ title: 'Карточка ребёнка' }} />
      <Stack.Screen name="AddGroup" component={AddGroupScreen} options={{ presentation: 'modal', title: '' }} />
      <Stack.Screen name="AddChild" component={AddChildScreen} options={{ presentation: 'modal', title: '' }} />
      <Stack.Screen name="AddParent" component={AddParentScreen} options={{ presentation: 'modal', title: '' }} />
      <Stack.Screen name="AddStaff" component={AddStaffScreen} options={{ presentation: 'modal', title: '' }} />
      <Stack.Screen name="AddCharge" component={AddChargeScreen} options={{ presentation: 'modal', title: '' }} />
      <Stack.Screen name="AddPayment" component={AddPaymentScreen} options={{ presentation: 'modal', title: '' }} />
      <Stack.Screen name="AddMenuItem" component={AddMenuItemScreen} options={{ presentation: 'modal', title: '' }} />
      <Stack.Screen name="AddCategory" component={AddCategoryScreen} options={{ presentation: 'modal', title: '' }} />
      <Stack.Screen name="SetPlan" component={SetPlanScreen} options={{ presentation: 'modal', title: '' }} />
      <Stack.Screen name="AddFact" component={AddFactScreen} options={{ presentation: 'modal', title: '' }} />
      <Stack.Screen name="Scanner" component={ScannerScreen} options={{ presentation: 'fullScreenModal', title: 'Сканер QR', headerStyle: { backgroundColor: colors.ink }, headerTintColor: colors.white }} />
    </Stack.Navigator>
  );
}
