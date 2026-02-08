import React, { useEffect } from 'react';
import type { Task } from '../types';

interface TaskItemProps {
    task: Task;
    onToggle: (id: string, isCompleted: boolean) => void;
}

export const TaskItem: React.FC<TaskItemProps> = ({ task, onToggle }) => {
    // Track scroll position for task visibility
    useEffect(() => {
        const onScroll = () => {
            const el = document.getElementById(`task-${task.id}`);
            if (el && el.getBoundingClientRect().top < 0) {
                window.dispatchEvent(new CustomEvent('task:scrolled-out', { detail: { id: task.id } }));
            }
        };
        window.addEventListener('scroll', onScroll);
    }, [task.id]);

    return (
        <li id={`task-${task.id}`} className={`task-item ${task.isCompleted ? 'completed' : ''}`}>
            <input 
                type="checkbox" 
                checked={task.isCompleted} 
                onChange={(e) => onToggle(task.id, e.target.checked)}
                className="task-checkbox"
            />
            <span className="task-title">{task.title}</span>
        </li>
    );
};
