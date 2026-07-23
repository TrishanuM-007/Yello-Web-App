import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { db } from '../../config/firebase';
import { collection, onSnapshot, doc, updateDoc, addDoc } from 'firebase/firestore';
import { Menu, Search, Filter, CalendarPlus, UserPlus, Clock, X, Beaker, CheckCircle } from 'lucide-react';
import { Platform, View, Text } from 'react-native';
import DoctorBookingModal from '../../components/DoctorBookingModal';

export default function AddBookingScreen({ navigation }) {
  const { isDarkMode } = useTheme();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
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

  // Test Booking Modal
  const [isTestModalVisible, setIsTestModalVisible] = useState(false);
  const [selectedTest, setSelectedTest] = useState(null);
  const [manualDate, setManualDate] = useState('');
  const [manualTime, setManualTime] = useState('');
  const [isBookingTest, setIsBookingTest] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web' && !document.getElementById('tailwind-cdn')) {
      const script = document.createElement('script');
      script.id = 'tailwind-cdn';
      script.src = 'https://cdn.tailwindcss.com';
      document.head.appendChild(script);
    }
  }, []);

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

    if (doctorSearch) {
      result = result.filter(d => d.name?.toLowerCase().includes(doctorSearch.toLowerCase()));
    }
    if (specialtyFilter !== 'All') {
      result = result.filter(d => d.specialty === specialtyFilter);
    }

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
    setIsDoctorModalVisible(true);
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

  const confirmTestBooking = async (e) => {
    if (e) e.preventDefault();
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

  const filteredPatients = useMemo(() => {
    if (!patientSearch) return [];
    return patients.filter(p =>
      p.name?.toLowerCase().includes(patientSearch.toLowerCase()) ||
      p.phoneNumber?.includes(patientSearch)
    ).slice(0, 5);
  }, [patients, patientSearch]);

  if (Platform.OS !== 'web') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>This highly styled component is optimized for Web only.</Text>
      </View>
    );
  }

  return (
    <div className={`flex h-screen w-full bg-gray-50 dark:bg-[#0F172A] text-gray-900 dark:text-white ${isDarkMode ? 'dark' : ''}  overflow-hidden font-sans`}>



      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative p-4 md:p-8 flex flex-col min-w-0">

        {/* Header Row */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 shrink-0 border-b border-gray-200 dark:border-gray-800 pb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-gray-900 dark:text-white">Create Booking</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Schedule new doctor appointments or lab tests.</p>
          </div>

          <div className="flex bg-white dark:bg-[#1E293B] p-1 rounded-xl border border-gray-200 dark:border-gray-800 shrink-0">
            <button
              onClick={() => setActiveTab('doctors')}
              className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'doctors' ? 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-white'
                }`}
            >
              Doctors
            </button>
            <button
              onClick={() => navigation.navigate('AvailableTests')}
              className={`px-6 py-2 rounded-lg font-bold text-sm transition-all text-gray-500 dark:text-gray-400 hover:text-white`}
            >
              Lab Tests
            </button>
          </div>
        </header>

        {/* Dynamic Toolbar */}
        <div className="flex flex-wrap items-center gap-4 mb-6 shrink-0 bg-white dark:bg-[#1E293B] p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
          {activeTab === 'doctors' ? (
            <>
              <div className="flex-1 min-w-[200px] relative">
                <Search size={18} className="absolute left-3 top-3 text-gray-500 dark:text-gray-400" />
                <input
                  type="text"
                  placeholder="Search Doctors..."
                  value={doctorSearch}
                  onChange={(e) => setDoctorSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-[#0F172A] border border-gray-300 dark:border-gray-700 rounded-xl text-sm outline-none focus:border-yellow-400 text-gray-900 dark:text-white transition-colors"
                />
              </div>
              <div className="w-48 relative">
                <Filter size={16} className="absolute left-3 top-3 text-gray-500 dark:text-gray-400" />
                <select
                  value={specialtyFilter}
                  onChange={(e) => setSpecialtyFilter(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-[#0F172A] border border-gray-300 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-900 dark:text-white outline-none cursor-pointer appearance-none transition-colors"
                >
                  {specialties.map(spec => (
                    <option key={spec} value={spec}>{spec}</option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <div className="flex-1 min-w-[200px] relative">
              <Search size={18} className="absolute left-3 top-3 text-gray-500 dark:text-gray-400" />
              <input
                type="text"
                placeholder="Search Tests..."
                value={testSearch}
                onChange={(e) => setTestSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-[#0F172A] border border-gray-300 dark:border-gray-700 rounded-xl text-sm outline-none focus:border-yellow-400 text-gray-900 dark:text-white transition-colors"
              />
            </div>
          )}
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-20">

          {activeTab === 'doctors' && (
            loadingDoctors ? (
              <div className="col-span-full py-10 text-center text-gray-500 animate-pulse">Loading doctors...</div>
            ) : mergedDoctors.length === 0 ? (
              <div className="col-span-full p-10 text-center text-gray-500 bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-gray-800 rounded-2xl border-dashed">
                No doctors found.
              </div>
            ) : (
              mergedDoctors.map(item => (
                <div
                  key={item.id}
                  onClick={() => navigation.navigate('MasterCalendar', { selectedDoctorId: item.id, date: new Date().toISOString().split('T')[0] })}
                  className={`bg-white dark:bg-[#1E293B] border rounded-2xl p-5 transition-all flex flex-col cursor-pointer hover:-translate-y-1 hover:shadow-lg ${
                    item.hasSlots 
                      ? 'border-gray-200 dark:border-gray-800 hover:border-gray-600' 
                      : 'border-gray-800/50 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-4 mb-4">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="w-16 h-16 rounded-full object-cover border-2 border-gray-300 dark:border-gray-700" />
                    ) : (
                      <div className="w-16 h-16 bg-gray-50 dark:bg-[#0F172A] border border-gray-300 dark:border-gray-700 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400 shrink-0">
                        <UserPlus size={24} />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-gray-900 dark:text-white text-lg truncate">{item.name}</h3>
                      <p className="text-sm text-yellow-400 font-medium truncate">{item.specialty}</p>
                    </div>
                  </div>

                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 line-clamp-2 min-h-[40px]">
                    {item.description || 'No description available.'}
                  </p>

                  <div className={`mt-auto py-2.5 rounded-xl text-center text-sm font-bold border ${item.hasSlots ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
                    }`}>
                    {item.hasSlots ? `${item.availableSlots.length} Slots Available` : 'Fully Booked'}
                  </div>
                </div>
              ))
            )
          )}

          {activeTab === 'tests' && (
            loadingTests ? (
              <div className="col-span-full py-10 text-center text-gray-500 animate-pulse">Loading tests...</div>
            ) : filteredTests.length === 0 ? (
              <div className="col-span-full p-10 text-center text-gray-500 bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-gray-800 rounded-2xl border-dashed">
                No lab tests found.
              </div>
            ) : (
              filteredTests.map(item => (
                <div
                  key={item.id}
                  onClick={() => handleOpenTestModal(item)}
                  className="bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 hover:border-gray-600 transition-all cursor-pointer hover:-translate-y-1 hover:shadow-lg flex flex-col group"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="w-12 h-12 bg-gray-50 dark:bg-[#0F172A] border border-gray-300 dark:border-gray-700 rounded-full flex items-center justify-center text-blue-400 shrink-0 group-hover:text-yellow-400 transition-colors">
                      <Beaker size={20} />
                    </div>
                    <span className="font-black text-gray-900 dark:text-white text-lg bg-gray-200 dark:bg-gray-800 px-3 py-1 rounded-lg">₹{item.price}</span>
                  </div>

                  <h3 className="font-bold text-gray-900 dark:text-white text-lg mt-3 truncate">{item.testName || item.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 line-clamp-3">
                    {item.description || 'No description available for this test.'}
                  </p>

                  <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between text-yellow-400 font-bold text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                    Schedule Test <ChevronRight size={16} />
                  </div>
                </div>
              ))
            )
          )}

        </div>

      </main>




    </div>
  );
}
