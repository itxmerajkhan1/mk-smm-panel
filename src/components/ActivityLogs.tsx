/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { db } from '../firebase';
import { AuditLog } from '../types';
import { useAuthContext, handleFirestoreError, OperationType } from './AuthContext';
import { Clock, ShieldAlert } from 'lucide-react';

export default function ActivityLogs() {
    const { userProfile } = useAuthContext();
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userProfile) return;
        const fetchLogs = async () => {
            setLoading(true);
            try {
                const q = query(
                    collection(db, 'logs'),
                    where('userId', '==', userProfile.id),
                    orderBy('createdAt', 'desc'),
                    limit(10)
                );
                const snap = await getDocs(q);
                setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() } as AuditLog)));
            } catch (e: any) {
                handleFirestoreError(e, OperationType.LIST, 'logs');
            } finally {
                setLoading(false);
            }
        };
        fetchLogs();
    }, [userProfile]);

    return (
        <div className="border border-zinc-900 bg-[#080808] rounded-2xl p-6 shadow-sm">
            <h2 className="font-display text-lg font-bold tracking-tight text-white uppercase italic mb-6">Account Activity Logs</h2>
            {loading ? (
                <div className="space-y-4 animate-pulse">
                    {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-zinc-900 rounded-lg"></div>)}
                </div>
            ) : logs.length === 0 ? (
                <p className="text-zinc-500 text-sm">No recent activity found.</p>
            ) : (
                <div className="space-y-4">
                    {logs.map(log => (
                        <div key={log.id} className="flex gap-4 p-4 border border-zinc-900 rounded-xl bg-zinc-950/20">
                            <Clock className="h-5 w-5 text-blue-500" />
                            <div className="flex-1">
                                <p className="font-bold text-white text-sm">{log.action}</p>
                                <p className="text-zinc-400 text-xs mt-0.5">{log.details}</p>
                            </div>
                            <span className="text-zinc-600 text-[10px] tabular-nums font-mono whitespace-nowrap">
                                {new Date(log.createdAt).toLocaleString()}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
