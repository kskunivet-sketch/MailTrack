'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { collection, query, orderBy, getDocs, addDoc, updateDoc, doc, serverTimestamp, where, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { toast } from 'sonner';

interface Booking {
    id: string;
    nomorBooking: string;
    perihal: string;
    untukNama: string;
    dibuatOleh: string;
    dibuatOlehEmail: string;
    waktuBooking: Timestamp;
    status: 'pending' | 'completed';
    waktuSelesai?: Timestamp;
}

export default function BookingPage() {
    const { profile } = useAuth();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);

    const [form, setForm] = useState({
        nomorBooking: '',
        perihal: '',
        untukNama: ''
    });
    const [submitting, setSubmitting] = useState(false);

    const fetchBookings = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'booking_nomor'), orderBy('waktuBooking', 'desc'));
            const snap = await getDocs(q);
            const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
            setBookings(data);
        } catch (error) {
            console.error('Error fetching bookings', error);
            toast.error('Gagal mengambil data booking.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBookings();
    }, []);

    const handleSumbit = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!form.nomorBooking || !form.perihal || !form.untukNama) {
            toast.error('Mohon isi semua field');
            return;
        }

        setSubmitting(true);
        try {
            await addDoc(collection(db, 'booking_nomor'), {
                nomorBooking: form.nomorBooking,
                perihal: form.perihal,
                untukNama: form.untukNama,
                dibuatOleh: profile?.displayName || 'Unknown',
                dibuatOlehEmail: profile?.email || '',
                waktuBooking: serverTimestamp(),
                status: 'pending'
            });
            toast.success('Booking nomor berhasil dibuat');
            setForm({ nomorBooking: '', perihal: '', untukNama: '' });
            fetchBookings();
        } catch (error) {
            console.error('Error adding booking', error);
            toast.error('Gagal membuat booking nomor');
        } finally {
            setSubmitting(false);
        }
    };

    const handleComplete = async (id: string) => {
        if (!confirm('Apakah nomor ini sudah diinputkan ke Access?')) return;
        try {
            const ref = doc(db, 'booking_nomor', id);
            await updateDoc(ref, {
                status: 'completed',
                waktuSelesai: serverTimestamp()
            });
            toast.success('Status booking diselesaikan');
            fetchBookings();
        } catch (error) {
            console.error('Error updating booking', error);
            toast.error('Gagal menyelesaikan booking');
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Booking Nomor Surat</h1>
                    <p className="text-slate-600 dark:text-slate-400">Pesan nomor surat keluar untuk digunakan kemudian.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form Tambah Booking */}
                <div className="bg-white dark:bg-surface-dark rounded-2xl shadow-card border border-slate-100 dark:border-slate-800 p-6 h-max sticky top-6">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Buat Booking Baru</h2>
                    <form onSubmit={handleSumbit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Dipesan Untuk</label>
                            <input 
                                type="text"
                                className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                                placeholder="Nama Orang / Bagian"
                                value={form.untukNama}
                                onChange={e => setForm({...form, untukNama: e.target.value})}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nomor Booking</label>
                            <input 
                                type="text"
                                className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                                placeholder="Contoh: 153/B"
                                value={form.nomorBooking}
                                onChange={e => setForm({...form, nomorBooking: e.target.value})}
                                required
                            />
                            <p className="mt-1 text-xs text-slate-500">Isikan nomor loncat / custom.</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Perihal</label>
                            <textarea 
                                className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 min-h-[100px]"
                                placeholder="Perihal surat"
                                value={form.perihal}
                                onChange={e => setForm({...form, perihal: e.target.value})}
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                        >
                            {submitting ? 'Menyimpan...' : 'Simpan Booking'}
                        </button>
                    </form>
                </div>

                {/* List Booking */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-surface-dark rounded-2xl shadow-card border border-slate-100 dark:border-slate-800 overflow-hidden">
                        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/20">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Daftar Booking Nomor</h2>
                        </div>
                        
                        {loading ? (
                            <div className="flex justify-center items-center p-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                            </div>
                        ) : bookings.length === 0 ? (
                            <div className="p-12 text-center text-slate-500">Belum ada booking nomor.</div>
                        ) : (
                            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                {bookings.map(book => (
                                    <div key={book.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-3">
                                                <span className="font-mono font-bold text-lg text-primary-600 dark:text-primary-400">{book.nomorBooking}</span>
                                                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${book.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                                    {book.status === 'completed' ? 'Selesai' : 'Pending'}
                                                </span>
                                            </div>
                                            <p className="text-base font-medium text-slate-900 dark:text-white flex-1">{book.perihal}</p>
                                            <div className="text-sm text-slate-500 dark:text-slate-400 flex flex-wrap gap-x-4 gap-y-1">
                                                <span><strong className="text-slate-600 dark:text-slate-300">Untuk:</strong> {book.untukNama}</span>
                                                <span><strong className="text-slate-600 dark:text-slate-300">Dipesan Oleh:</strong> {book.dibuatOleh}</span>
                                                <span>
                                                    <strong className="text-slate-600 dark:text-slate-300">Waktu:</strong> {book.waktuBooking?.seconds ? new Date(book.waktuBooking.seconds * 1000).toLocaleString('id-ID') : 'Baru saja'}
                                                </span>
                                            </div>
                                        </div>
                                        
                                        {book.status === 'pending' && (
                                            <button 
                                                onClick={() => handleComplete(book.id)}
                                                className="shrink-0 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded-lg text-sm font-medium transition-colors whitespace-nowrap border border-emerald-200 dark:border-emerald-800"
                                            >
                                                Selesaikan
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
