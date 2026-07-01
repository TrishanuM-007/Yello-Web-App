import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../config/firebase';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { X, Search } from 'lucide-react';

export default function DoctorBookingModal({ isVisible, onClose, selectedDoctor, initialSlotId }) {
  const [patients, setPatients] = useState([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  
  const [selectedSlotId, setSelectedSlotId] = useState(initialSlotId || null);
  const [isBookingDoctor, setIsBookingDoctor] = useState(false);

  useEffect(() => {
    setSelectedSlotId(initialSlotId || null);
  }, [initialSlotId, isVisible]);

  useEffect(() => {
    if (isVisible) {
      const unsubPatients = onSnapshot(collection(db, 'patients'), (snapshot) => {
        const pList = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setPatients(pList);
      });
      return () => unsubPatients();
    }
  }, [isVisible]);

  const filteredPatients = useMemo(() => {
    if (!patientSearch) return [];
    return patients.filter(p => 
      p.name?.toLowerCase().includes(patientSearch.toLowerCase()) || 
      p.phoneNumber?.includes(patientSearch)
    ).slice(0, 5);
  }, [patients, patientSearch]);

  const confirmDoctorBooking = async () => {
    if (!selectedPatientId || !selectedSlotId) {
      window.alert('Error: Please select a patient and an available slot.');
      return;
    }

    setIsBookingDoctor(true);
    try {
      const slotRef = doc(db, 'available_slots', selectedSlotId);
      await updateDoc(slotRef, {
        isBooked: true,
        status: 'confirmed',
        patientId: selectedPatientId,
        bookedAt: new Date().toISOString()
      });
      
      setPatientSearch('');
      setSelectedPatientId(null);
      
      onClose();
    } catch (error) {
      console.error(error);
      window.alert('Error: Failed to book appointment.');
    } finally {
      setIsBookingDoctor(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm transition-opacity font-sans">
      <div className="bg-[#1E293B] w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-gray-800 flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-[#0F172A]/50">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Book Appointment</h2>
            {selectedDoctor && <p className="text-yellow-400 font-medium mt-1">Dr. {selectedDoctor.name}</p>}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors bg-gray-800/50 hover:bg-gray-700 p-2 rounded-full">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 flex flex-col gap-5 overflow-y-auto">
          
          <div className="flex flex-col gap-2 relative">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider pl-1">1. Select Patient</label>
            <div className="relative">
              <Search size={16} className="absolute left-4 top-4 text-gray-400" />
              <input 
                type="text"
                placeholder="Type Name or Phone..."
                value={patientSearch}
                onChange={(e) => {
                  setPatientSearch(e.target.value);
                  setSelectedPatientId(null);
                }}
                className="w-full pl-11 pr-4 py-3 bg-[#0F172A] border border-gray-700 rounded-xl text-sm outline-none focus:border-yellow-400 text-white transition-colors"
              />
            </div>
            
            {filteredPatients.length > 0 && !selectedPatientId && (
              <div className="absolute top-[72px] left-0 right-0 bg-[#0F172A] border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-48 overflow-y-auto">
                {filteredPatients.map(p => (
                  <button 
                    key={p.id} 
                    onClick={() => {
                      setSelectedPatientId(p.id);
                      setPatientSearch(`${p.name} (${p.phoneNumber})`);
                    }}
                    className="w-full text-left px-4 py-3 border-b border-gray-800 hover:bg-gray-800 text-sm text-gray-200 transition-colors flex items-center justify-between"
                  >
                    <span className="font-medium text-white">{p.name}</span>
                    <span className="text-gray-400 text-xs">{p.phoneNumber}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider pl-1">2. Select Available Slot</label>
            <select
              value={selectedSlotId || ''}
              onChange={(e) => setSelectedSlotId(e.target.value)}
              className="w-full px-4 py-3 bg-[#0F172A] border border-gray-700 rounded-xl text-sm font-medium text-white outline-none cursor-pointer transition-colors"
            >
              <option value="" disabled>Choose a time slot...</option>
              {selectedDoctor?.availableSlots?.map(slot => (
                <option key={slot.id} value={slot.id}>
                  {slot.date} at {slot.time}
                </option>
              ))}
            </select>
          </div>
          
          <button
            disabled={isBookingDoctor}
            onClick={confirmDoctorBooking}
            className={`w-full mt-4 py-4 rounded-xl font-bold text-base transition-all ${
              isBookingDoctor
                ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                : 'bg-yellow-400 hover:bg-yellow-500 text-yellow-950 shadow-md hover:shadow-lg hover:-translate-y-0.5'
            }`}
          >
            {isBookingDoctor ? 'Confirming...' : 'Confirm Booking'}
          </button>

        </div>
      </div>
    </div>
  );
}
