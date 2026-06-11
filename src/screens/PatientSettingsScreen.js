import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Switch, ScrollView, TextInput, Alert, ActivityIndicator, TouchableOpacity, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../context/ThemeContext';
import ClayCard from '../components/ClayCard';
import ClayButton from '../components/ClayButton';
import { auth, db } from '../config/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export default function PatientSettingsScreen({ navigation }) {
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [profile, setProfile] = useState({
    name: '',
    dob: new Date(),
    address: '',
    area: '',
    postcode: '',
    allergies: '',
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [hasDob, setHasDob] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [])
  );

  const loadProfile = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const docRef = doc(db, 'patients', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          let dobDate = new Date();
          let existingDob = false;
          if (data.dob) {
            dobDate = new Date(data.dob);
            existingDob = true;
          } else if (data.age) {
            dobDate = new Date(); // fallback if only age exists
          }
          setProfile({
            name: data.name || '',
            dob: dobDate,
            address: data.address || '',
            area: data.area || '',
            postcode: data.postcode || '',
            allergies: data.allergies || '',
          });
          setHasDob(existingDob);
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const user = auth.currentUser;
      if (user) {
        const docRef = doc(db, 'patients', user.uid);
        const profileDataToSave = {
          ...profile,
          dob: profile.dob.toISOString().split('T')[0]
        };
        await setDoc(docRef, profileDataToSave, { merge: true });
        Alert.alert('Success', 'Profile updated successfully!');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      // Navigation stack is reset automatically if using auth state listeners, 
      // but we can manually reset just in case.
      navigation.reset({ index: 0, routes: [{ name: 'RoleSelection' }] });
    } catch (error) {
      console.error(error);
    }
  };

  const dynamicStyles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    scrollContent: { padding: theme.spacing.xl },
    title: { ...theme.typography.header, color: isDarkMode ? '#FFFFFF' : theme.colors.text, marginBottom: theme.spacing.xl },
    sectionTitle: { ...theme.typography.title, color: isDarkMode ? '#FFFFFF' : theme.colors.text, marginBottom: theme.spacing.md },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.md },
    label: { ...theme.typography.body, color: isDarkMode ? '#FFFFFF' : theme.colors.text },
    input: {
      borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md, color: isDarkMode ? '#FFFFFF' : theme.colors.text, backgroundColor: theme.colors.surface,
      marginBottom: theme.spacing.md,
    }
  });

  const calculateAge = (dob) => {
    if (!dob) return '';
    const diff_ms = Date.now() - dob.getTime();
    const age_dt = new Date(diff_ms);
    return Math.abs(age_dt.getUTCFullYear() - 1970);
  };

  if (loading) {
    return (
      <View style={[dynamicStyles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={theme.colors.primary} size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={dynamicStyles.container} contentContainerStyle={dynamicStyles.scrollContent}>
      <Text style={dynamicStyles.title}>Settings</Text>

      <ClayCard style={{ marginBottom: theme.spacing.xl }}>
        <Text style={dynamicStyles.sectionTitle}>Appearance</Text>
        <View style={dynamicStyles.row}>
          <Text style={dynamicStyles.label}>Dark Mode</Text>
          <Switch
            value={isDarkMode}
            onValueChange={toggleTheme}
            trackColor={{ false: '#767577', true: theme.colors.primary }}
          />
        </View>
      </ClayCard>

      <ClayCard style={{ marginBottom: theme.spacing.xl }}>
        <Text style={dynamicStyles.sectionTitle}>Edit Profile</Text>

        <Text style={dynamicStyles.label}>Full Name</Text>
        <TextInput
          style={dynamicStyles.input}
          value={profile.name}
          onChangeText={(val) => setProfile({ ...profile, name: val })}
          placeholderTextColor={theme.colors.textLight}
        />

        <Text style={dynamicStyles.label}>Date of Birth</Text>
        {Platform.OS === 'ios' ? (
          <View pointerEvents={hasDob ? 'none' : 'auto'} style={hasDob ? { opacity: 0.6 } : {}}>
            <DateTimePicker
              value={profile.dob}
              mode="date"
              display="default"
              disabled={hasDob}
              onChange={(event, selectedDate) => {
                if (selectedDate) setProfile({ ...profile, dob: selectedDate });
              }}
              style={{ alignSelf: 'flex-start', marginBottom: 16 }}
            />
          </View>
        ) : (
          <>
            <TouchableOpacity 
              onPress={() => !hasDob && setShowDatePicker(true)} 
              style={[dynamicStyles.input, hasDob && { opacity: 0.6 }]}
              pointerEvents={hasDob ? 'none' : 'auto'}
            >
              <Text style={{ color: isDarkMode ? '#FFFFFF' : theme.colors.text }}>{profile.dob.toISOString().split('T')[0]}</Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={profile.dob}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) setProfile({ ...profile, dob: selectedDate });
                }}
              />
            )}
          </>
        )}


        <Text style={dynamicStyles.label}>Age</Text>
        <TextInput
          style={[dynamicStyles.input, { backgroundColor: theme.colors.border, color: isDarkMode ? '#FFFFFF' : theme.colors.textLight }]}
          value={`${calculateAge(profile.dob)} years`}
          editable={false}
        />

        <Text style={dynamicStyles.label}>Full Address</Text>
        <TextInput
          style={dynamicStyles.input}
          value={profile.address}
          onChangeText={(val) => setProfile({ ...profile, address: val })}
          placeholderTextColor={theme.colors.textLight}
        />

        <Text style={dynamicStyles.label}>Area</Text>
        <TextInput
          style={dynamicStyles.input}
          value={profile.area}
          onChangeText={(val) => setProfile({ ...profile, area: val })}
          placeholderTextColor={theme.colors.textLight}
        />

        <Text style={dynamicStyles.label}>Postcode/ZIP</Text>
        <TextInput
          style={dynamicStyles.input}
          value={profile.postcode}
          onChangeText={(val) => setProfile({ ...profile, postcode: val })}
          placeholderTextColor={theme.colors.textLight}
        />

        <ClayButton
          title="Save Changes"
          onPress={handleSave}
          loading={saving}
          style={{ marginTop: theme.spacing.md }}
        />
      </ClayCard>

      <ClayButton
        title="Logout"
        variant="secondary"
        onPress={handleLogout}
        style={{ marginBottom: theme.spacing.xl }}
      />
    </ScrollView>
  );
}
