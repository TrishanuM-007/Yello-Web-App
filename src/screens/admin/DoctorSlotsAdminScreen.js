import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import ClayButton from '../../components/ClayButton';
import ClayCard from '../../components/ClayCard';
import { db } from '../../config/firebase';
import { collection, addDoc, onSnapshot, query, where, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';

export default function DoctorSlotsAdminScreen({ route, navigation }) {
  const { doctor } = route.params;
  const { theme, isDarkMode } = useTheme();
  const styles = getStyles(theme, isDarkMode);

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [shiftStart, setShiftStart] = useState('09:00');
  const [shiftEnd, setShiftEnd] = useState('17:00');
  const [generatedSlots, setGeneratedSlots] = useState([]);
  
  const [addingSlot, setAddingSlot] = useState(false);
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(true);

  // Batch Deletion State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedSlotIds, setSelectedSlotIds] = useState([]);

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
      window.alert('Error: Failed to fetch existing slots.');
      setLoadingSlots(false);
    });

    return () => unsubscribe();
  }, [doctor]);

  const handlePreviewSlots = () => {
    const startDateTime = new Date(`${date}T${shiftStart}:00`);
    const endDateTime = new Date(`${date}T${shiftEnd}:00`);

    if (endDateTime <= startDateTime) {
      window.alert('Invalid Time: Shift end must be after shift start.');
      return;
    }
    const tempSlots = [];
    let current = startDateTime;
    while (current < endDateTime) {
      tempSlots.push(new Date(current));
      current.setMinutes(current.getMinutes() + 15);
    }
    setGeneratedSlots(tempSlots);
  };

  const handleAddSlots = async () => {
    if (generatedSlots.length === 0) {
      window.alert('Error: Please generate slots before publishing.');
      return;
    }

    setAddingSlot(true);
    try {
      const dateString = date;

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

      window.alert(`Success: ${generatedSlots.length} slots added successfully!`);
      setGeneratedSlots([]);
    } catch (error) {
      console.error('Error adding slots:', error);
      window.alert('Error: Failed to add slots. Please try again.');
    } finally {
      setAddingSlot(false);
    }
  };

  const handleDeleteDoctor = () => {
    if (window.confirm(`Delete Doctor: Are you sure you want to delete ${doctor.name}? This will also delete all their slots.`)) {
      (async () => {
        try {
          const slotsQuery = query(collection(db, 'available_slots'), where('doctorId', '==', doctor.id));
          const slotsSnapshot = await getDocs(slotsQuery);
          const batchPromises = slotsSnapshot.docs.map(slotDoc => deleteDoc(doc(db, 'available_slots', slotDoc.id)));
          await Promise.all(batchPromises);

          await deleteDoc(doc(db, 'doctors', doctor.id));

          window.alert('Success: Doctor deleted successfully.');
          navigation.goBack();
        } catch (error) {
          console.error('Error deleting doctor:', error);
          window.alert('Error: Failed to delete doctor.');
        }
      })();
    }
  };

  const handleBatchDeleteSlots = async () => {
    if (selectedSlotIds.length === 0) return;

    const bookedSelected = slots.filter(s => selectedSlotIds.includes(s.id) && s.isBooked);
    let warningMsg = `Are you sure you want to delete ${selectedSlotIds.length} slot(s)?`;
    if (bookedSelected.length > 0) {
      warningMsg += `\n\nWARNING: ${bookedSelected.length} of these slots are currently BOOKED!`;
    }

    if (window.confirm(warningMsg)) {
      setLoadingSlots(true);
      try {
        const batchPromises = selectedSlotIds.map(id => deleteDoc(doc(db, 'available_slots', id)));
        await Promise.all(batchPromises);
        window.alert('Success: Slots deleted successfully.');
        setIsSelectionMode(false);
        setSelectedSlotIds([]);
      } catch (error) {
        console.error('Error batch deleting slots:', error);
        window.alert('Error: Failed to delete some slots.');
      } finally {
        setLoadingSlots(false);
      }
    }
  };

  const renderSlotItem = (item) => {
    const isSelected = selectedSlotIds.includes(item.id);

    const handleCardPress = () => {
      if (!isSelectionMode) return;
      if (isSelected) {
        setSelectedSlotIds(prev => prev.filter(id => id !== item.id));
      } else {
        setSelectedSlotIds(prev => [...prev, item.id]);
      }
    };

    return (
      <TouchableOpacity key={item.id} onPress={handleCardPress} activeOpacity={isSelectionMode ? 0.7 : 1}>
        <View style={[styles.slotCard, isSelected && { borderColor: theme.colors.primary, borderWidth: 2 }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.slotDate}>{item.date}</Text>
            <Text style={styles.slotTime}>{item.time}</Text>
          </View>
          <View style={styles.slotActions}>
            <View style={[styles.statusBadge, { backgroundColor: item.isBooked ? theme.colors.error : theme.colors.success }]}>
              <Text style={styles.statusText}>{item.isBooked ? 'Booked' : 'Available'}</Text>
            </View>
            {isSelectionMode && (
              <Ionicons 
                name={isSelected ? "checkbox" : "square-outline"} 
                size={24} 
                color={isSelected ? theme.colors.primary : theme.colors.textLight} 
                style={{ marginLeft: 8 }}
              />
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

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
              <Text style={styles.pickerLabel}>Shift Start Time</Text>
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
              <Text style={styles.pickerLabel}>Shift End Time</Text>
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
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.lg }}>
            <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Existing Slots</Text>
            
            <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
              {isSelectionMode && selectedSlotIds.length > 0 && (
                <TouchableOpacity
                  style={{ backgroundColor: '#FF3B30', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, justifyContent: 'center' }}
                  onPress={handleBatchDeleteSlots}
                >
                  <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Delete ({selectedSlotIds.length})</Text>
                </TouchableOpacity>
              )}
              <ClayButton
                title={isSelectionMode ? "Cancel Select" : "Select Slots"}
                variant="secondary"
                onPress={() => {
                  setIsSelectionMode(!isSelectionMode);
                  setSelectedSlotIds([]);
                }}
              />
            </View>
          </View>
          
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
