import { useState, useEffect } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { APP_ID } from '../../lib/constants';
import { Seat } from '../../types/schema';
import { SEATING_PLAN_TEMPLATE } from '../../config/seatingPlan';
import { initializeEventSeats } from '../../services/bookingService';
import { Loader2, AlertCircle } from 'lucide-react';

interface SeatMapProps {
  eventId: string;
  requiredSeats: number;
  selectedSeats: string[];
  onSeatSelect: (seatIds: string[]) => void;
}

export function SeatMap({ eventId, requiredSeats, selectedSeats, onSeatSelect }: SeatMapProps) {
  const [seats, setSeats] = useState<Record<string, Seat>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(false);

  useEffect(() => {
    if (!eventId) return;
    setIsLoading(true);

    const q = query(collection(db, `apps/${APP_ID}/events/${eventId}/seats`));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (snapshot.empty) {
        if (!isInitializing) {
          setIsInitializing(true);
          try {
            // Hot-init proxy for missing event structures
            await initializeEventSeats(eventId);
          } catch (err) {
            console.error('Bootstrapping seat map blueprint failed', err);
          } finally {
            setIsInitializing(false);
          }
        }
      } else {
        const seatMap: Record<string, Seat> = {};
        snapshot.forEach(doc => {
          seatMap[doc.id] = doc.data() as Seat;
        });
        setSeats(seatMap);
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [eventId, isInitializing]);

  const handleSeatClick = (seatId: string) => {
    const seat = seats[seatId];
    if (!seat || seat.status !== 'available') return;

    if (selectedSeats.includes(seatId)) {
      onSeatSelect(selectedSeats.filter(id => id !== seatId));
    } else {
      if (selectedSeats.length >= requiredSeats) {
         // Auto-override last assigned seat array queue if overflow occurs
         onSeatSelect([...selectedSeats.slice(1), seatId]);
      } else {
         onSeatSelect([...selectedSeats, seatId]);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-gray-400 bg-gray-50 border border-gray-200 rounded-xl">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-brand-primary" />
        <p className="font-medium text-gray-600">Sitzplan-Grid wird initialisiert...</p>
        <p className="text-xs mt-2 text-gray-400">Das Kontingent wird aus der Datenbank synchronisiert.</p>
      </div>
    );
  }

  // Warning when constraints strictly block progression
  const seatsMissing = requiredSeats - selectedSeats.length;

  return (
    <div className="w-full bg-white border border-gray-200 rounded-xl p-6 shadow-inner relative">
      
      {seatsMissing > 0 && (
         <div className="mb-6 flex items-center gap-3 p-4 bg-orange-50 border border-orange-200 text-orange-800 rounded-lg animate-pulse">
           <AlertCircle className="w-5 h-5 flex-shrink-0" />
           <p className="font-bold text-sm">Aktion erforderlich: Bitte weisen Sie noch {seatsMissing} Tickets im Sitzplan physisch zu.</p>
         </div>
      )}

      <div className="w-full overflow-x-auto pb-4">
        <div className="min-w-max mx-auto space-y-4">
          <div className="w-full bg-gray-300 text-gray-500 text-center py-2 text-sm font-bold tracking-widest uppercase rounded">
            Bühnen Setup
          </div>
          
          <div className="flex flex-col gap-3 mt-8">
            {SEATING_PLAN_TEMPLATE.map((rowConfig) => (
              <div key={rowConfig.rowId} className="flex items-center gap-4 justify-center">
                <span className="w-6 text-center font-bold text-gray-400">{rowConfig.rowId}</span>
                
                <div className="flex gap-2">
                  {rowConfig.elements.map((seatItem, idx) => {
                    if (seatItem.type === 'spacer') {
                      return <div key={`spacer-${idx}`} style={{ width: `${seatItem.width * 2.5}rem` }} className="h-10" />;
                    }

                    const s = seatItem as { id: string; number: number };
                    const seatData = seats[s.id];
                    if (!seatData) return <div key={s.id} className="w-10 h-10 border border-gray-200 bg-gray-100 rounded opacity-50"></div>;

                    const isSelected = selectedSeats.includes(s.id);
                    const isAvailable = seatData.status === 'available';

                    // Strict UI Twin-Toggling logic
                    let btnClass = "w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all ";
                    
                    if (isSelected) {
                      btnClass += "bg-brand-primary text-white shadow-lg ring-2 ring-brand-primary/50 transform scale-110";
                    } else if (isAvailable) {
                      btnClass += "bg-white border-2 border-gray-300 text-gray-700 hover:border-brand-primary hover:text-brand-primary cursor-pointer active:scale-95";
                    } else {
                      btnClass += "bg-gray-200 border border-gray-300 text-gray-400 cursor-not-allowed opacity-50";
                    }

                    return (
                      <button
                        key={s.id}
                        onClick={() => handleSeatClick(s.id)}
                        disabled={!isAvailable}
                        className={btnClass}
                        title={`Reihe ${rowConfig.rowId} Platz ${s.number} (${seatData.status})`}
                      >
                        {s.number}
                      </button>
                    );
                  })}
                </div>
                
                <span className="w-6 text-center font-bold text-gray-400">{rowConfig.rowId}</span>
              </div>
            ))}
          </div>
          <div className="mt-8 pt-4 border-t border-gray-200 flex justify-center gap-6 text-sm font-medium text-gray-600">
            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full border-2 border-gray-300 bg-white"></div> Frei</div>
            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-brand-primary shadow-sm ring-2 ring-brand-primary/30"></div> Aktiv ({selectedSeats.length}/{requiredSeats})</div>
            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-gray-200 border border-gray-300 opacity-60"></div> Gesperrt</div>
          </div>
        </div>
      </div>
    </div>
  );
}
