import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import ClayButton from '../../components/ClayButton';
import ClayCard from '../../components/ClayCard';
import { db } from '../../config/firebase';
import { collection, addDoc, onSnapshot, query, where, deleteDoc, doc, getDocs } from 'firebase/firestore';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';

export default function DoctorSlotsAdminScreen({ route, navigation }) {
  const { doctor } = route.params;
  const { theme, isDarkMode } = useTheme();
  const styles = getStyles(theme, isDarkMode);

  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  const defaultStart = new Date();
  defaultStart.setHours(9, 0, 0, 0);
  const defaultEnd = new Date();
  defaultEnd.setHours(17, 0, 0, 0);

  const [shiftStart, setShiftStart] = useState(defaultStart);
  const [shiftEnd, setShiftEnd] = useState(defaultEnd);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [generatedSlots, setGeneratedSlots] = useState([]);
  
  const [addingSlot, setAddingSlot] = useState(false);
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(true);

  useEffect(() => {
    if (!doctor || !doctor.id) return;
    
    const simpleQ = query(collection(db, 'available_slots'), where('doctorId', '==', doctor.id));

    const unsubscribe = onSnapshot(simpleQ, (snapshot) => {
      const slotsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      slotsList.sort((a, b) => {
        if (a.date === b.date) {
          return a.time.localeCompare(b.time);
        }
        return a.date.localeCompare(b.date);
      });
      setSlots(slotsList);
      setLoadingSlots(false);
    }, (error) => {
      console.error("Error fetching slots: ", error);
      Alert.alert('Error', 'Failed to fetch existing slots.');
      setLoadingSlots(false);
    });

    return () => unsubscribe();
  }, [doctor]);

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) setDate(selectedDate);
  };

  const onStartChange = (event, selectedDate) => {
    setShowStartPicker(false);
    if (selectedDate) setShiftStart(selectedDate);
  };

  const onEndChange = (event, selectedDate) => {
    setShowEndPicker(false);
    if (selectedDate) setShiftEnd(selectedDate);
  };

  const handlePreviewSlots = () => {
    if (shiftEnd <= shiftStart) {
      Alert.alert('Invalid Time', 'Shift end must be after shift start.');
      return;
    }
    const tempSlots = [];
    let current = new Date(shiftStart);
    while (current < shiftEnd) {
      tempSlots.push(new Date(current));
      current.setMinutes(current.getMinutes() + 15);
    }
    setGeneratedSlots(tempSlots);
  };

  const handleAddSlots = async () => {
    if (generatedSlots.length === 0) {
      Alert.alert('Error', 'Please generate slots before publishing.');
      return;
    }

    setAddingSlot(true);
    try {
      const dateString = date.toISOString().split('T')[0];

      for (const slot of generatedSlots) {
        const startStr = slot.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).toUpperCase();
        const endSlot = new Date(slot.getTime() + 15 * 60000);
        const endStr = endSlot.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).toUpperCase();
        
        const slotData = {
          doctorId: doctor.id,
          doctorName: doctor.name,
          specialty: doctor.specialty,
          date: dateString,
          time: `${startStr} - ${endStr}`,
          isBooked: false,
          createdAt: new Date().toISOString()
        };
        await addDoc(collection(db, 'available_slots'), slotData);
      }

      Alert.alert('Success', `${generatedSlots.length} slots added successfully!`);
      setGeneratedSlots([]);
    } catch (error) {
      console.error('Error adding slots:', error);
      Alert.alert('Error', 'Failed to add slots. Please try again.');
    } finally {
      setAddingSlot(false);
    }
  };

  const handleDeleteDoctor = () => {
    Alert.alert(
      'Delete Doctor',
      `Are you sure you want to delete ${doctor.name}? This will also delete all their slots.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              const slotsQuery = query(collection(db, 'available_slots'), where('doctorId', '==', doctor.id));
              const slotsSnapshot = await getDocs(slotsQuery);
              const batchPromises = slotsSnapshot.docs.map(slotDoc => deleteDoc(doc(db, 'available_slots', slotDoc.id)));
              await Promise.all(batchPromises);

              await deleteDoc(doc(db, 'doctors', doctor.id));

              Alert.alert('Success', 'Doctor deleted successfully.');
              navigation.goBack();
            } catch (error) {
              console.error('Error deleting doctor:', error);
              Alert.alert('Error', 'Failed to delete doctor.');
            }
          }
        }
      ]
    );
  };

  const handleDeleteSlot = (slot) => {
    Alert.alert(
      'Delete Slot',
      `Are you sure you want to delete the slot at ${slot.time}?${slot.isBooked ? '\n\nWARNING: This slot is currently booked!' : ''}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'available_slots', slot.id));
              // Since we are using onSnapshot, the list will update automatically
            } catch (error) {
              console.error('Error deleting slot:', error);
              Alert.alert('Error', 'Failed to delete slot.');
            }
          }
        }
      ]
    );
  };

  const renderSlotItem = (item) => (
    <View key={item.id} style={styles.slotCard}>
      <View style={{ flex: 1 }}>
        <Text style={styles.slotDate}>{item.date}</Text>
        <Text style={styles.slotTime}>{item.time}</Text>
      </View>
      <View style={styles.slotActions}>
        <View style={[styles.statusBadge, { backgroundColor: item.isBooked ? theme.colors.error : theme.colors.success }]}>
          <Text style={styles.statusText}>{item.isBooked ? 'Booked' : 'Available'}</Text>
        </View>
        <TouchableOpacity onPress={() => handleDeleteSlot(item)} style={styles.slotDeleteButton}>
          <Ionicons name="trash-outline" size={20} color="#FF3B30" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <Text style={styles.title}>Manage Slots</Text>
            <TouchableOpacity onPress={handleDeleteDoctor} style={styles.deleteButton}>
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
          <ClayCard style={styles.doctorInfoCard}>
            <Text style={styles.doctorName}>{doctor.name}</Text>
            <Text style={styles.doctorSpecialty}>{doctor.specialty} • {doctor.experience} yrs exp</Text>
            <Text style={styles.doctorContact}>{doctor.contactNumber}</Text>
          </ClayCard>
        </View>

        <ClayCard style={styles.form}>
          <Text style={styles.sectionTitle}>Add New Slots</Text>
          
          <Text style={styles.label}>Select Date</Text>
          <TouchableOpacity onPress={() => setShowDatePicker(true)} style={[styles.pickerButton, { width: '100%' }]}>
            <Ionicons name="calendar-outline" size={20} color={theme.colors.textLight} />
            <Text style={styles.pickerButtonText}>{date.toLocaleDateString()}</Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display="default"
              onChange={onDateChange}
            />
          )}

          <Text style={styles.sectionHeader}>Define Shift Time</Text>
          <View style={styles.shiftContainer}>
            <View style={styles.pickerColumn}>
              <Text style={styles.pickerLabel}>Shift Start Time</Text>
              <TouchableOpacity onPress={() => setShowStartPicker(true)} style={styles.pickerButton}>
                <Ionicons name="time-outline" size={20} color={theme.colors.textLight} />
                <Text style={styles.pickerButtonText}>
                  {shiftStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </TouchableOpacity>
              {showStartPicker && (
                <DateTimePicker
                  value={shiftStart}
                  mode="time"
                  display="default"
                  onChange={onStartChange}
                />
              )}
            </View>

            <View style={styles.pickerColumn}>
              <Text style={styles.pickerLabel}>Shift End Time</Text>
              <TouchableOpacity onPress={() => setShowEndPicker(true)} style={styles.pickerButton}>
                <Ionicons name="time-outline" size={20} color={theme.colors.textLight} />
                <Text style={styles.pickerButtonText}>
                  {shiftEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </TouchableOpacity>
              {showEndPicker && (
                <DateTimePicker
                  value={shiftEnd}
                  mode="time"
                  display="default"
                  onChange={onEndChange}
                />
              )}
            </View>
          </View>

          <ClayButton 
            title="Preview Slots"
            onPress={handlePreviewSlots}
            style={styles.previewButton}
          />

          {generatedSlots.length > 0 && (
            <View style={styles.previewContainer}>
              <Text style={styles.previewTitle}>Generated 15-Minute Slots</Text>
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
                onPress={handleAddSlots}
                loading={addingSlot}
                style={styles.publishButton}
              />
            </View>
          )}
        </ClayCard>

        <View style={styles.slotsSection}>
          <Text style={styles.sectionTitle}>Existing Slots</Text>
          
          {loadingSlots ? (
            <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginTop: theme.spacing.md }} />
          ) : slots.length === 0 ? (
            <Text style={styles.emptyText}>No slots found for this doctor.</Text>
          ) : (
            <View style={styles.slotsListContainer}>
              {slots.map(slot => renderSlotItem(slot))}
            </View>
          )}
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const getStyles = (theme, isDarkMode) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    marginBottom: theme.spacing.xl,
  },
  scrollContent: {
    padding: theme.spacing.xl,
    paddingTop: 40,
    paddingBottom: 40,
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  title: {
    ...theme.typography.header,
    color: isDarkMode ? '#FFFFFF' : theme.colors.text,
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
  },
  deleteButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  doctorInfoCard: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
  },
  doctorName: {
    ...theme.typography.title,
    color: isDarkMode ? '#FFFFFF' : theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  doctorSpecialty: {
    ...theme.typography.body,
    color: isDarkMode ? '#FFFFFF' : theme.colors.textLight,
    marginBottom: theme.spacing.xs,
  },
  doctorContact: {
    ...theme.typography.body,
    color: isDarkMode ? '#FFFFFF' : theme.colors.textLight,
  },
  form: {
    width: '100%',
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    ...theme.typography.title,
    color: isDarkMode ? '#FFFFFF' : theme.colors.text,
    marginBottom: theme.spacing.lg,
  },
  label: {
    ...theme.typography.body,
    fontWeight: '600',
    color: isDarkMode ? '#FFFFFF' : theme.colors.text,
    marginBottom: theme.spacing.xs,
    marginTop: theme.spacing.sm,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    backgroundColor: isDarkMode ? '#2A2A2A' : '#F9F9F9',
    marginBottom: theme.spacing.sm,
    width: '95%',
  },
  pickerButtonText: {
    ...theme.typography.body,
    marginLeft: theme.spacing.sm,
    color: isDarkMode ? '#FFFFFF' : theme.colors.text,
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
  },
  slotsSection: {
    marginTop: theme.spacing.xs,
  },
  slotsListContainer: {
    gap: theme.spacing.sm,
  },
  slotCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  slotDate: {
    ...theme.typography.body,
    fontWeight: '600',
    color: isDarkMode ? '#FFFFFF' : theme.colors.text,
  },
  slotTime: {
    ...theme.typography.body,
    color: isDarkMode ? '#FFFFFF' : theme.colors.textLight,
    marginTop: 2,
  },
  slotActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: theme.spacing.md,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  slotDeleteButton: {
    padding: 4,
  },
  emptyText: {
    ...theme.typography.body,
    color: isDarkMode ? '#FFFFFF' : theme.colors.textLight,
    fontStyle: 'italic',
    marginTop: theme.spacing.md,
  }
});
