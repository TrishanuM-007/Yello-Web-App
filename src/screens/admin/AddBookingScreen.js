import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Modal, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import ClayButton from '../../components/ClayButton';
import ClayCard from '../../components/ClayCard';
import { db } from '../../config/firebase';
import { collection, onSnapshot, doc, updateDoc, addDoc, query, where, getDocs } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';

export default function AddBookingScreen({ navigation }) {
  const { theme, isDarkMode } = useTheme();
  const styles = getStyles(theme, isDarkMode);

  const [activeTab, setActiveTab] = useState('doctors'); // 'doctors' or 'tests'

  // Doctors State
  const [doctors, setDoctors] = useState([]);
  const [slots, setSlots] = useState([]);
  const [doctorSearch, setDoctorSearch] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('All');
  const [loadingDoctors, setLoadingDoctors] = useState(true);

  // Tests State
  const [tests, setTests] = useState([]);
  const [testSearch, setTestSearch] = useState('');
  const [loadingTests, setLoadingTests] = useState(true);

  // Shared Modals State
  const [patients, setPatients] = useState([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState(null);

  // Doctor Booking Modal
  const [isDoctorModalVisible, setIsDoctorModalVisible] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedSlotId, setSelectedSlotId] = useState(null);
  const [isBookingDoctor, setIsBookingDoctor] = useState(false);

  // Test Booking Modal
  const [isTestModalVisible, setIsTestModalVisible] = useState(false);
  const [selectedTest, setSelectedTest] = useState(null);
  const [manualDate, setManualDate] = useState('');
  const [manualTime, setManualTime] = useState('');
  const [isBookingTest, setIsBookingTest] = useState(false);

  useEffect(() => {
    // Fetch Doctors
    const unsubDoctors = onSnapshot(collection(db, 'doctors'), (snapshot) => {
      const dList = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setDoctors(dList);
      setLoadingDoctors(false);
    });

    // Fetch Slots
    const unsubSlots = onSnapshot(collection(db, 'available_slots'), (snapshot) => {
      const sList = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setSlots(sList);
    });

    // Fetch Tests
    const unsubTests = onSnapshot(collection(db, 'available_tests'), (snapshot) => {
      const tList = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setTests(tList);
      setLoadingTests(false);
    });

    // Fetch Patients for Modals
    const unsubPatients = onSnapshot(collection(db, 'patients'), (snapshot) => {
      const pList = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setPatients(pList);
    });

    return () => {
      unsubDoctors();
      unsubSlots();
      unsubTests();
      unsubPatients();
    };
  }, []);

  // -------------------------
  // DOCTORS LOGIC
  // -------------------------
  const mergedDoctors = useMemo(() => {
    let result = doctors.map(doc => {
      // Find all unbooked slots for this doctor
      const docSlots = slots.filter(s => s.doctorId === doc.id && s.isBooked === false);
      return { ...doc, availableSlots: docSlots, hasSlots: docSlots.length > 0 };
    });

    // Filter
    if (doctorSearch) {
      result = result.filter(d => d.name?.toLowerCase().includes(doctorSearch.toLowerCase()));
    }
    if (specialtyFilter !== 'All') {
      result = result.filter(d => d.specialty === specialtyFilter);
    }

    // Sort: Available first, then Unavailable
    result.sort((a, b) => {
      if (a.hasSlots && !b.hasSlots) return -1;
      if (!a.hasSlots && b.hasSlots) return 1;
      return a.name.localeCompare(b.name);
    });

    return result;
  }, [doctors, slots, doctorSearch, specialtyFilter]);

  const specialties = ['All', ...Array.from(new Set(doctors.map(d => d.specialty).filter(Boolean)))];

  const handleOpenDoctorModal = (doctor) => {
    setSelectedDoctor(doctor);
    setPatientSearch('');
    setSelectedPatientId(null);
    setSelectedSlotId(null);
    setIsDoctorModalVisible(true);
  };

  const confirmDoctorBooking = async () => {
    if (!selectedPatientId || !selectedSlotId) {
      window.alert('Error: Please select a patient and an available slot.');
      return;
    }

    setIsBookingDoctor(true);
    try {
      const slotRef = doc(db, 'available_slots', selectedSlotId);
      await updateDoc(slotRef, {
        isBooked: true,
        status: 'confirmed',
        patientId: selectedPatientId,
        bookedAt: new Date().toISOString()
      });
      window.alert('Success: Doctor appointment booked!');
      setIsDoctorModalVisible(false);
    } catch (error) {
      console.error(error);
      window.alert('Error: Failed to book appointment.');
    } finally {
      setIsBookingDoctor(false);
    }
  };

  // -------------------------
  // TESTS LOGIC
  // -------------------------
  const filteredTests = useMemo(() => {
    let result = tests;
    if (testSearch) {
      result = result.filter(t => t.testName?.toLowerCase().includes(testSearch.toLowerCase()));
    }
    return result;
  }, [tests, testSearch]);

  const handleOpenTestModal = (test) => {
    setSelectedTest(test);
    setPatientSearch('');
    setSelectedPatientId(null);
    setManualDate('');
    setManualTime('');
    setIsTestModalVisible(true);
  };

  const confirmTestBooking = async () => {
    if (!selectedPatientId || !manualDate || !manualTime) {
      window.alert('Error: Please select a patient, date, and time.');
      return;
    }

    let formattedTime = manualTime;
    if (Platform.OS === 'web' && manualTime.includes(':')) {
      const [h, m] = manualTime.split(':');
      let hours = parseInt(h, 10);
      const suffix = hours >= 12 ? 'PM' : 'AM';
      if (hours === 0) hours = 12;
      if (hours > 12) hours -= 12;
      formattedTime = `${hours}:${m} ${suffix}`;
    }

    setIsBookingTest(true);
    try {
      await addDoc(collection(db, 'test_requests'), {
        testId: selectedTest.id,
        testName: selectedTest.testName || selectedTest.name,
        patientId: selectedPatientId,
        status: 'confirmed',
        requestedDate: manualDate,
        requestedTime: formattedTime,
        createdAt: new Date().toISOString()
      });
      window.alert('Success: Test booked successfully!');
      setIsTestModalVisible(false);
    } catch (error) {
      console.error(error);
      window.alert('Error: Failed to book test.');
    } finally {
      setIsBookingTest(false);
    }
  };

  // -------------------------
  // SHARED MODAL HELPERS
  // -------------------------
  const filteredPatients = useMemo(() => {
    if (!patientSearch) return [];
    return patients.filter(p => 
      p.name?.toLowerCase().includes(patientSearch.toLowerCase()) || 
      p.phoneNumber?.includes(patientSearch)
    ).slice(0, 5); // Max 5 results for simplicity
  }, [patients, patientSearch]);

  // -------------------------
  // RENDERERS
  // -------------------------
  const renderDoctorItem = ({ item }) => {
    const isAvailable = item.hasSlots;
    return (
      <TouchableOpacity onPress={() => isAvailable && handleOpenDoctorModal(item)} activeOpacity={isAvailable ? 0.7 : 1}>
        <ClayCard style={[styles.card, !isAvailable && styles.cardDisabled]}>
          <View style={styles.cardRow}>
            {item.imageUrl ? (
              <Image source={{ uri: item.imageUrl }} style={[styles.docImage, !isAvailable && styles.imageDisabled]} />
            ) : (
              <View style={[styles.docAvatarPlaceholder, !isAvailable && styles.imageDisabled]}>
                <Ionicons name="person" size={24} color="#FFF" />
              </View>
            )}
            <View style={styles.cardInfo}>
              <Text style={[styles.cardTitle, !isAvailable && styles.textDisabled]}>{item.name}</Text>
              <Text style={styles.cardSubtitle}>{item.specialty}</Text>
              <Text style={styles.cardDesc} numberOfLines={2}>{item.description || 'No description available.'}</Text>
              
              <Text style={[styles.availabilityText, isAvailable ? styles.availableGreen : styles.unavailableRed]}>
                {isAvailable ? `${item.availableSlots.length} Slots Available` : 'No Slots Available'}
              </Text>
            </View>
          </View>
        </ClayCard>
      </TouchableOpacity>
    );
  };

  const renderTestItem = ({ item }) => (
    <TouchableOpacity onPress={() => handleOpenTestModal(item)}>
      <ClayCard style={styles.card}>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle}>{item.testName || item.name}</Text>
          <Text style={styles.testPrice}>₹{item.price}</Text>
          {item.description && (
            <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
          )}
        </View>
      </ClayCard>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'doctors' && styles.activeTab]}
          onPress={() => setActiveTab('doctors')}
        >
          <Text style={[styles.tabText, activeTab === 'doctors' && styles.activeTabText]}>Doctor Appointments</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'tests' && styles.activeTab]}
          onPress={() => setActiveTab('tests')}
        >
          <Text style={[styles.tabText, activeTab === 'tests' && styles.activeTabText]}>Schedule Test</Text>
        </TouchableOpacity>
      </View>

      {/* DOCTORS TAB */}
      {activeTab === 'doctors' && (
        <>
          <View style={styles.filterRow}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search Doctors..."
              placeholderTextColor="#666666"
              value={doctorSearch}
              onChangeText={setDoctorSearch}
            />
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={specialtyFilter}
                onValueChange={setSpecialtyFilter}
                style={styles.picker}
              >
                {specialties.map(spec => (
                  <Picker.Item key={spec} label={spec} value={spec} color="#000000" />
                ))}
              </Picker>
            </View>
          </View>

          {loadingDoctors ? (
            <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 40 }} />
          ) : mergedDoctors.length === 0 ? (
            <Text style={styles.emptyText}>No doctors found.</Text>
          ) : (
            <FlatList
              data={mergedDoctors}
              keyExtractor={item => item.id}
              renderItem={renderDoctorItem}
              contentContainerStyle={{ paddingBottom: 40 }}
            />
          )}
        </>
      )}

      {/* TESTS TAB */}
      {activeTab === 'tests' && (
        <>
          <View style={styles.filterRow}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search Tests..."
              placeholderTextColor="#666666"
              value={testSearch}
              onChangeText={setTestSearch}
            />
          </View>

          {loadingTests ? (
            <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 40 }} />
          ) : filteredTests.length === 0 ? (
            <Text style={styles.emptyText}>No tests found.</Text>
          ) : (
            <FlatList
              data={filteredTests}
              keyExtractor={item => item.id}
              renderItem={renderTestItem}
              contentContainerStyle={{ paddingBottom: 40 }}
            />
          )}
        </>
      )}

      {/* DOCTOR BOOKING MODAL */}
      <Modal visible={isDoctorModalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Book Doctor Appointment</Text>
            {selectedDoctor && <Text style={styles.modalSubtitle}>Dr. {selectedDoctor.name}</Text>}

            <Text style={styles.label}>1. Select Patient</Text>
            <TextInput
              style={styles.input}
              placeholder="Type Name or Phone..."
              placeholderTextColor="#666666"
              value={patientSearch}
              onChangeText={(text) => {
                setPatientSearch(text);
                setSelectedPatientId(null);
              }}
            />
            {filteredPatients.length > 0 && !selectedPatientId && (
              <View style={styles.dropdownContainer}>
                {filteredPatients.map(p => (
                  <TouchableOpacity key={p.id} style={styles.dropdownItem} onPress={() => {
                    setSelectedPatientId(p.id);
                    setPatientSearch(`${p.name} (${p.phoneNumber})`);
                  }}>
                    <Text style={styles.dropdownItemText}>{p.name} - {p.phoneNumber}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={styles.label}>2. Select Available Slot</Text>
            <View style={styles.pickerWrapperModal}>
              <Picker
                selectedValue={selectedSlotId}
                onValueChange={setSelectedSlotId}
                style={styles.picker}
              >
                <Picker.Item label="-- Choose Slot --" value={null} color="#000000" />
                {selectedDoctor?.availableSlots.map(slot => (
                  <Picker.Item key={slot.id} label={`${slot.date} at ${slot.time}`} value={slot.id} color="#000000" />
                ))}
              </Picker>
            </View>

            <ClayButton title="Confirm Booking" onPress={confirmDoctorBooking} loading={isBookingDoctor} style={{ marginTop: 20 }} />
            <ClayButton title="Cancel" variant="secondary" onPress={() => setIsDoctorModalVisible(false)} style={{ marginTop: 10 }} />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* TEST BOOKING MODAL */}
      <Modal visible={isTestModalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Schedule Lab Test</Text>
            {selectedTest && <Text style={styles.modalSubtitle}>{selectedTest.testName || selectedTest.name}</Text>}

            <Text style={styles.label}>1. Select Patient</Text>
            <TextInput
              style={styles.input}
              placeholder="Type Name or Phone..."
              placeholderTextColor="#666666"
              value={patientSearch}
              onChangeText={(text) => {
                setPatientSearch(text);
                setSelectedPatientId(null);
              }}
            />
            {filteredPatients.length > 0 && !selectedPatientId && (
              <View style={styles.dropdownContainer}>
                {filteredPatients.map(p => (
                  <TouchableOpacity key={p.id} style={styles.dropdownItem} onPress={() => {
                    setSelectedPatientId(p.id);
                    setPatientSearch(`${p.name} (${p.phoneNumber})`);
                  }}>
                    <Text style={styles.dropdownItemText}>{p.name} - {p.phoneNumber}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={styles.label}>2. Date</Text>
            {Platform.OS === 'web' ? (
              <input 
                type="date"
                value={manualDate}
                onChange={(e) => setManualDate(e.target.value)}
                style={{
                  border: '1px solid #CCCCCC',
                  borderRadius: '8px',
                  padding: '12px',
                  backgroundColor: '#FFFFFF',
                  color: '#000000',
                  fontSize: '16px',
                  width: '100%',
                  height: '48px',
                }}
              />
            ) : (
              <TextInput
                style={styles.input}
                placeholder="e.g. 2026-06-20"
                placeholderTextColor="#666666"
                value={manualDate}
                onChangeText={setManualDate}
              />
            )}

            <Text style={styles.label}>3. Time</Text>
            {Platform.OS === 'web' ? (
              <input 
                type="time"
                value={manualTime}
                onChange={(e) => setManualTime(e.target.value)}
                style={{
                  border: '1px solid #CCCCCC',
                  borderRadius: '8px',
                  padding: '12px',
                  backgroundColor: '#FFFFFF',
                  color: '#000000',
                  fontSize: '16px',
                  width: '100%',
                  height: '48px',
                  marginTop: '8px'
                }}
              />
            ) : (
              <TextInput
                style={styles.input}
                placeholder="e.g. 10:30 AM"
                placeholderTextColor="#666666"
                value={manualTime}
                onChangeText={setManualTime}
              />
            )}

            <ClayButton title="Confirm Booking" onPress={confirmTestBooking} loading={isBookingTest} style={{ marginTop: 20 }} />
            <ClayButton title="Cancel" variant="secondary" onPress={() => setIsTestModalVisible(false)} style={{ marginTop: 10 }} />
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </View>
  );
}

const getStyles = (theme, isDarkMode) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.lg,
  },
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
  filterRow: {
    flexDirection: 'row',
    marginBottom: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  searchInput: {
    flex: 2,
    backgroundColor: '#FFFFFF',
    color: '#000000',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  pickerWrapper: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
    height: 48,
    justifyContent: 'center',
  },
  pickerWrapperModal: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
    height: 48,
    justifyContent: 'center',
  },
  picker: {
    width: '100%',
    height: '100%',
    color: '#000000',
    backgroundColor: '#FFFFFF',
  },
  emptyText: {
    color: theme.colors.textLight,
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
  },
  // Card Styles
  card: {
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
  },
  cardDisabled: {
    opacity: 0.6,
    backgroundColor: isDarkMode ? '#222' : '#F5F5F5',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  docImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: theme.spacing.md,
  },
  docAvatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.primary,
    marginRight: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageDisabled: {
    opacity: 0.5,
    tintColor: 'gray', // For actual image, might not work perfectly but opacity helps
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    ...theme.typography.title,
    fontSize: 18,
    color: isDarkMode ? '#FFFFFF' : theme.colors.text,
  },
  textDisabled: {
    color: theme.colors.textLight,
  },
  cardSubtitle: {
    ...theme.typography.body,
    fontSize: 14,
    color: theme.colors.primary,
    marginTop: 2,
  },
  cardDesc: {
    ...theme.typography.body,
    fontSize: 13,
    color: theme.colors.textLight,
    marginTop: 4,
  },
  availabilityText: {
    ...theme.typography.title,
    fontSize: 13,
    marginTop: 8,
  },
  availableGreen: {
    color: '#34C759',
  },
  unavailableRed: {
    color: '#FF3B30',
  },
  testPrice: {
    ...theme.typography.title,
    color: theme.colors.primary,
    marginTop: 4,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    maxHeight: '90%',
  },
  modalTitle: {
    ...theme.typography.header,
    color: theme.colors.text,
    textAlign: 'center',
  },
  modalSubtitle: {
    ...theme.typography.title,
    color: theme.colors.primary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
    marginTop: 4,
  },
  label: {
    ...theme.typography.title,
    fontSize: 14,
    color: theme.colors.text,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    backgroundColor: '#FFFFFF',
    color: '#000000',
    height: 48,
  },
  dropdownContainer: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface,
    marginTop: 4,
    maxHeight: 150,
  },
  dropdownItem: {
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  dropdownItemText: {
    ...theme.typography.body,
    color: theme.colors.text,
  }
});
