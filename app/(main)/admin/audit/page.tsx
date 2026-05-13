'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/lib/hooks/useAuth';
import { useConfig } from '@/lib/hooks/useConfig';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import Swal from 'sweetalert2';

/**
 * Inner component to handle data fetching ONLY when authenticated and authorized.
 * This prevents "Missing or insufficient permissions" errors during initial page load
 * before the authentication state is fully resolved.
 */
function AdminAuditContent() {
    const { user } = useAuth();
    const { config: configMasuk } = useConfig('masuk');
    const { config: configKeluar } = useConfig('keluar');
    const [fileLogsLoading, setFileLogsLoading] = useState(true);
    const [bridgeFileLogs, setBridgeFileLogs] = useState<string[]>([]);

    // Auto-scroll logic for local logs
    useEffect(() => {
        const container = document.getElementById('bridge-terminal');
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }, [bridgeFileLogs]);

    useEffect(() => {
        // Poll the local bridge logs API
        const fetchLocalLogs = async () => {
            try {
                const res = await fetch('/api/bridge-logs');
                if (res.ok) {
                    const data = await res.json();
                    setBridgeFileLogs(data.logs || []);
                } else {
                    throw new Error("Failed to fetch local API");
                }
            } catch (err: any) {
                console.error("Local Logs error:", err);
            } finally {
                setFileLogsLoading(false);
            }
        };

        fetchLocalLogs();
        const interval = setInterval(fetchLocalLogs, 3000);
        return () => clearInterval(interval);
    }, []);

    const showDiagnostic = (msg: string) => {
        let title = 'System Diagnostic';
        let text = msg;
        let icon: 'error' | 'warning' | 'info' = 'info';

        if (msg.includes('PermissionDenied')) {
            title = 'Security Rule Block';
            text = 'Firestore rejected the request. Please verify that your Security Rules allow the current user or service account to access this collection.';
            icon = 'error';
        } else if (msg.includes('database is unreachable')) {
            title = 'Database Link Lost';
            text = 'The bridge cannot find the MS Access file. Check if the PC is on and the path is correct.';
            icon = 'warning';
        }

        Swal.fire({
            title,
            text,
            icon,
            background: '#1e293b',
            color: '#f8fafc',
            confirmButtonColor: '#3b82f6',
            customClass: {
                popup: 'rounded-2xl border border-slate-700 shadow-2xl shadow-blue-500/10'
            }
        });
    };

    const isSystemErrorMasuk = configMasuk?.syncStatus === 'offline' || !!configMasuk?.lastError;
    const lastActiveMasuk = configMasuk?.lastActive ? new Date(configMasuk.lastActive.seconds * 1000).toLocaleString('id-ID') : 'Never';

    const isSystemErrorKeluar = configKeluar?.syncStatus === 'offline' || !!configKeluar?.lastError;
    const lastActiveKeluar = configKeluar?.lastActive ? new Date(configKeluar.lastActive.seconds * 1000).toLocaleString('id-ID') : 'Never';

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-12 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">Technical <span className="text-blue-500">Audit</span> Log</h1>
                    <p className="text-slate-600 dark:text-slate-400 font-medium">Monitoring kernel events and bridge health sensors</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm font-semibold hover:bg-slate-200 transition-all flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        Refresh Console
                    </button>
                </div>
            </div>

            {/* Dashboard Sensors */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                <div className="lg:col-span-1 space-y-6">
                    {/* Connection Status Card - Surat Masuk */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-800">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">Sensor Status - Surat Masuk</h2>
                            <div className={`h-2.5 w-2.5 rounded-full ${configMasuk?.syncStatus === 'online' || configMasuk?.syncStatus === 'healthy' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                        </div>
                        <div className="p-6 text-center">
                            <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-3 ${configMasuk?.syncStatus === 'online' || configMasuk?.syncStatus === 'healthy' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500' : 'bg-red-50 dark:bg-red-900/20 text-red-500'}`}>
                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1 uppercase">{configMasuk?.syncStatus === 'online' ? 'ACTIVE' : configMasuk?.syncStatus || 'OFFLINE'}</h3>
                            <p className="text-[10px] text-slate-500 font-mono mb-4">LAST BEACON: {lastActiveMasuk}</p>

                            {configMasuk?.lastError && (
                                <button
                                    onClick={() => showDiagnostic(configMasuk.lastError!)}
                                    className="w-full py-2 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-xl font-bold text-[10px] uppercase tracking-wider hover:bg-red-200 transition-all border border-red-200 dark:border-red-800/50"
                                >
                                    Deep Diagnostic Required
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Connection Status Card - Surat Keluar */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-800">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">Sensor Status - Surat Keluar</h2>
                            <div className={`h-2.5 w-2.5 rounded-full ${configKeluar?.syncStatus === 'online' || configKeluar?.syncStatus === 'healthy' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                        </div>
                        <div className="p-6 text-center">
                            <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-3 ${configKeluar?.syncStatus === 'online' || configKeluar?.syncStatus === 'healthy' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500' : 'bg-red-50 dark:bg-red-900/20 text-red-500'}`}>
                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1 uppercase">{configKeluar?.syncStatus === 'online' ? 'ACTIVE' : configKeluar?.syncStatus || 'OFFLINE'}</h3>
                            <p className="text-[10px] text-slate-500 font-mono mb-4">LAST BEACON: {lastActiveKeluar}</p>

                            {configKeluar?.lastError && (
                                <button
                                    onClick={() => showDiagnostic(configKeluar.lastError!)}
                                    className="w-full py-2 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-xl font-bold text-[10px] uppercase tracking-wider hover:bg-red-200 transition-all border border-red-200 dark:border-red-800/50"
                                >
                                    Deep Diagnostic Required
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Meta Info */}
                    <div className="bg-blue-600 rounded-2xl shadow-xl p-6 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10"><svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
                        <h4 className="font-bold text-lg mb-2 relative z-10">Bridge Operations</h4>
                        <p className="text-blue-100 text-sm relative z-10 leading-relaxed mb-4">The background service is currently polling for Google Drive signals every 60 seconds.</p>
                        <div className="text-[10px] font-mono bg-white/20 p-2 rounded relative z-10">
                            ENV: PRODUCTION<br />
                            HOST: LOCAL_MACHINE<br />
                            VERSION: 2.1.0-STABLE
                        </div>
                    </div>
                </div>

                {/* Log Streamer */}
                <div className="lg:col-span-2 relative min-h-[500px] lg:min-h-0">
                    <div className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col h-full lg:absolute lg:inset-0 w-full">
                        <div className="px-5 py-3 bg-slate-800/80 border-b border-white/5 flex items-center justify-between shrink-0">
                            <div className="flex gap-1.5">
                                <div className="w-3 h-3 rounded-full bg-red-500/50" />
                                <div className="w-3 h-3 rounded-full bg-amber-500/50" />
                                <div className="w-3 h-3 rounded-full bg-green-500/50" />
                            </div>
                            <span className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em]">Local Bridge Output</span>
                        </div>
                        <div id="bridge-terminal" className="flex-1 p-6 font-mono text-xs text-green-400/90 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-slate-700">
                            {fileLogsLoading ? (
                                <div className="h-full flex items-center justify-center text-slate-600 italic">Connecting to Local Engine...</div>
                            ) : bridgeFileLogs.length === 0 ? (
                                <div className="h-full flex items-center justify-center text-slate-600 italic">Local bridge logs empty.</div>
                            ) : (
                                bridgeFileLogs.map((logStr, i) => {
                                    let colorClass = 'text-green-400/90';
                                    if (logStr.includes('[ERROR]') || logStr.includes('[CRITICAL]')) colorClass = 'text-red-400';
                                    else if (logStr.includes('[WARNING]')) colorClass = 'text-amber-400';
                                    
                                    return (
                                        <div key={i} className="hover:bg-white/5 border-l-2 border-transparent hover:border-blue-500 pl-3 transition-colors">
                                            <span className={colorClass}>{logStr}</span>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function AuditLogPage() {
    return (
        <ProtectedRoute requireAdmin>
            <AdminAuditContent />
        </ProtectedRoute>
    );
}
