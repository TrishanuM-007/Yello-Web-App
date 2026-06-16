import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import ClayButton from '../../components/ClayButton';
import ClayCard from '../../components/ClayCard';
import { db } from '../../config/firebase';
import { collection, addDoc, getDocs, query } from 'firebase/firestore';
import { collection, addDoc, getDocs, query } from 'firebase/firestore';
import { Picker } from '@react-native-picker/picker';

export default function ManageDoctorSlotsScreen() {
  const { theme, isDarkMode } = useTheme();
  const styles = getStyles(theme, isDarkMode);

  const [doctors, setDoctors] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [shiftStart, setShiftStart] = useState('09:00');
  const [shiftEnd, setShiftEnd] = useState('17:00');
  
  const [generatedSlots, setGeneratedSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    try {
      const q = query(collection(db, 'doctors'));
      const snapshot = await getDocs(q);
      const docsList = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setDoctors(docsList);
      if (docsList.length > 0) {
        setSelectedDoctorId(docsList[0].id);
      }
    } catch (error) {
      console.error(error);
      window.alert('Error: Failed to fetch doctors.');
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = () => {
    const startDateTime = new Date(`${date}T${shiftStart}:00`);
    const endDateTime = new Date(`${date}T${shiftEnd}:00`);

    if (endDateTime <= startDateTime) {
      window.alert('Invalid Time: Shift end must be after shift start.');
      return;
    }
    const slots = [];
    let current = startDateTime;
    while (current < endDateTime) {
      slots.push(new Date(current));
      current.setMinutes(current.getMinutes() + 15);
    }
    setGeneratedSlots(slots);
  };

  const handlePublish = async () => {
    if (generatedSlots.length === 0) {
      window.alert('Error: Please preview slots before publishing.');
      return;
    }
    if (!selectedDoctorId) {
      window.alert('Error: Please select a doctor.');
      return;
    }

    const doctor = doctors.find(d => d.id === selectedDoctorId);
    if (!doctor) return;

    setPublishing(true);
    try {
      const slotsRef = collection(db, 'available_slots');
      const dateString = date;

      for (const slot of generatedSlots) {
        const startStr = slot.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).toUpperCase();
        const endSlot = new Date(slot.getTime() + 15 * 60000);
        const endStr = endSlot.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).toUpperCase();
        
        await addDoc(slotsRef, {
          doctorId: doctor.id,
          doctorName: doctor.name,
          specialty: doctor.specialty,
          date: dateString,
          time: `${startStr} - ${endStr}`,
          isBooked: false,
          createdAt: new Date().toISOString()
        });
      }

      window.alert(`Success: ${generatedSlots.length} slots published successfully!`);
      setGeneratedSlots([]);
    } catch (error) {
      console.error(error);
      window.alert('Error: Failed to publish slots.');
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Add Doctor Slots</Text>
        
        <ClayCard style={styles.form}>
          <Text style={styles.label}>Select Doctor</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedDoctorId}
              onValueChange={(itemValue) => setSelectedDoctorId(itemValue)}
              style={styles.picker}
            >
              {doctors.map(doc => (
                <Picker.Item key={doc.id} label={`${doc.name} (${doc.specialty})`} value={doc.id} />
              ))}
            </Picker>
          </View>

          <Text style={styles.label}>Date</Text>
          <View style={{ marginBottom: theme.spacing.sm }}>
            <input 
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{
                padding: 12,
                borderRadius: 8,
                border: '1px solid #CCCCCC',
                width: '100%',
                fontSize: 16,
                backgroundColor: '#FFFFFF',
                color: '#1A1A1A'
              }}
            />
          </View>

          <Text style={styles.sectionHeader}>Define Shift Time</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.lg }}>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={styles.pickerLabel}>Shift Start</Text>
              <input 
                type="time"
                value={shiftStart}
                onChange={(e) => setShiftStart(e.target.value)}
                style={{
                  padding: 12,
                  borderRadius: 8,
                  border: '1px solid #CCCCCC',
                  width: '90%',
                  fontSize: 16,
                  backgroundColor: '#FFFFFF',
                  color: '#1A1A1A'
                }}
              />
            </View>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={styles.pickerLabel}>Shift End</Text>
              <input 
                type="time"
                value={shiftEnd}
                onChange={(e) => setShiftEnd(e.target.value)}
                style={{
                  padding: 12,
                  borderRadius: 8,
                  border: '1px solid #CCCCCC',
                  width: '90%',
                  fontSize: 16,
                  backgroundColor: '#FFFFFF',
                  color: '#1A1A1A'
                }}
              />
            </View>
          </View>

          <ClayButton 
            title="Preview Slots"
            onPress={handlePreview}
            style={styles.previewButton}
          />

          {generatedSlots.length > 0 && (
            <View style={styles.previewContainer}>
              <Text style={styles.previewTitle}>Generated Slots</Text>
              <View style={styles.slotsGrid}>
                {generatedSlots.map((slot, idx) => (
                  <View key={idx} style={styles.slotChip}>
                    <Text style={styles.slotChipText}>
                      {slot.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).toUpperCase()}
                    </Text>
                  </View>
                ))}
              </View>

              <ClayButton 
                title="Publish Slots"
                onPress={handlePublish}
                loading={publishing}
                style={styles.publishButton}
              />
            </View>
          )}
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: theme.spacing.xl,
    paddingTop: 40,
    paddingBottom: 60,
  },
  title: {
    ...theme.typography.header,
    color: isDarkMode ? '#FFFFFF' : theme.colors.text,
    marginBottom: theme.spacing.xl,
  },
  form: {
    width: '100%',
    padding: theme.spacing.lg,
  },
  label: {
    ...theme.typography.title,
    fontSize: 14,
    color: isDarkMode ? '#FFFFFF' : theme.colors.text,
    marginBottom: theme.spacing.xs,
    marginTop: theme.spacing.sm,
  },
  dateButton: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background,
    marginBottom: theme.spacing.sm,
  },
  dateButtonText: {
    fontSize: theme.typography.body.fontSize,
    color: isDarkMode ? '#FFFFFF' : theme.colors.text,
  },
  iosDatePickerContainer: {
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.background,
    marginBottom: theme.spacing.md,
    overflow: 'hidden',
  },
  picker: {
    width: '100%',
    height: 50,
  },
  sectionHeader: {
    ...theme.typography.title,
    fontSize: 16,
    color: theme.colors.primary,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  shiftContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
  },
  pickerColumn: {
    flex: 1,
    alignItems: 'center',
  },
  pickerLabel: {
    ...theme.typography.body,
    fontWeight: '600',
    color: isDarkMode ? '#CCCCCC' : theme.colors.textLight,
    marginBottom: 8,
  },
  timePickerWrapper: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    width: '95%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  timePicker: {
    width: '100%',
    height: 120,
  },
  previewButton: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.border,
  },
  previewContainer: {
    marginTop: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  previewTitle: {
    ...theme.typography.title,
    fontSize: 15,
    color: isDarkMode ? '#FFFFFF' : theme.colors.text,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  slotChip: {
    width: '30%',
    backgroundColor: isDarkMode ? '#333333' : '#F5F5F5',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  slotChipText: {
    ...theme.typography.body,
    color: isDarkMode ? '#FFFFFF' : theme.colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  publishButton: {
    marginTop: theme.spacing.md,
  }
});
