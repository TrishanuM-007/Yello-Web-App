import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Menu, UserPlus, Image as ImageIcon, CheckCircle, Clock } from 'lucide-react';
import { Platform, View, Text } from 'react-native';
import { db } from '../../config/firebase';
import { collection, writeBatch, doc } from 'firebase/firestore';

const SPECIALTIES = [
  'Gynecologist',
  'Pediatrician',
  'Radiology',
  'Psychiatrist',
  'Physiology',
  'General Physician',
  'Dentist'
];

export default function AddDoctorScreen() {
  const { isDarkMode } = useTheme();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    if (Platform.OS === 'web' && !document.getElementById('tailwind-cdn')) {
      const script = document.createElement('script');
      script.id = 'tailwind-cdn';
      script.src = 'https://cdn.tailwindcss.com';
      document.head.appendChild(script);
    }
  }, []);

  const formatTimeForDisplay = (time24) => {
    if (!time24) return '';
    const [h, m] = time24.split(':');
    let hours = parseInt(h, 10);
    const suffix = hours >= 12 ? 'PM' : 'AM';
    if (hours === 0) hours = 12;
    if (hours > 12) hours -= 12;
    return `${hours}:${m} ${suffix}`;
  };

  const [name, setName] = useState('');
  const [specialty, setSpecialty] = useState(SPECIALTIES[0]);
  const [experience, setExperience] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [contactNumber, setContactNumber] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');

  const [duration, setDuration] = useState('30');
  const [daysInAdvance, setDaysInAdvance] = useState('30');

  const [loading, setLoading] = useState(false);

  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImageUrl(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddDoctor = async (e) => {
    if (e) e.preventDefault();
    if (!name.trim() || !specialty || !experience.trim() || !contactNumber.trim() || !description.trim()) {
      window.alert('Error: Please fill in all required fields.');
      return;
    }

    setLoading(true);
    try {
      const batch = writeBatch(db);
      const newDoctorRef = doc(collection(db, 'doctors'));

      const doctorData = {
        name: name.trim(),
        specialty,
        experience: parseInt(experience, 10) || 0,
        contactNumber: `${countryCode} ${contactNumber.trim()}`,
        startTime: formatTimeForDisplay(startTime),
        endTime: formatTimeForDisplay(endTime),
        description: description.trim(),
        imageUrl: imageUrl,
        createdAt: new Date().toISOString()
      };

      batch.set(newDoctorRef, doctorData);

      // Generate slots
      const days = parseInt(daysInAdvance, 10) || 30;
      const durationMins = parseInt(duration, 10) || 30;

      const [startH, startM] = startTime.split(':').map(Number);
      const [endH, endM] = endTime.split(':').map(Number);

      const startTotalMins = startH * 60 + startM;
      const endTotalMins = endH * 60 + endM;

      const today = new Date();
      for (let i = 1; i <= days; i++) {
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + i);
        const dateStr = targetDate.toISOString().split('T')[0];

        let currentMins = startTotalMins;

        while (currentMins + durationMins <= endTotalMins) {
          const slotStartH = Math.floor(currentMins / 60);
          const slotStartM = currentMins % 60;
          const slotEndH = Math.floor((currentMins + durationMins) / 60);
          const slotEndM = (currentMins + durationMins) % 60;

          const formatTime = (h, m) => {
            const ampm = h >= 12 ? 'PM' : 'AM';
            let hr = h % 12;
            if (hr === 0) hr = 12;
            const minStr = m.toString().padStart(2, '0');
            return `${hr}:${minStr} ${ampm}`;
          };

          const timeString = `${formatTime(slotStartH, slotStartM)} - ${formatTime(slotEndH, slotEndM)}`;
          const startTimestampStr = `${dateStr}T${slotStartH.toString().padStart(2, '0')}:${slotStartM.toString().padStart(2, '0')}:00`;

          const slotRef = doc(collection(db, 'available_slots'));
          batch.set(slotRef, {
            doctorId: newDoctorRef.id,
            doctorName: doctorData.name,
            date: dateStr,
            time: timeString,
            startTimestamp: startTimestampStr,
            isBooked: false,
            createdAt: new Date().toISOString()
          });

          currentMins += durationMins;
        }
      }

      await batch.commit();

      window.alert('Success: Doctor and their available slots were successfully generated!');

      setName('');
      setSpecialty(SPECIALTIES[0]);
      setExperience('');
      setContactNumber('');
      setDescription('');
      setImageUrl('');
      setStartTime('09:00');
      setEndTime('17:00');
      setDuration('30');
      setDaysInAdvance('30');
    } catch (error) {
      console.error('Error adding doctor:', error);
      window.alert('Error: Failed to add doctor. Please try again.');
    } finally {
      setLoading(false);
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
    <div className={`flex h-screen w-full bg-gray-50 dark:bg-[#0F172A] text-white ${isDarkMode ? 'dark' : ''}  overflow-hidden font-sans`}>



      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative p-4 md:p-8 flex flex-col min-w-0">

        {/* Header Row */}
        <header className="flex flex-col gap-2 mb-8 shrink-0 border-b border-gray-800 pb-6">
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">Add New Doctor</h1>
          <p className="text-gray-400 mt-1">Create a new doctor profile and automatically generate their schedule slots.</p>
        </header>

        <form onSubmit={handleAddDoctor} className="max-w-4xl w-full flex flex-col gap-6 pb-24">

          {/* Profile Card */}
          <div className="bg-[#1E293B] border border-gray-800 rounded-3xl p-6 lg:p-8 shadow-xl flex flex-col gap-6">
            <h2 className="text-xl font-bold text-white border-b border-gray-800 pb-4">1. Profile Details</h2>

            <div className="flex flex-col lg:flex-row gap-8">

              {/* Image Upload */}
              <div className="flex flex-col items-center gap-4 shrink-0">
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-32 h-32 rounded-full border-2 border-dashed border-gray-600 bg-[#0F172A] hover:border-yellow-400 flex flex-col items-center justify-center cursor-pointer transition-colors overflow-hidden group"
                >
                  {imageUrl ? (
                    <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <ImageIcon size={24} className="text-gray-400 group-hover:text-yellow-400 mb-2 transition-colors" />
                      <span className="text-[10px] font-bold text-gray-400 group-hover:text-yellow-400 uppercase tracking-wider">Upload</span>
                    </>
                  )}
                </div>
              </div>

              {/* Input Fields */}
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider pl-1">Doctor Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 bg-[#0F172A] border border-gray-700 rounded-xl text-sm outline-none focus:border-yellow-400 text-white transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider pl-1">Specialty</label>
                  <select
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    className="w-full px-4 py-3 bg-[#0F172A] border border-gray-700 rounded-xl text-sm outline-none focus:border-yellow-400 text-white transition-colors cursor-pointer appearance-none"
                  >
                    {SPECIALTIES.map(spec => (
                      <option key={spec} value={spec}>{spec}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider pl-1">Experience (Years)</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 10"
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                    className="w-full px-4 py-3 bg-[#0F172A] border border-gray-700 rounded-xl text-sm outline-none focus:border-yellow-400 text-white transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider pl-1">Contact Number</label>
                  <div className="flex gap-2">
                    <select
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className="px-3 py-3 bg-[#0F172A] border border-gray-700 rounded-xl text-sm outline-none focus:border-yellow-400 text-white transition-colors w-24"
                    >
                      <option value="+91">+91 (IN)</option>
                      <option value="+1">+1 (US/CA)</option>
                      <option value="+44">+44 (UK)</option>
                      <option value="+61">+61 (AU)</option>
                      <option value="+971">+971 (AE)</option>
                    </select>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 9876543210"
                      value={contactNumber}
                      onChange={(e) => setContactNumber(e.target.value)}
                      className="flex-1 px-4 py-3 bg-[#0F172A] border border-gray-700 rounded-xl text-sm outline-none focus:border-yellow-400 text-white transition-colors"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2 md:col-span-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider pl-1">Professional Description</label>
                  <textarea
                    required
                    placeholder="Enter a brief bio..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 bg-[#0F172A] border border-gray-700 rounded-xl text-sm outline-none focus:border-yellow-400 text-white transition-colors resize-none"
                  />
                </div>

              </div>
            </div>
          </div>

          {/* Schedule Configuration Card */}
          <div className="bg-[#1E293B] border border-gray-800 rounded-3xl p-6 lg:p-8 shadow-xl flex flex-col gap-6">
            <h2 className="text-xl font-bold text-white border-b border-gray-800 pb-4 flex items-center gap-3">
              2. Schedule Configuration <Clock size={20} className="text-yellow-400" />
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider pl-1">Shift Timing</label>
                <div className="flex items-center gap-3">
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="flex-1 px-4 py-3 bg-[#0F172A] border border-gray-700 rounded-xl text-sm outline-none focus:border-yellow-400 text-white transition-colors"
                  />
                  <span className="text-gray-500 font-medium">to</span>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="flex-1 px-4 py-3 bg-[#0F172A] border border-gray-700 rounded-xl text-sm outline-none focus:border-yellow-400 text-white transition-colors"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider pl-1">Consultation Duration</label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full px-4 py-3 bg-[#0F172A] border border-gray-700 rounded-xl text-sm outline-none focus:border-yellow-400 text-white transition-colors cursor-pointer appearance-none"
                >
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="45">45 minutes</option>
                  <option value="60">60 minutes</option>
                </select>
              </div>

              <div className="flex flex-col gap-2 md:col-span-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider pl-1">Days to Generate in Advance</label>
                <input
                  type="number"
                  required
                  min="1"
                  max="90"
                  value={daysInAdvance}
                  onChange={(e) => setDaysInAdvance(e.target.value)}
                  className="w-full md:w-1/2 px-4 py-3 bg-[#0F172A] border border-gray-700 rounded-xl text-sm outline-none focus:border-yellow-400 text-white transition-colors"
                />
                <p className="text-xs text-gray-500 mt-1 pl-1">This will automatically bulk-create available slots for the next {daysInAdvance || 0} days.</p>
              </div>

            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all ${loading
                ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                : 'bg-yellow-400 hover:bg-yellow-500 text-yellow-950 shadow-[0_4px_15px_rgb(250,204,21,0.2)] hover:shadow-[0_6px_20px_rgb(250,204,21,0.3)] hover:-translate-y-0.5'
              }`}
          >
            {loading ? 'Processing & Generating Slots...' : (
              <>
                <CheckCircle size={20} />
                Create Doctor Profile & Schedule
              </>
            )}
          </button>

        </form>

      </main>
    </div>


  );
}
