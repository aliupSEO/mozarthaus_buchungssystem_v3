import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { APP_ID } from '../../lib/constants';
import { Event, Booking } from '../../types/schema';
import type { Musiker } from '../../services/firebase/musikerService';
import { SeatingChartVisual } from '../../components/events/SeatingChartVisual';
import { EventMusikerAssignment } from '../../components/events/EventMusikerAssignment';
import { EventBookingTable } from '../../components/events/EventBookingTable';
import { ArrowLeft, Users, FileText, Music, Printer } from 'lucide-react';

export function EventBelegungsplan() {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState<Event | null>(null);
  const [musikerList, setMusikerList] = useState<Musiker[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!eventId) return;

    // 1. Fetch Event Document
    const unsubEvent = onSnapshot(doc(db, `apps/${APP_ID}/events`, eventId), (snap) => {
      if (snap.exists()) {
        setEvent({ id: snap.id, ...snap.data() } as Event);
      } else {
        alert("Event nicht gefunden.");
        navigate('/events');
      }
    });

    // 2. Fetch all Musiker
    const unsubMusiker = onSnapshot(collection(db, `apps/${APP_ID}/musiker`), (snap) => {
      const list: Musiker[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as Musiker));
      list.sort((a, b) => a.nachname.localeCompare(b.nachname));
      setMusikerList(list);
    });

    // 3. Fetch all Bookings for this Event
    const q = query(collection(db, `apps/${APP_ID}/bookings`), where('eventId', '==', eventId));
    const unsubBookings = onSnapshot(q, (snap) => {
      const bList: Booking[] = [];
      snap.forEach(d => bList.push({ id: d.id, ...d.data() } as Booking));
      setBookings(bList);
      setIsLoading(false);
    });

    return () => {
      unsubEvent();
      unsubMusiker();
      unsubBookings();
    };
  }, [eventId, navigate]);

  if (isLoading || !event) {
    return (
      <div className="flex flex-col gap-4 animate-pulse pt-10 px-8">
        <div className="h-10 bg-gray-200 rounded w-1/4"></div>
        <div className="flex gap-6 mt-6">
           <div className="h-96 bg-gray-200 rounded-xl w-1/2"></div>
           <div className="h-96 bg-gray-200 rounded-xl w-1/2"></div>
        </div>
        <div className="h-64 bg-gray-200 rounded-xl w-full mt-6"></div>
      </div>
    );
  }

  // Extract all booked seat IDs from bookings
  const bookedSeatIds = bookings
    .filter(b => b.status !== 'cancelled')
    .flatMap(b => b.seatIds || []);

  const groupTicketsCount = bookings
    .filter(b => b.status !== 'cancelled' && (!b.seatIds || b.seatIds.length === 0))
    .reduce((sum, b) => {
       if (b.groupPersons) return sum + b.groupPersons;
       if (b.tickets) return sum + b.tickets.reduce((s: number, t: any) => s + (t.quantity || 1), 0);
       return sum;
    }, 0);
    
  const totalBooked = bookedSeatIds.length + groupTicketsCount;

  const eventDateStr = typeof event.date !== 'string' && (event.date as any)?.toDate 
    ? (event.date as any).toDate().toLocaleDateString('de-AT', { dateStyle: 'full' }) 
    : String(event.date);

  return (
    <div className="max-w-[1400px] mx-auto pb-12 print:pb-0 print:max-w-none">
      
      {/* Print-Only Header */}
      <div className="hidden print:block mb-8 border-b-2 border-black pb-4">
        <h1 className="text-3xl font-bold font-heading text-black m-0 mb-1">{event.title}</h1>
        <p className="text-xl text-black font-medium text-gray-800 m-0">
          {eventDateStr} | {event.time || ''} Uhr
        </p>
        <h2 className="text-xl font-bold mt-2 uppercase tracking-widest text-gray-500">Belegungs- & Abendkassenplan</h2>
      </div>

      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <button 
            onClick={() => navigate('/events')}
            className="flex items-center gap-2 text-gray-500 hover:text-brand-primary font-medium text-sm mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Zurück zu Events
          </button>
          <h1 className="text-3xl font-heading text-brand-primary font-bold flex items-center gap-3">
            <FileText className="w-8 h-8 opacity-80" />
            Belegungsplan & Dienstplan
          </h1>
          <p className="text-gray-600 font-medium mt-1 text-lg">
            {event.title} <span className="text-gray-400 mx-2">|</span> {eventDateStr} {event.time || ''} Uhr
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => window.print()}
            className="px-4 py-2.5 bg-gray-900 text-white font-bold rounded-xl shadow-sm hover:bg-gray-800 transition-all flex items-center gap-2"
          >
            <Printer className="w-5 h-5" />
            Drucken
          </button>
          <button 
            onClick={() => navigate(`/events/${event.id}`)}
            className="px-4 py-2.5 bg-white text-gray-700 font-bold border border-gray-200 rounded-xl shadow-sm hover:bg-gray-50 hover:border-brand-primary/30 transition-all flex items-center gap-2"
          >
             Kasse / Verkauf öffnen
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8 mt-8 print:block print:w-full print:mt-2 print:mb-4">
        {/* Links: Visueller Saalplan */}
        <div className="flex flex-col gap-3 print:mb-8 print:w-1/2 print:mx-auto">
          <h2 className="text-xl font-heading font-bold text-gray-900 flex items-center gap-2 px-2 print:hidden">
            <Users className="w-5 h-5 text-gray-400" />
            Visueller Saalplan
            <span className="text-sm font-bold bg-brand-primary text-white px-2 py-0.5 rounded-full ml-auto">
              {totalBooked} belegt
            </span>
          </h2>
          <SeatingChartVisual eventId={eventId!} bookedSeatIds={bookedSeatIds} />
        </div>
        
        {/* Rechts: Musiker & Gagen */}
        <div className="flex flex-col gap-3 print:hidden">
          <h2 className="text-xl font-heading font-bold text-gray-900 flex items-center gap-2 px-2">
            <Music className="w-5 h-5 text-gray-400" />
            Dienstplan
          </h2>
          <EventMusikerAssignment event={event} musikerList={musikerList} />
        </div>
      </div>

      {/* Unten: Buchungs-Tabelle */}
      <div className="print:w-full">
        <h2 className="text-xl font-heading font-bold text-gray-900 flex items-center gap-2 px-2 mb-4 mt-12 print:hidden">
          Detaillierte Ticket-Liste
        </h2>
        <EventBookingTable bookings={bookings} />
      </div>
    </div>
  );
}
