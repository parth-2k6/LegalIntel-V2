"use client";

import { useState, useEffect } from 'react';
import { doc, onSnapshot, getFirestore } from 'firebase/firestore';
import { useAuth } from './use-auth';
import { app } from '@/lib/firebase-config';

export const useTask = (taskId: string | null, onUpdate: (task: any) => void) => {
    const { user } = useAuth();
    const [task, setTask] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!taskId || !user) {
            setIsLoading(false);
            setTask(null);
            return;
        }

        setIsLoading(true);
        setError(null);

        const db = getFirestore(app);
        const taskRef = doc(db, 'users', user.uid, 'tasks', taskId);

        const unsubscribe = onSnapshot(taskRef, (docSnap) => {
            if (docSnap.exists()) {
                const taskData = docSnap.data();
                setTask(taskData);
                onUpdate(taskData);

                if (taskData.status === 'completed' || taskData.status === 'failed') {
                    setIsLoading(false);
                    unsubscribe(); // Stop listening once the task is finished
                }
            } else {
                setError('Task not found.');
                setIsLoading(false);
            }
        }, (err) => {
            console.error("Error listening to task:", err);
            setError('Failed to get task status.');
            setIsLoading(false);
        });

        return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [taskId, user]);

    return { task, isLoading, error };
};
