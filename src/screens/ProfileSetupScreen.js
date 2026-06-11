import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import ClayButton from '../components/ClayButton';
import ClayCard from '../components/ClayCard';
import { db } from '../config/firebase';
import { doc, setDoc } from 'firebase/firestore';
import DateTimePicker from '@react-native-community/datetimepicker';
import { TouchableOpacity } from 'react-native';

export default function ProfileSetupScreen({ route, navigation }) {
  const { theme, isDarkMode } = useTheme();
  const styles = getStyles(theme, isDarkMode);

  const uid = route?.params?.uid || 'test-uid';
  const phoneNumber = route?.params?.phoneNumber || '';
  
  const [name, setName] = useState('');
  const [dob, setDob] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [gender, setGender] = useState('');
  const [address, setAddress] = useState('');
  const [area, setArea] = useState('');
  const [postcode, setPostcode] = useState('');
  const [allergies, setAllergies] = useState('');
  const [medicalHistory, setMedicalHistory] = useState('');
  const [insuranceInfo, setInsuranceInfo] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);

  const handleCompleteSetup = async () => {
    if (!name.trim() || !gender.trim() || !address.trim() || !area.trim() || !postcode.trim()) {
      Alert.alert('Required Fields', 'Please fill in your Name, Gender, and full Address details.');
      return;
    }

    setLoading(true);
    try {
      const userRef = doc(db, 'patients', uid);
      await setDoc(userRef, {
        name,
        dob: dob.toISOString().split('T')[0],
        gender,
        phoneNumber,
        address,
        area,
        postcode,
        allergies,
        medicalHistory,
        insuranceInfo,
        createdAt: new Date().toISOString()
      });

      setToastVisible(true);
      
      setTimeout(() => {
        setToastVisible(false);
        navigation.reset({ index: 0, routes: [{ name: 'MainDrawer' }] });
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

        <ClayCard style={styles.form}>
          <Text style={styles.label}>Full Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="John Doe"
            placeholderTextColor={theme.colors.textLight}
            value={name}
            onChangeText={setName}
          />

          <Text style={styles.label}>Date of Birth *</Text>
          {Platform.OS === 'ios' ? (
            <DateTimePicker
              value={dob}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                if (selectedDate) setDob(selectedDate);
              }}
              style={{ alignSelf: 'flex-start', marginBottom: 16 }}
            />
          ) : (
            <>
              <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.input}>
                <Text style={{ color: isDarkMode ? '#FFFFFF' : theme.colors.text }}>{dob.toISOString().split('T')[0]}</Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={dob}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(false);
                    if (selectedDate) setDob(selectedDate);
                  }}
                />
              )}
            </>
          )}

          <Text style={styles.label}>Gender *</Text>
          <TextInput
            style={styles.input}
            placeholder="Male / Female / Other"
            placeholderTextColor={theme.colors.textLight}
            value={gender}
            onChangeText={setGender}
          />

          <Text style={styles.label}>Phone Number (Read Only)</Text>
          <TextInput
            style={[styles.input, styles.readOnlyInput]}
            value={phoneNumber}
            editable={false}
          />

          <Text style={styles.label}>Full Address *</Text>
          <TextInput
            style={styles.input}
            placeholder="123 Main St, City"
            placeholderTextColor={theme.colors.textLight}
            value={address}
            onChangeText={setAddress}
          />

          <Text style={styles.label}>Area *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Downtown"
            placeholderTextColor={theme.colors.textLight}
            value={area}
            onChangeText={setArea}
          />

          <Text style={styles.label}>Postcode/ZIP *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 10001"
            placeholderTextColor={theme.colors.textLight}
            value={postcode}
            onChangeText={setPostcode}
          />

          <Text style={styles.label}>Allergies (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="List any allergies..."
            placeholderTextColor={theme.colors.textLight}
            multiline
            numberOfLines={3}
            value={allergies}
            onChangeText={setAllergies}
          />

          <Text style={styles.label}>Medical History (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Relevant medical history..."
            placeholderTextColor={theme.colors.textLight}
            multiline
            numberOfLines={3}
            value={medicalHistory}
            onChangeText={setMedicalHistory}
          />

          <Text style={styles.label}>Insurance Info (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Provider and Policy Number"
            placeholderTextColor={theme.colors.textLight}
            value={insuranceInfo}
            onChangeText={setInsuranceInfo}
          />

          <ClayButton 
            title="Complete Setup"
            onPress={handleCompleteSetup}
            loading={loading}
            style={{ marginTop: theme.spacing.xl }}
          />
        </ClayCard>
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

const getStyles = (theme, isDarkMode) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: theme.spacing.xl,
    paddingTop: 60,
    paddingBottom: 40,
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
  readOnlyInput: {
    backgroundColor: theme.colors.border,
    color: isDarkMode ? '#FFFFFF' : theme.colors.textLight,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  toastContainer: {
    position: 'absolute',
    bottom: 50,
    left: '10%',
    right: '10%',
    backgroundColor: '#4CAF50',
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
