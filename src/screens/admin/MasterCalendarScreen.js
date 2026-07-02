import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '../../config/firebase';
import { collection, onSnapshot, query, where, doc, deleteDoc, addDoc, updateDoc } from 'firebase/firestore';
import {
  ChevronLeft, ChevronRight, CheckCircle2,
  Clock, Plus, Search, UserCircle, Trash2, Moon, Sun, X, Calendar, Activity, Phone, FileText
} from 'lucide-react';
import { formatDate } from '../../utils/dateUtils';
import { Platform, View, Text } from 'react-native';
import toast from 'react-hot-toast';
import { useTheme } from '../../context/ThemeContext';

const formatDocName = (name) => {
  if (!name) return 'Dr. Unknown';
  const clean = name.replace(/^(Dr\.\s*)+/i, '').trim();
  return `Dr. ${clean}`;
};

const sendWhatsAppMessage = (phone, message) => {
  if (!phone) {
    toast.error("No valid phone number found for this user.");
    return;
  }
  const cleanPhone = phone.replace(/\D/g, ''); 
  const encodedMessage = encodeURIComponent(message);
  window.open(`https://wa.me/${cleanPhone}?text=${encodedMessage}`, '_blank');
};

export default function MasterCalendarScreen() {
  const { isDarkMode } = useTheme();

  // 1. Core State
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date()); // For Mini-Calendar

  const [rawDoctors, setRawDoctors] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState(null);
  const [allSlots, setAllSlots] = useState([]);
  const [patients, setPatients] = useState([]);
  const [testRequests, setTestRequests] = useState([]);

  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  const [isAddSlotMode, setIsAddSlotMode] = useState(false);
  const [slotDuration, setSlotDuration] = useState(30);

  // Modal / Slide-Out State
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [slotToBook, setSlotToBook] = useState(null); // The slot object being booked

  const [isPatientSlideOutOpen, setIsPatientSlideOutOpen] = useState(false);
  const [selectedBookedSlot, setSelectedBookedSlot] = useState(null);

  // Patient Search State for Modal
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState(null);

  const gridRef = useRef(null);
  const [messageSettings, setMessageSettings] = useState({});

  // Inject Tailwind CDN
  useEffect(() => {
    if (Platform.OS === 'web' && !document.getElementById('tailwind-cdn')) {
      const script = document.createElement('script');
      script.id = 'tailwind-cdn';
      script.src = 'https://cdn.tailwindcss.com';
      document.head.appendChild(script);
    }
  }, []);

  // Update current time indicator
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Doctors & Default Selected
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'doctors'), (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRawDoctors(docs);
      setLoadingDoctors(false);
      if (docs.length > 0 && !selectedDoctorId) {
        setSelectedDoctorId(docs[0].id);
      }
    });
    return () => unsub();
  }, [selectedDoctorId]);

  // Fetch Patients
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'patients'), (snapshot) => {
      const pList = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setPatients(pList);
    });
    return () => unsub();
  }, []);

  // Fetch Message Settings
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'general'), (docSnap) => {
      if (docSnap.exists()) {
        setMessageSettings(docSnap.data());
      }
    });
    return () => unsub();
  }, []);



  // Fetch Test Requests (for Patient History)
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'test_requests'), (snapshot) => {
      const reqList = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setTestRequests(reqList);
    });
    return () => unsub();
  }, []);

  // Fetch Slots for Selected Doctor and Date
  useEffect(() => {
    if (!selectedDoctorId) return;
    const dateString = selectedDate.toISOString().split('T')[0];
    const slotsQuery = query(
      collection(db, 'available_slots'),
      where('doctorId', '==', selectedDoctorId),
      where('date', '==', dateString)
    );

    const unsub = onSnapshot(slotsQuery, (snapshot) => {
      const slots = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllSlots(slots);
    });
    return () => unsub();
  }, [selectedDate, selectedDoctorId]);


  const parseDateAndTimeString = (dateStr, timeStr) => {
    const dummyDate = new Date(`${dateStr}T00:00:00`);
    if (!timeStr) return dummyDate;
    
    // First try 12-hour AM/PM format
    const timeParts12 = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (timeParts12) {
      let h = parseInt(timeParts12[1], 10);
      let m = parseInt(timeParts12[2], 10);
      const ampm = timeParts12[3].toUpperCase();
      if (ampm === 'PM' && h < 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;
      dummyDate.setHours(h, m, 0, 0);
      return dummyDate;
    }

    // Then try 24-hour HH:MM format
    const timeParts24 = timeStr.match(/(\d+):(\d+)/);
    if (timeParts24) {
      let h = parseInt(timeParts24[1], 10);
      let m = parseInt(timeParts24[2], 10);
      dummyDate.setHours(h, m, 0, 0);
      return dummyDate;
    }

    return dummyDate;
  };

  // Filter and Map Events
  const displayedEvents = useMemo(() => {
    return allSlots.map(slot => {
      let start, end;
      if (slot.startTimestamp) {
        start = new Date(slot.startTimestamp);
        try {
          const parts = slot.time.split('-');
          if (parts.length === 2) {
            const endStr = parts[1].trim();
            end = parseDateAndTimeString(slot.date, endStr);
          } else {
            end = new Date(start.getTime() + 30 * 60000);
          }
        } catch (e) {
          end = new Date(start.getTime() + 30 * 60000);
        }
      } else {
        try {
          const parts = slot.time?.split('-') || [];
          start = parseDateAndTimeString(slot.date, parts[0]?.trim());
          if (parts.length > 1 && parts[1]) {
            end = parseDateAndTimeString(slot.date, parts[1]?.trim());
          } else {
            end = new Date(start.getTime() + 30 * 60000); // default 30 mins
          }
        } catch (e) {
          start = new Date(slot.date);
          end = new Date(slot.date);
        }
      }

      const durationInHours = (end.getTime() - start.getTime()) / 3600000;

      let patientName = slot.patientName || 'Patient';
      let patientPhone = slot.patientPhone || 'No Contact Info';

      if (slot.patientId) {
        const foundPatient = patients.find(p => p.id === slot.patientId);
        if (foundPatient) {
          patientName = foundPatient.name || patientName;
          patientPhone = foundPatient.phoneNumber || patientPhone;
        }
      }

      return {
        ...slot,
        id: slot.id,
        start,
        end,
        durationInHours,
        rawStatus: slot.status,
        isBooked: slot.isBooked,
        patientName,
        patientPhone
      };
    });
  }, [allSlots, patients]);

  const activeDoctor = rawDoctors.find(d => d.id === selectedDoctorId);

  // Interaction Handlers
  const handleDeleteSlot = async (e, slotId) => {
    e.stopPropagation();
    if (window.confirm('Delete this slot?')) {
      try {
        await deleteDoc(doc(db, 'available_slots', slotId));
      } catch (err) {
        console.error('Failed to delete slot', err);
      }
    }
  };

  const handleGridClick = async (e) => {
    if (!isAddSlotMode || !gridRef.current) return;
    if (!activeDoctor) return;

    const rect = gridRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top - 16; // Adjust for the 16px padding

    // Each hour is 200px. Starts at 6 AM.
    const hourFloat = (y / 200) + 6;

    let targetHour = Math.floor(hourFloat);
    let targetMinute = Math.floor((hourFloat % 1) * 60);

    // Snap to closest interval based on slotDuration (15, 30, 60)
    targetMinute = Math.round(targetMinute / slotDuration) * slotDuration;
    if (targetMinute >= 60) {
      targetMinute = 0;
      targetHour += 1;
    }

    let endHour = targetHour;
    let endMinute = targetMinute + slotDuration;
    while (endMinute >= 60) {
      endMinute -= 60;
      endHour += 1;
    }

    const formatAmPm = (h, m) => {
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 || 12;
      const mStr = m === 0 ? '00' : m.toString();
      return `${h12 < 10 ? '0' + h12 : h12}:${mStr} ${ampm}`;
    };

    const timeString = `${formatAmPm(targetHour, targetMinute)} - ${formatAmPm(endHour, endMinute)}`;
    const dateString = selectedDate.toISOString().split('T')[0];

    const dummyStart = new Date(`${dateString}T00:00:00`);
    dummyStart.setHours(targetHour, targetMinute, 0, 0);

    const dummyEnd = new Date(`${dateString}T00:00:00`);
    dummyEnd.setHours(endHour, endMinute, 0, 0);

    let newSlot = {
      doctorId: activeDoctor.id,
      doctorName: formatDocName(activeDoctor.name),
      date: dateString,
      time: timeString,
      startTimestamp: dummyStart.getTime(),
      endTimestamp: dummyEnd.getTime(),
      isBooked: false,
      status: 'available',
      createdAt: new Date().toISOString()
    };

    try {
      await addDoc(collection(db, 'available_slots'), newSlot);
    } catch (err) {
      console.error('Failed to add slot', err);
    }
  };

  const handleBookSlotClick = (slot) => {
    setSlotToBook(slot);
    setPatientSearch('');
    setSelectedPatientId(null);
    setIsBookingModalOpen(true);
  };

  const confirmBooking = async () => {
    if (!selectedPatientId || !slotToBook) {
      toast.error("Please select a patient.");
      return;
    }

    const whatsappTab = window.open('about:blank', '_blank');

    const p = patients.find(pat => pat.id === selectedPatientId);
    try {
      const slotRef = doc(db, 'available_slots', slotToBook.id);
      await updateDoc(slotRef, {
        isBooked: true,
        status: 'confirmed',
        patientId: selectedPatientId,
        patientName: p?.name || 'Unknown Patient',
        patientPhone: p?.phoneNumber || 'No Phone',
        bookedAt: new Date().toISOString()
      });
      
      // Task A: Notify Doctor on Booking
      const doctorPhone = activeDoctor?.phone || activeDoctor?.phoneNumber || activeDoctor?.contactNumber;
      
      if (!doctorPhone) {
        whatsappTab.close();
        toast.error("No valid phone number found for this doctor.");
      } else {
        let docMsg = messageSettings.bookingTemplate || `Hello Doctor,\n\nYou have a new booking scheduled at [time] on [date] with patient [patient_name].\n\nThank you!`;
        docMsg = docMsg.replace(/\[time\]/g, slotToBook.time)
                       .replace(/\[date\]/g, formatDate(slotToBook.date))
                       .replace(/\[patient_name\]/g, p?.name || 'Unknown Patient');
                       
        const cleanPhone = doctorPhone.replace(/\D/g, '');
        const encodedMessage = encodeURIComponent(docMsg);
        whatsappTab.location.href = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
      }

      setIsBookingModalOpen(false);
      setSlotToBook(null);
      toast.success('Booking Confirmed!');
    } catch (e) {
      console.error(e);
      whatsappTab.close();
      toast.error("Failed to book.");
    }
  };

  const handleCheckout = async (slotId) => {
    const whatsappTab = window.open('about:blank', '_blank');

    try {
      await updateDoc(doc(db, 'available_slots', slotId), {
        status: 'completed'
      });
      
      // Task B: Patient Checkout Review
      if (selectedBookedSlot && selectedBookedSlot.patientPhone) {
        const pPhone = selectedBookedSlot.patientPhone;
        let reviewMsg = messageSettings.feedbackTemplate || `Hi [patient_name]!\n\nThanks for visiting Yello Clinics and Diagnostics, Kokapet.\n\nIf your visit brought you comfort, a kind 5-star review would mean the world — and help others find the care they need too.\n\nReview here 💛 https://tinyurl.com/wrbr3mpd`;
        reviewMsg = reviewMsg.replace(/\[patient_name\]/g, selectedBookedSlot.patientName || 'Patient')
                             .replace(/\[link\]/g, 'https://g.page/review/...');
        
        const cleanPhone = pPhone.replace(/\D/g, '');
        const encodedMessage = encodeURIComponent(reviewMsg);
        whatsappTab.location.href = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
      } else {
        whatsappTab.close();
      }

      setIsPatientSlideOutOpen(false);
      toast.success('Service marked as completed!');
    } catch (e) {
      console.error(e);
      whatsappTab.close();
      toast.error("Failed to checkout.");
    }
  };

  const getPatientHistory = (patId) => {
    return testRequests.filter(tr => tr.patientId === patId);
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];

    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const daysToRender = useMemo(() => getDaysInMonth(currentMonth), [currentMonth]);

  const filteredModalPatients = useMemo(() => {
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

  if (loadingDoctors) {
    return (
      <div className={`h-screen w-full flex items-center justify-center ${isDarkMode ? 'bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white' : 'bg-[#F4F7F6] text-gray-800'}`}>
        <p className="font-medium animate-pulse">Loading Command Center...</p>
      </div>
    );
  }

  const hours = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
  const currentHour = currentTime.getHours();
  const currentMinute = currentTime.getMinutes();
  const showCurrentTimeLine = currentHour >= 6 && currentHour <= 23;
  const currentTimeTop = (currentHour - 6 + currentMinute / 60) * 200 + 16;

  return (
    <div className={`${isDarkMode ? 'dark' : ''} h-screen w-full overflow-hidden flex flex-col lg:flex-row bg-[#F4F7F6] dark:bg-gray-950 font-sans transition-colors duration-300 text-gray-800 dark:text-gray-100`}>

      {/* LEFT SIDEBAR (Mini-Calendar Master Controller) */}
      <aside className="w-full lg:w-80 shrink-0 flex flex-col h-full overflow-y-auto border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1E293B] z-20 pb-10 transition-colors duration-300">

        {/* Workspace Controls Header */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white/90 dark:bg-[#1E293B]/90 backdrop-blur-md z-10 flex items-center justify-between transition-colors duration-300">
          <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Schedule Controls</span>
          <div className="flex items-center gap-2 px-2 py-1 bg-green-500/10 rounded-full border border-green-500/20">
             <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
             <span className="text-[10px] font-bold text-green-500 uppercase tracking-wider">Live Sync</span>
          </div>
        </div>

        <div className="p-6 flex flex-col gap-8 flex-1">

          {/* Active Schedule Card */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">Active Schedule</h3>

                <select
                  value={selectedDoctorId || ''}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-200 outline-none cursor-pointer mb-2 transition-colors duration-300"
                >
                  {rawDoctors.map(doc => (
                    <option key={doc.id} value={doc.id}>{formatDocName(doc.name)}</option>
                  ))}
                </select>

                {activeDoctor && (
                  <div className="group flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm transition-transform hover:scale-[1.02] cursor-pointer">
                    <div className="w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center text-yellow-400 font-bold text-lg shrink-0">
                      <UserCircle size={24} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-gray-900 dark:text-white leading-tight truncate">{formatDocName(activeDoctor.name)}</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5 truncate">{activeDoctor.specialty || 'General Practitioner'}</p>
                    </div>
                  </div>
                )}
          </div>

          {/* Master Controller Mini Calendar */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h3>
              <div className="flex gap-1">
                <button
                  onClick={() => { const d = new Date(currentMonth); d.setMonth(d.getMonth() - 1); setCurrentMonth(d); }}
                  className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => { const d = new Date(currentMonth); d.setMonth(d.getMonth() + 1); setCurrentMonth(d); }}
                  className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-xs">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                <span key={day} className="font-medium text-gray-500 dark:text-gray-400 dark:text-gray-600 mb-2">{day}</span>
              ))}

              {daysToRender.map((dateObj, i) => {
                if (!dateObj) return <div key={i} />; // padding
                const isSelected = dateObj.toISOString().split('T')[0] === selectedDate.toISOString().split('T')[0];
                return (
                  <div
                    key={i}
                    onClick={() => setSelectedDate(dateObj)}
                    className={`w-8 h-8 flex items-center justify-center rounded-full transition-all cursor-pointer mx-auto ${isSelected
                      ? 'bg-gray-100 dark:bg-gray-900 dark:bg-white text-gray-900 dark:text-white dark:text-gray-900 font-bold shadow-md'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                  >
                    {dateObj.getDate()}
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </aside>

      {/* RIGHT PANEL (Main Interactive Grid) */}
      <main className="flex-1 flex flex-col h-full min-w-0 relative">

        {/* Top Header */}
        <header className="h-20 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 flex flex-wrap lg:flex-nowrap items-center justify-between px-4 lg:px-8 z-30 shrink-0 transition-colors duration-300">

          <div className="flex items-center gap-2 lg:gap-4 w-full lg:w-auto justify-between lg:justify-start mb-2 lg:mb-0">
            <h1 className="text-xl lg:text-2xl font-black text-gray-900 dark:text-white tracking-tight truncate">
              {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </h1>
          </div>

          <div className="flex items-center gap-3 lg:gap-6 w-full lg:w-auto overflow-x-auto pb-1 lg:pb-0 hide-scrollbar">
            


            {isAddSlotMode && (
              <select 
                value={slotDuration}
                onChange={(e) => setSlotDuration(Number(e.target.value))}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 text-sm font-bold rounded-xl px-3 py-2 outline-none"
              >
                <option value={15}>15 mins</option>
                <option value={30}>30 mins</option>
                <option value={60}>60 mins</option>
              </select>
            )}

            <button
              onClick={() => setIsAddSlotMode(!isAddSlotMode)}
              className={`flex items-center gap-1 lg:gap-2 px-4 lg:px-6 py-2.5 rounded-full font-bold transition-all shadow-sm outline-none shrink-0 ${isAddSlotMode ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-yellow-400 hover:bg-yellow-500 text-yellow-950 hover:shadow-md'}`}
            >
              <Plus size={18} className={isAddSlotMode ? 'rotate-45 transition-transform' : 'transition-transform'} />
              <span className="hidden sm:inline">{isAddSlotMode ? 'Done' : 'Add Slot'}</span>
            </button>
          </div>
        </header>

        {/* Scrollable Calendar Grid Wrapper */}
        <div className="flex-1 overflow-y-auto overflow-x-auto p-4 lg:p-8">

          <div className="relative min-h-[1200px] min-w-[800px] bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm flex overflow-hidden transition-colors duration-300">

            {/* Time Labels Column */}
            <div className="w-16 lg:w-24 shrink-0 flex flex-col pt-4 border-r border-dashed border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#0F172A]/50">
              {hours.map((hour, idx) => (
                <div key={idx} className="h-[200px] relative">
                  <span className="absolute -top-2.5 right-2 lg:right-4 text-xs font-bold text-gray-500 dark:text-gray-400 dark:text-gray-500">
                    {hour > 12 ? `${hour - 12} PM` : hour === 12 ? '12 PM' : `${hour} AM`}
                  </span>
                </div>
              ))}
            </div>

            {/* Grid Area (Interactive) */}
            <div
              ref={gridRef}
              onClick={handleGridClick}
              className="flex-1 relative pt-4 cursor-crosshair group/grid"
            >

              {/* Background Rows */}
              {hours.map((_, idx) => (
                <div key={idx} className="h-[200px] border-b border-gray-100 dark:border-gray-800 w-full" />
              ))}

              {/* Current Time Indicator */}
              {showCurrentTimeLine && (
                <div
                  className="absolute left-0 right-0 z-30 pointer-events-none"
                  style={{ top: `${currentTimeTop}px` }}
                >
                  <div className="h-0.5 bg-red-500 w-full relative">
                    <div className="absolute -left-1.5 -top-1.5 w-3 h-3 bg-red-500 rounded-full shadow-sm ring-2 ring-white dark:ring-gray-900" />
                  </div>
                </div>
              )}

              {/* Floating Events */}
              {displayedEvents.map(event => {
                const startHour = event.start.getHours();
                const startMinute = event.start.getMinutes();
                const topPosition = (startHour + startMinute / 60 - 6) * 200 + 16;

                const calculatedHeight = event.durationInHours * 200 - 8;
                const height = Math.max(calculatedHeight, 40);

                const isShort = event.durationInHours <= 0.25;

                if (startHour < 6 || startHour >= 24) return null;

                if (!event.isBooked) {
                  return (
                    <div
                      key={event.id}
                      onClick={(e) => { e.stopPropagation(); handleBookSlotClick(event); }}
                      className={`absolute left-2 right-2 lg:left-4 lg:right-4 z-10 border-2 border-dashed border-yellow-300 dark:border-yellow-600 bg-yellow-50/60 dark:bg-yellow-900/20 rounded-2xl flex items-center justify-between cursor-pointer transition-all group hover:bg-yellow-100 dark:hover:bg-yellow-900/40 hover:border-yellow-400 hover:shadow-sm ${isShort ? 'px-2' : 'px-4'}`}
                      style={{ top: `${topPosition + 4}px`, height: `${height}px` }}
                    >
                      <div className="flex items-center gap-1 sm:gap-2 transition-transform transform group-hover:translate-x-1 sm:group-hover:translate-x-2">
                        <Plus size={16} className="text-yellow-600 dark:text-yellow-500" />
                        <span className="text-yellow-700 dark:text-yellow-400 font-bold text-sm hidden sm:inline">Open Slot</span>
                      </div>

                      <button
                        onClick={(e) => handleDeleteSlot(e, event.id)}
                        className="p-2 bg-white dark:bg-gray-800 rounded-full shadow-sm opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-900/40 text-red-500 transition-all z-20"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                }

                if (event.rawStatus === 'completed') {
                  return (
                    <div
                      key={event.id}
                      onClick={(e) => e.stopPropagation()}
                      className="absolute left-2 right-2 lg:left-4 lg:right-4 z-10 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-2xl p-3 sm:p-4 opacity-75 grayscale flex flex-col sm:flex-row items-start sm:items-center justify-between pointer-events-none overflow-hidden"
                      style={{ top: `${topPosition + 4}px`, height: `${height}px` }}
                    >
                      <div className="flex items-center gap-3 w-full min-w-0">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 shrink-0 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                          <UserCircle size={20} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-gray-500 dark:text-gray-400 line-through truncate">{event.patientName || 'Patient'}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Completed</p>
                        </div>
                      </div>
                      <CheckCircle2 size={20} className="text-gray-700 dark:text-gray-300 dark:text-gray-600 hidden sm:block shrink-0 ml-2" />
                    </div>
                  );
                }

                // Booked Premium Card
                return (
                  <div
                    key={event.id}
                    onClick={(e) => { e.stopPropagation(); setSelectedBookedSlot(event); setIsPatientSlideOutOpen(true); }}
                    className={`absolute left-2 right-2 lg:left-4 lg:right-4 z-20 bg-gray-100 dark:bg-gray-900 dark:bg-gray-100 border border-gray-200 dark:border-gray-800 dark:border-gray-200 text-gray-900 dark:text-white dark:text-gray-900 rounded-2xl shadow-lg group overflow-hidden transition-all hover:shadow-xl hover:-translate-y-0.5 flex cursor-pointer ${isShort ? 'p-2 flex-row items-center justify-between' : 'p-3 sm:p-4 flex-col'}`}
                    style={{ top: `${topPosition + 4}px`, height: `${height}px` }}
                  >
                    <div className={`flex justify-between items-center relative z-10 w-full ${isShort ? '' : 'flex-1 items-start'}`}>

                      {/* Left: Patient Info */}
                      <div className={`flex items-center gap-2 sm:gap-3 min-w-0 ${isShort ? 'w-[75%]' : 'w-[60%] sm:w-[70%] items-start'}`}>
                        <div className={`${isShort ? 'w-6 h-6 sm:w-8 sm:h-8' : 'w-10 h-10 sm:w-12 sm:h-12'} shrink-0 bg-gray-200 dark:bg-gray-800 dark:bg-gray-200 rounded-full flex items-center justify-center text-yellow-400 dark:text-yellow-600 ring-2 ring-gray-700 dark:ring-white`}>
                          <UserCircle size={isShort ? 14 : 20} className={isShort ? '' : 'sm:w-6 sm:h-6'} />
                        </div>
                        <div className={`min-w-0 flex-1 ${isShort ? 'flex items-center gap-2' : ''}`}>
                          <h4 className={`font-bold leading-tight truncate text-gray-900 dark:text-white ${isShort ? 'text-xs sm:text-sm' : 'text-base sm:text-lg'}`}>{event.patientName || 'Patient'}</h4>
                          <div className={`flex items-center gap-1 text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium truncate ${isShort ? 'text-[10px] mt-0' : 'text-xs mt-1 gap-1.5'}`}>
                            {!isShort && <Clock size={12} className="shrink-0" />}
                            <span className="truncate">{event.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({event.durationInHours * 60}m)</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions / Badges */}
                      <div className={`flex items-end justify-between shrink-0 ${isShort ? 'flex-row items-center gap-2' : 'flex-col h-full'}`}>
                        <span className={`bg-gray-200 dark:bg-gray-800 dark:bg-gray-200 border border-gray-300 dark:border-gray-700 dark:border-gray-300 rounded-full font-bold text-gray-700 dark:text-gray-300 dark:text-gray-600 shadow-inner truncate text-center ${isShort ? 'px-1.5 py-0.5 text-[8px] sm:text-[10px]' : 'px-2 py-1 sm:px-3 sm:py-1 text-[10px] sm:text-xs max-w-[100px] sm:max-w-none'}`}>
                          Confirmed
                        </span>

                        {!isShort && (
                          <div className="flex items-center gap-1.5 sm:gap-2 opacity-0 group-hover:opacity-100 transition-all translate-y-4 group-hover:translate-y-0">
                            <span className="text-yellow-400 dark:text-yellow-600 text-xs font-bold flex items-center gap-1">
                              Details <ChevronRight size={14} />
                            </span>
                          </div>
                        )}
                      </div>

                    </div>

                    {/* Subtle gradient background flair */}
                    <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-yellow-400/5 dark:bg-yellow-400/10 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none transition-transform group-hover:scale-150 duration-700" />
                  </div>
                );
              })}

            </div>
          </div>

        </div>
      </main>

      {/* Booking Modal (Tailwind Custom) */}
      {isBookingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm transition-opacity">
          <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-800">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Book Appointment</h2>
              <button onClick={() => setIsBookingModalOpen(false)} className="text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-6">

              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Selected Slot</label>
                {slotToBook ? (
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900/50 rounded-xl flex items-center gap-3">
                    <Calendar size={18} className="text-yellow-600 dark:text-yellow-500" />
                    <span className="text-sm font-bold text-yellow-900 dark:text-yellow-500">{formatDate(slotToBook.date)} at {slotToBook.time}</span>
                  </div>
                ) : (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-xl text-sm font-medium text-red-700 dark:text-red-400">
                    No slot selected. Click an available slot on the calendar.
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Find Patient</label>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-3 text-gray-500 dark:text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name or phone..."
                    value={patientSearch}
                    onChange={(e) => {
                      setPatientSearch(e.target.value);
                      setSelectedPatientId(null);
                    }}
                    className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-sm outline-none focus:border-yellow-400 dark:text-white transition-colors"
                  />
                </div>

                {filteredModalPatients.length > 0 && !selectedPatientId && (
                  <div className="mt-2 border border-gray-300 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm max-h-48 overflow-y-auto">
                    {filteredModalPatients.map(p => (
                      <div
                        key={p.id}
                        onClick={() => {
                          setSelectedPatientId(p.id);
                          setPatientSearch(`${p.name} (${p.phoneNumber || 'N/A'})`);
                        }}
                        className="p-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-0"
                      >
                        <p className="font-bold text-sm text-gray-900 dark:text-white">{p.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{p.phoneNumber || 'No phone'}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                disabled={!slotToBook || !selectedPatientId}
                onClick={confirmBooking}
                className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${!slotToBook || !selectedPatientId
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 dark:text-gray-600 cursor-not-allowed'
                  : 'bg-yellow-400 hover:bg-yellow-500 text-yellow-950 shadow-sm'
                  }`}
              >
                Confirm Booking
              </button>

            </div>
          </div>
        </div>
      )}

      {/* Patient Details Slide-Out */}
      <div className={`fixed inset-y-0 right-0 w-full md:w-96 bg-white dark:bg-gray-900 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out border-l border-gray-200 dark:border-gray-800 flex flex-col ${isPatientSlideOutOpen ? 'translate-x-0' : 'translate-x-full'}`}>

        {isPatientSlideOutOpen && selectedBookedSlot && (
          <>
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-start bg-gray-50 dark:bg-gray-800/50">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-gray-100 dark:bg-gray-900 dark:bg-white rounded-full flex items-center justify-center text-yellow-400 dark:text-yellow-600 shadow-sm shrink-0">
                  <UserCircle size={28} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900 dark:text-white leading-tight">{selectedBookedSlot.patientName || 'Unknown Patient'}</h2>
                  <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 text-sm mt-1">
                    <Phone size={14} />
                    <span>{selectedBookedSlot.patientPhone || 'No Contact Info'}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setIsPatientSlideOutOpen(false)} className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8">

              {/* Current Appointment */}
              <div className="flex flex-col gap-3">
                <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">Current Appointment</h3>
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900/50 rounded-2xl flex items-center gap-4">
                  <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/50 rounded-full flex items-center justify-center text-yellow-600">
                    <Clock size={18} />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-yellow-500">{formatDate(selectedBookedSlot.date)}</p>
                    <p className="text-sm text-gray-600 dark:text-yellow-600/80 font-medium">{selectedBookedSlot.time}</p>
                  </div>
                </div>
              </div>

              {/* Patient History */}
              <div className="flex flex-col gap-3 flex-1">
                <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">Lab History</h3>
                {selectedBookedSlot.patientId ? (
                  <div className="flex flex-col gap-3">
                    {getPatientHistory(selectedBookedSlot.patientId).length > 0 ? (
                      getPatientHistory(selectedBookedSlot.patientId).map(tr => (
                        <div key={tr.id} className="p-3 border border-gray-100 dark:border-gray-800 rounded-xl flex items-center gap-3">
                          <Activity size={16} className="text-gray-500 dark:text-gray-400" />
                          <div>
                            <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{tr.testName || 'Lab Test'}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-500">{formatDate(tr.timestamp)}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-600 italic p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">No lab history found.</p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">No patient linked to this slot.</p>
                )}
              </div>
            </div>

            {/* Sticky Bottom Actions */}
            <div className="p-6 border-t border-gray-100 dark:border-gray-800 flex flex-col gap-3 bg-white dark:bg-gray-900">
              <button
                onClick={() => handleCheckout(selectedBookedSlot.id)}
                className="w-full py-3.5 bg-gray-100 dark:bg-gray-900 dark:bg-yellow-400 hover:bg-gray-800 dark:hover:bg-yellow-500 text-gray-900 dark:text-white dark:text-yellow-950 rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={18} /> Complete & Checkout
              </button>
            </div>
          </>
        )}
      </div>

    </div>
  );
}
