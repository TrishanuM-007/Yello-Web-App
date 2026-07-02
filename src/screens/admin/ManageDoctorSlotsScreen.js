import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { db } from '../../config/firebase';
import { collection, addDoc, getDocs, query, doc, updateDoc, writeBatch, where } from 'firebase/firestore';
import { Menu, CalendarDays, CheckCircle, Clock, UserCog, Save } from 'lucide-react';
import { Platform, View, Text } from 'react-native';
import toast from 'react-hot-toast';

export default function ManageDoctorSlotsScreen() {
  const { isDarkMode } = useTheme();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [doctors, setDoctors] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [shiftStart, setShiftStart] = useState('09:00');
  const [shiftEnd, setShiftEnd] = useState('17:00');
  
  const [generatedSlots, setGeneratedSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);

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

  // Edit State
  const [activeTab, setActiveTab] = useState('slots'); // 'slots' | 'edit'
  const [editName, setEditName] = useState('');
  const [editSpecialty, setEditSpecialty] = useState('');
  const [editExperience, setEditExperience] = useState('');
  const [editCountryCode, setEditCountryCode] = useState('+91');
  const [editContact, setEditContact] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web' && !document.getElementById('tailwind-cdn')) {
      const script = document.createElement('script');
      script.id = 'tailwind-cdn';
      script.src = 'https://cdn.tailwindcss.com';
      document.head.appendChild(script);
    }
  }, []);

  useEffect(() => {
    fetchDoctors();
  }, []);

  useEffect(() => {
    if (selectedDoctorId && doctors.length > 0) {
      const selectedDoc = doctors.find(d => d.id === selectedDoctorId);
      if (selectedDoc) {
        setEditName(selectedDoc.name || '');
        setEditSpecialty(selectedDoc.specialty || '');
        setEditExperience(selectedDoc.experience || '');
        setEditCountryCode(getInitialCountryCode(selectedDoc.contactNumber));
        setEditContact(getInitialPhoneNumber(selectedDoc.contactNumber));
        setEditDescription(selectedDoc.description || '');
      }
    }
  }, [selectedDoctorId, doctors]);

  const fetchDoctors = async () => {
    try {
      const q = query(collection(db, 'doctors'));
      const snapshot = await getDocs(q);
      const docsList = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setDoctors(docsList);
      if (docsList.length > 0) {
        setSelectedDoctorId(docsList[0].id);
      }
    } catch (error) {
      console.error(error);
      window.alert('Error: Failed to fetch doctors.');
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = () => {
    const startDateTime = new Date(`${date}T${shiftStart}:00`);
    const endDateTime = new Date(`${date}T${shiftEnd}:00`);

    if (endDateTime <= startDateTime) {
      window.alert('Invalid Time: Shift end must be after shift start.');
      return;
    }
    const slots = [];
    let current = startDateTime;
    while (current < endDateTime) {
      slots.push(new Date(current));
      current.setMinutes(current.getMinutes() + 15);
    }
    setGeneratedSlots(slots);
  };

  const handlePublish = async () => {
    if (generatedSlots.length === 0) {
      window.alert('Error: Please preview slots before publishing.');
      return;
    }
    if (!selectedDoctorId) {
      window.alert('Error: Please select a doctor.');
      return;
    }

    const doctor = doctors.find(d => d.id === selectedDoctorId);
    if (!doctor) return;

    setPublishing(true);
    try {
      const slotsRef = collection(db, 'available_slots');
      const dateString = date;

      for (const slot of generatedSlots) {
        const startStr = slot.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).toUpperCase();
        const endSlot = new Date(slot.getTime() + 15 * 60000);
        const endStr = endSlot.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).toUpperCase();
        
        await addDoc(slotsRef, {
          doctorId: doctor.id,
          doctorName: doctor.name,
          specialty: doctor.specialty,
          date: dateString,
          time: `${startStr} - ${endStr}`,
          isBooked: false,
          createdAt: new Date().toISOString()
        });
      }

      window.alert(`Success: ${generatedSlots.length} slots published successfully!`);
      setGeneratedSlots([]);
    } catch (error) {
      console.error(error);
      window.alert('Error: Failed to publish slots.');
    } finally {
      setPublishing(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!selectedDoctorId) return;
    if (!editName.trim() || !editSpecialty.trim()) {
      toast.error('Name and Specialty are required.');
      return;
    }
    
    setUpdating(true);
    try {
      const cleanName = editName.trim();
      const cleanSpec = editSpecialty.trim();

      // 1. Update doctor document
      const docRef = doc(db, 'doctors', selectedDoctorId);
      await updateDoc(docRef, {
        name: cleanName,
        specialty: cleanSpec,
        experience: parseInt(editExperience) || 0,
        contactNumber: `${editCountryCode} ${editContact.trim()}`,
        description: editDescription.trim()
      });

      // 2. Batch update slots to keep denormalized data consistent
      const slotsQ = query(collection(db, 'available_slots'), where('doctorId', '==', selectedDoctorId));
      const slotsSnap = await getDocs(slotsQ);
      
      const batch = writeBatch(db);
      slotsSnap.docs.forEach(dSnap => {
        batch.update(dSnap.ref, {
          doctorName: cleanName,
          specialty: cleanSpec
        });
      });
      await batch.commit();

      toast.success('Doctor Profile Updated!');
      await fetchDoctors();
    } catch (e) {
      console.error(e);
      toast.error('Failed to update profile.');
    } finally {
      setUpdating(false);
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
    <div className={`flex h-screen w-full bg-gray-50 dark:bg-[#0F172A] text-gray-900 dark:text-white ${isDarkMode ? 'dark' : ''}  overflow-hidden font-sans`}>
      
      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative p-4 md:p-8 flex flex-col min-w-0">
        
        {/* Header Row */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 shrink-0 border-b border-gray-200 dark:border-gray-800 pb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-gray-900 dark:text-white">Manage Doctors</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Edit profiles or add manual slot blocks for doctors.</p>
          </div>

          <div className="flex bg-white dark:bg-[#1E293B] p-1 rounded-xl border border-gray-200 dark:border-gray-800 shrink-0">
            <button
              onClick={() => setActiveTab('edit')}
              className={`px-6 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'edit' ? 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
            >
              <UserCog size={16} /> Edit Profile
            </button>
            <button
              onClick={() => setActiveTab('slots')}
              className={`px-6 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'slots' ? 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
            >
              <CalendarDays size={16} /> Add Slots
            </button>
          </div>
        </header>

        {loading ? (
          <div className="py-20 text-center text-gray-500 animate-pulse">Loading doctors...</div>
        ) : (
          <div className="max-w-2xl w-full flex flex-col gap-8 pb-24">
            
            <div className="bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-gray-800 rounded-3xl p-6 md:p-8 shadow-xl flex flex-col gap-6">
              
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider pl-1">Select Doctor</label>
                <select
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0F172A] border border-gray-300 dark:border-gray-700 rounded-xl text-sm outline-none focus:border-yellow-400 text-gray-900 dark:text-white transition-colors cursor-pointer appearance-none"
                >
                  {doctors.map(doc => (
                    <option key={doc.id} value={doc.id}>{doc.name} ({doc.specialty})</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider pl-1">Select Doctor</label>
                <select
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0F172A] border border-gray-300 dark:border-gray-700 rounded-xl text-sm outline-none focus:border-yellow-400 text-gray-900 dark:text-white transition-colors cursor-pointer appearance-none"
                >
                  {doctors.map(doc => (
                     <option key={doc.id} value={doc.id}>{doc.name} ({doc.specialty})</option>
                  ))}
                </select>
              </div>

              {activeTab === 'slots' ? (
                <>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider pl-1">Target Date</label>
                    <input 
                      type="date"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0F172A] border border-gray-300 dark:border-gray-700 rounded-xl text-sm outline-none focus:border-yellow-400 text-gray-900 dark:text-white transition-colors"
                    />
                  </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider pl-1">Shift Timing <span className="lowercase font-normal text-gray-500">(15 min intervals)</span></label>
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
                onClick={handlePreview}
                className="w-full mt-2 py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-700 border border-gray-300 dark:border-gray-700"
              >
                <Clock size={18} /> Preview Shift Slots
              </button>

                </>
              ) : (
                <>
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1 flex flex-col gap-2">
                      <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider pl-1">Name</label>
                      <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0F172A] border border-gray-300 dark:border-gray-700 rounded-xl text-sm outline-none focus:border-yellow-400 text-gray-900 dark:text-white transition-colors" />
                    </div>
                    <div className="flex-1 flex flex-col gap-2">
                      <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider pl-1">Specialty</label>
                      <input type="text" value={editSpecialty} onChange={(e) => setEditSpecialty(e.target.value)} className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0F172A] border border-gray-300 dark:border-gray-700 rounded-xl text-sm outline-none focus:border-yellow-400 text-gray-900 dark:text-white transition-colors" />
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row gap-6">
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

                  <button
                    type="button"
                    onClick={handleUpdateProfile}
                    disabled={updating}
                    className={`w-full mt-2 py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all ${updating ? 'bg-gray-200 dark:bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-yellow-400 hover:bg-yellow-500 text-black shadow-[0_4px_15px_rgb(250,204,21,0.2)] hover:shadow-[0_6px_20px_rgb(250,204,21,0.3)] hover:-translate-y-0.5'}`}
                  >
                    <Save size={18} /> {updating ? 'Saving...' : 'Save Profile Changes'}
                  </button>
                </>
              )}

            </div>

            {activeTab === 'slots' && generatedSlots.length > 0 && (
              <div className="bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-gray-800 rounded-3xl p-6 md:p-8 shadow-xl flex flex-col gap-6">
                <h2 className="text-lg font-bold text-yellow-400">Preview: {generatedSlots.length} Slots Generated</h2>
                
                <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                  {generatedSlots.map((slot, idx) => (
                    <span key={idx} className="px-3 py-1.5 bg-gray-50 dark:bg-[#0F172A] border border-gray-300 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300">
                      {slot.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).toUpperCase()}
                    </span>
                  ))}
                </div>

                <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                  <button
                    onClick={handlePublish}
                    disabled={publishing}
                    className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all ${
                      publishing
                        ? 'bg-gray-200 dark:bg-gray-800 text-gray-500 cursor-not-allowed'
                        : 'bg-yellow-400 hover:bg-yellow-500 text-yellow-950 shadow-[0_4px_15px_rgb(250,204,21,0.2)] hover:shadow-[0_6px_20px_rgb(250,204,21,0.3)] hover:-translate-y-0.5'
                    }`}
                  >
                    {publishing ? 'Publishing...' : (
                      <>
                        <CheckCircle size={20} />
                        Publish All Slots
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

          </div>
        )}

      </main>

      
  </div>
    );
}
