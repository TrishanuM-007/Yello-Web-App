import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import ClayButton from '../../components/ClayButton';
import ClayCard from '../../components/ClayCard';
import { db } from '../../config/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { Picker } from '@react-native-picker/picker';

const SPECIALTIES = [
  'Gynecologist',
  'Pediatrician',
  'Radiology',
  'Psychiatrist',
  'Physiology',
  'General Physician',
  'Dentist'
];

export default function AddDoctorScreen() {
  const { theme, isDarkMode } = useTheme();
  const styles = getStyles(theme, isDarkMode);

  // Helper to convert 24hr HTML time to 12hr AM/PM for Firestore
  const formatTimeForDisplay = (time24) => {
    if (!time24) return '';
    const [h, m] = time24.split(':');
    let hours = parseInt(h, 10);
    const suffix = hours >= 12 ? 'PM' : 'AM';
    if (hours === 0) hours = 12;
    if (hours > 12) hours -= 12;
    return `${hours}:${m} ${suffix}`;
  };

  const [name, setName] = useState('');
  const [specialty, setSpecialty] = useState(SPECIALTIES[0]);
  const [experience, setExperience] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  
  const [loading, setLoading] = useState(false);

  const experienceRef = useRef(null);
  const contactNumberRef = useRef(null);
  const descriptionRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImageUrl(event.target.result); // Save as Base64 Data URL
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddDoctor = async () => {
    if (!name.trim() || !specialty || !experience.trim() || !contactNumber.trim() || !description.trim()) {
      window.alert('Error: Please fill in all required fields.');
      return;
    }

    setLoading(true);
    try {
      const doctorData = {
        name: name.trim(),
        specialty,
        experience: parseInt(experience, 10) || 0,
        contactNumber: contactNumber.trim(),
        startTime: formatTimeForDisplay(startTime),
        endTime: formatTimeForDisplay(endTime),
        description: description.trim(),
        imageUrl: imageUrl,
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'doctors'), doctorData);

      window.alert('Success: Doctor added successfully!');
      
      // Clear form
      setName('');
      setSpecialty(SPECIALTIES[0]);
      setExperience('');
      setContactNumber('');
      setDescription('');
      setImageUrl('');
      setStartTime('09:00');
      setEndTime('17:00');
    } catch (error) {
      console.error('Error adding doctor:', error);
      window.alert('Error: Failed to add doctor. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Add New Doctor</Text>
        
        <ClayCard style={styles.form}>
          <Text style={styles.label}>Doctor Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Dr. John Doe"
            placeholderTextColor="#666666"
            value={name}
            onChangeText={setName}
            returnKeyType="next"
            onSubmitEditing={() => experienceRef.current?.focus()}
            blurOnSubmit={false}
          />

          <Text style={styles.label}>Specialty</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={specialty}
              onValueChange={(itemValue) => setSpecialty(itemValue)}
              style={styles.picker}
            >
              {SPECIALTIES.map(spec => (
                <Picker.Item 
                  key={spec} 
                  label={spec} 
                  value={spec} 
                  color="#000000"
                />
              ))}
            </Picker>
          </View>

          <Text style={styles.label}>Experience (Years)</Text>
          <TextInput
            ref={experienceRef}
            style={styles.input}
            placeholder="e.g. 5"
            placeholderTextColor="#666666"
            value={experience}
            onChangeText={setExperience}
            keyboardType="numeric"
            returnKeyType="next"
            onSubmitEditing={() => contactNumberRef.current?.focus()}
            blurOnSubmit={false}
          />

          <Text style={styles.label}>Contact Number</Text>
          <TextInput
            ref={contactNumberRef}
            style={styles.input}
            placeholder="e.g. +1 234 567 8900"
            placeholderTextColor="#666666"
            value={contactNumber}
            onChangeText={setContactNumber}
            keyboardType="phone-pad"
            returnKeyType="next"
            onSubmitEditing={() => descriptionRef.current?.focus()}
            blurOnSubmit={false}
          />

          <Text style={styles.label}>Working Hours (Start & End Time)</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.sm }}>
            {Platform.OS === 'web' ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <input 
                  type="time" 
                  value={startTime} 
                  onChange={(e) => setStartTime(e.target.value)} 
                  style={{
                    border: '1px solid #CCCCCC',
                    borderRadius: '8px',
                    padding: '12px',
                    fontSize: '16px',
                    backgroundColor: '#FFFFFF',
                    color: '#000000'
                  }}
                />
                <Text style={{ marginHorizontal: 10, color: theme.colors.text }}>to</Text>
                <input 
                  type="time" 
                  value={endTime} 
                  onChange={(e) => setEndTime(e.target.value)} 
                  style={{
                    border: '1px solid #CCCCCC',
                    borderRadius: '8px',
                    padding: '12px',
                    fontSize: '16px',
                    backgroundColor: '#FFFFFF',
                    color: '#000000'
                  }}
                />
              </View>
            ) : (
              <Text style={{ color: 'red' }}>Time picking is only supported on web.</Text>
            )}
          </View>

          <Text style={styles.label}>Doctor Description</Text>
          <TextInput
            ref={descriptionRef}
            style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
            placeholder="e.g. Highly experienced professional..."
            placeholderTextColor="#666666"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
          />

          <Text style={styles.label}>Doctor Picture (Optional)</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.sm }}>
            <ClayButton 
              title="Upload Image from Desktop" 
              variant="secondary"
              onPress={() => fileInputRef.current?.click()} 
              style={{ flex: 1, marginRight: theme.spacing.md }}
            />
            {imageUrl ? (
              <Text style={{ color: '#34C759', ...theme.typography.body }}>Image selected</Text>
            ) : (
              <Text style={{ color: theme.colors.textLight, ...theme.typography.body }}>No image</Text>
            )}
          </View>

          {/* Hidden File Input for Web */}
          {Platform.OS === 'web' && (
            <input 
              type="file" 
              accept="image/*"
              ref={fileInputRef}
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
          )}

          <ClayButton 
            title="Add Doctor"
            onPress={handleAddDoctor}
            loading={loading}
            style={{ marginTop: theme.spacing.xl }}
          />
        </ClayCard>
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
    color: '#000000',
    backgroundColor: '#FFFFFF',
    marginBottom: theme.spacing.sm,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.background,
    marginBottom: theme.spacing.sm,
    overflow: 'hidden',
  },
  picker: {
    width: '100%',
    height: 50,
    color: '#000000',
    backgroundColor: '#FFFFFF',
  },
});
