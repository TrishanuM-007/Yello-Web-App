import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../context/ThemeContext';

// Import Screens
import RoleSelectionScreen from '../screens/RoleSelectionScreen';
import AdminLoginScreen from '../screens/AdminLoginScreen';
import AdminNavigator from './AdminNavigator';
import LoginScreen from '../screens/LoginScreen';
import OTPVerificationScreen from '../screens/OTPVerificationScreen';
import ProfileSetupScreen from '../screens/ProfileSetupScreen';
import HomeScreen from '../screens/HomeScreen';
import ScheduleScreen from '../screens/ScheduleScreen';
import BookAppointmentScreen from '../screens/BookAppointmentScreen';
import PatientDoctorListScreen from '../screens/PatientDoctorListScreen';
import DoctorDetailsScreen from '../screens/DoctorDetailsScreen';
import BookTestScreen from '../screens/BookTestScreen';
import TestReportsScreen from '../screens/TestReportsScreen';
import ContactUsScreen from '../screens/ContactUsScreen';
import PatientSettingsScreen from '../screens/PatientSettingsScreen';
import HealthPackagesScreen from '../screens/HealthPackagesScreen';
import AIDoctorScreen from '../screens/AIChatbot/AIDoctorChatBot';

const Drawer = createDrawerNavigator();
const Stack = createNativeStackNavigator();

const BookStack = createNativeStackNavigator();
function BookAppointmentStackNavigator() {
  const { theme } = useTheme();
  return (
    <BookStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.primary },
        headerTintColor: '#1A1A1A',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <BookStack.Screen name="BookAppointmentMain" component={BookAppointmentScreen} options={{ headerShown: false }} />
      <BookStack.Screen name="PatientDoctorListScreen" component={PatientDoctorListScreen} options={{ title: 'Select Doctor' }} />
      <BookStack.Screen name="DoctorDetailsScreen" component={DoctorDetailsScreen} options={{ title: 'Doctor Details' }} />
    </BookStack.Navigator>
  );
}

function DrawerNavigator() {
  const { theme } = useTheme();
  
  return (
    <Drawer.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.primary,
        },
        headerTintColor: '#1A1A1A', // Ensure contrast on primary yellow header
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        drawerStyle: {
          backgroundColor: theme.colors.background,
        },
        drawerActiveTintColor: theme.colors.primary,
        drawerActiveBackgroundColor: theme.colors.surface,
        drawerInactiveTintColor: theme.colors.text,
      }}
    >
      <Drawer.Screen name="Home" component={HomeScreen} options={{ title: 'Home' }} />
      <Drawer.Screen name="Schedule" component={ScheduleScreen} options={{ title: 'My Schedule' }} />
      <Drawer.Screen name="BookAppointment" component={BookAppointmentStackNavigator} options={{ title: 'Book Appointment' }} />
      <Drawer.Screen name="BookTest" component={BookTestScreen} options={{ title: 'Book Test' }} />
      <Drawer.Screen name="HealthPackages" component={HealthPackagesScreen} options={{ title: 'Health Packages' }} />
      <Drawer.Screen name="TestReports" component={TestReportsScreen} options={{ title: 'Test Reports' }} />
      <Drawer.Screen name="AIDoctor" component={AIDoctorScreen} options={{ title: 'AI Doctor Chat' }} />
      <Drawer.Screen name="Settings" component={PatientSettingsScreen} options={{ title: 'Settings' }} />
      <Drawer.Screen name="ContactUs" component={ContactUsScreen} options={{ title: 'Contact Us' }} />
    </Drawer.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="RoleSelection"
      screenOptions={{ headerShown: false }}
    >
      {/* Entry Point */}
      <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />

      {/* Authentication & Onboarding (Patient) */}
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />
      <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
      
      {/* Admin Flow */}
      <Stack.Screen name="AdminLogin" component={AdminLoginScreen} />
      <Stack.Screen name="AdminDashboard" component={AdminNavigator} />
      
      {/* Main App (Drawer) */}
      <Stack.Screen name="MainDrawer" component={DrawerNavigator} />
    </Stack.Navigator>
  );
}
