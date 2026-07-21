import { db } from '../config/firebase';
import { collection, query, where, getDocs, writeBatch, doc } from 'firebase/firestore';

export const migrateFutureSlots = async () => {
  try {
    const slotsRef = collection(db, 'available_slots');
    const q = query(slotsRef, where('date', '>=', '2026-07-21'));
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.log('No future slots found to migrate.');
      return;
    }

    let batch = writeBatch(db);
    let operationCount = 0;
    
    for (const document of querySnapshot.docs) {
      const data = document.data();
      let is30Min = false;
      let startMins = null;

      const parseTime = (timeStr) => {
        if (!timeStr) return null;
        const match12 = timeStr.trim().match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (match12) {
          let h = parseInt(match12[1], 10);
          let m = parseInt(match12[2], 10);
          if (match12[3].toUpperCase() === 'PM' && h < 12) h += 12;
          if (match12[3].toUpperCase() === 'AM' && h === 12) h = 0;
          return h * 60 + m;
        }
        const match24 = timeStr.trim().match(/(\d+):(\d+)/);
        if (match24) {
          return parseInt(match24[1], 10) * 60 + parseInt(match24[2], 10);
        }
        return null;
      };

      if (data.time && typeof data.time === 'string' && data.time.includes('-')) {
        const parts = data.time.split('-');
        if (parts.length === 2) {
          startMins = parseTime(parts[0]);
          const endMins = parseTime(parts[1]);
          if (startMins !== null && endMins !== null) {
            let diff = endMins - startMins;
            if (diff < 0) diff += 24 * 60;
            if (diff === 30) {
              is30Min = true;
            }
          }
        }
      }

      if (typeof data.startTimestamp === 'number') {
        const d = new Date(data.startTimestamp);
        if (startMins === null) startMins = d.getHours() * 60 + d.getMinutes();
        if (typeof data.endTimestamp === 'number') {
          if (data.endTimestamp - data.startTimestamp === 30 * 60 * 1000) is30Min = true;
        }
      } else if (typeof data.startTimestamp === 'string') {
         const timePart = data.startTimestamp.split('T')[1];
         if (timePart && startMins === null) {
            const [h, m] = timePart.split(':');
            startMins = parseInt(h, 10) * 60 + parseInt(m, 10);
         }
      }

      if (data.duration === 30 || data.durationInHours === 0.5) {
        is30Min = true;
      }

      if (is30Min && startMins !== null) {
        const slotDocRef = doc(db, 'available_slots', document.id);
        
        let newStartMins = startMins;
        let newEndMins = startMins + 20;

        if (startMins % 60 === 30) {
          newStartMins = startMins - 10;
          newEndMins = newStartMins + 20;
        }

        const formatAmPm = (mins) => {
          let h = Math.floor(mins / 60);
          let m = mins % 60;
          const ampm = h >= 12 ? 'PM' : 'AM';
          h = h % 12;
          if (h === 0) h = 12;
          return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${ampm}`;
        };

        const newTimeStr = `${formatAmPm(newStartMins)} - ${formatAmPm(newEndMins)}`;
        
        let newStartTimestamp = data.startTimestamp;
        if (typeof data.startTimestamp === 'string') {
          const sh = Math.floor(newStartMins / 60).toString().padStart(2, '0');
          const sm = (newStartMins % 60).toString().padStart(2, '0');
          newStartTimestamp = `${data.date}T${sh}:${sm}:00`;
        } else if (typeof data.startTimestamp === 'number') {
          const d = new Date(`${data.date}T00:00:00`);
          d.setHours(Math.floor(newStartMins / 60), newStartMins % 60, 0, 0);
          newStartTimestamp = d.getTime();
        }

        let updateData = {
          duration: 20,
          time: newTimeStr,
          startTimestamp: newStartTimestamp
        };

        if (data.endTimestamp !== undefined) {
          if (typeof data.endTimestamp === 'number') {
            const d = new Date(`${data.date}T00:00:00`);
            d.setHours(Math.floor(newEndMins / 60), newEndMins % 60, 0, 0);
            updateData.endTimestamp = d.getTime();
          } else if (typeof data.endTimestamp === 'string') {
             const eh = Math.floor(newEndMins / 60).toString().padStart(2, '0');
             const em = (newEndMins % 60).toString().padStart(2, '0');
             updateData.endTimestamp = `${data.date}T${eh}:${em}:00`;
          }
        }

        batch.update(slotDocRef, updateData);
        
        operationCount++;
        
        if (operationCount === 500) {
          await batch.commit();
          batch = writeBatch(db);
          operationCount = 0;
        }
      }
    }
    
    if (operationCount > 0) {
      await batch.commit();
    }
    
    console.log("Migration complete: All existing 30-min slots converted to 20 mins");
  } catch (error) {
    console.error("Error migrating future slots:", error);
  }
};
