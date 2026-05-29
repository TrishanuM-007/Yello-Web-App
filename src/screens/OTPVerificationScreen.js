import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { theme } from '../theme/theme';
import { db, auth } from '../config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { PhoneAuthProvider, signInWithCredential } from 'firebase/auth';

export default function OTPVerificationScreen({ route, navigation }) {
  const { verificationId, phoneNumber } = route.params;
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerifyOTP = async () => {
    if (otp.length < 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      // Create credential and sign in
      const credential = PhoneAuthProvider.credential(verificationId, otp);
      const result = await signInWithCredential(auth, credential);
      const user = result.user;

      // Check if user profile exists in Firestore
      const userDocRef = doc(db, 'patients', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        // Profile exists, go to Home
        navigation.navigate('MainDrawer');
      } else {
        // Profile does not exist, go to Profile Setup
        navigation.navigate('ProfileSetup', { uid: user.uid, phoneNumber });
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Invalid OTP or network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verification Code</Text>
      <Text style={styles.subtitle}>Enter the 6-digit code sent to {phoneNumber}</Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="123456"
          placeholderTextColor={theme.colors.surface}
          keyboardType="number-pad"
          maxLength={6}
          value={otp}
          onChangeText={setOtp}
        />
      </View>

      <TouchableOpacity 
        style={styles.button}
        onPress={handleVerifyOTP}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={theme.colors.text} />
        ) : (
          <Text style={styles.buttonText}>Verify</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
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
    textAlign: 'center',
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
    fontSize: theme.typography.header.fontSize,
    color: theme.colors.text,
    textAlign: 'center',
    letterSpacing: 5,
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
