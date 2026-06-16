import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Alert } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import ClayButton from '../components/ClayButton';
import ClayCard from '../components/ClayCard';

export default function AdminLoginScreen({ navigation }) {
  const { theme, isDarkMode } = useTheme();
  const styles = getStyles(theme, isDarkMode);
  const [passcode, setPasscode] = useState('');

  const handleLogin = () => {
    if (passcode === 'admin123') {
      navigation.navigate('AdminDashboard');
    } else {
      window.alert('Access Denied: Incorrect passcode. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Admin Portal</Text>
      <Text style={styles.subtitle}>Enter your clinic access code</Text>

      <ClayCard style={{ width: '100%' }}>
        <Text style={styles.label}>Passcode</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Passcode"
            placeholderTextColor={theme.colors.textLight}
            secureTextEntry
            value={passcode}
            onChangeText={setPasscode}
            returnKeyType="go"
            onSubmitEditing={handleLogin}
          />
        </View>

        <ClayButton 
          title="Login"
          variant="primary"
          onPress={handleLogin}
          style={{ marginBottom: theme.spacing.md }}
        />

        <ClayButton 
          title="Go Back"
          variant="secondary"
          onPress={() => navigation.goBack()}
        />
      </ClayCard>
    </View>
  );
}

const getStyles = (theme, isDarkMode) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  title: {
    ...theme.typography.header,
    color: isDarkMode ? '#FFFFFF' : theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    ...theme.typography.body,
    color: isDarkMode ? '#FFFFFF' : theme.colors.textLight,
    marginBottom: theme.spacing.xl,
    textAlign: 'center',
  },
  label: {
    ...theme.typography.body,
    color: isDarkMode ? '#FFFFFF' : theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  inputContainer: {
    width: '100%',
    marginBottom: theme.spacing.xl,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: theme.typography.body.fontSize,
    color: isDarkMode ? '#FFFFFF' : theme.colors.text,
    backgroundColor: theme.colors.background,
    textAlign: 'center',
  },
});
