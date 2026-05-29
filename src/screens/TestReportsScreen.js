import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme/theme';

export default function TestReportsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Test Reports</Text>
      <View style={styles.card}>
        <Text style={styles.cardText}>No recent test reports available.</Text>
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
  card: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
  },
  cardText: {
    ...theme.typography.body,
    color: theme.colors.textLight,
  }
});
