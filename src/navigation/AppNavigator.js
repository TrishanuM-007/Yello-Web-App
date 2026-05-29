import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { theme } from '../theme/theme';

// Import Screens
import LoginScreen from '../screens/LoginScreen';
import OTPVerificationScreen from '../screens/OTPVerificationScreen';
import ProfileSetupScreen from '../screens/ProfileSetupScreen';
import HomeScreen from '../screens/HomeScreen';
import BookAppointmentScreen from '../screens/BookAppointmentScreen';
import BookTestScreen from '../screens/BookTestScreen';
import TestReportsScreen from '../screens/TestReportsScreen';
import ContactUsScreen from '../screens/ContactUsScreen';

const Drawer = createDrawerNavigator();
const Stack = createNativeStackNavigator();

function DrawerNavigator() {
  return (
    <Drawer.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.primary,
        },
        headerTintColor: theme.colors.text,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        drawerActiveTintColor: theme.colors.primary,
        drawerActiveBackgroundColor: theme.colors.surface,
        drawerInactiveTintColor: theme.colors.text,
      }}
    >
      <Drawer.Screen name="Home" component={HomeScreen} options={{ title: 'Schedule' }} />
      <Drawer.Screen name="BookAppointment" component={BookAppointmentScreen} options={{ title: 'Book Appointment' }} />
      <Drawer.Screen name="BookTest" component={BookTestScreen} options={{ title: 'Book Test' }} />
      <Drawer.Screen name="TestReports" component={TestReportsScreen} options={{ title: 'Test Reports' }} />
      <Drawer.Screen name="ContactUs" component={ContactUsScreen} options={{ title: 'Contact Us' }} />
    </Drawer.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{ headerShown: false }}
    >
      {/* Authentication & Onboarding */}
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />
      <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
      
      {/* Main App (Drawer) */}
      <Stack.Screen name="MainDrawer" component={DrawerNavigator} />
    </Stack.Navigator>
  );
}
