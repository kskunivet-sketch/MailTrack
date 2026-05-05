'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import Link from 'next/link';

export default function HomePage() {
    const { user, isApproved, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && user) {
            if (isApproved) {
                router.push('/dashboard');
            } else {
                router.push('/auth/pending');
            }
        }
    }, [user, isApproved, loading, router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800">
                <div className="loader"></div>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-slate-50 relative overflow-hidden flex flex-col justify-center items-center">
            {/* Background elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-[40rem] h-[40rem] bg-blue-100 rounded-full mix-blend-multiply opacity-50 blur-[100px]"></div>
                <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-[30rem] h-[30rem] bg-indigo-100 rounded-full mix-blend-multiply opacity-50 blur-[80px]"></div>
            </div>

            <div className="relative z-10 w-full max-w-6xl mx-auto px-6 py-12 flex flex-col items-center">
                
                {/* Hero Content */}
                <div className="text-center max-w-3xl mx-auto space-y-8 animate-fade-in">
                    
                    {/* Minimalist Logo / Badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 shadow-sm text-sm font-medium text-slate-600 mb-4">
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                        </span>
                        Unified Mail Tracking System
                    </div>

                    <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight leading-tight">
                        Modernize Your <br className="hidden md:block"/> 
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Mail Workflow</span>
                    </h1>

                    <p className="text-lg md:text-xl text-slate-500 font-light leading-relaxed max-w-2xl mx-auto">
                        A seamless, unified platform to manage both incoming and outgoing mail. Synced directly with your local MS Access database, delivered via the cloud.
                    </p>

                    {/* CTA Actions */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8 animate-slide-up">
                        <Link
                            href="/auth/login"
                            className="group flex flex-1 w-full sm:w-auto items-center justify-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-2xl font-semibold text-base hover:bg-slate-800 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
                        >
                            <span>Access Dashboard</span>
                            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                        </Link>
                        
                        <Link
                            href="/auth/register"
                            className="flex flex-1 w-full sm:w-auto items-center justify-center px-8 py-4 bg-white text-slate-700 border border-slate-200 rounded-2xl font-semibold text-base hover:bg-slate-50 hover:border-slate-300 transition-all duration-300"
                        >
                            Create an Account
                        </Link>
                    </div>
                </div>

                {/* Minimalist Feature Cards */}
                <div className="mt-28 w-full grid grid-cols-1 md:grid-cols-3 gap-8 animate-slide-up" style={{ animationDelay: '0.2s' }}>
                    
                    {/* Feature 1 */}
                    <div className="bg-white/60 backdrop-blur-xl border border-slate-100 rounded-3xl p-8 hover:shadow-xl transition-all duration-300">
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                            </svg>
                        </div>
                        <h3 className="text-slate-900 font-bold text-xl mb-3">Unified System</h3>
                        <p className="text-slate-500 leading-relaxed text-sm">
                            Aggregate incoming (Surat Masuk) and outgoing (Surat Keluar) mail into a single, intuitive interface.
                        </p>
                    </div>

                    {/* Feature 2 */}
                    <div className="bg-white/60 backdrop-blur-xl border border-slate-100 rounded-3xl p-8 hover:shadow-xl transition-all duration-300">
                        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </div>
                        <h3 className="text-slate-900 font-bold text-xl mb-3">Real-time Sync</h3>
                        <p className="text-slate-500 leading-relaxed text-sm">
                            Background data bridges seamlessly sync your local MS Access workflow securely with cloud storage.
                        </p>
                    </div>

                    {/* Feature 3 */}
                    <div className="bg-white/60 backdrop-blur-xl border border-slate-100 rounded-3xl p-8 hover:shadow-xl transition-all duration-300">
                        <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-6">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                        </div>
                        <h3 className="text-slate-900 font-bold text-xl mb-3">Role-based Access</h3>
                        <p className="text-slate-500 leading-relaxed text-sm">
                            Ensure tight security with strict user authentication, admin approvals, and organized access rules.
                        </p>
                    </div>
                </div>

                {/* Footer Minimal */}
                <footer className="mt-20 w-full pt-8 border-t border-slate-200">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-400 text-sm font-medium">
                        <p>&copy; 2026 Mail Track. Built with Next.js.</p>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                            All systems operational
                        </div>
                    </div>
                </footer>
            </div>
        </main>
    );
}
