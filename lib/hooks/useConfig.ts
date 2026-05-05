'use client';

import { useEffect, useState } from 'react';
import { getSystemConfig, onConfigChange, SystemConfig, onBackupModeChange, AppType } from '@/lib/firebase/firestore';

export const useConfig = (type: AppType = 'masuk') => {
    const [config, setConfig] = useState<SystemConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [quotaExceeded, setQuotaExceeded] = useState(false);
    const [backupMode, setBackupMode] = useState(false);

    useEffect(() => {
        // ... (existing fetchConfig logic)
        const fetchConfig = async () => {
            try {
                setLoading(true);
                const systemConfig = await getSystemConfig(type);
                setConfig(systemConfig);
            } catch (error: any) {
                if (error.code === 'resource-exhausted' || error.message?.includes('Quota')) {
                    setQuotaExceeded(true);
                }
            } finally {
                setLoading(false);
            }
        };

        fetchConfig();

        // Listen to config changes
        const unsubConfig = onConfigChange((updatedConfig) => {
            setConfig(updatedConfig);
            setQuotaExceeded(false);
        }, (error) => {
            if (error.code === 'resource-exhausted' || error.message?.includes('Quota')) {
                setQuotaExceeded(true);
            }
        }, type);

        // Listen to Backup Mode changes
        const unsubBackup = onBackupModeChange((active) => {
            setBackupMode(active);
        });

        return () => {
            unsubConfig();
            unsubBackup();
        };
    }, [type]);

    return { config, loading, quotaExceeded, backupMode };
};
