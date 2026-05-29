import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../theme/theme';

export default function BookTestScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Book a Test</Text>
      
      <View style={styles.form}>
        <Text style={styles.placeholder}>Select a test to book...</Text>
        
        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>Book Now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.lg,
  },
  title: {
    ...theme.typography.header,
    color: theme.colors.text,
    marginBottom: theme.spacing.lg,
  },
  form: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    ...theme.typography.body,
    color: theme.colors.surface,
    marginBottom: theme.spacing.xl,
  },
  button: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.md,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    ...theme.typography.title,
    color: theme.colors.text,
  },
});
