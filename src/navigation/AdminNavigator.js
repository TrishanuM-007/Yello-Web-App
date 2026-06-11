import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { TouchableOpacity, Text } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ManageAppointmentsScreen from '../screens/admin/ManageAppointmentsScreen';
import DoctorSlotsAdminScreen from '../screens/admin/DoctorSlotsAdminScreen';
import AddDoctorScreen from '../screens/admin/AddDoctorScreen';
import ManageTestsScreen from '../screens/admin/ManageTestsScreen';
import UploadTestReportScreen from '../screens/admin/UploadTestReportScreen';
import AdminSettingsScreen from '../screens/admin/AdminSettingsScreen';
import PendingApprovalsScreen from '../screens/admin/PendingApprovalsScreen';
import OngoingServicesScreen from '../screens/admin/OngoingServicesScreen';
import { useTheme } from '../context/ThemeContext';

const Tab = createBottomTabNavigator();
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
      <Stack.Screen name="ManageAppointments" component={ManageAppointmentsScreen} options={{ title: 'Manage Doctors' }} />
      <Stack.Screen name="DoctorSlotsAdminScreen" component={DoctorSlotsAdminScreen} options={{ title: 'Doctor Slots' }} />
      <Stack.Screen name="AddDoctorScreen" component={AddDoctorScreen} options={{ title: 'Add Doctor' }} />
    </Stack.Navigator>
  );
}

export default function AdminNavigator() {
  const { theme } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.primary,
        },
        headerTintColor: '#1A1A1A', // Always dark text on yellow header
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textLight,
        tabBarStyle: {
          backgroundColor: theme.colors.surface, 
          borderTopColor: theme.colors.border,
        },
      }}
    >
      <Tab.Screen 
        name="ManageDoctorsTab" 
        component={DoctorsStackNavigator} 
        options={{ headerShown: false, tabBarLabel: 'Doctors' }} 
      />
      <Tab.Screen 
        name="ManageTests" 
        component={ManageTestsScreen} 
        options={{ title: 'Manage Tests', tabBarLabel: 'Tests' }} 
      />
      <Tab.Screen 
        name="PendingApprovals" 
        component={PendingApprovalsScreen} 
        options={{ title: 'Pending', tabBarLabel: 'Pending' }} 
      />
      <Tab.Screen 
        name="OngoingServices" 
        component={OngoingServicesScreen} 
        options={{ title: 'Ongoing', tabBarLabel: 'Ongoing' }} 
      />
      <Tab.Screen 
        name="UploadTestReport" 
        component={UploadTestReportScreen} 
        options={{ title: 'Upload Reports', tabBarLabel: 'Upload' }} 
      />
      <Tab.Screen 
        name="AdminSettings" 
        component={AdminSettingsScreen} 
        options={{ title: 'Settings', tabBarLabel: 'Settings' }} 
      />
    </Tab.Navigator>
  );
}
