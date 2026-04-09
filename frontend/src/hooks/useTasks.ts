import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { logger } from '../utils/logger';
import i18n from '../i18n';
import type { Task } from '../types';

export const useTasks = () => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadTasks = async () => {
        try {
            setLoading(true);
            const data = await api.getTasks();
            setTasks(data);
            setError(null);
            logger.info('Tasks loaded successfully', data.length);
        } catch (err) {
            const message = i18n.t('errors.loadFailed');
            setError(message);
            logger.error(message, err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddTask = async (title: string) => {
        try {
            const newTask = await api.createTask(title);
            setTasks(prev => [...prev, newTask]);
            logger.info('Task added successfully', newTask.id);
        } catch (err) {
            const message = i18n.t('errors.addFailed');
            logger.error(message, err);
            alert(message);
        }
    };

    const handleToggleTask = async (id: string, isCompleted: boolean) => {
        try {
            const updatedTask = await api.updateTask(id, { isCompleted });
            setTasks(prev => prev.map(t => t.id === id ? updatedTask : t));
            logger.info('Task updated successfully', id);
        } catch (err) {
            const message = i18n.t('errors.updateFailed');
            logger.error(message, err);
            alert(message);
        }
    };

    useEffect(() => {
        loadTasks();
    }, []);

    return {
        tasks,
        loading,
        error,
        handleAddTask,
        handleToggleTask,
        refreshTasks: loadTasks
    };
};
