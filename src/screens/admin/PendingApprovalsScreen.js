import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert, RefreshControl, Modal, TouchableOpacity, ScrollView, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../../context/ThemeContext';
import ClayCard from '../../components/ClayCard';
import ClayButton from '../../components/ClayButton';
import { db } from '../../config/firebase';
import { collection, query, where, onSnapshot, doc, getDoc, updateDoc, getDocs } from 'firebase/firestore';

export default function PendingApprovalsScreen() {
  const { theme, isDarkMode } = useTheme();
  const styles = getStyles(theme, isDarkMode);

  const [activeTab, setActiveTab] = useState('appointments'); // 'appointments' or 'tests'

  // Appointments State
  const [pendingSlots, setPendingSlots] = useState([]);
  const [loadingAppointments, setLoadingAppointments] = useState(true);
  const [confirmingId, setConfirmingId] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [activeRequest, setActiveRequest] = useState(null);
  const [fetchedSlots, setFetchedSlots] = useState([]);
  const [fetchingSlots, setFetchingSlots] = useState(false);
  const [selectedSlots, setSelectedSlots] = useState([]);

  // Lab Tests State
  const [pendingTests, setPendingTests] = useState([]);
  const [loadingTests, setLoadingTests] = useState(true);
  const [confirmingTestId, setConfirmingTestId] = useState(null);
  const [testTimePickerVisible, setTestTimePickerVisible] = useState(false);
  const [selectedTestTime, setSelectedTestTime] = useState(new Date());
  const [activeTestRequest, setActiveTestRequest] = useState(null);

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1200);
  };

  // ------------------------------------------
  // APPOINTMENTS LOGIC
  // ------------------------------------------
  useEffect(() => {
    const q = query(collection(db, 'booking_requests'), where('status', '==', 'pending'));
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      try {
        const slotsWithDetails = await Promise.all(snapshot.docs.map(async (slotDoc) => {
          const slotData = slotDoc.data();
          
          let patientName = 'Unknown Patient';
          let patientPhone = 'N/A';
          let doctorName = 'Unknown Doctor';

          if (slotData.patientId) {
            const pRef = doc(db, 'patients', slotData.patientId);
            const pSnap = await getDoc(pRef);
            if (pSnap.exists()) {
              patientName = pSnap.data().name || 'Unknown Patient';
              patientPhone = pSnap.data().phoneNumber || 'N/A';
            }
          }

          if (slotData.doctorId) {
            const dRef = doc(db, 'doctors', slotData.doctorId);
            const dSnap = await getDoc(dRef);
            if (dSnap.exists()) {
              doctorName = dSnap.data().name || 'Unknown Doctor';
            }
          }

          return {
            id: slotDoc.id,
            ...slotData,
            patientName,
            patientPhone,
            doctorName
          };
        }));
        
        slotsWithDetails.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        setPendingSlots(slotsWithDetails);
        setLoadingAppointments(false);
      } catch (error) {
        console.error("Error populating pending slots:", error);
        setLoadingAppointments(false);
      }
    }, (error) => {
      console.error("Error fetching pending slots:", error);
      setLoadingAppointments(false);
    });

    return () => unsubscribe();
  }, []);

  const openAssignModal = async (item) => {
    setActiveRequest(item);
    setSelectedSlots([]);
    setFetchedSlots([]);
    setIsModalVisible(true);
    setFetchingSlots(true);
    
    try {
      const q = query(
        collection(db, 'available_slots'), 
        where('doctorId', '==', item.doctorId),
        where('isBooked', '==', false)
      );
      const snapshot = await getDocs(q);
      const slotsList = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      
      slotsList.sort((a, b) => {
        if (a.date === b.date) {
          return a.time.localeCompare(b.time);
        }
        return a.date.localeCompare(b.date);
      });
      
      setFetchedSlots(slotsList);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to fetch slots.');
    } finally {
      setFetchingSlots(false);
    }
  };

  const toggleSlotSelection = (slot) => {
    if (selectedSlots.find(s => s.id === slot.id)) {
      setSelectedSlots(selectedSlots.filter(s => s.id !== slot.id));
    } else {
      setSelectedSlots([...selectedSlots, slot]);
    }
  };

  const confirmBooking = async () => {
    if (selectedSlots.length === 0) {
      Alert.alert('Selection Required', 'Please select at least one slot to assign.');
      return;
    }
    
    setConfirmingId(activeRequest.id);
    setIsModalVisible(false);
    
    try {
      for (const slot of selectedSlots) {
        const slotRef = doc(db, 'available_slots', slot.id);
        await updateDoc(slotRef, {
          isBooked: true,
          patientId: activeRequest.patientId,
          status: 'confirmed'
        });
      }
      
      const assignedTimeStr = selectedSlots.map(s => `${s.date} ${s.time}`).join(', ');
      
      const reqRef = doc(db, 'booking_requests', activeRequest.id);
      await updateDoc(reqRef, {
        status: 'confirmed',
        assignedTime: assignedTimeStr,
        confirmedAt: new Date().toISOString()
      });
      
      Alert.alert('Success', 'Booking confirmed and slots assigned!');
    } catch (error) {
      console.error('Error confirming booking:', error);
      Alert.alert('Error', 'Failed to confirm booking.');
    } finally {
      setConfirmingId(null);
      setActiveRequest(null);
    }
  };

  // ------------------------------------------
  // LAB TESTS LOGIC
  // ------------------------------------------
  useEffect(() => {
    const q = query(collection(db, 'test_requests'), where('status', '==', 'pending'));
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      try {
        const testsWithDetails = await Promise.all(snapshot.docs.map(async (docSnap) => {
          const testData = docSnap.data();
          let patientName = 'Unknown Patient';
          let patientPhone = 'N/A';

          if (testData.patientId) {
            const pRef = doc(db, 'patients', testData.patientId);
            const pSnap = await getDoc(pRef);
            if (pSnap.exists()) {
              patientName = pSnap.data().name || 'Unknown Patient';
              patientPhone = pSnap.data().phoneNumber || 'N/A';
            }
          }

          return {
            id: docSnap.id,
            ...testData,
            patientName,
            patientPhone
          };
        }));
        
        testsWithDetails.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setPendingTests(testsWithDetails);
        setLoadingTests(false);
      } catch (error) {
        console.error("Error populating pending tests:", error);
        setLoadingTests(false);
      }
    }, (error) => {
      console.error("Error fetching pending tests:", error);
      setLoadingTests(false);
    });

    return () => unsubscribe();
  }, []);

  const openTestTimePicker = (testRequest) => {
    setActiveTestRequest(testRequest);
    setSelectedTestTime(new Date());
    setTestTimePickerVisible(true);
  };

  const onTestTimeChange = async (event, selectedTime) => {
    setTestTimePickerVisible(false);
    if (!selectedTime || !activeTestRequest) return;
    
    setConfirmingTestId(activeTestRequest.id);
    try {
      const formattedTime = selectedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const reqRef = doc(db, 'test_requests', activeTestRequest.id);
      await updateDoc(reqRef, {
        status: 'confirmed',
        requestedTime: formattedTime,
        confirmedAt: new Date().toISOString()
      });
      Alert.alert('Success', `Test booking confirmed at ${formattedTime}!`);
    } catch (error) {
      console.error('Error confirming test booking:', error);
      Alert.alert('Error', 'Failed to confirm booking.');
    } finally {
      setConfirmingTestId(null);
      setActiveTestRequest(null);
    }
  };

  // ------------------------------------------
  // RENDER HELPERS
  // ------------------------------------------
  const renderAppointmentItem = ({ item }) => (
    <ClayCard style={styles.card}>
      <Text style={styles.cardTitle}>Dr. {item.doctorName}</Text>
      <View style={styles.detailsRow}>
        <Text style={styles.detailLabel}>Requested At:</Text>
        <Text style={styles.detailValue}>{new Date(item.timestamp).toLocaleString()}</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.detailsRow}>
        <Text style={styles.detailLabel}>Patient:</Text>
        <Text style={styles.detailValue}>{item.patientName}</Text>
      </View>
      <View style={styles.detailsRow}>
        <Text style={styles.detailLabel}>Phone:</Text>
        <Text style={styles.detailValue}>{item.patientPhone}</Text>
      </View>
      
      <ClayButton 
        title="Assign Time"
        onPress={() => openAssignModal(item)}
        loading={confirmingId === item.id}
        style={styles.confirmButton}
      />
    </ClayCard>
  );

  const renderTestItem = ({ item }) => (
    <ClayCard style={styles.card}>
      <Text style={styles.cardTitle}>{item.testName}</Text>
      <View style={styles.detailsRow}>
        <Text style={styles.detailLabel}>Requested Time:</Text>
        <Text style={styles.detailValue}>{item.requestedDate} at {item.requestedTime}</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.detailsRow}>
        <Text style={styles.detailLabel}>Patient:</Text>
        <Text style={styles.detailValue}>{item.patientName}</Text>
      </View>
      <View style={styles.detailsRow}>
        <Text style={styles.detailLabel}>Phone:</Text>
        <Text style={styles.detailValue}>{item.patientPhone}</Text>
      </View>
      
      <ClayButton 
        title="Confirm Booking"
        onPress={() => openTestTimePicker(item)}
        loading={confirmingTestId === item.id}
        style={styles.confirmButton}
      />
    </ClayCard>
  );

  const renderContent = () => {
    if (activeTab === 'appointments') {
      if (loadingAppointments) {
        return (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        );
      }
      if (pendingSlots.length === 0) {
        return (
          <View style={styles.centerContainer}>
            <Text style={styles.emptyText}>No pending appointment requests.</Text>
          </View>
        );
      }
      return (
        <FlatList
          data={pendingSlots}
          keyExtractor={(item) => item.id}
          renderItem={renderAppointmentItem}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} tintColor={theme.colors.primary} />}
        />
      );
    } else {
      if (loadingTests) {
        return (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        );
      }
      if (pendingTests.length === 0) {
        return (
          <View style={styles.centerContainer}>
            <Text style={styles.emptyText}>No pending test requests.</Text>
          </View>
        );
      }
      return (
        <FlatList
          data={pendingTests}
          keyExtractor={(item) => item.id}
          renderItem={renderTestItem}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} tintColor={theme.colors.primary} />}
        />
      );
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Tab UI */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'appointments' && styles.activeTab]}
          onPress={() => setActiveTab('appointments')}
        >
          <Text style={[styles.tabText, activeTab === 'appointments' && styles.activeTabText]}>Appointments</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'tests' && styles.activeTab]}
          onPress={() => setActiveTab('tests')}
        >
          <Text style={[styles.tabText, activeTab === 'tests' && styles.activeTabText]}>Lab Tests</Text>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      {renderContent()}

      {/* Appointment Assign Modal */}
      <Modal visible={isModalVisible} animationType="slide" transparent={true} onRequestClose={() => setIsModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Available Slots</Text>
            
            {fetchingSlots ? (
              <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginVertical: 20 }} />
            ) : fetchedSlots.length === 0 ? (
              <Text style={styles.emptySlotsText}>No slots published for this doctor.</Text>
            ) : (
              <ScrollView style={styles.slotsScroll} contentContainerStyle={styles.slotsGrid}>
                {fetchedSlots.map((slot) => {
                  const isSelected = selectedSlots.some(s => s.id === slot.id);
                  return (
                    <TouchableOpacity 
                      key={slot.id} 
                      style={[styles.slotChip, isSelected && styles.slotChipSelected]}
                      onPress={() => toggleSlotSelection(slot)}
                    >
                      <Text style={[styles.slotChipText, isSelected && styles.slotChipTextSelected]}>
                        {slot.date}
                        {'\n'}
                        {slot.time}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            <ClayButton 
              title={`Confirm ${selectedSlots.length > 0 ? `(${selectedSlots.length})` : ''}`} 
              onPress={confirmBooking} 
              style={styles.generateButton}
              disabled={selectedSlots.length === 0}
            />
            
            <ClayButton 
              title="Cancel" 
              onPress={() => setIsModalVisible(false)} 
              style={styles.cancelButton} 
            />
          </View>
        </View>
      </Modal>

      {/* Test Time Assign Picker */}
      {testTimePickerVisible && (
        <DateTimePicker
          value={selectedTestTime}
          mode="time"
          display="default"
          onChange={onTestTimeChange}
        />
      )}
    </View>
  );
}

const getStyles = (theme, isDarkMode) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.lg,
  },
  // Tab UI Styles
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: isDarkMode ? '#1A1A1A' : '#EEEEEE',
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.xl,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.md - 4,
  },
  activeTab: {
    backgroundColor: theme.colors.primary,
  },
  tabText: {
    ...theme.typography.title,
    fontSize: 14,
    color: isDarkMode ? '#AAAAAA' : theme.colors.textLight,
  },
  activeTabText: {
    color: '#1A1A1A',
  },
  // Rest of original styles...
  listContainer: {
    paddingBottom: theme.spacing.xl,
  },
  card: {
    marginBottom: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  cardTitle: {
    ...theme.typography.title,
    color: isDarkMode ? '#FFFFFF' : theme.colors.text,
    fontSize: 20,
    marginBottom: theme.spacing.md,
  },
  detailsRow: {
    flexDirection: 'row',
    marginBottom: theme.spacing.sm,
  },
  detailLabel: {
    ...theme.typography.body,
    fontWeight: '600',
    color: isDarkMode ? '#CCCCCC' : theme.colors.textLight,
    width: 130, // Slightly widened to accommodate "Requested Time"
  },
  detailValue: {
    ...theme.typography.body,
    color: isDarkMode ? '#FFFFFF' : theme.colors.text,
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: isDarkMode ? '#333333' : '#EEEEEE',
    marginVertical: theme.spacing.md,
  },
  confirmButton: {
    marginTop: theme.spacing.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    borderRadius: 20,
    padding: theme.spacing.xl,
    maxHeight: '90%',
  },
  modalTitle: {
    ...theme.typography.title,
    color: isDarkMode ? '#FFFFFF' : theme.colors.text,
    fontSize: 22,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },
  emptySlotsText: {
    ...theme.typography.body,
    color: theme.colors.textLight,
    textAlign: 'center',
    marginVertical: theme.spacing.lg,
  },
  generateButton: {
    marginBottom: theme.spacing.md,
  },
  slotsScroll: {
    flexGrow: 0,
    maxHeight: 300,
    marginBottom: theme.spacing.lg,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  slotChip: {
    width: '48%',
    backgroundColor: isDarkMode ? '#333333' : '#F5F5F5',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  slotChipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  slotChipText: {
    ...theme.typography.body,
    color: isDarkMode ? '#FFFFFF' : theme.colors.text,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  slotChipTextSelected: {
    color: '#1A1A1A',
  },
  cancelButton: {
    backgroundColor: theme.colors.border,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.textLight,
    fontSize: 16,
  }
});
