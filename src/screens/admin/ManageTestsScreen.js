import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Alert, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import ClayButton from '../../components/ClayButton';
import ClayCard from '../../components/ClayCard';
import { db } from '../../config/firebase';
import { collection, addDoc, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';

export default function ManageTestsScreen() {
  const { theme, isDarkMode } = useTheme();
  const styles = getStyles(theme, isDarkMode);

  const [testName, setTestName] = useState('');
  const [price, setPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [tests, setTests] = useState([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'available_tests'), (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      // Sort so newest are first
      data.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setTests(data);
      setFetching(false);
    });
    return () => unsub();
  }, []);

  const handleSubmit = async () => {
    if (!testName || !price) {
      window.alert('Error: Please enter both test name and price.');
      return;
    }

    setLoading(true);
    try {
      const testsRef = collection(db, 'available_tests');
      await addDoc(testsRef, {
        testName,
        price: parseFloat(price),
        createdAt: new Date().toISOString()
      });

      window.alert('Success: Test added successfully!');
      setTestName('');
      setPrice('');
    } catch (error) {
      console.error(error);
      window.alert('Error: Failed to add test. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id) => {
    if (window.confirm('Confirm Delete: Are you sure you want to completely remove this test? Patients will no longer see it.')) {
      (async () => {
        try {
          await deleteDoc(doc(db, 'available_tests', id));
        } catch (e) {
          console.error(e);
          window.alert('Error: Could not delete test');
        }
      })();
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Add New Test</Text>

        <ClayCard style={styles.form}>
          <Text style={styles.label}>Test Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Complete Blood Count (CBC)"
            placeholderTextColor={theme.colors.textLight}
            value={testName}
            onChangeText={setTestName}
          />

          <Text style={styles.label}>Price (₹)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 50"
            placeholderTextColor={theme.colors.textLight}
            keyboardType="numeric"
            value={price}
            onChangeText={setPrice}
          />

          <ClayButton
            title="Publish Test"
            onPress={handleSubmit}
            loading={loading}
            style={{ marginTop: theme.spacing.xl }}
          />
        </ClayCard>

        <Text style={[styles.title, { marginTop: 40 }]}>Published Tests</Text>
        {fetching ? (
          <ActivityIndicator color={theme.colors.primary} />
        ) : tests.length === 0 ? (
          <Text style={{ color: theme.colors.textLight }}>No tests published yet.</Text>
        ) : (
          tests.map(test => (
            <ClayCard key={test.id} style={styles.testCard}>
              <View style={styles.testCardInner}>
                <View style={styles.testInfo}>
                  <Text style={styles.testCardName}>{test.testName || test.name}</Text>
                  <Text style={styles.testCardPrice}>₹{test.price}</Text>
                </View>
                <TouchableOpacity onPress={() => handleDelete(test.id)} style={styles.deleteButton}>
                  <Ionicons name="trash-outline" size={24} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            </ClayCard>
          ))
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const getStyles = (theme, isDarkMode) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: theme.spacing.xl,
    paddingTop: 40,
  },
  title: {
    ...theme.typography.header,
    color: isDarkMode ? '#FFFFFF' : theme.colors.text,
    marginBottom: theme.spacing.xl,
  },
  form: {
    width: '100%',
  },
  label: {
    ...theme.typography.title,
    fontSize: 14,
    color: isDarkMode ? '#FFFFFF' : theme.colors.text,
    marginBottom: theme.spacing.xs,
    marginTop: theme.spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: theme.typography.body.fontSize,
    color: isDarkMode ? '#FFFFFF' : theme.colors.text,
    backgroundColor: theme.colors.background,
    marginBottom: theme.spacing.sm,
  },
  testCard: {
    marginBottom: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  testCardInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  testInfo: {
    flex: 1,
  },
  testCardName: {
    ...theme.typography.title,
    fontSize: 16,
    color: isDarkMode ? '#FFFFFF' : theme.colors.text,
  },
  testCardPrice: {
    ...theme.typography.body,
    color: theme.colors.primary,
    marginTop: 4,
    fontWeight: '600',
  },
  deleteButton: {
    padding: 8,
  }
});
