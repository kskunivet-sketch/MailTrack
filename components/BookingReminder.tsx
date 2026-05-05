'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';

interface Booking {
    id: string;
    nomorBooking: string;
    perihal: string;
    untukNama: string;
}

export default function BookingReminder() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [dismissed, setDismissed] = useState<string[]>([]);

    useEffect(() => {
        if (loading || !user) return;

        // Removed sessionStorage load so notifications reappear on reload

        const q = query(
            collection(db, 'booking_nomor'),
            where('status', '==', 'pending')
        );

        const unsubscribe = onSnapshot(q, (snap) => {
            const data = snap.docs.map(doc => ({
                id: doc.id,
                nomorBooking: doc.data().nomorBooking,
                perihal: doc.data().perihal,
                untukNama: doc.data().untukNama,
            }));
            
            // Filter out those we've dismissed so we don't flash them on reload
            setBookings(data);
        }, (error) => {
            console.error("Error listening to bookings: ", error);
        });

        return () => unsubscribe();
    }, [user, loading]);

    const handleDismiss = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const newDismissed = [...dismissed, id];
        setDismissed(newDismissed);
    };

    const activeBookings = bookings.filter(b => !dismissed.includes(b.id));

    if (activeBookings.length === 0) return null;

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
            {activeBookings.map((booking) => (
                <div 
                    key={booking.id}
                    onClick={() => router.push('/booking')}
                    className="bg-white dark:bg-slate-800 border-l-4 border-amber-500 shadow-xl rounded-lg p-4 w-80 cursor-pointer animate-slide-up hover:shadow-2xl transition-all"
                >
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            <span className="font-bold text-sm">Booking Aktif {booking.nomorBooking}</span>
                        </div>
                        <button 
                            onClick={(e) => handleDismiss(booking.id, e)}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{booking.perihal}</p>
                    <p className="text-xs text-slate-500 mt-1">Untuk: {booking.untukNama}</p>
                </div>
            ))}
        </div>
    );
}
