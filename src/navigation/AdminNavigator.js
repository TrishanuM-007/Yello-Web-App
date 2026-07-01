import React, { useState } from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useWindowDimensions, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Menu } from 'lucide-react';

import ManageAppointmentsScreen from '../screens/admin/ManageAppointmentsScreen';
import DoctorSlotsAdminScreen from '../screens/admin/DoctorSlotsAdminScreen';
import AddDoctorScreen from '../screens/admin/AddDoctorScreen';
import ManageTestsScreen from '../screens/admin/ManageTestsScreen';
import AvailableTestsScreen from '../screens/admin/AvailableTestsScreen';
import UploadTestReportScreen from '../screens/admin/UploadTestReportScreen';
import AdminSettingsScreen from '../screens/admin/AdminSettingsScreen';
import AddBookingScreen from '../screens/admin/AddBookingScreen';
import OngoingServicesScreen from '../screens/admin/OngoingServicesScreen';
import PatientDashboardScreen from '../screens/admin/PatientDashboardScreen';
import PatientDetailsScreen from '../screens/admin/PatientDetailsScreen';
import MasterCalendarScreen from '../screens/admin/MasterCalendarScreen';
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

function CustomDrawerContent(props) {
  const { state, descriptors, navigation, isSidebarOpen, setIsSidebarOpen } = props;

  return (
    <>
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 md:relative md:translate-x-0 bg-gray-50 dark:bg-[#0F172A] border-r border-gray-200 dark:border-gray-800 pt-8 flex flex-col font-sans ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      
      {/* Brand Header */}
      <div className="px-6 mb-8 flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 bg-yellow-400 rounded-lg flex items-center justify-center shadow-sm">
          <span className="font-bold text-yellow-950 text-lg">y</span>
        </div>
        <span className="font-bold text-xl tracking-tight text-gray-900 dark:text-white whitespace-nowrap">Daily CRM</span>
      </div>

      {/* Navigation Links */}
      <nav className="flex flex-col gap-2 px-4">
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          
          if (options.drawerItemStyle?.display === 'none') return null;

          const label = options.drawerLabel !== undefined ? options.drawerLabel : options.title !== undefined ? options.title : route.name;
          const isFocused = state.index === index;
          
          return (
            <button
              key={route.key}
              onClick={(e) => {
                e.preventDefault();
                // Retain existing routing logic
                if (route.name === 'PatientCRM') {
                  navigation.navigate('PatientCRM', { screen: 'PatientDashboard' });
                } else if (route.name === 'ManageDoctorsTab') {
                  navigation.navigate('ManageDoctorsTab', { screen: 'ManageAppointments' });
                } else {
                  navigation.navigate(route.name);
                }
              }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${
                isFocused
                  ? 'bg-yellow-400/10 text-yellow-600 dark:text-yellow-400 font-bold'
                  : 'text-gray-500 dark:text-gray-400 font-medium hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/5'
              }`}
            >
              <span className="truncate">{label}</span>
            </button>
          );
        })}
      </nav>
      </aside>
    </>
  );
}

export default function AdminNavigator() {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const isDesktop = width > 768;
  const [isSidebarOpen, setIsSidebarOpen] = useState(isDesktop);

  return (
    <>
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />}
      screenOptions={({ navigation }) => ({
        unmountOnBlur: true,
        drawerType: isDesktop ? 'permanent' : 'front',
        headerShown: false,
        drawerStyle: isDesktop ? {
          width: isSidebarOpen ? 256 : 0,
          opacity: isSidebarOpen ? 1 : 0,
          backgroundColor: 'transparent',
          borderRightWidth: 0,
          overflow: 'hidden',
          transition: 'all 0.3s ease-in-out',
        } : {
          width: 256,
          backgroundColor: 'transparent',
          borderRightWidth: 0,
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
        name="MasterCalendar" 
        component={MasterCalendarScreen} 
        options={{ title: 'Master Calendar', drawerLabel: 'Master Calendar' }} 
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
        name="AvailableTests" 
        component={AvailableTestsScreen} 
        options={{ 
          title: 'Available Tests', 
          drawerItemStyle: { display: 'none' } 
        }} 
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
    {isDesktop && (
      <div className="fixed bottom-8 left-8 z-[9999]">
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
          className="w-14 h-14 bg-yellow-400 hover:bg-yellow-500 text-black rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.3)] border border-yellow-500 transition-all flex items-center justify-center transform hover:scale-105"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>
    )}
    </>
  );
}
