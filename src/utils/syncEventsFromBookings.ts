import { collection, getDocs, doc, getDoc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { APP_ID } from '../lib/constants';
import { initializeEventSeats } from '../services/bookingService';

export async function syncMissingEvents() {
  try {
    const bookingsSnap = await getDocs(collection(db, `apps/${APP_ID}/bookings`));
    const uniqueEvents = new Map();

    bookingsSnap.forEach(docSnap => {
      const data = docSnap.data();
      if (data.eventId && data.dateTime) {
        if (!uniqueEvents.has(data.eventId)) {
          uniqueEvents.set(data.eventId, data.dateTime);
        }
      }
    });

    let createdCount = 0;

    for (const [eventId, dateTime] of uniqueEvents.entries()) {
      const eventRef = doc(db, `apps/${APP_ID}/events`, eventId);
      const eventSnap = await getDoc(eventRef);

      if (!eventSnap.exists()) {
        const batch = writeBatch(db);
        batch.set(eventRef, {
          title: 'Importiertes Event (Regiondo)',
          date: dateTime,
          status: 'active'
        });
        await batch.commit();

        // WICHTIG: Sitze initialisieren, damit die Auslastung berechnet werden kann
        await initializeEventSeats(eventId);
        createdCount++;
      }
    }

    return createdCount;
  } catch (error) {
    console.error("Fehler beim Synchronisieren:", error);
    throw error;
  }
}
