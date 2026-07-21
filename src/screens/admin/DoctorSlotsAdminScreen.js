import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { db } from '../../config/firebase';
import { collection, addDoc, onSnapshot, query, where, deleteDoc, doc, getDocs, updateDoc, writeBatch } from 'firebase/firestore';
import { Menu, CalendarPlus, Trash2, CalendarDays, CheckCircle, Clock, CheckSquare, Square, ChevronLeft, Edit3, X, Save } from 'lucide-react';
import { formatDate } from '../../utils/dateUtils';
import { Platform, View, Text } from 'react-native';

export default function DoctorSlotsAdminScreen({ route, navigation }) {
  const { isDarkMode } = useTheme();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { doctor: initialDoctor } = route?.params || {};
  const [currentDoctor, setCurrentDoctor] = useState(initialDoctor);
  
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [slotDuration, setSlotDuration] = useState(15);
  const [minStartDate, setMinStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [shiftStart, setShiftStart] = useState('09:00');
  const [shiftEnd, setShiftEnd] = useState('17:00');
  const [generatedSlots, setGeneratedSlots] = useState([]);
  
  const [addingSlot, setAddingSlot] = useState(false);
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(true);

  // Batch Deletion State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedSlotIds, setSelectedSlotIds] = useState([]);

  const getInitialCountryCode = (contact) => {
    if (!contact) return '+91';
    const match = contact.match(/^(\+\d+)\s(.*)$/);
    if (match) return match[1];
    if (contact.startsWith('+')) {
       const parts = contact.split(' ');
       if (parts.length > 1) return parts[0];
    }
    return '+91';
  };

  const getInitialPhoneNumber = (contact) => {
    if (!contact) return '';
    const match = contact.match(/^(\+\d+)\s(.*)$/);
    if (match) return match[2];
    return contact;
  };

  // Edit Doctor State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState(initialDoctor?.name || '');
  const [editSpecialty, setEditSpecialty] = useState(initialDoctor?.specialty || '');
  const [editExperience, setEditExperience] = useState(initialDoctor?.experience || '');
  const [editCountryCode, setEditCountryCode] = useState(() => getInitialCountryCode(initialDoctor?.contactNumber));
  const [editContact, setEditContact] = useState(() => getInitialPhoneNumber(initialDoctor?.contactNumber));
  const [editDescription, setEditDescription] = useState(initialDoctor?.description || '');
  const [updatingProfile, setUpdatingProfile] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web' && !document.getElementById('tailwind-cdn')) {
      const script = document.createElement('script');
      script.id = 'tailwind-cdn';
      script.src = 'https://cdn.tailwindcss.com';
      document.head.appendChild(script);
    }
  }, []);

  useEffect(() => {
    if (!currentDoctor || !currentDoctor.id) {
      setLoadingSlots(false);
      return;
    }
    
    const simpleQ = query(collection(db, 'available_slots'), where('doctorId', '==', currentDoctor.id));

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
  }, [currentDoctor.id]);

  useEffect(() => {
    if (slots.length > 0) {
      const lastSlot = slots[slots.length - 1];
      const maxDate = new Date(lastSlot.date);
      maxDate.setDate(maxDate.getDate() + 1);
      const nextDayStr = maxDate.toISOString().split('T')[0];
      const todayStr = new Date().toISOString().split('T')[0];
      
      const computedMin = nextDayStr > todayStr ? nextDayStr : todayStr;
      setMinStartDate(computedMin);
      
      setStartDate(prev => prev < computedMin ? computedMin : prev);
      setEndDate(prev => prev < computedMin ? computedMin : prev);
    } else {
      const todayStr = new Date().toISOString().split('T')[0];
      setMinStartDate(todayStr);
    }
  }, [slots]);

  const handlePreviewSlots = () => {
    if (endDate < startDate) {
      window.alert('Error: End Date must be greater than or equal to Start Date.');
      return;
    }
    
    const tempSlots = [];
    
    // Loop through each day from startDate to endDate (inclusive)
    let currentDay = new Date(startDate);
    const lastDay = new Date(endDate);
    
    while (currentDay <= lastDay) {
      const dateStr = currentDay.toISOString().split('T')[0];
      
      const startDateTime = new Date(`${dateStr}T${shiftStart}:00`);
      const endDateTime = new Date(`${dateStr}T${shiftEnd}:00`);

      if (endDateTime > startDateTime) {
        let current = startDateTime;
        while (current < endDateTime) {
          tempSlots.push(new Date(current));
          current.setMinutes(current.getMinutes() + Number(slotDuration));
        }
      }
      
      currentDay.setDate(currentDay.getDate() + 1);
    }
    
    if (tempSlots.length === 0) {
      window.alert('No valid slots could be generated with the given times.');
      return;
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
      const batch = writeBatch(db);
      
      for (const slot of generatedSlots) {
        const yyyy = slot.getFullYear();
        const mm = String(slot.getMonth() + 1).padStart(2, '0');
        const dd = String(slot.getDate()).padStart(2, '0');
        const dateStringLocal = `${yyyy}-${mm}-${dd}`;

        const startStr = slot.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).toUpperCase();
        const endSlot = new Date(slot.getTime() + Number(slotDuration) * 60000);
        const endStr = endSlot.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).toUpperCase();
        
        const h = slot.getHours().toString().padStart(2, '0');
        const min = slot.getMinutes().toString().padStart(2, '0');
        const startTimestampStr = `${dateStringLocal}T${h}:${min}:00`;

        const slotData = {
          doctorId: currentDoctor.id,
          doctorName: currentDoctor.name,
          specialty: currentDoctor.specialty,
          date: dateStringLocal,
          time: `${startStr} - ${endStr}`,
          startTimestamp: startTimestampStr,
          duration: Number(slotDuration),
          isBooked: false,
          createdAt: new Date().toISOString()
        };
        
        const slotRef = doc(collection(db, 'available_slots'));
        batch.set(slotRef, slotData);
      }
      
      await batch.commit();

      window.alert(`Success: ${generatedSlots.length} slots published successfully!`);
      setGeneratedSlots([]);
    } catch (error) {
      console.error('Error adding slots:', error);
      window.alert('Error: Failed to add slots. Please try again.');
    } finally {
      setAddingSlot(false);
    }
  };

  const handleDeleteDoctor = async () => {
    if (window.confirm(`Delete Doctor: Are you sure you want to delete ${currentDoctor.name}? This will also delete all their slots.`)) {
      try {
        const batch = writeBatch(db);
        const slotsQuery = query(collection(db, 'available_slots'), where('doctorId', '==', currentDoctor.id));
        const slotsSnap = await getDocs(slotsQuery);
        slotsSnap.forEach(docSnap => {
          batch.delete(docSnap.ref);
        });
        await batch.commit();
        await deleteDoc(doc(db, 'doctors', currentDoctor.id));
        window.alert('Success: Doctor and their slots deleted.');
        navigation?.goBack();
      } catch (error) {
        console.error('Error deleting doctor:', error);
        window.alert('Error: Failed to delete doctor.');
      }
    }
  };

  const handleUpdateProfile = async () => {
    if (!currentDoctor || !currentDoctor.id) return;
    if (!editName.trim() || !editSpecialty.trim()) {
      window.alert('Error: Name and Specialty are required.');
      return;
    }
    
    setUpdatingProfile(true);
    try {
      const cleanName = editName.trim();
      const cleanSpec = editSpecialty.trim();

      // 1. Update doctor document
      const docRef = doc(db, 'doctors', currentDoctor.id);
      const newDocData = {
        name: cleanName,
        specialty: cleanSpec,
        experience: parseInt(editExperience) || 0,
        contactNumber: `${editCountryCode} ${editContact.trim()}`,
        description: editDescription.trim()
      };
      await updateDoc(docRef, newDocData);

      // 2. Batch update slots to keep denormalized data consistent
      const slotsQ = query(collection(db, 'available_slots'), where('doctorId', '==', currentDoctor.id));
      const slotsSnap = await getDocs(slotsQ);
      
      const batch = writeBatch(db);
      slotsSnap.docs.forEach(dSnap => {
        batch.update(dSnap.ref, {
          doctorName: cleanName,
          specialty: cleanSpec
        });
      });
      await batch.commit();

      setCurrentDoctor(prev => ({ ...prev, ...newDocData }));
      setIsEditingProfile(false);
      window.alert('Success: Doctor Profile Updated!');
    } catch (e) {
      console.error(e);
      window.alert('Error: Failed to update profile.');
    } finally {
      setUpdatingProfile(false);
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

  if (!currentDoctor) {
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
                {currentDoctor.name}
              </h1>
              <p className="text-yellow-400 font-bold mt-1 text-sm">{currentDoctor.specialty} • {currentDoctor.experience} yrs exp</p>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{currentDoctor.contactNumber}</p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <button 
                onClick={() => setIsEditingProfile(true)}
                className="px-6 py-2.5 rounded-lg font-bold text-sm bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-700 transition-all flex items-center gap-2 shrink-0"
              >
                <Edit3 size={16} /> Edit Doctor
              </button>
              <button 
                onClick={handleDeleteDoctor}
                className="px-6 py-2.5 rounded-lg font-bold text-sm bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all flex items-center gap-2 shrink-0"
              >
                <Trash2 size={16} /> Delete Doctor
              </button>
            </div>
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
              
              <div className="flex-1 w-full flex flex-col gap-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider pl-1">Start Date</label>
                    <input 
                      type="date"
                      required
                      min={minStartDate}
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0F172A] border border-gray-300 dark:border-gray-700 rounded-xl text-sm outline-none focus:border-yellow-400 text-gray-900 dark:text-white transition-colors"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider pl-1">End Date</label>
                    <input 
                      type="date"
                      required
                      min={startDate}
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0F172A] border border-gray-300 dark:border-gray-700 rounded-xl text-sm outline-none focus:border-yellow-400 text-gray-900 dark:text-white transition-colors"
                    />
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider pl-1">Duration</label>
                    <select
                      value={slotDuration}
                      onChange={(e) => setSlotDuration(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0F172A] border border-gray-300 dark:border-gray-700 rounded-xl text-sm outline-none focus:border-yellow-400 text-gray-900 dark:text-white transition-colors appearance-none"
                    >
                      <option value={15}>15 mins</option>
                      <option value={20}>20 mins</option>
                      <option value={30}>30 mins</option>
                      <option value={60}>60 mins</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-5 items-end">
                  <div className="flex-1 flex flex-col gap-2 w-full">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider pl-1">Shift Timing</label>
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
                    className="w-full md:w-auto shrink-0 px-8 py-3.5 rounded-xl font-bold text-sm bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-700 transition-all border border-gray-300 dark:border-gray-700 whitespace-nowrap"
                  >
                    Preview
                  </button>
                </div>
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
                        <p className="text-gray-900 dark:text-white font-bold">{formatDate(slot.date)}</p>
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

      {/* Edit Doctor Modal */}
      {isEditingProfile && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !updatingProfile && setIsEditingProfile(false)} />
          <div className="bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-gray-800 rounded-3xl p-6 md:p-8 shadow-2xl relative w-full max-w-2xl flex flex-col gap-6 z-10 max-h-full overflow-y-auto">
            
            <div className="flex justify-between items-center pb-4 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                <Edit3 className="text-yellow-400" size={24} /> Edit Doctor Profile
              </h2>
              <button 
                onClick={() => setIsEditingProfile(false)}
                disabled={updatingProfile}
                className="p-2 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex flex-col gap-5">
              <div className="flex flex-col md:flex-row gap-5">
                <div className="flex-1 flex flex-col gap-2">
                  <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider pl-1">Name</label>
                  <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0F172A] border border-gray-300 dark:border-gray-700 rounded-xl text-sm outline-none focus:border-yellow-400 text-gray-900 dark:text-white transition-colors" />
                </div>
                <div className="flex-1 flex flex-col gap-2">
                  <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider pl-1">Specialty</label>
                  <input type="text" value={editSpecialty} onChange={(e) => setEditSpecialty(e.target.value)} className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0F172A] border border-gray-300 dark:border-gray-700 rounded-xl text-sm outline-none focus:border-yellow-400 text-gray-900 dark:text-white transition-colors" />
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-5">
                <div className="flex-1 flex flex-col gap-2">
                  <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider pl-1">Experience (Years)</label>
                  <input type="number" value={editExperience} onChange={(e) => setEditExperience(e.target.value)} className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0F172A] border border-gray-300 dark:border-gray-700 rounded-xl text-sm outline-none focus:border-yellow-400 text-gray-900 dark:text-white transition-colors" />
                </div>
                <div className="flex-1 flex flex-col gap-2">
                  <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider pl-1">Contact Number</label>
                  <div className="flex gap-2">
                    <select
                      value={editCountryCode}
                      onChange={(e) => setEditCountryCode(e.target.value)}
                      className="px-3 py-3 bg-gray-50 dark:bg-[#0F172A] border border-gray-300 dark:border-gray-700 rounded-xl text-sm outline-none focus:border-yellow-400 text-gray-900 dark:text-white transition-colors w-24"
                    >
                      <option value="+91">+91 (IN)</option>
                      <option value="+1">+1 (US/CA)</option>
                      <option value="+44">+44 (UK)</option>
                      <option value="+61">+61 (AU)</option>
                      <option value="+971">+971 (AE)</option>
                    </select>
                    <input type="tel" value={editContact} onChange={(e) => setEditContact(e.target.value)} className="flex-1 px-4 py-3 bg-gray-50 dark:bg-[#0F172A] border border-gray-300 dark:border-gray-700 rounded-xl text-sm outline-none focus:border-yellow-400 text-gray-900 dark:text-white transition-colors" />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider pl-1">About / Description</label>
                <textarea rows="4" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0F172A] border border-gray-300 dark:border-gray-700 rounded-xl text-sm outline-none focus:border-yellow-400 text-gray-900 dark:text-white transition-colors resize-none"></textarea>
              </div>
            </div>

            <button
              type="button"
              onClick={handleUpdateProfile}
              disabled={updatingProfile}
              className={`w-full py-4 mt-2 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all ${updatingProfile ? 'bg-gray-200 dark:bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-yellow-400 hover:bg-yellow-500 text-yellow-950 shadow-[0_4px_15px_rgb(250,204,21,0.2)] hover:shadow-[0_6px_20px_rgb(250,204,21,0.3)] hover:-translate-y-0.5'}`}
            >
              <Save size={20} /> {updatingProfile ? 'Saving Changes...' : 'Save Profile Changes'}
            </button>

          </div>
        </div>
      )}

  </div>
    );
}
