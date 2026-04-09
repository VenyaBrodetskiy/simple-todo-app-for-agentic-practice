import { useTranslation } from 'react-i18next';
import { TaskList } from '../components/TaskList';
import { TaskInput } from '../components/TaskInput';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { useTasks } from '../hooks/useTasks';

export const TasksPage = () => {
    const { t } = useTranslation();
    const {
        tasks,
        loading,
        error,
        handleAddTask,
        handleToggleTask
    } = useTasks();

    return (
        <div className="tasks-page">
            <div className="top-bar">
                <LanguageSwitcher />
            </div>
            <header className="page-header">
                <h1>{t('app.title')}</h1>
                <p>{t('app.subtitle')}</p>
            </header>

            <section className="input-section">
                <TaskInput onAddTask={handleAddTask} />
            </section>

            <section className="list-section">
                {error && <div className="error-message">{error}</div>}
                {loading ? (
                    <div className="loading-state">{t('tasks.loading')}</div>
                ) : (
                    <TaskList tasks={tasks} onToggleTask={handleToggleTask} />
                )}
            </section>
        </div>
    );
};
