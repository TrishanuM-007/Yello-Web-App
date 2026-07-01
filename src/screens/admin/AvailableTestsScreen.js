import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../config/firebase';
import { collection, onSnapshot, addDoc } from 'firebase/firestore';
import { Menu, FileText, CheckCircle, Plus, X, Search, Clock, User, ChevronLeft } from 'lucide-react';
import { Platform, View, Text } from 'react-native';

export default function AvailableTestsScreen({ navigation }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [tests, setTests] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Booking Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTest, setSelectedTest] = useState(null);
  
  // Form State
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [manualDate, setManualDate] = useState('');
  const [manualTime, setManualTime] = useState('');
  const [bookingStatus, setBookingStatus] = useState('idle'); // idle, loading, success

  useEffect(() => {
    if (Platform.OS === 'web' && !document.getElementById('tailwind-cdn')) {
      const script = document.createElement('script');
      script.id = 'tailwind-cdn';
      script.src = 'https://cdn.tailwindcss.com';
      document.head.appendChild(script);
    }
  }, []);

  // Fetch Tests
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'available_tests'), (snapshot) => {
      const fetchedTests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTests(fetchedTests);
      setLoading(false);
    }, (error) => {
      console.error(error);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Fetch Patients
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'patients'), (snapshot) => {
      const fetchedPatients = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPatients(fetchedPatients);
    }, (error) => {
      console.error(error);
    });
    return () => unsub();
  }, []);

  const filteredPatients = useMemo(() => {
    if (!patientSearch || selectedPatientId) return [];
    const term = patientSearch.toLowerCase();
    return patients.filter(p => 
      p.name?.toLowerCase().includes(term) || 
      p.phoneNumber?.includes(term)
    );
  }, [patients, patientSearch, selectedPatientId]);

  const openBookingModal = (test) => {
    setSelectedTest(test);
    setPatientSearch('');
    setSelectedPatientId(null);
    setManualDate('');
    setManualTime('');
    setBookingStatus('idle');
    setIsModalOpen(true);
  };

  const closeBookingModal = () => {
    setIsModalOpen(false);
    setTimeout(() => {
      setSelectedTest(null);
    }, 300);
  };

  const handleConfirmBooking = async (e) => {
    e.preventDefault();
    
    // Ensure all required fields are provided
    if (!selectedPatientId || !manualDate || !manualTime || !selectedTest) {
      window.alert('Please fill out all fields and select a valid patient from the list.');
      return;
    }

    const patientInfo = patients.find(p => p.id === selectedPatientId);
    if (!patientInfo) return;

    setBookingStatus('loading');
    try {
      await addDoc(collection(db, 'test_requests'), {
        testId: selectedTest.id,
        testName: selectedTest.name || selectedTest.testName || 'Unknown Test',
        patientId: selectedPatientId,
        patientName: patientInfo.name || 'Unknown Patient',
        patientPhone: patientInfo.phoneNumber || 'N/A',
        date: manualDate,
        time: manualTime,
        status: 'confirmed',
        requestedAt: new Date().toISOString()
      });
      
      setBookingStatus('success');
      setTimeout(() => {
        closeBookingModal();
      }, 1500);
    } catch (error) {
      console.error(error);
      window.alert("Failed to confirm test booking.");
      setBookingStatus('idle');
    }
  };

  if (Platform.OS !== 'web') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>This component is optimized for Web only.</Text>
      </View>
    );
  }

  return (
    <div className="flex h-screen w-full bg-gray-50 dark:bg-[#0F172A] text-gray-900 dark:text-white overflow-hidden font-sans transition-colors duration-300">
      
      {/* Main Content (No Sidebar) */}
      <main className="flex-1 overflow-y-auto relative p-4 md:p-8 flex flex-col min-w-0">
        
        {/* Header Row */}
        <header className="flex flex-col gap-2 mb-8 shrink-0 border-b border-gray-200 dark:border-gray-800 pb-6 relative">
          <button 
            onClick={() => navigation.goBack()} 
            className="absolute top-0 right-0 flex items-center gap-1 text-sm font-bold text-gray-500 dark:text-gray-400 hover:text-white transition-colors bg-gray-800/50 hover:bg-gray-800 px-4 py-2 rounded-full"
          >
            <ChevronLeft size={16} /> Back
          </button>
          
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-gray-900 dark:text-white">Available Lab Tests</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Select an available test to book a time slot for a patient.</p>
        </header>

        {loading ? (
          <div className="py-20 text-center text-gray-500 dark:text-gray-400 animate-pulse">Loading tests...</div>
        ) : tests.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 border border-dashed border-gray-200 dark:border-gray-800 rounded-3xl bg-white dark:bg-[#1E293B]">
            <Search size={48} className="mb-4 opacity-50" />
            <p>No tests are currently available in the catalog.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-24">
            {tests.map(test => (
              <div 
                key={test.id} 
                className="bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-md hover:shadow-xl hover:border-yellow-400 transition-all cursor-pointer group flex flex-col h-full"
                onClick={() => openBookingModal(test)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-full bg-gray-50 dark:bg-[#0F172A] text-blue-400 border border-gray-300 dark:border-gray-700 flex items-center justify-center shrink-0">
                    <FileText size={24} />
                  </div>
                  <div className="bg-gray-200 dark:bg-gray-800 text-green-400 text-xs font-bold px-2 py-1 rounded-md">
                    Available
                  </div>
                </div>
                
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 group-hover:text-yellow-400 transition-colors">
                  {test.name || test.testName || 'Unknown Test'}
                </h3>
                
                <p className="text-gray-500 dark:text-gray-400 text-sm line-clamp-2 mb-4 flex-1">
                  {test.description || 'Routine laboratory testing protocol.'}
                </p>
                
                <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-800">
                  <span className="font-black text-gray-900 dark:text-white">
                    ₹{test.price || 'N/A'}
                  </span>
                  <button className="text-sm font-bold text-yellow-400 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Plus size={16} /> Book Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </main>

      {/* Booking Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm transition-opacity">
          <div className="relative bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-gray-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-[#0F172A]/50">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Book Lab Test</h2>
                {selectedTest && <p className="text-yellow-400 font-medium mt-1 text-sm">{selectedTest.name || selectedTest.testName}</p>}
              </div>
              <button 
                onClick={closeBookingModal}
                className="p-2 rounded-full hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors bg-gray-800/50"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleConfirmBooking} className="p-6 overflow-y-auto flex flex-col gap-5">

              <div className="flex flex-col gap-2 relative">
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider pl-1">1. Select Patient</label>
                <div className="relative">
                  <Search size={16} className="absolute left-4 top-[14px] text-gray-500 dark:text-gray-400" />
                  <input 
                    type="text"
                    required={!selectedPatientId}
                    placeholder="Type Name or Phone..."
                    value={patientSearch}
                    onChange={(e) => {
                      setPatientSearch(e.target.value);
                      setSelectedPatientId(null);
                    }}
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-[#0F172A] border border-gray-300 dark:border-gray-700 rounded-xl text-sm outline-none focus:border-yellow-400 text-gray-900 dark:text-white transition-colors"
                  />
                </div>
                
                {filteredPatients.length > 0 && !selectedPatientId && (
                  <div className="absolute top-[72px] left-0 right-0 bg-gray-50 dark:bg-[#0F172A] border border-gray-300 dark:border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-48 overflow-y-auto">
                    {filteredPatients.map(p => (
                      <button 
                        key={p.id} 
                        type="button"
                        onClick={() => {
                          setSelectedPatientId(p.id);
                          setPatientSearch(`${p.name} (${p.phoneNumber})`);
                        }}
                        className="w-full text-left px-4 py-3 border-b border-gray-200 dark:border-gray-800 hover:bg-gray-800 text-sm text-gray-200 transition-colors flex items-center justify-between"
                      >
                        <span className="font-medium text-gray-900 dark:text-white">{p.name}</span>
                        <span className="text-gray-500 dark:text-gray-400 text-xs">{p.phoneNumber}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider pl-1">2. Date</label>
                <input 
                  type="date"
                  required
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0F172A] border border-gray-300 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-900 dark:text-white outline-none focus:border-yellow-400 transition-colors"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider pl-1">3. Time</label>
                <input 
                  type="time"
                  required
                  value={manualTime}
                  onChange={(e) => setManualTime(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0F172A] border border-gray-300 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-900 dark:text-white outline-none focus:border-yellow-400 transition-colors"
                />
              </div>

              <div className="mt-4">
                {bookingStatus === 'success' ? (
                  <div className="w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 bg-green-500 text-gray-900 shadow-lg">
                    <CheckCircle size={20} />
                    Booking Confirmed!
                  </div>
                ) : (
                  <button
                    type="submit"
                    disabled={bookingStatus === 'loading'}
                    className={`w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all ${
                      bookingStatus === 'loading'
                        ? 'bg-gray-200 dark:bg-gray-800 text-gray-500 cursor-not-allowed'
                        : 'bg-yellow-400 hover:bg-yellow-500 text-black shadow-[0_4px_15px_rgb(250,204,21,0.2)] hover:shadow-[0_6px_20px_rgb(250,204,21,0.3)] hover:-translate-y-0.5'
                    }`}
                  >
                    {bookingStatus === 'loading' ? 'Confirming...' : 'Confirm Booking'}
                  </button>
                )}
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
