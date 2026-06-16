import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import ClayCard from '../../components/ClayCard';
import ClayButton from '../../components/ClayButton';
import { db } from '../../config/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

export default function ManageAppointmentsScreen({ navigation }) {
  const { theme, isDarkMode } = useTheme();
  const styles = getStyles(theme, isDarkMode);

  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1200);
  };

  useEffect(() => {
    // We order by createdAt descending to show newest doctors first
    const q = query(collection(db, 'doctors'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const doctorsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setDoctors(doctorsList);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching doctors: ", error);
      window.alert('Error: Failed to fetch doctors list. Please check your connection.');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const renderDoctorItem = ({ item }) => (
    <TouchableOpacity 
      onPress={() => navigation.navigate('DoctorSlotsAdminScreen', { doctor: item })}
      activeOpacity={0.7}
    >
      <ClayCard style={styles.card}>
        <View style={styles.cardContent}>
          <Text style={styles.doctorName}>{item.name}</Text>
          <Text style={styles.doctorSpecialty}>{item.specialty}</Text>
        </View>
        <Text style={styles.arrow}>{'›'}</Text>
      </ClayCard>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Manage Appointments</Text>
      <Text style={styles.subtitle}>Select a doctor to manage their available slots.</Text>
      
      <ClayButton 
        title="Add New Doctor" 
        onPress={() => navigation.navigate('AddDoctorScreen')}
        style={{ marginBottom: theme.spacing.xl }}
      />
      
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading doctors...</Text>
        </View>
      ) : doctors.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>No doctors found in the system. Please add doctors first.</Text>
        </View>
      ) : (
        <FlatList
          data={doctors}
          keyExtractor={item => item.id}
          renderItem={renderDoctorItem}
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
    padding: theme.spacing.xl,
    paddingTop: 40,
  },
  title: {
    ...theme.typography.header,
    color: isDarkMode ? '#FFFFFF' : theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    ...theme.typography.body,
    color: isDarkMode ? '#FFFFFF' : theme.colors.textLight,
    marginBottom: theme.spacing.xl,
  },
  listContainer: {
    paddingBottom: theme.spacing.xl,
  },
  card: {
    marginBottom: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.lg,
  },
  cardContent: {
    flex: 1,
  },
  doctorName: {
    ...theme.typography.title,
    color: isDarkMode ? '#FFFFFF' : theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  doctorSpecialty: {
    ...theme.typography.body,
    color: isDarkMode ? '#FFFFFF' : theme.colors.textLight,
  },
  arrow: {
    fontSize: 24,
    color: theme.colors.primary,
    fontWeight: 'bold',
    marginLeft: theme.spacing.md,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...theme.typography.body,
    color: isDarkMode ? '#FFFFFF' : theme.colors.textLight,
    marginTop: theme.spacing.md,
  },
  emptyText: {
    ...theme.typography.body,
    color: isDarkMode ? '#FFFFFF' : theme.colors.textLight,
    textAlign: 'center',
  }
});
