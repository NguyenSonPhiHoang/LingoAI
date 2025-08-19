
"use client";

import { useEffect, useRef, type ReactNode } from 'react';
import { useAuth } from './auth-context';
import { recordActivity } from '@/services/activity';

const PING_INTERVAL_MS = 15 * 1000; // 15 seconds

export const ActivityTracker = ({ children }: { children: ReactNode }) => {
    const { user, loading } = useAuth();
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const isVisibleRef = useRef(true);

    useEffect(() => {
        const handleVisibilityChange = () => {
            isVisibleRef.current = document.visibilityState === 'visible';
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    useEffect(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        if (user && !loading) {
            intervalRef.current = setInterval(() => {
                if (isVisibleRef.current) {
                    recordActivity(user.uid, PING_INTERVAL_MS / 1000);
                }
            }, PING_INTERVAL_MS);
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [user, loading]);

    return <>{children}</>;
};
