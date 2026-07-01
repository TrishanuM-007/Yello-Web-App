import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { db } from '../../config/firebase';
import { collection, addDoc, onSnapshot, query, where, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { Menu, CalendarPlus, Trash2, CalendarDays, CheckCircle, Clock, CheckSquare, Square, ChevronLeft } from 'lucide-react';
import { Platform, View, Text } from 'react-native';

export default function DoctorSlotsAdminScreen({ route, navigation }) {
  const { isDarkMode } = useTheme();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { doctor } = route?.params || {};
  
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [shiftStart, setShiftStart] = useState('09:00');
  const [shiftEnd, setShiftEnd] = useState('17:00');
  const [generatedSlots, setGeneratedSlots] = useState([]);
  
  const [addingSlot, setAddingSlot] = useState(false);
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(true);

  // Batch Deletion State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedSlotIds, setSelectedSlotIds] = useState([]);

  useEffect(() => {
    if (Platform.OS === 'web' && !document.getElementById('tailwind-cdn')) {
      const script = document.createElement('script');
      script.id = 'tailwind-cdn';
      script.src = 'https://cdn.tailwindcss.com';
      document.head.appendChild(script);
    }
  }, []);

  useEffect(() => {
    if (!doctor || !doctor.id) {
      setLoadingSlots(false);
      return;
    }
    
    const simpleQ = query(collection(db, 'available_slots'), where('doctorId', '==', doctor.id));

    const unsubscribe = onSnapshot(simpleQ, (snapshot) => {
      const slotsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      slotsList.sort((a, b) => {
        if (a.date === b.date) {
          return a.time.localeCompare(b.time);
        }
        return a.date.localeCompare(b.date);
      });
      setSlots(slotsList);
      setLoadingSlots(false);
    }, (error) => {
      console.error("Error fetching slots: ", error);
      window.alert('Error: Failed to fetch existing slots.');
      setLoadingSlots(false);
    });

    return () => unsubscribe();
  }, [doctor]);

  const handlePreviewSlots = () => {
    const startDateTime = new Date(`${date}T${shiftStart}:00`);
    const endDateTime = new Date(`${date}T${shiftEnd}:00`);

    if (endDateTime <= startDateTime) {
      window.alert('Invalid Time: Shift end must be after shift start.');
      return;
    }
    const tempSlots = [];
    let current = startDateTime;
    while (current < endDateTime) {
      tempSlots.push(new Date(current));
      current.setMinutes(current.getMinutes() + 15);
    }
    setGeneratedSlots(tempSlots);
  };

  const handleAddSlots = async () => {
    if (generatedSlots.length === 0) {
      window.alert('Error: Please generate slots before publishing.');
      return;
    }

    setAddingSlot(true);
    try {
      const dateString = date;

      for (const slot of generatedSlots) {
        const startStr = slot.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).toUpperCase();
        const endSlot = new Date(slot.getTime() + 15 * 60000);
        const endStr = endSlot.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).toUpperCase();
        
        const slotData = {
          doctorId: doctor.id,
          doctorName: doctor.name,
          specialty: doctor.specialty,
          date: dateString,
          time: `${startStr} - ${endStr}`,
          isBooked: false,
          createdAt: new Date().toISOString()
        };
        await addDoc(collection(db, 'available_slots'), slotData);
      }

      window.alert(`Success: ${generatedSlots.length} slots added successfully!`);
      setGeneratedSlots([]);
    } catch (error) {
      console.error('Error adding slots:', error);
      window.alert('Error: Failed to add slots. Please try again.');
    } finally {
      setAddingSlot(false);
    }
  };

  const handleDeleteDoctor = () => {
    if (window.confirm(`Delete Doctor: Are you sure you want to delete ${doctor.name}? This will also delete all their slots.`)) {
      (async () => {
        try {
          const slotsQuery = query(collection(db, 'available_slots'), where('doctorId', '==', doctor.id));
          const slotsSnapshot = await getDocs(slotsQuery);
          const batchPromises = slotsSnapshot.docs.map(slotDoc => deleteDoc(doc(db, 'available_slots', slotDoc.id)));
          await Promise.all(batchPromises);

          await deleteDoc(doc(db, 'doctors', doctor.id));

          window.alert('Success: Doctor deleted successfully.');
          if (navigation?.goBack) {
            navigation.goBack();
          } else {
            window.location.reload();
          }
        } catch (error) {
          console.error('Error deleting doctor:', error);
          window.alert('Error: Failed to delete doctor.');
        }
      })();
    }
  };

  const handleBatchDeleteSlots = async () => {
    if (selectedSlotIds.length === 0) return;

    const bookedSelected = slots.filter(s => selectedSlotIds.includes(s.id) && s.isBooked);
    let warningMsg = `Are you sure you want to delete ${selectedSlotIds.length} slot(s)?`;
    if (bookedSelected.length > 0) {
      warningMsg += `\n\nWARNING: ${bookedSelected.length} of these slots are currently BOOKED!`;
    }

    if (window.confirm(warningMsg)) {
      setLoadingSlots(true);
      try {
        const batchPromises = selectedSlotIds.map(id => deleteDoc(doc(db, 'available_slots', id)));
        await Promise.all(batchPromises);
        window.alert('Success: Slots deleted successfully.');
        setIsSelectionMode(false);
        setSelectedSlotIds([]);
      } catch (error) {
        console.error('Error batch deleting slots:', error);
        window.alert('Error: Failed to delete some slots.');
      } finally {
        setLoadingSlots(false);
      }
    }
  };

  const toggleSlotSelection = (id) => {
    if (!isSelectionMode) return;
    if (selectedSlotIds.includes(id)) {
      setSelectedSlotIds(prev => prev.filter(slotId => slotId !== id));
    } else {
      setSelectedSlotIds(prev => [...prev, id]);
    }
  };

  if (Platform.OS !== 'web') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>This component is optimized for Web only.</Text>
      </View>
    );
  }

  if (!doctor) {
    return (
      <div className="flex h-screen w-full bg-gray-50 dark:bg-[#0F172A] items-center justify-center text-gray-900 dark:text-white font-sans">
        <p>No doctor provided. Please navigate from the Doctors list.</p>
      </div>
    );
  }

  return (
    <div className={`flex h-screen w-full bg-gray-50 dark:bg-[#0F172A] text-gray-900 dark:text-white ${isDarkMode ? 'dark' : ''}  overflow-hidden font-sans`}>
      
      

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative p-4 md:p-8 flex flex-col min-w-0">
        
        {/* Header Row */}
        <header className="flex flex-col gap-4 mb-8 shrink-0 border-b border-gray-200 dark:border-gray-800 pb-6">
          <button onClick={() => navigation?.goBack()} className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-yellow-400 transition-colors w-fit">
            <ChevronLeft size={16} /> Back to Doctors
          </button>
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-gray-900 dark:text-white flex items-center gap-3">
                {doctor.name}
              </h1>
              <p className="text-yellow-400 font-bold mt-1 text-sm">{doctor.specialty} • {doctor.experience} yrs exp</p>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{doctor.contactNumber}</p>
            </div>
            
            <button 
              onClick={handleDeleteDoctor}
              className="px-6 py-2.5 rounded-lg font-bold text-sm bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all flex items-center gap-2 shrink-0"
            >
              <Trash2 size={16} /> Delete Doctor
            </button>
          </div>
        </header>

        <div className="flex flex-col gap-8 pb-24">
          
          {/* Add New Slots Form */}
          <div className="w-full shrink-0">
            <div className="bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-xl flex flex-col xl:flex-row gap-5 items-start">
              
              <div className="flex-shrink-0 xl:w-48 xl:border-r xl:border-gray-800 xl:pr-5 xl:pt-2">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <CalendarPlus className="text-yellow-400" size={20} /> Add Slots
                </h2>
                <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">Generate bulk shifts</p>
              </div>
              
              <div className="flex-1 flex flex-col md:flex-row gap-5 w-full items-end">
                <div className="flex-1 flex flex-col gap-2 w-full">
                  <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider pl-1">Target Date</label>
                  <input 
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0F172A] border border-gray-300 dark:border-gray-700 rounded-xl text-sm outline-none focus:border-yellow-400 text-gray-900 dark:text-white transition-colors"
                  />
                </div>

                <div className="flex-1 flex flex-col gap-2 w-full md:col-span-2">
                  <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider pl-1">Shift Timing (15m intervals)</label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="time" 
                      required
                      value={shiftStart} 
                      onChange={(e) => setShiftStart(e.target.value)} 
                      className="flex-1 px-4 py-3 bg-gray-50 dark:bg-[#0F172A] border border-gray-300 dark:border-gray-700 rounded-xl text-sm outline-none focus:border-yellow-400 text-gray-900 dark:text-white transition-colors"
                    />
                    <span className="text-gray-500 font-medium">to</span>
                    <input 
                      type="time" 
                      required
                      value={shiftEnd} 
                      onChange={(e) => setShiftEnd(e.target.value)} 
                      className="flex-1 px-4 py-3 bg-gray-50 dark:bg-[#0F172A] border border-gray-300 dark:border-gray-700 rounded-xl text-sm outline-none focus:border-yellow-400 text-gray-900 dark:text-white transition-colors"
                    />
                  </div>
                </div>
                
                <button
                  type="button"
                  onClick={handlePreviewSlots}
                  className="w-full md:w-auto shrink-0 px-6 py-3.5 rounded-xl font-bold text-sm bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-700 transition-all border border-gray-300 dark:border-gray-700"
                >
                  Preview
                </button>
              </div>

              {generatedSlots.length > 0 && (
                <div className="w-full xl:w-auto xl:min-w-[300px] xl:border-l xl:border-gray-800 xl:pl-5 flex flex-col gap-4">
                  <p className="text-sm text-yellow-400 font-bold">Preview: {generatedSlots.length} Slots</p>
                  
                  <div className="flex flex-row xl:flex-wrap gap-2 max-h-24 overflow-y-auto overflow-x-auto custom-scrollbar">
                    {generatedSlots.map((slot, idx) => (
                      <span key={idx} className="px-3 py-1 bg-gray-50 dark:bg-[#0F172A] border border-gray-300 dark:border-gray-700 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 shrink-0">
                        {slot.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).toUpperCase()}
                      </span>
                    ))}
                  </div>

                  <button
                    onClick={handleAddSlots}
                    disabled={addingSlot}
                    className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                      addingSlot
                        ? 'bg-gray-200 dark:bg-gray-800 text-gray-500 cursor-not-allowed'
                        : 'bg-yellow-400 hover:bg-yellow-500 text-yellow-950 shadow-md'
                    }`}
                  >
                    {addingSlot ? 'Publishing...' : 'Publish Slots'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Existing Slots Grid */}
          <div className="flex-1 w-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Existing Slots Catalog</h2>
              
              <div className="flex items-center gap-3">
                {isSelectionMode && selectedSlotIds.length > 0 && (
                  <button
                    onClick={handleBatchDeleteSlots}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-gray-900 dark:text-white rounded-lg font-bold text-sm transition-colors shadow-sm"
                  >
                    Delete Selected ({selectedSlotIds.length})
                  </button>
                )}
                <button
                  onClick={() => {
                    setIsSelectionMode(!isSelectionMode);
                    setSelectedSlotIds([]);
                  }}
                  className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors border ${
                    isSelectionMode ? 'bg-yellow-400 text-black border-yellow-400' : 'bg-transparent text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700 hover:bg-gray-800'
                  }`}
                >
                  {isSelectionMode ? 'Cancel Selection' : 'Select Slots'}
                </button>
              </div>
            </div>
            
            {loadingSlots ? (
              <div className="py-20 text-center text-gray-500 animate-pulse">Loading slots...</div>
            ) : slots.length === 0 ? (
              <div className="p-10 text-center text-gray-500 bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-gray-800 rounded-2xl border-dashed">
                No slots found for this doctor.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {slots.map(slot => {
                  const isSelected = selectedSlotIds.includes(slot.id);
                  return (
                    <div 
                      key={slot.id} 
                      onClick={() => toggleSlotSelection(slot.id)}
                      className={`bg-white dark:bg-[#1E293B] border rounded-xl p-4 transition-colors flex items-center justify-between ${
                        isSelectionMode ? 'cursor-pointer hover:border-yellow-400/50' : ''
                      } ${isSelected ? 'border-yellow-400 bg-yellow-400/5' : 'border-gray-200 dark:border-gray-800'}`}
                    >
                      <div>
                        <p className="text-gray-900 dark:text-white font-bold">{slot.date}</p>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5 flex items-center gap-1.5"><Clock size={12}/> {slot.time}</p>
                      </div>
                      
                      <div className="flex flex-col items-end gap-2">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                          slot.isBooked ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-green-500/10 text-green-400 border border-green-500/20'
                        }`}>
                          {slot.isBooked ? 'Booked' : 'Available'}
                        </span>
                        {isSelectionMode && (
                          <div className={`text-xl ${isSelected ? 'text-yellow-400' : 'text-gray-600'}`}>
                            {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
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
