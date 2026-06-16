import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Animated } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import ClayCard from '../../components/ClayCard';
import ClayButton from '../../components/ClayButton';
import { db } from '../../config/firebase';
import { collection, query, where, onSnapshot, doc, getDoc, updateDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';

export default function OngoingServicesScreen() {
  const { theme, isDarkMode } = useTheme();
  const styles = getStyles(theme, isDarkMode);

  const [activeTab, setActiveTab] = useState('appointments'); // 'appointments' or 'tests'
  
  const [ongoingAppointments, setOngoingAppointments] = useState([]);
  const [loadingAppointments, setLoadingAppointments] = useState(true);
  
  const [ongoingTests, setOngoingTests] = useState([]);
  const [loadingTests, setLoadingTests] = useState(true);

  const [processingId, setProcessingId] = useState(null);

  // Toast State
  const [toastVisible, setToastVisible] = useState(false);
  const toastMessage = useRef('');
  const toastOpacity = useRef(new Animated.Value(0)).current;

  const showToast = (message) => {
    toastMessage.current = message;
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

  // Fetch Ongoing Appointments
  useEffect(() => {
    const q = query(
      collection(db, 'available_slots'), 
      where('status', '==', 'confirmed'),
      where('isBooked', '==', true)
    );
    
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
        
        // Sort by date then time
        slotsWithDetails.sort((a, b) => {
          if (a.date === b.date) {
            return a.time.localeCompare(b.time);
          }
          return a.date.localeCompare(b.date);
        });

        setOngoingAppointments(slotsWithDetails);
        setLoadingAppointments(false);
      } catch (error) {
        console.error("Error populating ongoing appointments:", error);
        setLoadingAppointments(false);
      }
    }, (error) => {
      console.error("Error fetching ongoing appointments:", error);
      setLoadingAppointments(false);
    });

    return () => unsubscribe();
  }, []);

  // Fetch Ongoing Tests
  useEffect(() => {
    const q = query(collection(db, 'test_requests'), where('status', '==', 'confirmed'));
    
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
        
        testsWithDetails.sort((a, b) => new Date(b.confirmedAt || b.createdAt) - new Date(a.confirmedAt || a.createdAt));
        setOngoingTests(testsWithDetails);
        setLoadingTests(false);
      } catch (error) {
        console.error("Error populating ongoing tests:", error);
        setLoadingTests(false);
      }
    }, (error) => {
      console.error("Error fetching ongoing tests:", error);
      setLoadingTests(false);
    });

    return () => unsubscribe();
  }, []);

  const handleCheckout = async (id, collectionName, patientId) => {
    setProcessingId(id);
    try {
      const docRef = doc(db, collectionName, id);
      await updateDoc(docRef, {
        status: 'completed',
        completedAt: new Date().toISOString()
      });
      showToast('Checkout successful!');

      // WhatsApp notification placeholder
      if (patientId) {
        console.log('Would send WhatsApp alert to patient here');
      }
    } catch (error) {
      console.error('Error marking service as done:', error);
      alert('Failed to update status.');
    } finally {
      setProcessingId(null);
    }
  };

  const renderAppointmentItem = ({ item }) => (
    <ClayCard style={styles.card}>
      <Text style={styles.cardTitle}>Dr. {item.doctorName}</Text>
      <View style={styles.detailsRow}>
        <Text style={styles.detailLabel}>Schedule:</Text>
        <Text style={styles.detailValue}>{item.date} at {item.time}</Text>
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
        title="Checkout"
        onPress={() => handleCheckout(item.id, 'available_slots', item.patientId)}
        loading={processingId === item.id}
        style={styles.doneButton}
      />
    </ClayCard>
  );

  const renderTestItem = ({ item }) => (
    <ClayCard style={styles.card}>
      <Text style={styles.cardTitle}>{item.testName}</Text>
      <View style={styles.detailsRow}>
        <Text style={styles.detailLabel}>Schedule:</Text>
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
        title="Checkout"
        onPress={() => handleCheckout(item.id, 'test_requests', item.patientId)}
        loading={processingId === item.id}
        style={styles.doneButton}
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
      if (ongoingAppointments.length === 0) {
        return (
          <View style={styles.centerContainer}>
            <Text style={styles.emptyText}>No ongoing appointments.</Text>
          </View>
        );
      }
      return (
        <FlatList
          data={ongoingAppointments}
          keyExtractor={(item) => item.id}
          renderItem={renderAppointmentItem}
          contentContainerStyle={styles.listContainer}
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
      if (ongoingTests.length === 0) {
        return (
          <View style={styles.centerContainer}>
            <Text style={styles.emptyText}>No ongoing lab tests.</Text>
          </View>
        );
      }
      return (
        <FlatList
          data={ongoingTests}
          keyExtractor={(item) => item.id}
          renderItem={renderTestItem}
          contentContainerStyle={styles.listContainer}
        />
      );
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Ongoing Services</Text>

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

      {/* Sleek Toast */}
      {toastVisible && (
        <Animated.View style={[styles.toastContainer, { opacity: toastOpacity }]}>
          <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
          <Text style={styles.toastText}>{toastMessage.current}</Text>
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
  headerTitle: {
    ...theme.typography.header,
    color: isDarkMode ? '#FFFFFF' : theme.colors.text,
    marginBottom: theme.spacing.xl,
    marginTop: 20,
    fontSize: 28,
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
    width: 100,
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
  doneButton: {
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.primary,
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
  },
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
    zIndex: 999,
  },
  toastText: {
    ...theme.typography.body,
    color: isDarkMode ? '#FFFFFF' : theme.colors.text,
    marginLeft: 12,
    flex: 1,
    fontWeight: '500',
  }
});
