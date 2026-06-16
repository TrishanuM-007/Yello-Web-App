import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import ClayCard from '../../components/ClayCard';
import { db } from '../../config/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';

export default function PatientDetailsScreen({ route }) {
  const { theme, isDarkMode } = useTheme();
  const styles = getStyles(theme, isDarkMode);

  const { patientId, patientData } = route.params;

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        // Fetch Completed Appointments
        const slotsQ = query(
          collection(db, 'available_slots'),
          where('patientId', '==', patientId),
          where('status', '==', 'completed')
        );
        const slotsSnap = await getDocs(slotsQ);
        
        // Let's also check for booked ones if completed isn't explicitly set in old data
        const slotsQBooked = query(
          collection(db, 'available_slots'),
          where('patientId', '==', patientId),
          where('isBooked', '==', true)
        );
        const slotsBookedSnap = await getDocs(slotsQBooked);

        const allSlots = [...slotsSnap.docs, ...slotsBookedSnap.docs].reduce((acc, doc) => {
          if(!acc.find(s => s.id === doc.id)) acc.push({ id: doc.id, ...doc.data(), type: 'appointment' });
          return acc;
        }, []);

        // Fetch Completed Lab Tests
        // Assuming test_requests has a patientId and status
        const testsQ = query(
          collection(db, 'test_requests'),
          where('patientId', '==', patientId),
          where('status', '==', 'completed')
        );
        const testsSnap = await getDocs(testsQ);
        
        const allTests = testsSnap.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'lab_test' }));

        // Merge and Sort
        let merged = [...allSlots, ...allTests];
        merged.sort((a, b) => {
          // Appointments usually have 'date' (YYYY-MM-DD) or createdAt. Tests have requestedDate or createdAt
          const dateA = new Date(a.date || a.requestedDate || a.createdAt || 0);
          const dateB = new Date(b.date || b.requestedDate || b.createdAt || 0);
          return dateB - dateA; // Newest first
        });

        setHistory(merged);
      } catch (error) {
        console.error("Error fetching patient history:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [patientId]);

  const renderHistoryItem = ({ item }) => {
    const isAppt = item.type === 'appointment';
    const dateStr = item.date || item.requestedDate || new Date(item.createdAt || 0).toLocaleDateString();
    
    return (
      <View style={styles.timelineItem}>
        <View style={styles.timelineLine} />
        <View style={[styles.timelineDot, { backgroundColor: isAppt ? '#34C759' : '#007AFF' }]} />
        
        <ClayCard style={styles.timelineCard}>
          <View style={styles.timelineHeader}>
            <Ionicons name={isAppt ? 'medical-outline' : 'flask-outline'} size={20} color={theme.colors.primary} />
            <Text style={styles.timelineType}>{isAppt ? 'Doctor Appointment' : 'Lab Test'}</Text>
            <Text style={styles.timelineDate}>{dateStr}</Text>
          </View>
          <View style={styles.timelineBody}>
            <Text style={styles.timelineTitle}>{isAppt ? `Dr. ${item.doctorName || 'Doctor'}` : item.testName}</Text>
            {item.time && <Text style={styles.timelineDetail}>Time: {item.time}</Text>}
            {item.notes && <Text style={styles.timelineDetail}>Notes: {item.notes}</Text>}
          </View>
        </ClayCard>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Profile Header */}
      <ClayCard style={styles.profileCard}>
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{patientData.name.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{patientData.name}</Text>
            <Text style={styles.profilePhone}>{patientData.phoneNumber}</Text>
          </View>
        </View>
        <View style={styles.divider} />
        <View style={styles.profileDetails}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Age</Text>
            <Text style={styles.detailValue}>{patientData.age} yrs</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Gender</Text>
            <Text style={styles.detailValue}>{patientData.gender}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Joined</Text>
            <Text style={styles.detailValue}>{new Date(patientData.createdAt || 0).toLocaleDateString()}</Text>
          </View>
        </View>
        {patientData.medicalHistory ? (
          <View style={styles.historyBlock}>
            <Text style={styles.historyLabel}>Medical History</Text>
            <Text style={styles.historyValue}>{patientData.medicalHistory}</Text>
          </View>
        ) : null}
      </ClayCard>

      {/* History Timeline */}
      <Text style={styles.sectionTitle}>Service History</Text>
      
      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 40 }} />
      ) : history.length === 0 ? (
        <Text style={styles.emptyText}>No service history found for this patient.</Text>
      ) : (
        <FlatList
          data={history}
          keyExtractor={item => item.id}
          renderItem={renderHistoryItem}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
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
  profileCard: {
    padding: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.lg,
  },
  avatarText: {
    ...theme.typography.header,
    color: '#1A1A1A',
    fontSize: 28,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    ...theme.typography.header,
    color: isDarkMode ? '#FFFFFF' : theme.colors.text,
    fontSize: 24,
  },
  profilePhone: {
    ...theme.typography.body,
    color: theme.colors.textLight,
    marginTop: 4,
    fontSize: 16,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginBottom: theme.spacing.lg,
  },
  profileDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    ...theme.typography.body,
    color: theme.colors.textLight,
    fontSize: 13,
  },
  detailValue: {
    ...theme.typography.title,
    color: isDarkMode ? '#FFFFFF' : theme.colors.text,
    fontSize: 16,
    marginTop: 4,
  },
  historyBlock: {
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  historyLabel: {
    ...theme.typography.title,
    color: theme.colors.textLight,
    fontSize: 13,
    marginBottom: 4,
  },
  historyValue: {
    ...theme.typography.body,
    color: isDarkMode ? '#FFFFFF' : theme.colors.text,
    lineHeight: 22,
  },
  sectionTitle: {
    ...theme.typography.header,
    color: isDarkMode ? '#FFFFFF' : theme.colors.text,
    fontSize: 20,
    marginBottom: theme.spacing.lg,
  },
  emptyText: {
    color: theme.colors.textLight,
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
  },
  // Timeline Styles
  timelineItem: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
    position: 'relative',
  },
  timelineLine: {
    position: 'absolute',
    left: 7,
    top: 24,
    bottom: -20,
    width: 2,
    backgroundColor: theme.colors.border,
    zIndex: 1,
  },
  timelineDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginTop: 18,
    marginRight: theme.spacing.md,
    zIndex: 2,
    borderWidth: 2,
    borderColor: theme.colors.background,
  },
  timelineCard: {
    flex: 1,
    padding: theme.spacing.md,
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  timelineType: {
    ...theme.typography.title,
    fontSize: 14,
    color: theme.colors.textLight,
    marginLeft: 8,
    flex: 1,
  },
  timelineDate: {
    ...theme.typography.body,
    fontSize: 12,
    color: theme.colors.textLight,
  },
  timelineBody: {
    marginTop: 4,
  },
  timelineTitle: {
    ...theme.typography.title,
    fontSize: 16,
    color: isDarkMode ? '#FFFFFF' : theme.colors.text,
    marginBottom: 4,
  },
  timelineDetail: {
    ...theme.typography.body,
    fontSize: 14,
    color: theme.colors.textLight,
  }
});
