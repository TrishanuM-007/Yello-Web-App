import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { db } from '../../config/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { ArrowLeft, User, Phone, Calendar, Stethoscope, Clock, FileText, Activity } from 'lucide-react';
import { formatDate } from '../../utils/dateUtils';
import { Platform, View, Text } from 'react-native';

export default function PatientDetailsScreen({ route, navigation }) {
  const { isDarkMode } = useTheme();

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
          if (!acc.find(s => s.id === doc.id)) acc.push({ id: doc.id, ...doc.data(), type: 'appointment' });
          return acc;
        }, []);

        // Fetch Completed Lab Tests
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

    if (Platform.OS === 'web' && !document.getElementById('tailwind-cdn')) {
      const script = document.createElement('script');
      script.id = 'tailwind-cdn';
      script.src = 'https://cdn.tailwindcss.com';
      document.head.appendChild(script);
    }

    fetchHistory();
  }, [patientId]);

  if (Platform.OS !== 'web') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>This component is optimized for Web only.</Text>
      </View>
    );
  }

  return (
    <div className="flex h-screen w-full bg-gray-50 dark:bg-[#0F172A] text-gray-900 dark:text-white overflow-hidden font-sans transition-colors duration-300">
      <main className="flex-1 overflow-y-auto relative p-4 md:p-8 flex flex-col min-w-0">

        {/* Header Row */}
        <header className="flex items-center gap-4 mb-8 shrink-0 border-b border-gray-200 dark:border-gray-800 pb-6">
          <button
            onClick={() => navigation.goBack()}
            className="w-10 h-10 bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-gray-700 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-yellow-500 dark:hover:text-yellow-400 transition-colors shadow-sm outline-none"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-gray-900 dark:text-white">Patient Profile</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Detailed history and information.</p>
          </div>
        </header>

        <div className="max-w-4xl w-full mx-auto flex flex-col gap-6 pb-20">

          {/* Profile Card */}
          <div className="bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-gray-800 rounded-3xl p-6 md:p-8 shadow-sm flex flex-col md:flex-row gap-8 items-start md:items-center relative overflow-hidden">
            {/* decorative background element */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-400/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>

            <div className="w-24 h-24 bg-gray-100 dark:bg-[#0F172A] border border-gray-200 dark:border-gray-700 rounded-full flex items-center justify-center shrink-0">
              <span className="text-4xl font-black text-gray-900 dark:text-white">
                {patientData.name.charAt(0).toUpperCase()}
              </span>
            </div>

            <div className="flex-1 relative z-10">
              <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-4">{patientData.name}</h2>

              <div className="flex flex-wrap gap-4 text-sm font-medium">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-[#0F172A] px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700">
                  <Phone size={14} className="text-yellow-500" />
                  {patientData.phoneNumber}
                </div>
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-[#0F172A] px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700">
                  <User size={14} className="text-yellow-500" />
                  {patientData.gender}
                </div>
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-[#0F172A] px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700">
                  <Calendar size={14} className="text-yellow-500" />
                  Joined: {formatDate(patientData.createdAt || 0)}
                </div>
              </div>
            </div>
          </div>

          {patientData.medicalHistory && (
            <div className="bg-yellow-50 dark:bg-yellow-400/5 border border-yellow-200 dark:border-yellow-400/20 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-3 text-yellow-800 dark:text-yellow-400 font-bold">
                <Activity size={18} />
                <h3>Medical History</h3>
              </div>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-sm">
                {patientData.medicalHistory}
              </p>
            </div>
          )}

          {/* Service History Timeline */}
          <div className="mt-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <Clock size={20} className="text-gray-400" />
              Service History
            </h3>

            {loading ? (
              <div className="py-10 text-center text-gray-500 font-medium animate-pulse">Loading history...</div>
            ) : history.length === 0 ? (
              <div className="p-8 text-center text-gray-500 bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-gray-800 rounded-2xl border-dashed">
                No service history found for this patient.
              </div>
            ) : (
              <div className="relative border-l-2 border-gray-200 dark:border-gray-800 ml-4 space-y-8 pb-10">
                {history.map((item, index) => {
                  const isAppt = item.type === 'appointment';
                  const dateStr = item.date ? formatDate(item.date) : (item.requestedDate ? formatDate(item.requestedDate) : formatDate(item.createdAt || 0));

                  return (
                    <div key={item.id} className="relative pl-8">
                      {/* Timeline Dot */}
                      <div className={`absolute -left-[9px] top-4 w-4 h-4 rounded-full border-2 border-gray-50 dark:border-[#0F172A] ${isAppt ? 'bg-green-500' : 'bg-blue-500'}`}></div>

                      <div className="bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow group">
                        <div className="flex items-center justify-between mb-3">
                          <div className={`flex items-center gap-2 text-xs font-bold px-2 py-1 rounded-md ${isAppt ? 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400'}`}>
                            {isAppt ? <Stethoscope size={14} /> : <FileText size={14} />}
                            {isAppt ? 'Doctor Appointment' : 'Lab Test'}
                          </div>
                          <span className="text-xs text-gray-500 font-medium">{dateStr}</span>
                        </div>

                        <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                          {isAppt ? `${item.doctorName || 'Doctor'}` : item.testName}
                        </h4>

                        {(item.time || item.notes) && (
                          <div className="flex flex-col gap-1 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800/50">
                            {item.time && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600"></span>
                                <strong className="text-gray-700 dark:text-gray-300">Time:</strong> {item.time}
                              </p>
                            )}
                            {item.notes && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600"></span>
                                <strong className="text-gray-700 dark:text-gray-300">Notes:</strong> {item.notes}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
