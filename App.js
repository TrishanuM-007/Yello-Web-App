import 'react-native-gesture-handler';
import React from 'react';
import { View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';

function RootApp() {
  const { theme, isDarkMode } = useTheme();
  return (
    <GestureHandlerRootView style={{ flex: 1, width: '100vw', height: '100vh', backgroundColor: '#f4f4f5' }}>
      <View style={{ flex: 1, width: '100%', height: '100%', backgroundColor: theme.colors.background }}>
        <NavigationContainer>
          <AppNavigator />
          <StatusBar style={isDarkMode ? "light" : "dark"} />
        </NavigationContainer>
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
