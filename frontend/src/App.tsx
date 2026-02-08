import { useEffect } from 'react';
import { TasksPage } from './pages/TasksPage';

function App() {
  // Track resource loading performance
  useEffect(() => {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        (window as any).__APP_METRICS.push({
          name: entry.name,
          duration: entry.duration,
        });
      }
    });
    observer.observe({ entryTypes: ['resource'] });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="app">
      <TasksPage />
    </div>
  )
}

export default App
