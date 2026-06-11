import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, ActivityIndicator, Animated, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import ClayCard from '../components/ClayCard';
import ClayButton from '../components/ClayButton';
import { auth, db } from '../config/firebase';
import { collection, onSnapshot, addDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';

export default function BookTestScreen() {
  const { theme, isDarkMode } = useTheme();
  const styles = getStyles(theme, isDarkMode);

  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [addressModalVisible, setAddressModalVisible] = useState(false);
  const [selectedTest, setSelectedTest] = useState(null);

  // Date State
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Patient Address State
  const [patientAddress, setPatientAddress] = useState('');
  const [patientArea, setPatientArea] = useState('');
  const [patientPostcode, setPatientPostcode] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Toast State
  const [toastVisible, setToastVisible] = useState(false);
  const toastOpacity = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      const fetchAddress = async () => {
        if (auth.currentUser) {
          try {
            const docRef = doc(db, 'patients', auth.currentUser.uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              const data = docSnap.data();
              if (data.address) setPatientAddress(data.address);
              if (data.area) setPatientArea(data.area);
              if (data.postcode) setPatientPostcode(data.postcode);
            }
          } catch (error) {
            console.error("Error fetching patient address:", error);
          }
        }
      };
      fetchAddress();
    }, [])
  );

  useEffect(() => {
    const testsRef = collection(db, 'available_tests');
    const unsubscribe = onSnapshot(testsRef, (snapshot) => {
      const testsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTests(testsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching tests:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const openModal = (test) => {
    setSelectedTest(test);
    setDate(new Date());
    setModalVisible(true);
  };

  const showToast = () => {
    setToastVisible(true);
    Animated.timing(toastOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setTimeout(() => {
        Animated.timing(toastOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => setToastVisible(false));
      }, 3000);
    });
  };

  const proceedToAddress = () => {
    setModalVisible(false);
    setTimeout(() => {
      setAddressModalVisible(true);
    }, 300); // small delay for smooth transition
  };

  const handleBooking = async () => {
    if (!auth.currentUser) return;
    
    if (!patientAddress.trim() || !patientArea.trim() || !patientPostcode.trim()) {
      alert('Please fill out all address fields (Full Address, Area, and Postcode).');
      return;
    }

    setIsSubmitting(true);
    try {
      // Update the patient's address in case they changed it
      const patientRef = doc(db, 'patients', auth.currentUser.uid);
      await setDoc(patientRef, { 
        address: patientAddress,
        area: patientArea,
        postcode: patientPostcode
      }, { merge: true });

      // Create test request
      const requestsRef = collection(db, 'test_requests');
      await addDoc(requestsRef, {
        patientId: auth.currentUser.uid,
        testName: selectedTest.testName || selectedTest.name, // Handle any legacy schemas just in case
        price: selectedTest.price,
        requestedDate: date.toISOString().split('T')[0],
        requestedTime: 'TBD', // Time is no longer selected by patient
        address: patientAddress,
        area: patientArea,
        postcode: patientPostcode,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      
      setAddressModalVisible(false);
      showToast();
    } catch (error) {
      console.error("Booking error:", error);
      alert('Failed to submit request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const onChangeDate = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) setDate(selectedDate);
  };

  const renderTestCard = ({ item }) => (
    <TouchableOpacity onPress={() => openModal(item)} activeOpacity={0.8}>
      <ClayCard style={styles.testCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.testName}>{item.testName || item.name}</Text>
          <Ionicons name="flask-outline" size={24} color={theme.colors.primary} />
        </View>
        <Text style={styles.testPrice}>₹{item.price}</Text>
        <Text style={styles.bookNowText}>Tap to book</Text>
      </ClayCard>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Available Tests</Text>
      
      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 50 }} />
      ) : tests.length === 0 ? (
         <Text style={styles.emptyText}>No tests available right now.</Text>
      ) : (
        <FlatList
          data={tests}
          keyExtractor={(item) => item.id}
          renderItem={renderTestCard}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}

      {/* Date Booking Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Book {selectedTest?.testName || selectedTest?.name}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={isDarkMode ? '#FFFFFF' : '#000'} />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalPrice}>Price: ₹{selectedTest?.price}</Text>

            <View style={styles.pickerSection}>
              <Text style={styles.pickerLabel}>Preferred Date</Text>
              <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
                <Ionicons name="calendar-outline" size={20} color={theme.colors.textLight} />
                <Text style={styles.dateText}>{date.toLocaleDateString()}</Text>
              </TouchableOpacity>
              
              {showDatePicker && (
                <DateTimePicker
                  value={date}
                  mode="date"
                  display="default"
                  minimumDate={new Date()}
                  onChange={onChangeDate}
                />
              )}
            </View>

            <ClayButton
              title="Next"
              onPress={proceedToAddress}
              style={styles.submitButton}
            />
          </View>
        </View>
      </Modal>

      {/* Address Confirmation Modal */}
      <Modal
        visible={addressModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setAddressModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Confirm Address</Text>
              <TouchableOpacity onPress={() => setAddressModalVisible(false)}>
                <Ionicons name="close" size={24} color={isDarkMode ? '#FFFFFF' : '#000'} />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.addressClarification}>Is this the correct address for the test collection?</Text>

            <Text style={styles.pickerLabel}>Full Address *</Text>
            <TextInput
              style={styles.addressInput}
              value={patientAddress}
              onChangeText={setPatientAddress}
              placeholder="Enter your full address..."
              placeholderTextColor={theme.colors.textLight}
              multiline
            />

            <Text style={styles.pickerLabel}>Area *</Text>
            <TextInput
              style={styles.addressInputShort}
              value={patientArea}
              onChangeText={setPatientArea}
              placeholder="e.g. Downtown"
              placeholderTextColor={theme.colors.textLight}
            />

            <Text style={styles.pickerLabel}>Postcode/ZIP *</Text>
            <TextInput
              style={styles.addressInputShort}
              value={patientPostcode}
              onChangeText={setPatientPostcode}
              placeholder="e.g. 10001"
              placeholderTextColor={theme.colors.textLight}
            />

            <ClayButton
              title="Confirm Booking"
              onPress={handleBooking}
              loading={isSubmitting}
              style={styles.submitButton}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Sleek Toast */}
      {toastVisible && (
        <Animated.View style={[styles.toastContainer, { opacity: toastOpacity }]}>
          <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
          <Text style={styles.toastText}>Request sent! Our reception will confirm shortly</Text>
        </Animated.View>
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
  title: {
    ...theme.typography.header,
    color: isDarkMode ? '#FFFFFF' : theme.colors.text,
    marginBottom: theme.spacing.lg,
  },
  emptyText: {
    ...theme.typography.body,
    textAlign: 'center',
    marginTop: 50,
    color: theme.colors.textLight,
  },
  testCard: {
    marginBottom: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  testName: {
    ...theme.typography.title,
    fontSize: 18,
    color: isDarkMode ? '#FFFFFF' : theme.colors.text,
    flex: 1,
  },
  testPrice: {
    ...theme.typography.body,
    fontSize: 16,
    color: theme.colors.primary,
    marginTop: theme.spacing.xs,
    fontWeight: 'bold',
  },
  bookNowText: {
    ...theme.typography.body,
    fontSize: 14,
    color: theme.colors.textLight,
    marginTop: theme.spacing.sm,
    fontStyle: 'italic',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: isDarkMode ? '#1A1A1A' : '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: theme.spacing.xl,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  modalTitle: {
    ...theme.typography.header,
    fontSize: 20,
    color: isDarkMode ? '#FFFFFF' : theme.colors.text,
    flex: 1,
  },
  modalPrice: {
    ...theme.typography.body,
    fontSize: 16,
    color: theme.colors.primary,
    marginBottom: theme.spacing.xl,
    fontWeight: '600',
  },
  pickerSection: {
    marginBottom: theme.spacing.lg,
  },
  pickerLabel: {
    ...theme.typography.title,
    fontSize: 14,
    color: isDarkMode ? '#AAAAAA' : theme.colors.textLight,
    marginBottom: theme.spacing.sm,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    backgroundColor: isDarkMode ? '#2A2A2A' : '#F9F9F9',
  },
  dateText: {
    ...theme.typography.body,
    marginLeft: theme.spacing.sm,
    color: isDarkMode ? '#FFFFFF' : theme.colors.text,
  },
  addressClarification: {
    ...theme.typography.body,
    color: theme.colors.textLight,
    marginBottom: theme.spacing.md,
  },
  addressInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    color: isDarkMode ? '#FFFFFF' : theme.colors.text,
    backgroundColor: isDarkMode ? '#2A2A2A' : '#F9F9F9',
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: theme.spacing.lg,
  },
  addressInputShort: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    color: isDarkMode ? '#FFFFFF' : theme.colors.text,
    backgroundColor: isDarkMode ? '#2A2A2A' : '#F9F9F9',
    marginBottom: theme.spacing.lg,
  },
  submitButton: {
    marginTop: theme.spacing.lg,
  },
  // Toast Styles
  toastContainer: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
    backgroundColor: isDarkMode ? '#2A2A2A' : '#FFFFFF',
    borderRadius: 30,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    borderWidth: 1,
    borderColor: isDarkMode ? '#444' : '#E0E0E0',
    zIndex: 999, // Ensure it's above the list
  },
  toastText: {
    ...theme.typography.body,
    color: isDarkMode ? '#FFFFFF' : theme.colors.text,
    marginLeft: 12,
    flex: 1,
    fontWeight: '500',
  }
});
