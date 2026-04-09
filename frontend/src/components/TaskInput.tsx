import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface TaskInputProps {
    onAddTask: (title: string) => Promise<void>;
}

export const TaskInput: React.FC<TaskInputProps> = ({ onAddTask }) => {
    const { t } = useTranslation();
    const [title, setTitle] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;

        setIsSubmitting(true);
        try {
            await onAddTask(title);
            setTitle('');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="task-input">
            <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('tasks.placeholder')}
                disabled={isSubmitting}
            />
            <button type="submit" disabled={isSubmitting || !title.trim()}>
                {t('tasks.addButton')}
            </button>
        </form>
    );
};
