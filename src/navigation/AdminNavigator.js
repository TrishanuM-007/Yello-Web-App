import React, { useState } from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useWindowDimensions, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import ManageAppointmentsScreen from '../screens/admin/ManageAppointmentsScreen';
import DoctorSlotsAdminScreen from '../screens/admin/DoctorSlotsAdminScreen';
import AddDoctorScreen from '../screens/admin/AddDoctorScreen';
import ManageTestsScreen from '../screens/admin/ManageTestsScreen';
import UploadTestReportScreen from '../screens/admin/UploadTestReportScreen';
import AdminSettingsScreen from '../screens/admin/AdminSettingsScreen';
import AddBookingScreen from '../screens/admin/AddBookingScreen';
import OngoingServicesScreen from '../screens/admin/OngoingServicesScreen';
import PatientDashboardScreen from '../screens/admin/PatientDashboardScreen';
import PatientDetailsScreen from '../screens/admin/PatientDetailsScreen';
import { useTheme } from '../context/ThemeContext';

const Drawer = createDrawerNavigator();
const Stack = createNativeStackNavigator();

function DoctorsStackNavigator() {
  const { theme } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.primary },
        headerTintColor: '#1A1A1A',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Stack.Screen 
        name="ManageAppointments" 
        component={ManageAppointmentsScreen} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="DoctorSlotsAdminScreen" 
        component={DoctorSlotsAdminScreen} 
        options={{ title: 'Doctor Slots' }} 
      />
      <Stack.Screen 
        name="AddDoctorScreen" 
        component={AddDoctorScreen} 
        options={{ title: 'Add Doctor' }} 
      />
    </Stack.Navigator>
  );
}

function PatientsStackNavigator() {
  const { theme } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.primary },
        headerTintColor: '#1A1A1A',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Stack.Screen 
        name="PatientDashboard" 
        component={PatientDashboardScreen} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="PatientDetails" 
        component={PatientDetailsScreen} 
        options={{ title: 'Patient Profile' }} 
      />
    </Stack.Navigator>
  );
}

export default function AdminNavigator() {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const isDesktop = width > 768;
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <Drawer.Navigator
      screenOptions={({ navigation }) => ({
        unmountOnBlur: true,
        drawerType: isDesktop ? 'permanent' : 'front',
        headerShown: true, // Always show the top header (with hamburger menu on mobile)
        headerStyle: {
          backgroundColor: theme.colors.primary,
        },
        headerTintColor: '#1A1A1A', // Always dark text on yellow header
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        headerLeft: () => (
          <TouchableOpacity 
            onPress={() => {
              if (isDesktop) {
                setIsSidebarOpen(!isSidebarOpen);
              } else {
                navigation.toggleDrawer();
              }
            }}
            style={{ marginLeft: 16 }}
          >
            <Ionicons name="menu" size={28} color="#1A1A1A" />
          </TouchableOpacity>
        ),
        drawerActiveTintColor: theme.colors.primary,
        drawerInactiveTintColor: theme.colors.textLight,
        drawerStyle: isDesktop ? {
          backgroundColor: theme.colors.surface, 
          borderRightColor: theme.colors.border,
          width: isSidebarOpen ? 240 : 0,
          overflow: 'hidden',
          transition: 'width 0.3s ease-in-out',
        } : {
          backgroundColor: theme.colors.surface, 
          borderRightColor: theme.colors.border,
          width: 240,
        },
      })}
    >
      <Drawer.Screen 
        name="PatientCRM" 
        component={PatientsStackNavigator} 
        options={{ title: 'Patient CRM', drawerLabel: 'Patient CRM' }} 
        listeners={({ navigation }) => ({
          drawerItemPress: (e) => {
            e.preventDefault();
            navigation.navigate('PatientCRM', { screen: 'PatientDashboard' });
          },
        })}
      />
      <Drawer.Screen 
        name="AddBooking" 
        component={AddBookingScreen} 
        options={{ title: 'Add Booking', drawerLabel: 'Add Booking' }} 
      />
      <Drawer.Screen 
        name="OngoingServices"  
        component={OngoingServicesScreen} 
        options={{ title: 'Ongoing Services', drawerLabel: 'Ongoing Services' }} 
      />
      <Drawer.Screen 
        name="ManageDoctorsTab" 
        component={DoctorsStackNavigator} 
        options={{ title: 'Manage Doctors', drawerLabel: 'Doctors' }} 
        listeners={({ navigation }) => ({
          drawerItemPress: (e) => {
            e.preventDefault();
            navigation.navigate('ManageDoctorsTab', { screen: 'ManageAppointments' });
          },
        })}
      />
      <Drawer.Screen 
        name="ManageTests"  
        component={ManageTestsScreen} 
        options={{ title: 'Manage Tests', drawerLabel: 'Tests' }} 
      />
      <Drawer.Screen 
        name="UploadTestReport" 
        component={UploadTestReportScreen} 
        options={{ title: 'Upload Reports', drawerLabel: 'Upload Reports' }} 
      />
      <Drawer.Screen 
        name="AdminSettings" 
        component={AdminSettingsScreen} 
        options={{ title: 'Settings', drawerLabel: 'Settings' }} 
      />
    </Drawer.Navigator>
  );
}
