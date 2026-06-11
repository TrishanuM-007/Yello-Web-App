import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Platform, RefreshControl } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { auth, db } from '../config/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { registerForPushNotificationsAsync, scheduleAppointmentReminder } from '../utils/NotificationSetup';

export default function ScheduleScreen() {
  const { theme, isDarkMode } = useTheme();
  const styles = getStyles(theme, isDarkMode);
  
  const [timelineData, setTimelineData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1200);
  };

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    // Setup push notifications and save token
    const setupNotifications = async () => {
      try {
        const token = await registerForPushNotificationsAsync();
        if (token) {
          const patientRef = doc(db, 'patients', user.uid);
          await updateDoc(patientRef, {
            expoPushToken: token
          });
          console.log('Saved push token to patient profile:', token);
        }
      } catch (error) {
        console.error('Push notification registration failed:', error);
      }
    };
    setupNotifications();

    let appointments = [];
    let reports = [];
    let tests = [];
    let doctorsMap = {};

    const updateTimeline = () => {
      // 1. Map doctor names
      const mappedAppointments = appointments.map(item => ({
        ...item,
        doctorName: doctorsMap[item.doctorId] || 'Unknown'
      }));

      // 2. Group by date and doctorId
      const groups = {};
      mappedAppointments.forEach(app => {
        const key = `${app.date}_${app.doctorId}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(app);
      });

      // Helper to parse "HH:MM AM" into total minutes from midnight for robust sorting
      const parseTimeToMinutes = (timeStr) => {
        if (!timeStr) return 0;
        const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        if (!match) return 0;
        let [_, hoursStr, minutesStr, modifier] = match;
        let hours = parseInt(hoursStr, 10);
        let minutes = parseInt(minutesStr, 10);
        if (hours === 12) hours = 0;
        if (modifier.toUpperCase() === 'PM') hours += 12;
        return hours * 60 + minutes;
      };

      const formatMinutesToTime = (totalMins) => {
        let hours = Math.floor(totalMins / 60);
        let mins = totalMins % 60;
        const modifier = hours >= 12 ? 'PM' : 'AM';
        if (hours > 12) hours -= 12;
        if (hours === 0) hours = 12;
        const hStr = hours.toString().padStart(2, '0');
        const mStr = mins.toString().padStart(2, '0');
        return `${hStr}:${mStr} ${modifier}`;
      };

      // Helper to create merged slot
      const createMergedSlot = (block) => {
        const first = block[0];
        const last = block[block.length - 1];
        
        // Extract start from first block (handles both "10:00 AM" and "10:00 AM - 10:15 AM")
        const startMatch = first.time.match(/^(\d{1,2}:\d{2}\s*(?:AM|PM))/i);
        const startStr = startMatch ? startMatch[1].toUpperCase() : first.time;

        // Try to extract end from last block, else calculate it
        const lastParts = last.time.split(' - ');
        let endStr = '';
        if (lastParts.length > 1) {
          endStr = lastParts[1].trim().toUpperCase();
        } else {
          const lastStartMins = parseTimeToMinutes(last.time);
          endStr = formatMinutesToTime(lastStartMins + 15);
        }
        
        return {
          ...first,
          time: `${startStr} - ${endStr}`,
          isMerged: block.length > 1,
          id: block.map(b => b.id).join('_')
        };
      };

      // 3. Merge contiguous slots
      const mergedAppointments = [];
      Object.values(groups).forEach(group => {
        // Sort by time
        group.sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time));

        if (group.length === 0) return;

        let currentBlock = [group[0]];

        for (let i = 1; i < group.length; i++) {
          const prevApp = currentBlock[currentBlock.length - 1];
          const currApp = group[i];
          
          const prevMins = parseTimeToMinutes(prevApp.time);
          const currMins = parseTimeToMinutes(currApp.time);
          
          if (currMins - prevMins === 15) {
            currentBlock.push(currApp);
          } else {
            mergedAppointments.push(createMergedSlot(currentBlock));
            currentBlock = [currApp];
          }
        }
        if (currentBlock.length > 0) {
          mergedAppointments.push(createMergedSlot(currentBlock));
        }
      });

      const combined = [...mergedAppointments, ...reports, ...tests];
      
      // Sort chronologically (ascending: earliest first)
      combined.sort((a, b) => {
        const dateA = a.date || a.createdAt?.split('T')[0] || '';
        const dateB = b.date || b.createdAt?.split('T')[0] || '';
        
        if (dateA === dateB) {
          return parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time);
        }
        return dateA.localeCompare(dateB);
      });

      // Schedule reminders
      combined.forEach(item => {
        if (item.type === 'appointment') {
          const startTime = item.time ? item.time.split(' - ')[0] : null;
          if (startTime) {
            scheduleAppointmentReminder(`Dr. ${item.doctorName}`, item.date, startTime);
          }
        } else if (item.type === 'test') {
          if (item.requestedDate && item.requestedTime) {
            scheduleAppointmentReminder(item.testName, item.requestedDate, item.requestedTime);
          }
        }
      });
      
      setTimelineData(combined);
      setLoading(false);
    };

    // Fetch doctors mapping once
    const unsubDoctors = onSnapshot(collection(db, 'doctors'), (snapshot) => {
      const map = {};
      snapshot.docs.forEach(doc => {
        map[doc.id] = doc.data().name;
      });
      doctorsMap = map;
      updateTimeline();
    });

    // Listener 1: Appointments
    const qAppointments = query(
      collection(db, 'available_slots'),
      where('patientId', '==', user.uid),
      where('isBooked', '==', true),
      where('status', '==', 'confirmed')
    );

    const unsubAppointments = onSnapshot(qAppointments, (snapshot) => {
      appointments = snapshot.docs.map(doc => ({
        id: doc.id,
        type: 'appointment',
        ...doc.data()
      }));
      updateTimeline();
    });

    // Listener 2: Test Reports
    const qReports = query(
      collection(db, 'test_reports'),
      where('patientId', '==', user.uid)
    );

    const unsubReports = onSnapshot(qReports, (snapshot) => {
      reports = snapshot.docs.map(doc => ({
        id: doc.id,
        type: 'report',
        ...doc.data()
      }));
      updateTimeline();
    });

    // Listener 3: Confirmed Tests
    const qTests = query(
      collection(db, 'test_requests'),
      where('patientId', '==', user.uid),
      where('status', '==', 'confirmed')
    );

    const unsubTests = onSnapshot(qTests, (snapshot) => {
      tests = snapshot.docs.map(doc => ({
        id: doc.id,
        type: 'test',
        ...doc.data()
      }));
      updateTimeline();
    });

    return () => {
      unsubDoctors();
      unsubAppointments();
      unsubReports();
      unsubTests();
    };
  }, []);

  const renderTimelineItem = ({ item, index }) => {
    const isAppointment = item.type === 'appointment';
    const isTest = item.type === 'test';
    
    let title = 'Event';
    if (isAppointment) title = 'Doctor Appointment';
    else if (isTest) title = `Lab Test: ${item.testName}`;
    else title = item.testName ? `${item.testName} Report` : 'Test Report';

    const dotColor = isAppointment ? theme.colors.primary : (isTest ? '#FFA500' : '#555555');
    const iconName = isAppointment ? 'calendar-outline' : (isTest ? 'flask-outline' : 'document-text-outline');
    
    // Fallback to createdAt if date/time are missing
    const displayDate = item.date || item.requestedDate || item.createdAt?.split('T')[0] || 'Unknown Date';
    const displayTime = item.time || item.requestedTime || (item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '');

    return (
      <View style={styles.timelineItemContainer}>
        {/* Vertical Line */}
        <View style={styles.timelineLine} />
        
        {/* Dot */}
        <View style={[styles.timelineDot, { backgroundColor: dotColor }]} />
        
        {/* Card */}
        <View style={styles.timelineCard}>
          <View style={styles.cardHeader}>
            <View style={styles.titleContainer}>
              <Ionicons name={iconName} size={20} color={dotColor} style={{ marginRight: 8 }} />
              <Text style={styles.cardTitle}>{title}</Text>
            </View>
          </View>
          <Text style={styles.timestamp}>
            {displayDate} {displayTime ? `• ${displayTime}` : ''}
          </Text>
          {isAppointment && item.doctorName && (
            <Text style={styles.detailsText}>Dr. {item.doctorName}</Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Your Schedule</Text>
      
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : timelineData.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>You have no upcoming appointments or reports.</Text>
        </View>
      ) : (
        <FlatList
          data={timelineData}
          keyExtractor={(item) => item.id}
          renderItem={renderTimelineItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} tintColor={theme.colors.primary} />
          }
        />
      )}
    </View>
  );
}

const getStyles = (theme, isDarkMode) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingTop: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
  },
  headerTitle: {
    ...theme.typography.header,
    color: isDarkMode ? '#FFFFFF' : theme.colors.text,
    marginBottom: theme.spacing.xl,
    marginTop: 20,
    fontSize: 28,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    ...theme.typography.body,
    color: isDarkMode ? '#CCCCCC' : '#888888',
    fontStyle: 'italic',
  },
  listContainer: {
    paddingBottom: 40,
    paddingLeft: 10,
    paddingRight: 10,
  },
  timelineItemContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    position: 'relative',
  },
  timelineLine: {
    position: 'absolute',
    left: 7, 
    top: 0,
    bottom: -24, 
    width: 2,
    backgroundColor: isDarkMode ? '#444444' : '#E0E0E0',
    zIndex: 0,
  },
  timelineDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginTop: 20, 
    marginRight: 16,
    zIndex: 1,
    borderWidth: 3,
    borderColor: theme.colors.background, 
  },
  timelineCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: isDarkMode ? '#FFFFFF' : theme.colors.text,
  },
  timestamp: {
    fontSize: 13,
    color: isDarkMode ? '#AAAAAA' : '#888888',
    marginBottom: 4,
    fontWeight: '500',
  },
  detailsText: {
    fontSize: 14,
    color: isDarkMode ? '#CCCCCC' : '#555555',
    marginTop: 4,
  }
});
