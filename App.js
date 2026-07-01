import 'react-native-gesture-handler';
import React, { useState } from 'react';
import { View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import AdminNavigator from './src/navigation/AdminNavigator';
import AdminLoginScreen from './src/screens/AdminLoginScreen';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';

import { Toaster } from 'react-hot-toast';

const AppNavigator = AdminNavigator;
function RootApp() {
  const { theme, isDarkMode } = useTheme();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  return (
    <GestureHandlerRootView style={{ flex: 1, width: '100vw', height: '100vh', backgroundColor: '#0F172A' }}>
      <View style={{ flex: 1, width: '100%', height: '100%', backgroundColor: '#0F172A' }}>
        <Toaster 
          position="bottom-center"
          toastOptions={{
            style: {
              background: '#1E293B',
              color: '#fff',
              border: '1px solid #334155',
              borderRadius: '12px',
              fontWeight: 'bold'
            },
            success: {
              iconTheme: { primary: '#FACC15', secondary: '#000' },
            },
          }} 
        />
        {!isAuthenticated ? (
          <AdminLoginScreen onLoginSuccess={() => setIsAuthenticated(true)} />
        ) : (
          <NavigationContainer>
            <AppNavigator />
            <StatusBar style="light" />
          </NavigationContainer>
        )}
      </View>
    </GestureHandlerRootView>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <RootApp />
    </ThemeProvider>
  );
}
