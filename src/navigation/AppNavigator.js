import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Import Screens
import AdminLoginScreen from '../screens/AdminLoginScreen';
import AdminNavigator from './AdminNavigator';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="AdminLogin"
      screenOptions={{ headerShown: false }}
    >
      {/* Admin Flow */}
      <Stack.Screen name="AdminLogin" component={AdminLoginScreen} />
      <Stack.Screen name="AdminDashboard" component={AdminNavigator} />
    </Stack.Navigator>
  );
}
