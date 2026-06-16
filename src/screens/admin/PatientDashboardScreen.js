import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Modal, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import ClayButton from '../../components/ClayButton';
import ClayCard from '../../components/ClayCard';
import { db } from '../../config/firebase';
import { collection, onSnapshot, doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';

export default function PatientDashboardScreen({ navigation }) {
  const { theme, isDarkMode } = useTheme();
  const styles = getStyles(theme, isDarkMode);

  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('newest'); // 'newest' or 'oldest'

  // Add Patient Modal State
  const [isAddModalVisible, setAddModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newAge, setNewAge] = useState('');
  const [newGender, setNewGender] = useState('Male');
  const [newHistory, setNewHistory] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Batch Deletion State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedPatientIds, setSelectedPatientIds] = useState([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'patients'), (snapshot) => {
      const pList = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setPatients(pList);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleAddPatient = async () => {
    if (!newName.trim() || !newPhone.trim() || !newAge.trim()) {
      window.alert('Error: Name, Phone, and Age are required.');
      return;
    }

    // Format phone (very simple format)
    const phoneId = newPhone.trim().replace(/\s+/g, '');
    
    setIsSubmitting(true);
    try {
      const patientRef = doc(db, 'patients', phoneId);
      const snap = await getDoc(patientRef);
      if (snap.exists()) {
        window.alert('Error: A patient with this phone number already exists.');
        setIsSubmitting(false);
        return;
      }

      await setDoc(patientRef, {
        name: newName.trim(),
        phoneNumber: phoneId,
        age: parseInt(newAge.trim(), 10) || 0,
        gender: newGender,
        medicalHistory: newHistory.trim(),
        createdAt: new Date().toISOString()
      });

      window.alert('Success: Patient added successfully.');
      setAddModalVisible(false);
      setNewName('');
      setNewPhone('');
      setNewAge('');
      setNewGender('Male');
      setNewHistory('');
    } catch (error) {
      console.error(error);
      window.alert('Error: Could not add patient.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBatchDeletePatients = async () => {
    if (selectedPatientIds.length === 0) return;
    
    if (window.confirm(`Are you sure you want to delete ${selectedPatientIds.length} patient(s)? This action cannot be undone.`)) {
      setLoading(true);
      try {
        const batchPromises = selectedPatientIds.map(id => deleteDoc(doc(db, 'patients', id)));
        await Promise.all(batchPromises);
        window.alert('Success: Patients deleted successfully.');
        setIsSelectionMode(false);
        setSelectedPatientIds([]);
      } catch (error) {
        console.error('Error batch deleting patients:', error);
        window.alert('Error: Failed to delete some patients.');
      } finally {
        setLoading(false);
      }
    }
  };

  const filteredPatients = useMemo(() => {
    let result = patients.filter(p => {
      const nameMatch = p.name?.toLowerCase().includes(searchQuery.toLowerCase());
      const phoneMatch = p.phoneNumber?.includes(searchQuery);
      return nameMatch || phoneMatch;
    });

    result.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0);
      const dateB = new Date(b.createdAt || 0);
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [patients, searchQuery, sortOrder]);

  const renderPatientItem = ({ item }) => {
    const isSelected = selectedPatientIds.includes(item.id);

    const handleCardPress = () => {
      if (isSelectionMode) {
        if (isSelected) {
          setSelectedPatientIds(prev => prev.filter(id => id !== item.id));
        } else {
          setSelectedPatientIds(prev => [...prev, item.id]);
        }
      } else {
        navigation.navigate('PatientDetails', { patientId: item.id, patientData: item });
      }
    };

    return (
      <TouchableOpacity onPress={handleCardPress} activeOpacity={0.7}>
        <ClayCard style={[styles.patientCard, isSelected && { borderColor: theme.colors.primary, borderWidth: 2 }]}>
          <View style={styles.patientCardInner}>
            <View style={styles.patientInfo}>
              <Text style={styles.patientName}>{item.name}</Text>
              <Text style={styles.patientPhone}>{item.phoneNumber}</Text>
            </View>
            <View style={styles.patientMeta}>
              <Text style={styles.patientMetaText}>{item.gender}, {item.age} yrs</Text>
              <Text style={styles.patientDate}>Joined: {new Date(item.createdAt || 0).toLocaleDateString()}</Text>
            </View>
            
            {isSelectionMode ? (
              <Ionicons 
                name={isSelected ? "checkbox" : "square-outline"} 
                size={24} 
                color={isSelected ? theme.colors.primary : theme.colors.textLight} 
                style={{ marginLeft: 8 }}
              />
            ) : (
              <Ionicons name="chevron-forward" size={24} color={theme.colors.textLight} />
            )}
          </View>
        </ClayCard>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Header & Search */}
      <View style={styles.headerRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by Name or Phone..."
          placeholderTextColor="#666666"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={sortOrder}
            onValueChange={setSortOrder}
            style={styles.picker}
          >
            <Picker.Item label="Newest First" value="newest" />
            <Picker.Item label="Oldest First" value="oldest" />
          </Picker>
        </View>
        <ClayButton
          title={isSelectionMode ? "Cancel Select" : "Delete..."}
          variant={isSelectionMode ? "secondary" : "secondary"}
          onPress={() => {
            setIsSelectionMode(!isSelectionMode);
            setSelectedPatientIds([]);
          }}
          style={styles.addBtn}
        />
        
        {isSelectionMode && selectedPatientIds.length > 0 && (
          <TouchableOpacity
            style={{ backgroundColor: '#FF3B30', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, marginLeft: theme.spacing.sm, height: 48, justifyContent: 'center' }}
            onPress={handleBatchDeletePatients}
          >
            <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Delete ({selectedPatientIds.length})</Text>
          </TouchableOpacity>
        )}

        {!isSelectionMode && (
          <ClayButton
            title="+ Add Patient"
            onPress={() => setAddModalVisible(true)}
            style={{ marginLeft: theme.spacing.sm }}
          />
        )}
      </View>

      {/* Directory List */}
      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 40 }} />
      ) : filteredPatients.length === 0 ? (
        <Text style={styles.emptyText}>No patients found.</Text>
      ) : (
        <FlatList
          data={filteredPatients}
          keyExtractor={item => item.id}
          renderItem={renderPatientItem}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}

      {/* Add Patient Modal */}
      <Modal visible={isAddModalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Add New Patient</Text>

              <Text style={styles.label}>Name</Text>
              <TextInput style={styles.input} value={newName} onChangeText={setNewName} placeholder="e.g. Jane Doe" placeholderTextColor="#666666" />

              <Text style={styles.label}>Phone Number (Unique ID)</Text>
              <TextInput style={styles.input} value={newPhone} onChangeText={setNewPhone} placeholder="e.g. 9876543210" keyboardType="phone-pad" placeholderTextColor="#666666" />

              <Text style={styles.label}>Age</Text>
              <TextInput style={styles.input} value={newAge} onChangeText={setNewAge} placeholder="e.g. 30" keyboardType="numeric" placeholderTextColor="#666666" />

              <Text style={styles.label}>Gender</Text>
              <View style={[styles.input, { padding: 0, overflow: 'hidden' }]}>
                <Picker selectedValue={newGender} onValueChange={setNewGender} style={{ height: '100%', width: '100%', color: '#000000', backgroundColor: '#FFFFFF' }}>
                  <Picker.Item label="Male" value="Male" color="#000000" />
                  <Picker.Item label="Female" value="Female" color="#000000" />
                  <Picker.Item label="Other" value="Other" color="#000000" />
                </Picker>
              </View>

              <Text style={styles.label}>Medical History (Optional)</Text>
              <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} value={newHistory} onChangeText={setNewHistory} multiline numberOfLines={3} placeholder="Any known allergies, past surgeries..." placeholderTextColor="#666666" />

              <ClayButton title="Save Patient" onPress={handleAddPatient} loading={isSubmitting} style={{ marginTop: 20 }} />
              <ClayButton title="Cancel" variant="secondary" onPress={() => setAddModalVisible(false)} style={{ marginTop: 10 }} />
            </ScrollView>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  searchInput: {
    flex: 2,
    minWidth: 200,
    backgroundColor: '#FFFFFF',
    color: '#000000',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  pickerWrapper: {
    flex: 1,
    minWidth: 150,
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
  addBtn: {
    marginLeft: 'auto',
  },
  emptyText: {
    color: theme.colors.textLight,
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
  },
  patientCard: {
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
  },
  patientCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  patientInfo: {
    flex: 2,
  },
  patientName: {
    ...theme.typography.title,
    fontSize: 18,
    color: isDarkMode ? '#FFFFFF' : theme.colors.text,
  },
  patientPhone: {
    ...theme.typography.body,
    color: theme.colors.textLight,
    marginTop: 4,
  },
  patientMeta: {
    flex: 1,
    alignItems: 'flex-end',
    marginRight: theme.spacing.md,
  },
  patientMetaText: {
    ...theme.typography.body,
    color: theme.colors.text,
  },
  patientDate: {
    ...theme.typography.body,
    fontSize: 12,
    color: theme.colors.textLight,
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
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
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
    height: 48, // Consistent height for inputs and pickers
  }
});
