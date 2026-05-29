import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  ActivityIndicator, 
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { theme } from '../theme/theme';
import { db } from '../config/firebase';
import { doc, setDoc } from 'firebase/firestore';

export default function ProfileSetupScreen({ route, navigation }) {
  // Params will be passed from OTP Verification Screen
  const uid = route?.params?.uid || 'test-uid';
  const phoneNumber = route?.params?.phoneNumber || '';
  
  // Form State
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [address, setAddress] = useState('');
  const [allergies, setAllergies] = useState('');
  const [medicalHistory, setMedicalHistory] = useState('');
  const [insuranceInfo, setInsuranceInfo] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);

  const handleCompleteSetup = async () => {
    // Basic validation for required fields
    if (!name.trim() || !age.trim() || !gender.trim() || !address.trim()) {
      Alert.alert('Required Fields', 'Please fill in your Name, Age, Gender, and Address.');
      return;
    }

    setLoading(true);
    try {
      // Save profile data to Firestore in the 'patients' collection
      const userRef = doc(db, 'patients', uid);
      await setDoc(userRef, {
        name,
        age: parseInt(age, 10),
        gender,
        phoneNumber,
        address,
        allergies,
        medicalHistory,
        insuranceInfo,
        createdAt: new Date().toISOString()
      });

      // Show success toast
      setToastVisible(true);
      
      // Wait for toast to be visible briefly before navigating
      setTimeout(() => {
        setToastVisible(false);
        navigation.navigate('MainDrawer');
      }, 1500);

    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Profile Setup</Text>
        <Text style={styles.subtitle}>Let's get to know you</Text>

        <View style={styles.form}>
          <Text style={styles.label}>Full Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="John Doe"
            placeholderTextColor={theme.colors.surface}
            value={name}
            onChangeText={setName}
          />

          <Text style={styles.label}>Age *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 30"
            placeholderTextColor={theme.colors.surface}
            keyboardType="number-pad"
            value={age}
            onChangeText={setAge}
          />

          <Text style={styles.label}>Gender *</Text>
          <TextInput
            style={styles.input}
            placeholder="Male / Female / Other"
            placeholderTextColor={theme.colors.surface}
            value={gender}
            onChangeText={setGender}
          />

          <Text style={styles.label}>Phone Number (Read Only)</Text>
          <TextInput
            style={[styles.input, styles.readOnlyInput]}
            value={phoneNumber}
            editable={false}
          />

          <Text style={styles.label}>Address *</Text>
          <TextInput
            style={styles.input}
            placeholder="123 Main St, City"
            placeholderTextColor={theme.colors.surface}
            value={address}
            onChangeText={setAddress}
          />

          <Text style={styles.label}>Allergies (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="List any allergies..."
            placeholderTextColor={theme.colors.surface}
            multiline
            numberOfLines={3}
            value={allergies}
            onChangeText={setAllergies}
          />

          <Text style={styles.label}>Medical History (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Relevant medical history..."
            placeholderTextColor={theme.colors.surface}
            multiline
            numberOfLines={3}
            value={medicalHistory}
            onChangeText={setMedicalHistory}
          />

          <Text style={styles.label}>Insurance Info (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Provider and Policy Number"
            placeholderTextColor={theme.colors.surface}
            value={insuranceInfo}
            onChangeText={setInsuranceInfo}
          />

          <TouchableOpacity 
            style={styles.button}
            onPress={handleCompleteSetup}
            disabled={loading || toastVisible}
          >
            {loading ? (
              <ActivityIndicator color={theme.colors.text} />
            ) : (
              <Text style={styles.buttonText}>Complete Setup</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Custom Toast */}
      {toastVisible && (
        <View style={styles.toastContainer}>
          <Text style={styles.toastText}>Profile setup complete!</Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: theme.spacing.xl,
    paddingTop: 60, // extra padding for top area
    paddingBottom: 40,
  },
  title: {
    ...theme.typography.header,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.surface,
    marginBottom: theme.spacing.xl,
  },
  form: {
    width: '100%',
  },
  label: {
    ...theme.typography.title,
    fontSize: 14,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
    marginTop: theme.spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text,
    backgroundColor: '#FAFAFA',
    marginBottom: theme.spacing.sm,
  },
  readOnlyInput: {
    backgroundColor: '#EAEAEA',
    color: '#888888',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top', // android multiline fix
  },
  button: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.md,
    width: '100%',
    alignItems: 'center',
    marginTop: theme.spacing.xl,
  },
  buttonText: {
    ...theme.typography.title,
    color: theme.colors.text,
  },
  toastContainer: {
    position: 'absolute',
    bottom: 50,
    left: '10%',
    right: '10%',
    backgroundColor: '#4CAF50', // Success green
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  toastText: {
    ...theme.typography.body,
    color: '#FFF',
    fontWeight: 'bold',
  }
});
