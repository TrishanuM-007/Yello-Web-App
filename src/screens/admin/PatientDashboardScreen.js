import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../config/firebase';
import { collection, onSnapshot, doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { formatDate } from '../../utils/dateUtils';
import { 
  Search, Users, Plus, Trash2, CheckSquare, Square, Menu, X, ChevronRight, Filter
} from 'lucide-react';
import { Platform, View, Text } from 'react-native';
import toast from 'react-hot-toast';

export default function PatientDashboardScreen({ navigation }) {
  // Navigation sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Core Data
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('newest'); // 'newest' or 'oldest'

  // Add Patient Modal State
  const [isAddModalVisible, setAddModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [newPhone, setNewPhone] = useState('');
  const [newAge, setNewAge] = useState('');
  const [newGender, setNewGender] = useState('Male');
  const [newHistory, setNewHistory] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Batch Deletion State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedPatientIds, setSelectedPatientIds] = useState([]);

  useEffect(() => {
    if (Platform.OS === 'web' && !document.getElementById('tailwind-cdn')) {
      const script = document.createElement('script');
      script.id = 'tailwind-cdn';
      script.src = 'https://cdn.tailwindcss.com';
      document.head.appendChild(script);
    }
  }, []);

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
      toast.error('Error: Name, Phone, and Age are required.');
      return;
    }

    const phoneId = `${countryCode} ${newPhone.trim()}`.replace(/\s+/g, '');
    
    setIsSubmitting(true);
    try {
      const patientRef = doc(db, 'patients', phoneId);
      const snap = await getDoc(patientRef);
      if (snap.exists()) {
        toast.error('Error: A patient with this phone number already exists.');
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

      setAddModalVisible(false);
      setNewName('');
      setNewPhone('');
      setNewAge('');
      setNewGender('Male');
      setNewHistory('');
      toast.success('Patient added successfully!');
    } catch (error) {
      console.error(error);
      toast.error('Error: Could not add patient.');
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
        setIsSelectionMode(false);
        setSelectedPatientIds([]);
        toast.success(`Successfully deleted ${selectedPatientIds.length} patient(s).`);
      } catch (error) {
        console.error('Error batch deleting patients:', error);
        toast.error('Error: Failed to delete some patients.');
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

  const toggleSelection = (e, id) => {
    e.stopPropagation();
    if (selectedPatientIds.includes(id)) {
      setSelectedPatientIds(prev => prev.filter(pid => pid !== id));
    } else {
      setSelectedPatientIds(prev => [...prev, id]);
    }
  };

  if (Platform.OS !== 'web') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>This highly styled component is optimized for Web only.</Text>
      </View>
    );
  }



  return (
    <div className="flex h-screen w-full bg-gray-50 dark:bg-[#0F172A] text-gray-900 dark:text-white overflow-hidden font-sans">
      
      

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative p-4 md:p-8 flex flex-col min-w-0">
        
        {/* Header Row */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 shrink-0">
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-gray-900 dark:text-white">Patient CRM</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Manage and organize your patient directory.</p>
          </div>
          <button 
            onClick={() => setAddModalVisible(true)}
            className="flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-yellow-950 px-5 py-2.5 rounded-xl font-bold transition-all shadow-sm outline-none shrink-0"
          >
            <Plus size={18} />
            <span>Add Patient</span>
          </button>
        </header>

        {/* Toolbar Row */}
        <div className="flex flex-wrap items-center gap-4 mb-6 shrink-0 bg-white dark:bg-[#1E293B] p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
          
          <div className="flex-1 min-w-[200px] relative">
            <Search size={18} className="absolute left-3 top-3 text-gray-500 dark:text-gray-400" />
            <input 
              type="text" 
              placeholder="Search by Name or Phone..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-[#0F172A] border border-gray-300 dark:border-gray-700 rounded-xl text-sm outline-none focus:border-yellow-400 text-gray-900 dark:text-white transition-colors"
            />
          </div>

          <div className="w-40 relative">
            <Filter size={16} className="absolute left-3 top-3 text-gray-500 dark:text-gray-400" />
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-[#0F172A] border border-gray-300 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-900 dark:text-white outline-none cursor-pointer appearance-none transition-colors"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>

          <button 
            onClick={() => {
              setIsSelectionMode(!isSelectionMode);
              setSelectedPatientIds([]);
            }}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all border ${isSelectionMode ? 'bg-gray-200 dark:bg-gray-800 border-gray-600 text-gray-900 dark:text-white' : 'bg-transparent border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-800'}`}
          >
            {isSelectionMode ? 'Cancel Select' : 'Delete...'}
          </button>

          {isSelectionMode && selectedPatientIds.length > 0 && (
            <button 
              onClick={handleBatchDeletePatients}
              className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-gray-900 dark:text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm"
            >
              <Trash2 size={16} />
              <span>Delete ({selectedPatientIds.length})</span>
            </button>
          )}

        </div>

        {/* Patient Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-20">
          {loading ? (
            /* Skeleton Loaders */
            [1, 2, 3, 4, 5, 6, 7, 8].map(n => (
              <div key={n} className="bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 flex flex-col animate-pulse">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-gray-200 dark:bg-gray-800 rounded-full" />
                  <div className="w-6 h-6 bg-gray-200 dark:bg-gray-800 rounded-md" />
                </div>
                <div className="w-3/4 h-5 bg-gray-200 dark:bg-gray-800 rounded-md mb-2" />
                <div className="w-1/2 h-4 bg-gray-200 dark:bg-gray-800 rounded-md mb-4" />
                <div className="w-full h-10 bg-gray-200 dark:bg-gray-800 rounded-xl mt-auto" />
              </div>
            ))
          ) : filteredPatients.length === 0 ? (
            /* Empty State */
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
              <Users className="w-16 h-16 text-gray-400 dark:text-gray-700 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-400">No Patients Found</h3>
              <p className="text-sm text-gray-500 dark:text-gray-600 mt-2">There is currently no data to display here.</p>
            </div>
          ) : (
            filteredPatients.map(item => {
              const isSelected = selectedPatientIds.includes(item.id);
              
              const handleCardClick = () => {
                if (isSelectionMode) {
                  toggleSelection({ stopPropagation: () => {} }, item.id);
                } else {
                  navigation.navigate('PatientDetails', { patientId: item.id, patientData: item });
                }
              };

              return (
                <div 
                  key={item.id}
                  onClick={handleCardClick}
                  className={`bg-white dark:bg-[#1E293B] border rounded-2xl p-5 cursor-pointer transition-all hover:-translate-y-1 hover:shadow-lg flex flex-col group ${
                    isSelected ? 'border-yellow-400 ring-1 ring-yellow-400 bg-[#1e293b]/80' : 'border-gray-200 dark:border-gray-800 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-gray-50 dark:bg-[#0F172A] border border-gray-300 dark:border-gray-700 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400 shrink-0 group-hover:text-yellow-400 transition-colors">
                      <Users size={20} />
                    </div>
                    
                    {isSelectionMode ? (
                      <button onClick={(e) => toggleSelection(e, item.id)} className="text-gray-500 dark:text-gray-400 hover:text-white transition-colors">
                        {isSelected ? <CheckSquare size={22} className="text-yellow-400" /> : <Square size={22} />}
                      </button>
                    ) : (
                      <ChevronRight size={20} className="text-gray-600 group-hover:text-white transition-colors" />
                    )}
                  </div>
                  
                  <div className="min-w-0">
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white truncate">{item.name}</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mt-1 truncate">{item.phoneNumber}</p>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-gray-800/50 flex flex-col gap-1">
                    <p className="text-xs text-gray-500 font-medium">{item.gender}, {item.age} yrs</p>
                    <p className="text-xs text-gray-600">Joined: {formatDate(item.createdAt || 0)}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </main>

      {/* Add Patient Modal */}
      {isAddModalVisible && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-2xl flex flex-col max-h-[90vh]">
            
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add New Patient</h2>
              <button 
                onClick={() => setAddModalVisible(false)}
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-[#0F172A] flex items-center justify-center text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Full Name <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0F172A] border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white outline-none focus:border-yellow-400 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Phone Number <span className="text-red-500">*</span></label>
                <div className="flex gap-2">
                  <select
                    value={countryCode}
                    onChange={e => setCountryCode(e.target.value)}
                    className="px-3 py-3 bg-gray-50 dark:bg-[#0F172A] border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white outline-none focus:border-yellow-400 transition-colors w-24"
                  >
                    <option value="+91">+91 (IN)</option>
                    <option value="+1">+1 (US/CA)</option>
                    <option value="+44">+44 (UK)</option>
                    <option value="+61">+61 (AU)</option>
                    <option value="+971">+971 (AE)</option>
                  </select>
                  <input 
                    type="tel" 
                    value={newPhone}
                    onChange={e => setNewPhone(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="flex-1 px-4 py-3 bg-gray-50 dark:bg-[#0F172A] border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white outline-none focus:border-yellow-400 transition-colors"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Age <span className="text-red-500">*</span></label>
                  <input 
                    type="number" 
                    value={newAge}
                    onChange={e => setNewAge(e.target.value)}
                    placeholder="e.g. 35"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0F172A] border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white outline-none focus:border-yellow-400 transition-colors"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Gender</label>
                  <select
                    value={newGender}
                    onChange={e => setNewGender(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0F172A] border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white outline-none focus:border-yellow-400 transition-colors appearance-none"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Medical History (Optional)</label>
                <textarea 
                  value={newHistory}
                  onChange={e => setNewHistory(e.target.value)}
                  placeholder="Any pre-existing conditions, allergies, etc."
                  rows={4}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0F172A] border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white outline-none focus:border-yellow-400 transition-colors resize-none"
                />
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-3 shrink-0">
              <button 
                onClick={() => setAddModalVisible(false)}
                className="px-6 py-3 rounded-xl font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#0F172A] transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button 
                onClick={handleAddPatient}
                className="px-6 py-3 rounded-xl font-bold bg-yellow-400 text-yellow-950 hover:bg-yellow-500 transition-colors disabled:opacity-50 flex items-center justify-center min-w-[120px]"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : 'Add Patient'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
