import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { db } from '../../config/firebase';
import { collection, query, where, onSnapshot, doc, getDoc, updateDoc } from 'firebase/firestore';
import { Menu, Activity, CalendarClock, CheckCircle, ChevronRight, Stethoscope } from 'lucide-react';
import { Platform, View, Text } from 'react-native';
import toast from 'react-hot-toast';

const sendWhatsAppMessage = (phone, message) => {
  if (!phone || phone === 'N/A') {
    toast.error("No valid phone number found for this user.");
    return;
  }
  const cleanPhone = phone.replace(/\D/g, ''); 
  const encodedMessage = encodeURIComponent(message);
  window.open(`https://wa.me/${cleanPhone}?text=${encodedMessage}`, '_blank');
};

export default function OngoingServicesScreen() {
  const { isDarkMode } = useTheme();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('appointments'); // 'appointments' or 'tests'
  
  const [ongoingAppointments, setOngoingAppointments] = useState([]);
  const [loadingAppointments, setLoadingAppointments] = useState(true);
  
  const [ongoingTests, setOngoingTests] = useState([]);
  const [loadingTests, setLoadingTests] = useState(true);

  const [processingId, setProcessingId] = useState(null);



  useEffect(() => {
    if (Platform.OS === 'web' && !document.getElementById('tailwind-cdn')) {
      const script = document.createElement('script');
      script.id = 'tailwind-cdn';
      script.src = 'https://cdn.tailwindcss.com';
      document.head.appendChild(script);
    }
  }, []);

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

  const handleCheckout = async (id, collectionName, patientId, patientPhone) => {
    setProcessingId(id);
    try {
      const docRef = doc(db, collectionName, id);
      await updateDoc(docRef, {
        status: 'completed',
        completedAt: new Date().toISOString()
      });
      toast.success('Service marked as completed!');

      if (patientPhone) {
        const reviewMsg = `Thank You for Visiting/Choosing YelloMedi for your service, we would be happy if you could give us a review on this link: https://g.page/review/...`;
        sendWhatsAppMessage(patientPhone, reviewMsg);
      }
    } catch (error) {
      console.error('Error marking service as done:', error);
      toast.error('Failed to update status.');
    } finally {
      setProcessingId(null);
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
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 shrink-0 border-b border-gray-200 dark:border-gray-800 pb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-gray-900 dark:text-white">Ongoing Services</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Manage active patient appointments and lab tests.</p>
          </div>
          
          <div className="flex bg-white dark:bg-[#1E293B] p-1 rounded-xl border border-gray-200 dark:border-gray-800 shrink-0">
            <button 
              onClick={() => setActiveTab('appointments')}
              className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${
                activeTab === 'appointments' ? 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-white'
              }`}
            >
              Appointments
            </button>
            <button 
              onClick={() => setActiveTab('tests')}
              className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${
                activeTab === 'tests' ? 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-white'
              }`}
            >
              Lab Tests
            </button>
          </div>
        </header>

        {/* Dynamic Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-20">
          
          {activeTab === 'appointments' && (
            loadingAppointments ? (
              /* Skeleton Loaders */
              [1, 2, 3, 4].map(n => (
                <div key={n} className="bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 flex flex-col animate-pulse">
                  <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-200 dark:border-gray-800">
                    <div className="w-10 h-10 bg-gray-200 dark:bg-gray-800 rounded-full" />
                    <div className="flex-1">
                      <div className="w-1/2 h-4 bg-gray-200 dark:bg-gray-800 rounded-md mb-2" />
                      <div className="w-1/3 h-3 bg-gray-200 dark:bg-gray-800 rounded-md" />
                    </div>
                  </div>
                  <div className="w-3/4 h-4 bg-gray-200 dark:bg-gray-800 rounded-md mb-2" />
                  <div className="w-1/4 h-5 bg-gray-200 dark:bg-gray-800 rounded-md mb-6" />
                  <div className="w-full h-10 bg-gray-200 dark:bg-gray-800 rounded-xl mt-auto" />
                </div>
              ))
            ) : ongoingAppointments.length === 0 ? (
              /* Empty State */
              <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
                <CalendarClock className="w-16 h-16 text-gray-400 dark:text-gray-700 mb-4" />
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-400">No Records Found</h3>
                <p className="text-sm text-gray-500 dark:text-gray-600 mt-2">There is currently no data to display here.</p>
              </div>
            ) : (
              ongoingAppointments.map(item => (
                <div key={item.id} className="bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 hover:border-gray-600 transition-colors flex flex-col">
                  <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-200 dark:border-gray-800">
                    <div className="w-10 h-10 bg-gray-50 dark:bg-[#0F172A] border border-gray-300 dark:border-gray-700 rounded-full flex items-center justify-center text-yellow-400">
                      <Stethoscope size={18} />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white">Dr. {item.doctorName}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{item.date} at {item.time}</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2 mb-6">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Patient: {item.patientName}</p>
                    <div className="bg-yellow-400/10 text-yellow-400 text-xs font-bold px-2 py-1 rounded inline-block w-fit">
                      In Progress
                    </div>
                  </div>

                  <div className="mt-auto pt-4 border-t border-gray-200 dark:border-gray-800">
                    <button
                      disabled={processingId === item.id}
                      onClick={() => handleCheckout(item.id, 'available_slots', item.patientId, item.patientPhone)}
                      className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex justify-center items-center gap-2 ${
                        processingId === item.id 
                          ? 'bg-gray-200 dark:bg-gray-800 text-gray-500 cursor-not-allowed'
                          : 'bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white border border-green-500/20'
                      }`}
                    >
                      {processingId === item.id ? 'Processing...' : (
                        <>
                          <CheckCircle size={16} />
                          Checkout
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))
            )
          )}

          {activeTab === 'tests' && (
            loadingTests ? (
              /* Skeleton Loaders */
              [1, 2, 3, 4].map(n => (
                <div key={n} className="bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 flex flex-col animate-pulse">
                  <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-200 dark:border-gray-800">
                    <div className="w-10 h-10 bg-gray-200 dark:bg-gray-800 rounded-full" />
                    <div className="flex-1">
                      <div className="w-1/2 h-4 bg-gray-200 dark:bg-gray-800 rounded-md mb-2" />
                      <div className="w-1/3 h-3 bg-gray-200 dark:bg-gray-800 rounded-md" />
                    </div>
                  </div>
                  <div className="w-3/4 h-4 bg-gray-200 dark:bg-gray-800 rounded-md mb-2" />
                  <div className="w-1/4 h-5 bg-gray-200 dark:bg-gray-800 rounded-md mb-6" />
                  <div className="w-full h-10 bg-gray-200 dark:bg-gray-800 rounded-xl mt-auto" />
                </div>
              ))
            ) : ongoingTests.length === 0 ? (
              /* Empty State */
              <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
                <Activity className="w-16 h-16 text-gray-400 dark:text-gray-700 mb-4" />
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-400">No Records Found</h3>
                <p className="text-sm text-gray-500 dark:text-gray-600 mt-2">There is currently no data to display here.</p>
              </div>
            ) : (
              ongoingTests.map(item => (
                <div key={item.id} className="bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 hover:border-gray-600 transition-colors flex flex-col">
                  <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-200 dark:border-gray-800">
                    <div className="w-10 h-10 bg-gray-50 dark:bg-[#0F172A] border border-gray-300 dark:border-gray-700 rounded-full flex items-center justify-center text-blue-400">
                      <Activity size={18} />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white truncate max-w-[200px]">{item.testName}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{item.requestedDate} at {item.requestedTime}</p>
                    </div>
                  </div>
                  
                  <div className="flex-1 mb-6">
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Patient</p>
                    <p className="font-medium text-gray-900 dark:text-white mb-1">{item.patientName}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{item.patientPhone}</p>
                  </div>

                  <div className="mt-auto pt-4 border-t border-gray-200 dark:border-gray-800">
                    <button
                      disabled={processingId === item.id}
                      onClick={() => handleCheckout(item.id, 'test_requests', item.patientId, item.patientPhone)}
                      className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex justify-center items-center gap-2 ${
                        processingId === item.id 
                          ? 'bg-gray-200 dark:bg-gray-800 text-gray-500 cursor-not-allowed'
                          : 'bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20'
                      }`}
                    >
                      {processingId === item.id ? 'Processing...' : (
                        <>
                          <CheckCircle size={16} />
                          Complete Test
                        </>
                      )}
                    </button>
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
