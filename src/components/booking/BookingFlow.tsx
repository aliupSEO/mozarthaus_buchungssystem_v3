import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { collection, query, orderBy, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { APP_ID } from '../../lib/constants';
import { useNavigate } from 'react-router-dom';
import { executeBookingTransaction } from '../../services/transactionService';
import { purchaseWithRegiondoCheckout } from '../../services/regiondoBookingPurchase';
import { Event } from '../../types/schema';
import type { RegiondoProduct } from '../../types/regiondo';
import {
  fetchRegiondoAvailabilities,
  fetchRegiondoProductById,
  fetchRegiondoProducts,
  weekAvailabilityDateRange,
} from '../../services/regiondoProductsService';
import { normalizeAvailabilityDateKey, parseAvailabilitySchedule } from '../../utils/regiondoAvailability';
import { getVariationUnitPriceEuro } from '../../utils/regiondoPrice';
import { distributeTotalAcrossCategories } from '../../utils/groupTicketDistribution';
import { regiondoCheckoutOptionIdString } from '../../utils/regiondoVariationIds';
import {
  addDays,
  RegiondoVariationWeekCalendar,
  regiondoVariationLabel,
  startOfWeekMonday,
  toYmdLocal,
  type SelectedCalendarSlot,
  type WeekCalendarBlock,
} from './RegiondoVariationWeekCalendar';
import { SeatMap } from './SeatMap';
import { PrivateEventCalendar } from './PrivateEventCalendar';
import {
  CalendarDays,
  Ticket,
  Building2,
  ChevronRight,
  CheckCircle2,
  Users,
  User,
  UsersRound,
  Loader2,
  ChevronDown,
  Search,
} from 'lucide-react';

function currencyLabel(p: RegiondoProduct): string {
  return p.currency_code || p.curency_code || 'EUR';
}

/** Seat map colors when using Regiondo variations (no Firebase ticket categories). */
const VARIATION_SEAT_COLORS = ['#0d9488', '#059669', '#0891b2', '#0284c7', '#4f46e5', '#7c3aed'];

/** Partner row from Firestore for B2B + auto-fill (see `Partner` in schema). */
interface PartnerOption {
  id: string;
  displayName: string;
  companyName: string;
  contactPerson: string;
  email: string;
  telefon: string;
  type: string;
}

function mapPartnerDoc(id: string, data: Record<string, unknown>): PartnerOption {
  const companyName = String(data.companyName ?? data.name ?? '').trim();
  const displayName = companyName || 'Unbenannt';
  return {
    id,
    displayName,
    companyName,
    contactPerson: typeof data.contactPerson === 'string' ? data.contactPerson.trim() : '',
    email: typeof data.email === 'string' ? data.email.trim() : '',
    telefon: typeof data.telefon === 'string' ? data.telefon.trim() : '',
    type: typeof data.type === 'string' ? data.type : '',
  };
}

export function BookingFlow() {
  const navigate = useNavigate();
  // Section 1 — Regiondo catalog (same source as Events page) + Firebase events for Saalplan (regiondoId link)
  const [regiondoProducts, setRegiondoProducts] = useState<RegiondoProduct[]>([]);
  const [regiondoListLoading, setRegiondoListLoading] = useState(true);
  const [productDetail, setProductDetail] = useState<RegiondoProduct | null>(null);
  const [productDetailLoading, setProductDetailLoading] = useState(false);
  const [calendarWeekStart, setCalendarWeekStart] = useState(() => startOfWeekMonday(new Date()));
  const [weekCalendarBlocks, setWeekCalendarBlocks] = useState<WeekCalendarBlock[]>([]);
  const [weekCalendarLoading, setWeekCalendarLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<SelectedCalendarSlot | null>(null);
  const [firebaseEvents, setFirebaseEvents] = useState<Event[]>([]);
  const [selectedRegiondoProductId, setSelectedRegiondoProductId] = useState('');
  
  // Section 2
  const [partners, setPartners] = useState<PartnerOption[]>([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState('');
  const [partnerComboOpen, setPartnerComboOpen] = useState(false);
  const [partnerSearchQuery, setPartnerSearchQuery] = useState('');
  const partnerComboRef = useRef<HTMLDivElement>(null);
  const partnerSearchInputRef = useRef<HTMLInputElement>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  
  const [bookingType, setBookingType] = useState<'einzel' | 'gruppe' | 'privat'>('einzel');
  const [sellerReference, setSellerReference] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [groupPersons, setGroupPersons] = useState<number | ''>('');
  /** Privat & Gruppe: Gesamt = Personen × Preis pro Person */
  const [privatePricePerPerson, setPrivatePricePerPerson] = useState<number | ''>('');
  const [groupPricePerPerson, setGroupPricePerPerson] = useState<number | ''>('');
  
  const [privateEventDate, setPrivateEventDate] = useState('');
  const [privateEventTime, setPrivateEventTime] = useState('');
  
  // Section 3 — quantities keyed by Regiondo `variation_id` (API), not Firebase ticket categories
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // Section 4
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);

  /** Firebase event document id for seat paths — requires `regiondoId` on the Event matching the Regiondo product_id. */
  const linkedFirebaseEventId = useMemo(() => {
    if (!selectedRegiondoProductId) return '';
    const ev = firebaseEvents.find((e) => String(e.regiondoId) === String(selectedRegiondoProductId));
    return ev?.id ?? '';
  }, [firebaseEvents, selectedRegiondoProductId]);

  /** First variation with ticket qty &gt; 0, else product id (for Firestore / downstream). */
  const variant = useMemo(() => {
    const vars = productDetail?.variations ?? [];
    for (const v of vars) {
      if ((quantities[v.variation_id] || 0) > 0) return v.variation_id;
    }
    return selectedRegiondoProductId;
  }, [productDetail?.variations, quantities, selectedRegiondoProductId]);

  /** Variations that have an API slot on the selected calendar date &amp; time. */
  const selectedSlotVariationIds = useMemo(() => {
    if (!selectedSlot) return new Set<string>();
    return new Set(
      weekCalendarBlocks
        .filter((b) => b.dateYmd === selectedSlot.dateYmd && b.slot.time === selectedSlot.time)
        .map((b) => b.variationId)
    );
  }, [selectedSlot, weekCalendarBlocks]);

  const filteredPartners = useMemo(() => {
    const q = partnerSearchQuery.trim().toLowerCase();
    if (!q) return partners;
    return partners.filter((p) => {
      const blob = [p.displayName, p.companyName, p.contactPerson, p.email, p.type, p.id]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return blob.includes(q);
    });
  }, [partners, partnerSearchQuery]);

  const applyPartnerContact = useCallback((p: PartnerOption | null) => {
    if (!p) {
      setCustomerName('');
      setCustomerEmail('');
      setCustomerPhone('');
      setContactPerson('');
      return;
    }
    setCustomerName((p.contactPerson || p.companyName || '').trim());
    setCustomerEmail((p.email || '').trim());
    setCustomerPhone((p.telefon || '').trim());
    setContactPerson((p.contactPerson || '').trim());
  }, []);

  useEffect(() => {
    if (!partnerComboOpen) return;
    const onMouseDown = (e: MouseEvent) => {
      const el = partnerComboRef.current;
      if (el && !el.contains(e.target as Node)) {
        setPartnerComboOpen(false);
        setPartnerSearchQuery('');
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [partnerComboOpen]);

  /** Focus search when opening; blur when closing — avoids focus fighting React commits (removeChild/insertBefore). */
  useEffect(() => {
    if (!partnerComboOpen) {
      partnerSearchInputRef.current?.blur();
      return;
    }
    const id = requestAnimationFrame(() => partnerSearchInputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [partnerComboOpen]);

  useEffect(() => {
    if (!selectedRegiondoProductId) {
      setProductDetail(null);
      setSelectedSlot(null);
      return;
    }
    let cancelled = false;
    setProductDetailLoading(true);
    void fetchRegiondoProductById(selectedRegiondoProductId, {
      store_locale: 'de-AT',
      currency: 'default',
    })
      .then((d) => {
        if (!cancelled) setProductDetail(d);
      })
      .catch(() => {
        if (!cancelled) setProductDetail(null);
      })
      .finally(() => {
        if (!cancelled) setProductDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedRegiondoProductId]);

  useEffect(() => {
    setSelectedSlot(null);
  }, [selectedRegiondoProductId]);

  useEffect(() => {
    setSelectedSlot(null);
  }, [calendarWeekStart]);

  /** One request per variation for Mon–Sun of `calendarWeekStart` only; refetch when week changes. */
  useEffect(() => {
    if (!productDetail?.variations?.length) {
      setWeekCalendarBlocks([]);
      setWeekCalendarLoading(false);
      return;
    }

    let cancelled = false;
    setWeekCalendarLoading(true);
    setWeekCalendarBlocks([]);

    const { dt_from, dt_to } = weekAvailabilityDateRange(calendarWeekStart);

    void Promise.all(
      productDetail.variations.map((v) =>
        fetchRegiondoAvailabilities(v.variation_id, {
          dt_from,
          dt_to,
          store_locale: 'de-AT',
        })
          .then((res) => ({ variationId: v.variation_id, rows: parseAvailabilitySchedule(res) }))
          .catch(() => ({ variationId: v.variation_id, rows: [] }))
      )
    ).then((results) => {
      if (cancelled) return;
      const variations = productDetail.variations!;
      const indexByVid = new Map(variations.map((v, i) => [v.variation_id, i]));

      const weekYmds = new Set<string>();
      for (let i = 0; i < 7; i++) {
        weekYmds.add(toYmdLocal(addDays(calendarWeekStart, i)));
      }

      const blocks: WeekCalendarBlock[] = [];
      for (const r of results) {
        const vMeta = variations.find((x) => x.variation_id === r.variationId);
        if (!vMeta) continue;
        const variationName = regiondoVariationLabel(vMeta);
        const variationIndex = indexByVid.get(r.variationId) ?? 0;
        for (const row of r.rows) {
          const d = normalizeAvailabilityDateKey(row.date);
          if (!weekYmds.has(d)) continue;
          for (const slot of row.slots) {
            blocks.push({
              variationId: r.variationId,
              variationName,
              variationIndex,
              dateYmd: d,
              slot,
            });
          }
        }
      }
      blocks.sort(
        (a, b) =>
          a.dateYmd.localeCompare(b.dateYmd) ||
          a.slot.time.localeCompare(b.slot.time) ||
          a.variationName.localeCompare(b.variationName)
      );
      setWeekCalendarBlocks(blocks);
      setWeekCalendarLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [productDetail, calendarWeekStart]);

  // Fix 1: Reset seats when event/date changes to prevent ghost bookings
  useEffect(() => {
    setSelectedSeats([]);
  }, [linkedFirebaseEventId, selectedSlot?.dateYmd, selectedSlot?.time]);

  useEffect(() => {
    setQuantities({});
  }, [selectedRegiondoProductId]);

  /** No calendar slot → no tickets; slot change → drop qty for variations not offered at that date/time. */
  useEffect(() => {
    if (!selectedSlot) {
      setQuantities({});
      return;
    }
    if (!productDetail?.variations?.length) return;
    const allowed = selectedSlotVariationIds;
    setQuantities((prev) => {
      const next = { ...prev };
      for (const v of productDetail.variations!) {
        if (!allowed.has(v.variation_id)) next[v.variation_id] = 0;
      }
      return next;
    });
  }, [selectedSlot, productDetail, selectedSlotVariationIds]);

  useEffect(() => {
    let cancelled = false;
    setRegiondoListLoading(true);
    void fetchRegiondoProducts({ limit: 250, offset: 0, store_locale: 'de-AT' })
      .then(({ products }) => {
        if (!cancelled) setRegiondoProducts(products);
      })
      .catch((err) => {
        console.error('Regiondo Produkte (Buchung):', err);
        if (!cancelled) setRegiondoProducts([]);
      })
      .finally(() => {
        if (!cancelled) setRegiondoListLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Trim seat selection when ticket count drops to keep SeatMap props consistent.
  useEffect(() => {
    let total = 0;
    for (const q of Object.values(quantities)) total += q;
    setSelectedSeats((prev) => {
      if (prev.length <= total) return prev;
      return prev.slice(0, total);
    });
  }, [quantities]);

  useEffect(() => {
    const unsubPartners = onSnapshot(collection(db, `apps/${APP_ID}/partners`), (snap) => {
      const list: PartnerOption[] = [];
      snap.forEach((d) => list.push(mapPartnerDoc(d.id, d.data() as Record<string, unknown>)));
      list.sort((a, b) => a.displayName.localeCompare(b.displayName, 'de'));
      setPartners(list);
    }, (err) => console.error('Fehler beim Laden der Partner:', err));

    const unsubEvents = onSnapshot(query(collection(db, `apps/${APP_ID}/events`), orderBy('date', 'asc')), snap => {
      const evts: Event[] = [];
      const now = Date.now();
      snap.forEach(d => {
         const data = d.data();
         const ev = { id: d.id, ...data } as Event;
         let eventTime = 0;
         if (data.date && typeof data.date.toDate === 'function') {
           eventTime = data.date.toMillis();
         } else if (data.date) {
           eventTime = new Date(`${data.date}T${data.time || '00:00'}`).getTime();
         }
         if (!eventTime || eventTime >= now) evts.push(ev);
      });
      setFirebaseEvents(evts);
    });

    return () => {
      unsubPartners();
      unsubEvents();
    };
  }, []);

  let totalPrice = 0;
  let totalTickets = 0;

  if (bookingType === 'einzel') {
    for (const v of productDetail?.variations ?? []) {
      const q = quantities[v.variation_id] || 0;
      totalTickets += q;
      totalPrice += q * getVariationUnitPriceEuro(v, productDetail);
    }
  } else if (bookingType === 'privat') {
    const n = Number(groupPersons) || 0;
    const ppp = Number(privatePricePerPerson) || 0;
    totalTickets = n;
    totalPrice = n * ppp;
  } else if (bookingType === 'gruppe') {
    const n = Number(groupPersons) || 0;
    const ppp = Number(groupPricePerPerson) || 0;
    totalTickets = n;
    totalPrice = n * ppp;
  }

  /** Gruppe: Tarif-Reihenfolge (Slot-Varianten zuerst), dann Aufteilung der Personenzahl. */
  const { groupVariationOrder, groupDistribution } = useMemo(() => {
    if (bookingType !== 'gruppe' || !productDetail?.variations?.length) {
      return { groupVariationOrder: null as string[] | null, groupDistribution: null as Record<string, number> | null };
    }
    const n = Number(groupPersons) || 0;
    if (n <= 0) return { groupVariationOrder: null, groupDistribution: null };
    const withSlot = (productDetail.variations ?? [])
      .map((v) => v.variation_id)
      .filter((id) => selectedSlotVariationIds.has(id));
    const order =
      withSlot.length > 0 ? withSlot : (productDetail.variations ?? []).map((v) => v.variation_id);
    if (order.length === 0) return { groupVariationOrder: null, groupDistribution: null };
    return {
      groupVariationOrder: order,
      groupDistribution: distributeTotalAcrossCategories(n, order),
    };
  }, [bookingType, productDetail, groupPersons, selectedSlotVariationIds]);

  const categoryAllocations = useMemo(() => {
    return (productDetail?.variations ?? []).map((v, i) => {
      let qty = 0;
      if (bookingType === 'einzel') qty = quantities[v.variation_id] || 0;
      else if (bookingType === 'gruppe' && groupDistribution) qty = groupDistribution[v.variation_id] || 0;
      return {
        id: v.variation_id,
        name: regiondoVariationLabel(v),
        quantity: qty,
        colorCode: VARIATION_SEAT_COLORS[i % VARIATION_SEAT_COLORS.length],
      };
    });
  }, [bookingType, productDetail, quantities, groupDistribution]);

  const handleSubmit = async () => {
    if (bookingType !== 'privat' && !selectedRegiondoProductId) {
      return alert('Bitte wähle ein Konzert aus (Regiondo-Katalog).');
    }
    if ((bookingType === 'einzel' || bookingType === 'gruppe') && !selectedSlot) {
      return alert('Bitte im Kalender einen Termin (Datum & Uhrzeit) auswählen.');
    }

    if (bookingType === 'einzel') {
      if (totalTickets === 0) return alert("Bitte wähle mindestens ein Ticket aus der Kategorie aus.");
      if (linkedFirebaseEventId && selectedSeats.length !== totalTickets) {
        return alert(`Bitte weise genau ${totalTickets} Sitzplätze im physischen Saalplan zu.`);
      }
      if (!customerName || !customerEmail || !customerPhone) return alert("Kundenname, Email und Telefonnummer sind zwingend erforderlich.");
    } else if (bookingType === 'gruppe') {
      if (!selectedPartnerId) return alert("Bitte wähle einen Partner für die Gruppenbuchung aus.");
      if (!sellerReference || !contactPerson) return alert("Verkäuferreferenz und Kontaktperson sind erforderlich.");
      if (!groupPersons || groupPricePerPerson === '') {
        return alert('Personenanzahl und Preis pro Person (€) sind erforderlich.');
      }
      if (!groupVariationOrder?.length) {
        return alert('Keine Tarife für den gewählten Termin — bitte Konzert und Termin prüfen.');
      }
      if (linkedFirebaseEventId && selectedSeats.length !== totalTickets) {
        return alert(`Bitte weise genau ${totalTickets} Sitzplätze im physischen Saalplan zu.`);
      }
    } else if (bookingType === 'privat') {
      if (!customerName || !customerEmail || !customerPhone) return alert("Kundenname, Email und Telefonnummer sind zwingend erforderlich.");
      if (!groupPersons || privatePricePerPerson === '') {
        return alert('Anzahl Personen und Preis pro Person (€) sind erforderlich.');
      }
      if (!privateEventDate || !privateEventTime) return alert("Bitte Datum und Uhrzeit für das Privat-Event angeben.");
    }

    setIsSubmitting(true);
    let regiondoPurchase: Awaited<ReturnType<typeof purchaseWithRegiondoCheckout>> | undefined;
    try {
      const tickets =
        bookingType === 'einzel'
          ? (productDetail?.variations ?? [])
              .filter((v) => (quantities[v.variation_id] || 0) > 0)
              .map((v) => ({
                categoryId: v.variation_id,
                quantity: quantities[v.variation_id],
                regiondoOptionId: regiondoCheckoutOptionIdString(v),
                categoryName: regiondoVariationLabel(v),
                price: getVariationUnitPriceEuro(v, productDetail),
              }))
          : bookingType === 'gruppe' && productDetail && groupDistribution
            ? (productDetail.variations ?? []).flatMap((v) => {
                const q = groupDistribution[v.variation_id] || 0;
                if (q <= 0) return [];
                return [
                  {
                    categoryId: v.variation_id,
                    quantity: q,
                    regiondoOptionId: regiondoCheckoutOptionIdString(v),
                    categoryName: regiondoVariationLabel(v),
                    price: getVariationUnitPriceEuro(v, productDetail),
                  },
                ];
              })
            : [];

      // Einzel/Gruppe: zuerst Regiondo Purchase; bei Erfolg dann Firebase. Privat: nur Firebase.
      if (bookingType === 'einzel' || bookingType === 'gruppe') {
        if (!productDetail || !selectedSlot) {
          setIsSubmitting(false);
          return;
        }
        const contactFullName = bookingType === 'gruppe' ? contactPerson.trim() : customerName.trim();
        try {
          regiondoPurchase = await purchaseWithRegiondoCheckout({
            bookingType,
            productId: selectedRegiondoProductId,
            productDetail,
            selectedSlot,
            quantities,
            groupPersons: bookingType === 'gruppe' ? Number(groupPersons) : undefined,
            groupVariationIds: bookingType === 'gruppe' ? groupVariationOrder ?? undefined : undefined,
            contactFullName,
            email: customerEmail.trim(),
            telephone: customerPhone.trim(),
          });
        } catch (re: unknown) {
          const msg = re instanceof Error ? re.message : String(re);
          alert(`Regiondo-Buchung fehlgeschlagen: ${msg}`);
          setIsSubmitting(false);
          return;
        }
      }

      const selectedEvent =
        bookingType === 'privat'
          ? undefined
          : firebaseEvents.find((e) => String(e.regiondoId) === String(selectedRegiondoProductId));
      const selectedRegiondoProduct =
        bookingType === 'privat'
          ? undefined
          : regiondoProducts.find((p) => p.product_id === selectedRegiondoProductId);

      /** Ohne lokales Firebase-Event: Regiondo-Buchung + Firestore-Eintrag unter Platzhalter-ID (kein Saalplan). */
      let finalEventId =
        selectedEvent?.id ?? `regiondo_product_${selectedRegiondoProductId}`;
      let finalVariantId = bookingType === 'privat' ? 'privat' : variant;
      let finalEventTitle = selectedEvent?.title || selectedRegiondoProduct?.name || '';
      let finalEventDateStr = '';

      if (bookingType !== 'privat' && selectedSlot && selectedRegiondoProduct) {
        if (bookingType === 'gruppe' && groupDistribution) {
          const parts = (productDetail?.variations ?? [])
            .map((v) => {
              const q = groupDistribution[v.variation_id] || 0;
              return q > 0 ? `${regiondoVariationLabel(v)} (${q})` : null;
            })
            .filter(Boolean);
          const ticketPart = parts.length ? parts.join(', ') : 'Gruppe';
          finalEventTitle = `${selectedRegiondoProduct.name} · ${ticketPart} · ${selectedSlot.dateYmd} ${selectedSlot.time}`;
        } else if (bookingType === 'einzel') {
          const ticketNames = (productDetail?.variations ?? [])
            .filter((v) => (quantities[v.variation_id] || 0) > 0)
            .map((v) => regiondoVariationLabel(v));
          const ticketPart = ticketNames.length ? ticketNames.join(', ') : 'Termin';
          finalEventTitle = `${selectedRegiondoProduct.name ?? finalEventTitle} · ${ticketPart} · ${selectedSlot.dateYmd} ${selectedSlot.time}`;
        }
      }

      if (bookingType === 'privat') {
        // Generiere eine lesbare, slugifizierte ID für das neue Event
        finalEventId = `privat_${privateEventDate.replace(/-/g, '_')}_${privateEventTime.replace(':', '')}`;
        finalEventTitle = `Privat Event - ${customerName}`;
        finalEventDateStr = `${privateEventDate}T${privateEventTime}:00.000Z`;
        
        // Neues Event-Dokument on-the-fly in Firestore anlegen
        await setDoc(doc(db, `apps/${APP_ID}/events`, finalEventId), {
          title: finalEventTitle,
          date: privateEventDate,
          time: privateEventTime,
          status: 'active',
          type: 'privat'
        });
      } else if (selectedSlot) {
        finalEventDateStr = `${selectedSlot.dateYmd}T${selectedSlot.time}:00`;
      } else {
        const eventDateRaw = selectedEvent?.date;
        finalEventDateStr = eventDateRaw
          ? typeof (eventDateRaw as any).toDate === 'function'
            ? (eventDateRaw as any).toDate().toISOString()
            : (eventDateRaw as string)
          : '';
      }

      const customerDisplayName = bookingType === 'gruppe' ? contactPerson.trim() : customerName.trim();

      const firebaseTotal =
        regiondoPurchase?.grand_total != null && !Number.isNaN(Number(regiondoPurchase.grand_total))
          ? Number(regiondoPurchase.grand_total)
          : regiondoPurchase?.checkoutTotalsForFirebase?.grandTotal != null &&
              !Number.isNaN(Number(regiondoPurchase.checkoutTotalsForFirebase.grandTotal))
            ? Number(regiondoPurchase.checkoutTotalsForFirebase.grandTotal)
            : totalPrice;

      await executeBookingTransaction({
        eventId: finalEventId,
        variantId: finalVariantId,
        eventTitle: finalEventTitle,
        eventDate: finalEventDateStr,
        dateTime:
          bookingType === 'privat' && privateEventDate && privateEventTime
            ? `${privateEventDate} ${privateEventTime}`
            : selectedSlot
              ? `${selectedSlot.dateYmd} ${selectedSlot.time}`
              : undefined,
        partnerId: selectedPartnerId || null,
        isB2B: !!selectedPartnerId,
        source:
          bookingType === 'privat'
            ? 'manual'
            : regiondoPurchase
              ? 'regiondo'
              : selectedPartnerId
                ? 'b2b'
                : 'manual',
        status: bookingType === 'privat' ? 'pending' : regiondoPurchase ? 'confirmed' : 'pending',
        bookingType,
        sellerReference: bookingType === 'gruppe' ? sellerReference : undefined,
        contactPerson: bookingType === 'gruppe' ? contactPerson : undefined,
        groupPersons: bookingType !== 'einzel' ? Number(groupPersons) : undefined,
        customTotalPrice:
          bookingType === 'privat'
            ? (Number(groupPersons) || 0) * (Number(privatePricePerPerson) || 0)
            : bookingType === 'gruppe'
              ? (Number(groupPersons) || 0) * (Number(groupPricePerPerson) || 0)
              : undefined,
        pricePerPerson:
          bookingType === 'privat'
            ? Number(privatePricePerPerson)
            : bookingType === 'gruppe'
              ? Number(groupPricePerPerson)
              : undefined,
        tickets,
        customerData: { name: customerDisplayName, email: customerEmail, phone: customerPhone },
        totalAmount: firebaseTotal,
        regiondoProductId: bookingType === 'privat' ? undefined : selectedRegiondoProductId,
        regiondoOrderId:
          regiondoPurchase?.order_id != null ? String(regiondoPurchase.order_id) : undefined,
        regiondoOrderNumber:
          regiondoPurchase?.order_number != null ? String(regiondoPurchase.order_number) : undefined,
        bookingNumber:
          regiondoPurchase?.order_number != null
            ? String(regiondoPurchase.order_number)
            : undefined,
        categoryName:
          bookingType === 'privat'
            ? undefined
            : bookingType === 'gruppe' && groupDistribution
              ? (productDetail?.variations ?? [])
                  .map((v) => {
                    const q = groupDistribution[v.variation_id] || 0;
                    return q > 0 ? `${regiondoVariationLabel(v)} (${q})` : null;
                  })
                  .filter(Boolean)
                  .join(', ') || undefined
              : bookingType === 'einzel'
                ? (productDetail?.variations ?? [])
                    .filter((v) => (quantities[v.variation_id] || 0) > 0)
                    .map((v) => regiondoVariationLabel(v))
                    .join(', ') || undefined
                : undefined,
        regiondoCheckoutMeta:
          regiondoPurchase?.checkoutTotalsForFirebase != null
            ? (JSON.parse(
                JSON.stringify(regiondoPurchase.checkoutTotalsForFirebase)
              ) as Record<string, unknown>)
            : undefined,
      }, (bookingType === 'einzel' || bookingType === 'gruppe') ? selectedSeats : []);
      
      setSuccess(true);
      setTimeout(() => navigate('/transaction'), 3000);
    } catch (err: any) {
      console.error(err);
      if (regiondoPurchase?.order_number) {
        alert(
          `Regiondo-Buchung ist angelegt (Nr. ${regiondoPurchase.order_number}), lokale Speicherung ist fehlgeschlagen: ${err?.message ?? String(err)}`
        );
      } else {
        alert('Schwerer Fehler bei der Transaktion: ' + (err?.message || JSON.stringify(err)));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-3xl mx-auto mt-20 p-12 bg-white rounded-2xl shadow-xl text-center border border-gray-100 flex flex-col items-center">
         <CheckCircle2 className="w-24 h-24 text-green-500 mb-6 animate-in zoom-in" />
         <h2 className="text-3xl font-heading font-bold text-gray-900 mb-2">Transaktion erfolgreich!</h2>
         <p className="text-gray-500 text-lg">Die Buchung wurde gespeichert.</p>
         <p className="text-sm text-gray-400 mt-6 animate-pulse">Sie werden zur Buchungsübersicht weitergeleitet...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-12 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-visible">
      <div className="border-b border-gray-200 pb-5">
        <h1 className="text-3xl font-heading text-brand-primary font-bold">Varianten-Buchung (Mozart Ensemble)</h1>
        <p className="text-gray-500 mt-2 text-lg font-medium">Regiondo B2B Flow & asymmetrische Kontingentbuchung</p>
      </div>

      <div className="flex gap-4 mb-8">
        <button onClick={() => setBookingType('einzel')} className={`flex-1 py-4 px-6 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${bookingType === 'einzel' ? 'bg-brand-primary text-white shadow-lg' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
          <User className="w-5 h-5"/> Einzelbuchung
        </button>
        <button onClick={() => setBookingType('gruppe')} className={`flex-1 py-4 px-6 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${bookingType === 'gruppe' ? 'bg-blue-500 text-white shadow-lg' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
          <Users className="w-5 h-5"/> Gruppenbuchung
        </button>
        <button onClick={() => setBookingType('privat')} className={`flex-1 py-4 px-6 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${bookingType === 'privat' ? 'bg-purple-500 text-white shadow-lg' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
          <UsersRound className="w-5 h-5"/> Privatbuchung
        </button>
      </div>

      {/* Sektion 1: Event & Termin */}
      <section className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
        <div
          className={`absolute top-0 left-0 w-1.5 h-full ${
            bookingType === 'privat'
              ? 'bg-purple-500 shadow-[0_0_10px_#a855f7]'
              : 'bg-brand-primary shadow-[0_0_10px_#c02a2a]'
          }`}
        />
        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <CalendarDays
            className={`w-6 h-6 ${bookingType === 'privat' ? 'text-purple-600' : 'text-brand-primary'}`}
          />{' '}
          1. Event & Termin Option
        </h2>
        
        <div className="grid grid-cols-1 gap-6">
          {bookingType === 'privat' ? (
            <PrivateEventCalendar
              selectedDateYmd={privateEventDate}
              onSelectDate={setPrivateEventDate}
              timeValue={privateEventTime}
              onTimeChange={setPrivateEventTime}
            />
          ) : (
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Konzert / Event auswählen (Regiondo-Katalog)
              </label>
              <div className="relative">
                <select
                  value={selectedRegiondoProductId}
                  onChange={(e) => setSelectedRegiondoProductId(e.target.value)}
                  disabled={regiondoListLoading}
                  className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary outline-none bg-gray-50 text-gray-900 font-bold cursor-pointer transition-shadow shadow-inner disabled:opacity-60"
                >
                  <option value="">-- Bitte wählen --</option>
                  {regiondoProducts.map((p) => {
                    const cur = currencyLabel(p);
                    const price = p.base_price ?? p.original_price;
                    const priceBit = price ? ` · ${price} ${cur}` : '';
                    const loc = [p.zipcode, p.city].filter(Boolean).join(' ');
                    const locBit = loc ? ` · ${loc}` : '';
                    return (
                      <option key={p.product_id} value={p.product_id}>
                        {p.name}
                        {priceBit}
                        {locBit} — ID {p.product_id}
                      </option>
                    );
                  })}
                </select>
                {regiondoListLoading && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    <Loader2 className="w-5 h-5 animate-spin text-brand-primary" />
                  </div>
                )}
              </div>
              <p className="mt-2 text-xs text-gray-500 leading-relaxed">
                Gleiche Liste wie unter <strong>Events &amp; Konzerte</strong>. Der Kalender zeigt pro Variante die
                Verfügbarkeit und lädt <strong>nur die aktuelle Woche</strong> (API pro Variante). Hier wählen Sie{' '}
                <strong>nur Datum und Uhrzeit</strong>; Tarife und Kontingente legen Sie in Sektion 3 fest (Regiondo).
                Saalplan: Firebase-Event mit <span className="font-mono">regiondoId</span> = Produkt-ID.
              </p>

              <div className="mt-6 space-y-3">
                <label className="block text-sm font-bold text-gray-800">
                  Kalender — Verfügbarkeit &amp; Terminwahl
                </label>
                <RegiondoVariationWeekCalendar
                  productName={productDetail?.name ?? ''}
                  hasVariations={(productDetail?.variations?.length ?? 0) > 0}
                  blocks={weekCalendarBlocks}
                  loading={productDetailLoading || weekCalendarLoading}
                  weekStart={calendarWeekStart}
                  onWeekStartChange={setCalendarWeekStart}
                  selected={selectedSlot}
                  onSelect={setSelectedSlot}
                />
                {selectedSlot && (
                  <p className="text-sm text-gray-800 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                    <span className="font-semibold text-emerald-900">Termin gewählt:</span>{' '}
                    <span className="tabular-nums">{selectedSlot.dateYmd}</span> ·{' '}
                    <span className="tabular-nums">{selectedSlot.time}</span>
                    {selectedSlot.capacityLabel && (
                      <span className="text-emerald-800"> · {selectedSlot.capacityLabel}</span>
                    )}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Sektion 2: Kundendaten & B2B — overflow-visible so the partner combobox is not clipped */}
      <section className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 relative overflow-visible">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500 shadow-[0_0_10px_#3b82f6] rounded-bl-sm pointer-events-none"></div>
        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Building2 className="w-6 h-6 text-blue-500"/> 2. Käuferdetails & Partner-Zuweisung
        </h2>
        
        <div className="space-y-6">
           {/* Partner Auswahl (B2B) - Immer für Gruppe, Optional für Einzel */}
           {(bookingType === 'einzel' || bookingType === 'gruppe') && (
             <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200 overflow-visible">
               <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="partner-combo-trigger">
                 {bookingType === 'gruppe' ? 'Hotel / Partner (Erforderlich)' : 'B2B Partner (Optional)'}
               </label>
               <p className="text-xs text-gray-500 mb-2">
                 Suchen und wählen — Kontaktdaten werden übernommen, sofern im Partner-Stamm hinterlegt.
               </p>
               <div
                 ref={partnerComboRef}
                 className={`relative isolate ${partnerComboOpen ? 'z-[300]' : 'z-20'}`}
               >
                 <button
                   id="partner-combo-trigger"
                   type="button"
                   onClick={() => {
                     setPartnerComboOpen((o) => !o);
                     if (!partnerComboOpen) setPartnerSearchQuery('');
                   }}
                   className={`w-full flex items-center justify-between gap-2 p-3 border border-gray-300 rounded-lg bg-white text-left text-sm font-medium text-gray-900 shadow-sm hover:bg-gray-50 focus:outline-none focus:border-transparent ${
                     partnerComboOpen
                       ? 'ring-0 shadow-md'
                       : 'focus:ring-2 focus:ring-[#c02a2a]'
                   }`}
                   aria-expanded={partnerComboOpen}
                   aria-haspopup="listbox"
                 >
                   <span className="truncate">
                     {selectedPartnerId
                       ? partners.find((x) => x.id === selectedPartnerId)?.displayName ?? 'Partner'
                       : bookingType === 'gruppe'
                         ? '— Bitte Partner wählen —'
                         : '— Kein Partner (Direktbuchung) —'}
                   </span>
                   <ChevronDown className={`w-5 h-5 shrink-0 text-gray-500 transition-transform ${partnerComboOpen ? 'rotate-180' : ''}`} />
                 </button>
                 {/* Keep panel mounted; toggle `hidden` only — conditional unmount caused React 19 DOM sync errors (removeChild/insertBefore). */}
                 <div
                   className={`absolute left-0 right-0 top-full z-[301] mt-2 w-full min-w-0 rounded-lg border border-gray-200 bg-white shadow-2xl ring-1 ring-black/10 overflow-hidden ${
                     partnerComboOpen ? '' : 'hidden'
                   }`}
                   role="listbox"
                   aria-hidden={!partnerComboOpen}
                 >
                     <div className="flex items-center gap-2 border-b border-gray-200 px-3 py-3 bg-white">
                       <Search className="w-4 h-4 shrink-0 text-brand-primary" aria-hidden />
                       <input
                         ref={partnerSearchInputRef}
                         type="search"
                         autoComplete="off"
                         placeholder="Partner suchen (Name, E-Mail, ID …)"
                         value={partnerSearchQuery}
                         onChange={(e) => setPartnerSearchQuery(e.target.value)}
                         className="min-h-[40px] min-w-0 flex-1 rounded-md border border-gray-200 bg-gray-50 px-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                         onKeyDown={(e) => {
                           if (e.key === 'Escape') {
                             setPartnerComboOpen(false);
                             setPartnerSearchQuery('');
                           }
                         }}
                       />
                     </div>
                     <ul className="max-h-56 overflow-y-auto overflow-x-hidden py-1">
                       <li>
                         <button
                           type="button"
                           role="option"
                           className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${!selectedPartnerId ? 'bg-emerald-50 font-medium' : ''}`}
                           onClick={() => {
                             setSelectedPartnerId('');
                             applyPartnerContact(null);
                             setPartnerComboOpen(false);
                             setPartnerSearchQuery('');
                           }}
                         >
                           {bookingType === 'gruppe' ? '— Bitte Partner wählen —' : '— Kein Partner (Direktbuchung) —'}
                         </button>
                       </li>
                       {filteredPartners.length === 0 ? (
                         <li className="px-3 py-4 text-sm text-gray-500 text-center">Kein Treffer.</li>
                       ) : (
                         filteredPartners.map((p) => (
                           <li key={p.id}>
                             <button
                               type="button"
                               role="option"
                               className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${selectedPartnerId === p.id ? 'bg-emerald-50 font-medium' : ''}`}
                               onClick={() => {
                                 setSelectedPartnerId(p.id);
                                 applyPartnerContact(p);
                                 setPartnerComboOpen(false);
                                 setPartnerSearchQuery('');
                               }}
                             >
                               <span className="block truncate">{p.displayName}</span>
                               {(p.email || p.contactPerson) && (
                                 <span className="block text-xs text-gray-500 truncate">
                                   {[p.contactPerson, p.email].filter(Boolean).join(' · ')}
                                 </span>
                               )}
                             </button>
                           </li>
                         ))
                       )}
                     </ul>
                   </div>
               </div>
             </div>
           )}

           {bookingType === 'gruppe' && (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
               <div>
                 <label className="block text-sm font-bold text-gray-700 mb-2">Verkäuferreferenz (Buchungsnummer)</label>
                 <input type="text" placeholder="z.B. REF-12345" value={sellerReference} onChange={e => setSellerReference(e.target.value)} className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none shadow-sm" />
               </div>
               <div>
                 <label className="block text-sm font-bold text-gray-700 mb-2">Kontaktperson (Name)</label>
                 <input type="text" placeholder="Name der meldenden Person" value={contactPerson} onChange={e => setContactPerson(e.target.value)} className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none shadow-sm" />
               </div>
             </div>
           )}

           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div>
               <label className="block text-sm font-bold text-gray-700 mb-2">{bookingType === 'gruppe' ? 'E-Mail für Bestätigung' : 'Vor- und Nachname'}</label>
               {bookingType === 'gruppe' ? (
                 <input type="email" placeholder="hotel@example.com" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none shadow-sm" />
               ) : (
                 <input type="text" placeholder="Max Mustermann" value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary outline-none shadow-sm" />
               )}
             </div>
             {bookingType !== 'gruppe' && (
               <div>
                 <label className="block text-sm font-bold text-gray-700 mb-2">Gültige E-Mail Adresse</label>
                 <input type="email" placeholder="max@example.com" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary outline-none shadow-sm" />
               </div>
             )}
             <div>
               <label className="block text-sm font-bold text-gray-700 mb-2">Telefonnummer</label>
               <input type="tel" placeholder="+43 123 45678" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className={`w-full p-4 border border-gray-300 rounded-xl focus:ring-2 outline-none shadow-sm ${bookingType === 'gruppe' ? 'focus:ring-blue-500' : 'focus:ring-brand-primary'}`} />
             </div>
           </div>
        </div>
      </section>

      {/* Sektion 3: Tickets */}
      {bookingType === 'einzel' && (
      <section className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500 shadow-[0_0_10px_#10b981]"></div>
        <h2 className="text-xl font-bold text-gray-900 mb-8 flex items-center gap-2">
          <Ticket className="w-6 h-6 text-emerald-500"/> 3. Kontingente & Tickets
        </h2>         <div className="grid grid-cols-1 items-stretch md:grid-cols-3 gap-6 mb-10">
           {(productDetail?.variations ?? []).map((v, idx) => {
             const vid = v.variation_id;
             const canBook =
               !!selectedSlot &&
               selectedSlotVariationIds.has(vid) &&
               !productDetailLoading &&
               !weekCalendarLoading;
             const cur = productDetail ? currencyLabel(productDetail) : 'EUR';
             const unit = getVariationUnitPriceEuro(v, productDetail);
             const q = quantities[vid] || 0;
             const color = VARIATION_SEAT_COLORS[idx % VARIATION_SEAT_COLORS.length];
             return (
               <div
                 key={vid}
                 className={`p-6 border rounded-2xl flex flex-col items-center justify-between shadow-sm ${
                   canBook ? 'border-gray-200 bg-gray-50' : 'border-gray-200 bg-gray-100/80 opacity-90'
                 }`}
               >
                 <div className="text-center mb-6 w-full">
                   <div className="text-xl font-bold text-gray-900 mb-1 flex items-center justify-center gap-2">
                     <span
                       className="w-4 h-4 rounded-full shadow-sm shrink-0 inline-block"
                       style={{ backgroundColor: color }}
                     />
                     <span className="leading-tight">{regiondoVariationLabel(v)}</span>
                   </div>
                   <span className="block text-sm text-gray-500 font-medium">
                     {unit.toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {cur} pro Ticket
                   </span>
                   {!canBook && (
                     <span className="block text-xs text-amber-800 mt-2 font-medium">
                       {!selectedSlot
                         ? 'Bitte zuerst einen Termin im Kalender wählen.'
                         : 'Für diesen Termin laut Verfügbarkeits-API keine Kontingente für diese Variante.'}
                     </span>
                   )}
                 </div>
                 <div className="flex items-center gap-5">
                   <button
                     type="button"
                     disabled={q === 0}
                     onClick={() =>
                       setQuantities((prev) => ({ ...prev, [vid]: Math.max(0, (prev[vid] || 0) - 1) }))
                     }
                     className="w-12 h-12 rounded-full bg-white border border-gray-300 flex items-center justify-center font-bold text-2xl hover:bg-gray-100 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                   >
                     -
                   </button>
                   <span className="text-3xl font-heading font-bold w-10 text-center text-brand-primary tabular-nums">{q}</span>
                   <button
                     type="button"
                     disabled={!canBook}
                     onClick={() => setQuantities((prev) => ({ ...prev, [vid]: (prev[vid] || 0) + 1 }))}
                     className="w-12 h-12 rounded-full bg-white border border-gray-300 flex items-center justify-center font-bold text-2xl hover:bg-gray-100 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                   >
                     +
                   </button>
                 </div>
               </div>
             );
           })}
           {!productDetailLoading && (productDetail?.variations?.length ?? 0) === 0 && (
             <div className="col-span-1 md:col-span-3 p-8 text-center text-gray-500 bg-gray-50 border border-dashed border-gray-300 rounded-xl font-medium">
               Für dieses Konzert liefert Regiondo keine Varianten / Tarife — bitte Produkt in Regiondo prüfen.
             </div>
           )}
         </div> 
      </section>
      )}

      {/* Sektion 4: Saalplan */}
      {(bookingType === 'einzel' || bookingType === 'gruppe') && (
        <section className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-purple-500 shadow-[0_0_10px_#a855f7]"></div>
          <h2 className="text-xl font-bold text-gray-900 mb-8 flex items-center gap-2">
            <Ticket className="w-6 h-6 text-purple-500"/> 4. Saalplan-Zuweisung ({selectedSeats.length} / {totalTickets} zugewiesen)
          </h2>
          
          {totalTickets === 0 ? (
            <div className="p-8 text-center text-gray-500 bg-gray-50 border border-dashed border-gray-300 rounded-xl font-medium">
               👆 Bitte definieren Sie zuerst die Ticket-Anzahl {bookingType === 'einzel' ? 'in Sektion 3' : 'in den Pauschal-Details'}, um die Plätze physisch zuzuweisen.
            </div>
          ) : !selectedRegiondoProductId ? (
            <div className="p-8 text-center text-gray-500 bg-gray-50 border border-dashed border-gray-300 rounded-xl font-medium">
               👆 Bitte wählen Sie zuerst ein Konzert aus Sektion 1, um den tagesaktuellen Saalplan zu laden.
            </div>
          ) : !linkedFirebaseEventId ? (
            <div className="p-8 text-center text-amber-900 bg-amber-50 border border-amber-200 rounded-xl text-sm leading-relaxed">
              Für Produkt-ID <span className="font-mono font-bold">{selectedRegiondoProductId}</span> ist kein Firebase-Event
              mit <span className="font-mono">regiondoId</span> verknüpft — kein physischer Saalplan hier. Die Buchung
              läuft trotzdem über <strong>Regiondo</strong> (Button „Zahlungspflichtig Buchen“); lokale Plätze können Sie
              nachziehen, sobald ein passendes Event in den Stammdaten existiert.
            </div>
          ) : (
            <div className="overflow-hidden">
               <SeatMap 
                 key={`${linkedFirebaseEventId}:${totalTickets}`}
                 eventId={linkedFirebaseEventId}
                 requiredSeats={totalTickets}
                 selectedSeats={selectedSeats}
                 onSeatSelect={setSelectedSeats}
                 categoryAllocations={categoryAllocations}
               />
            </div>
          )}
        </section>
      )}

      {bookingType !== 'einzel' && (
        <section className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
          <div className={`absolute top-0 left-0 w-1.5 h-full ${bookingType === 'gruppe' ? 'bg-blue-500 shadow-[0_0_10px_#3b82f6]' : 'bg-purple-500 shadow-[0_0_10px_#a855f7]'}`}></div>
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <UsersRound className={`w-6 h-6 ${bookingType === 'gruppe' ? 'text-blue-500' : 'text-purple-500'}`}/>
            {bookingType === 'privat' ? '3. Paket-Details' : '3. Pauschal-Details'}
          </h2>
          {bookingType === 'gruppe' ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Personenanzahl</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="z.B. 6"
                    value={groupPersons}
                    onChange={(e) => setGroupPersons(e.target.value ? Number(e.target.value) : '')}
                    className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none shadow-sm text-xl font-bold tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Preis pro Person (€)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="z.B. 115.00"
                    value={groupPricePerPerson}
                    onChange={(e) => setGroupPricePerPerson(e.target.value ? Number(e.target.value) : '')}
                    className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none shadow-sm text-xl font-bold tabular-nums"
                  />
                </div>
              </div>
              <div className="rounded-xl border border-blue-200 bg-blue-50/60 px-4 py-3 text-sm text-gray-800">
                <span className="font-semibold text-blue-900">Gesamtpreis (€): </span>
                <span className="tabular-nums">
                  {(Number(groupPersons) || 0) > 0 && (Number(groupPricePerPerson) || 0) >= 0 ? (
                    <>
                      {Number(groupPersons) || 0} Personen ×{' '}
                      {(Number(groupPricePerPerson) || 0).toLocaleString('de-AT', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{' '}
                      € ={' '}
                      <strong className="text-blue-900">
                        {((Number(groupPersons) || 0) * (Number(groupPricePerPerson) || 0)).toLocaleString('de-AT', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{' '}
                        €
                      </strong>
                    </>
                  ) : (
                    <span className="text-gray-500">Personenanzahl und Preis pro Person eingeben.</span>
                  )}
                </span>
              </div>
              {groupDistribution && (Number(groupPersons) || 0) > 0 && (
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
                  <p className="font-bold text-gray-900 mb-2">Verteilung auf Tarife (Regiondo-Purchase)</p>
                  <p className="text-xs text-gray-600 mb-2">
                    Die Personenzahl wird gleichmäßig auf die verfügbaren Kategorien am gewählten Termin verteilt;
                    Restplätze erhalten die ersten Tarife (z. B. 7 → 3+2+2).
                  </p>
                  <ul className="space-y-1 text-gray-800">
                    {(productDetail?.variations ?? []).map((v) => {
                      const q = groupDistribution[v.variation_id] || 0;
                      if (q <= 0) return null;
                      return (
                        <li key={v.variation_id} className="flex justify-between gap-4 tabular-nums">
                          <span>{regiondoVariationLabel(v)}</span>
                          <span className="font-semibold">{q} Plätze</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Anzahl Personen</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="z.B. 5"
                    value={groupPersons}
                    onChange={(e) => setGroupPersons(e.target.value ? Number(e.target.value) : '')}
                    className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none shadow-sm text-xl font-bold tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Preis pro Person (€)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="z.B. 300.00"
                    value={privatePricePerPerson}
                    onChange={(e) => setPrivatePricePerPerson(e.target.value ? Number(e.target.value) : '')}
                    className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none shadow-sm text-xl font-bold tabular-nums"
                  />
                </div>
              </div>
              <div className="rounded-xl border border-purple-200 bg-purple-50/60 px-4 py-3 text-sm text-gray-800">
                <span className="font-semibold text-purple-900">Übersicht: </span>
                <span className="tabular-nums">
                  {(Number(groupPersons) || 0) > 0 && (Number(privatePricePerPerson) || 0) >= 0 ? (
                    <>
                      {Number(groupPersons) || 0} Personen ×{' '}
                      {(Number(privatePricePerPerson) || 0).toLocaleString('de-AT', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{' '}
                      € ={' '}
                      <strong className="text-purple-900">
                        {(Number(groupPersons) || 0) * (Number(privatePricePerPerson) || 0) > 0
                          ? ((Number(groupPersons) || 0) * (Number(privatePricePerPerson) || 0)).toLocaleString(
                              'de-AT',
                              { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                            )
                          : '—'}{' '}
                        € gesamt
                      </strong>
                    </>
                  ) : (
                    <span className="text-gray-500">Personenanzahl und Preis pro Person eingeben.</span>
                  )}
                </span>
              </div>
            </div>
          )}
        </section>
      )}

        {/* Checkout Bar */}
        <div className="bg-gray-900 p-8 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-6 shadow-2xl relative overflow-hidden">
           <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary rounded-full blur-[100px] opacity-20 pointer-events-none"></div>
           <div className="z-10 text-center md:text-left">
             <p className="text-gray-400 font-bold mb-1 uppercase tracking-widest text-sm">Zusammenfassung: <strong className="text-brand-primary bg-red-500/10 px-2 py-0.5 rounded ml-1">
               {bookingType === 'privat' || bookingType === 'gruppe'
                 ? `${totalTickets || 0} ${totalTickets === 1 ? 'Person' : 'Personen'}`
                 : `${totalTickets} Ticket(s)`}
             </strong></p>
             <p className="text-4xl font-bold text-white tracking-tight">€ {totalPrice.toLocaleString('de-AT', {minimumFractionDigits: 2})}</p>
           </div>
           <button 
             onClick={handleSubmit} 
             disabled={isSubmitting || totalTickets === 0}
             className="w-full md:w-auto px-10 py-5 bg-brand-primary text-white text-xl font-bold rounded-xl hover:bg-red-700 transition-all flex items-center justify-center gap-3 shadow-lg shadow-brand-primary/30 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 z-10"
           >
             {isSubmitting ? 'Transaktion läuft...' : 'Zahlungspflichtig Buchen'}
             {!isSubmitting && <ChevronRight className="w-7 h-7"/>}
           </button>
        </div>
    </div>
  );
}
