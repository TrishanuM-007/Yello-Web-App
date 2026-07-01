import React, { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { Menu, Calendar, UserPlus, ChevronRight, Stethoscope } from 'lucide-react';
import { Platform, View, Text } from 'react-native';

export default function ManageAppointmentsScreen({ navigation }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (Platform.OS === 'web' && !document.getElementById('tailwind-cdn')) {
      const script = document.createElement('script');
      script.id = 'tailwind-cdn';
      script.src = 'https://cdn.tailwindcss.com';
      document.head.appendChild(script);
    }
  }, []);

  useEffect(() => {
    // Order by createdAt descending to show newest doctors first
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

  if (Platform.OS !== 'web') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>This component is optimized for Web only.</Text>
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
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-gray-900 dark:text-white">Manage Appointments</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Select a doctor to manage their available schedule and slots.</p>
          </div>

          <button
            onClick={() => navigation?.navigate('AddDoctorScreen')}
            className="px-6 py-3 rounded-xl font-bold text-sm bg-yellow-400 hover:bg-yellow-500 text-yellow-950 transition-all flex items-center gap-2 shadow-[0_4px_15px_rgb(250,204,21,0.2)] hover:shadow-[0_6px_20px_rgb(250,204,21,0.3)] shrink-0 w-fit"
          >
            <UserPlus size={18} /> Add New Doctor
          </button>
        </header>

        <div className="max-w-4xl w-full pb-24">

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-gray-500 animate-pulse">
              <div className="w-12 h-12 border-4 border-gray-300 dark:border-gray-700 border-t-yellow-400 rounded-full animate-spin mb-4"></div>
              <p>Loading doctors...</p>
            </div>
          ) : doctors.length === 0 ? (
            <div className="bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-gray-800 border-dashed rounded-3xl p-16 flex flex-col items-center justify-center text-center">
              <Stethoscope size={48} className="text-gray-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Doctors Found</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">There are no doctors registered in the system yet.</p>
              <button
                onClick={() => navigation?.navigate('AddDoctorScreen')}
                className="px-6 py-3 rounded-xl font-bold text-sm bg-gray-200 dark:bg-gray-800 hover:bg-gray-700 text-gray-900 dark:text-white transition-all border border-gray-300 dark:border-gray-700"
              >
                Add Your First Doctor
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {doctors.map(doctor => (
                <div
                  key={doctor.id}
                  onClick={() => navigation?.navigate('DoctorSlotsAdminScreen', { doctor })}
                  className="bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-gray-800 hover:border-yellow-400/50 rounded-2xl p-4 md:p-6 flex items-center justify-between cursor-pointer transition-all group hover:bg-[#1E293B]/80 hover:shadow-lg hover:-translate-y-0.5"
                >
                  <div className="flex items-center gap-5">
                    {/* Doctor Avatar Placeholder */}
                    <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 flex items-center justify-center text-yellow-400 shrink-0 overflow-hidden">
                      {doctor.imageUrl ? (
                        <img src={doctor.imageUrl} alt={doctor.name} className="w-full h-full object-cover" />
                      ) : (
                        <Stethoscope size={20} />
                      )}
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-yellow-400 transition-colors">{doctor.name}</h3>
                      <p className="text-gray-500 dark:text-gray-400 text-sm">{doctor.specialty} <span className="mx-1">•</span> {doctor.experience || 0} yrs exp</p>
                    </div>
                  </div>

                  <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-[#0F172A] border border-gray-300 dark:border-gray-700 flex items-center justify-center text-gray-500 group-hover:bg-yellow-400 group-hover:border-yellow-400 group-hover:text-yellow-950 transition-all shrink-0">
                    <ChevronRight size={20} />
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>

      </main>

    </div>


  );
}
