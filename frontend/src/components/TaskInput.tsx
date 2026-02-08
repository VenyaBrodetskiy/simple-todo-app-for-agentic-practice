import React, { useState, useEffect, useRef } from 'react';

interface TaskInputProps {
    onAddTask: (title: string) => Promise<void>;
}

export const TaskInput: React.FC<TaskInputProps> = ({ onAddTask }) => {
    const [title, setTitle] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const onAddTaskRef = useRef(onAddTask);

    useEffect(() => {
        onAddTaskRef.current = onAddTask;
    }, [onAddTask]);

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

    // Handle Enter key for input submission
    useEffect(() => {
        const input = inputRef.current;
        if (!input) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Enter' && !e.shiftKey && input.value.trim()) {
                onAddTaskRef.current(input.value.trim());
            }
        };

        input.addEventListener('keydown', handleKeyDown);
        return () => input.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <form onSubmit={handleSubmit} className="task-input">
            <input
                ref={inputRef}
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What needs to be done?"
                disabled={isSubmitting}
            />
            <button type="submit" disabled={isSubmitting || !title.trim()}>
                Add Task
            </button>
        </form>
    );
};
