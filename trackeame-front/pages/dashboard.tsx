import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { habitsAPI, timerAPI, Habit, TimeEntry } from '../lib/api';
import { buildHabitMetricSummary, HabitMetricSummary } from '../lib/metrics';

type HabitCardProps = {
  habit: Habit;
  description?: string | null;
  activeTimer?: TimeEntry;
  metrics?: HabitMetricSummary;
  formatDuration: (hours: number, minutes: number) => string;
  formatTime: (seconds: number) => string;
  getElapsedTime: (startTime: string) => number;
  onStart: () => void;
  onStop: (timeEntryId: string) => void;
  onDelete: () => void;
  onViewInsights: () => void;
};

function HabitCard({
  habit,
  activeTimer,
  metrics,
  formatDuration,
  formatTime,
  getElapsedTime,
  onStart,
  onStop,
  onDelete,
  onViewInsights,
}: HabitCardProps) {
  const [elapsed, setElapsed] = useState(() =>
    activeTimer ? getElapsedTime(activeTimer.startTime) : 0,
  );

  useEffect(() => {
    if (!activeTimer) {
      setElapsed(0);
      return;
    }

    setElapsed(getElapsedTime(activeTimer.startTime));
    const interval = setInterval(() => {
      setElapsed(getElapsedTime(activeTimer.startTime));
    }, 1000);

    return () => clearInterval(interval);
  }, [activeTimer, getElapsedTime]);

  return (
    <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-bold text-gray-900">{habit.name}</h3>
        <button
          onClick={onDelete}
          className="text-gray-400 hover:text-red-600 transition-colors"
        >
          🗑️
        </button>
      </div>

      {habit.description && (
        <p className="text-gray-600 text-sm mb-4">{habit.description}</p>
      )}

      <div className="mb-4 p-4 bg-gray-50 rounded-lg">
        {activeTimer ? (
          <div className="text-center">
            <div className="text-3xl font-mono font-bold text-purple-600 mb-3">
              {formatTime(elapsed)}
            </div>
            <button
              onClick={() => onStop(activeTimer.id)}
              className="w-full px-4 py-2 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition-colors"
            >
              ⏸ Stop Timer
            </button>
          </div>
        ) : (
          <button
            onClick={onStart}
            className="w-full px-4 py-2 bg-linear-to-r from-green-500 to-emerald-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
          >
            ▶️ Comenzar Timer
          </button>
        )}
      </div>

      {metrics && (
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Esta Semana:</span>
            <span className="font-semibold text-gray-900">
              {formatDuration(metrics.weekTotal.hours, metrics.weekTotal.minutes)}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Este Mes:</span>
            <span className="font-semibold text-gray-900">
              {formatDuration(metrics.monthTotal.hours, metrics.monthTotal.minutes)}
            </span>
          </div>
        </div>
      )}

      <button
        onClick={onViewInsights}
        className="mt-5 w-full px-4 py-2 border border-purple-200 text-purple-700 rounded-lg font-semibold hover:bg-purple-50 transition-colors"
      >
        📈 Ver progreso
      </button>
    </div>
  );
}

export default function Dashboard() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitDescription, setNewHabitDescription] = useState('');
  const [activeTimers, setActiveTimers] = useState<Record<string, TimeEntry>>({});
  const [metrics, setMetrics] = useState<Record<string, HabitMetricSummary>>({});
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user) {
      loadHabits();
    }
  }, [user, authLoading]);

  const loadHabits = async () => {
    try {
      const response = await habitsAPI.getAll();
      setHabits(response.data);
      
      // Load active timers and metrics for each habit
      for (const habit of response.data) {
        loadActiveTimer(habit.id);
        loadMetrics(habit.id);
      }
    } catch (error: any) {
      console.error('Failed to load habits:', error);
      setError('Failed to load habits');
    } finally {
      setLoading(false);
    }
  };

  const loadActiveTimer = async (habitId: string) => {
    try {
      const response = await timerAPI.getActive(habitId);
      if (response.data) {
        setActiveTimers(prev => ({ ...prev, [habitId]: response.data! }));
      }
    } catch (error) {
      console.error('Failed to load active timer:', error);
    }
  };

  const loadMetrics = async (habitId: string) => {
    try {
      const response = await habitsAPI.getMetrics(habitId);
      const summary = buildHabitMetricSummary(response.data.entries);
      setMetrics(prev => ({ ...prev, [habitId]: summary }));
    } catch (error) {
      console.error('Failed to load metrics:', error);
    }
  };

  const createHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      await habitsAPI.create({
        name: newHabitName,
        description: newHabitDescription || undefined,
      });
      
      setNewHabitName('');
      setNewHabitDescription('');
      setShowCreateModal(false);
      loadHabits();
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to create habit');
    }
  };

  const deleteHabit = async (habitId: string) => {
    if (!confirm('Are you sure you want to delete this habit?')) return;
    
    try {
      await habitsAPI.delete(habitId);
      loadHabits();
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to delete habit');
    }
  };

  const startTimer = async (habitId: string) => {
    try {
      const response = await timerAPI.start(habitId);
      setActiveTimers(prev => ({ ...prev, [habitId]: response.data }));
    } catch (error: any) {
      setError(error.response?.data?.message || 'Error al iniciar el timer');
    }
  };

  const stopTimer = async (habitId: string, timeEntryId: string) => {
    try {
      await timerAPI.stop(timeEntryId);
      setActiveTimers(prev => {
        const newTimers = { ...prev };
        delete newTimers[habitId];
        return newTimers;
      });
      loadMetrics(habitId);
      showToast('Tiempo agregado y guardado para este hábito.');
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to stop timer');
      showToast('No se pudo guardar el tiempo. Intenta nuevamente.', 'error');
    }
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast({ message, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
      toastTimeoutRef.current = null;
    }, 3000);
  };

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDuration = (hours: number, minutes: number) => {
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getElapsedTime = (startTime: string) => {
    const start = new Date(startTime).getTime();
    const now = Date.now();
    return Math.floor((now - start) / 1000);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Panel de Control - Trackeame</title>
      </Head>

      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-semibold transition-all ${
            toast.type === 'success'
              ? 'bg-green-600/90 border border-green-400/80'
              : 'bg-red-600/90 border border-red-400/80'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Trackeame</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-600">Hola, {user?.name || user?.email}</span>
            <button
              onClick={() => logout()}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              Cierra Sesión
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 bg-red-50 text-red-600 px-4 py-3 rounded-lg border-l-4 border-red-600">
            {error}
          </div>
        )}

        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Tus Hábitos</h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-linear-to-r from-purple-600 to-indigo-700 text-white rounded-lg font-semibold hover:shadow-lg hover:-translate-y-0.5 transition-all"
          >
            + Crear Hábito
          </button>
        </div>

        {habits.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🎯</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No hay hábitos aún</h3>
            <p className="text-gray-500 mb-6">Crea tu primer hábito para comenzar a rastrear tu tiempo.</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-linear-to-r from-purple-600 to-indigo-700 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
            >
              Crea Tu Primer Hábito
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {habits.map((habit) => {
              const activeTimer = activeTimers[habit.id];
              const habitMetrics = metrics[habit.id];

              return (
                <HabitCard
                  key={habit.id}
                  habit={habit}
                  activeTimer={activeTimer}
                  metrics={habitMetrics}
                  formatDuration={formatDuration}
                  formatTime={formatTime}
                  getElapsedTime={getElapsedTime}
                  onStart={() => startTimer(habit.id)}
                  onStop={(timeEntryId) => stopTimer(habit.id, timeEntryId)}
                  onDelete={() => deleteHabit(habit.id)}
                  onViewInsights={() => router.push(`/habits/${habit.id}/insights`)}
                />
              );
            })}
          </div>
        )}
      </main>

      {/* Create Habit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Crear Nuevo Hábito</h2>
            
            <form onSubmit={createHabit} className="space-y-4">
              <div>
                <label htmlFor="habitName" className="block text-sm font-semibold text-gray-700 mb-2">
                  Nombre del Hábito *
                </label>
                <input
                  type="text"
                  id="habitName"
                  value={newHabitName}
                  onChange={(e) => setNewHabitName(e.target.value)}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg outline-none focus:border-purple-600 focus:ring-4 focus:ring-purple-100 transition-all"
                  placeholder="e.g., Reading, Exercise, Meditation"
                />
              </div>

              <div>
                <label htmlFor="habitDescription" className="block text-sm font-semibold text-gray-700 mb-2">
                  Descripción (Opcional)
                </label>
                <textarea
                  id="habitDescription"
                  value={newHabitDescription}
                  onChange={(e) => setNewHabitDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg outline-none focus:border-purple-600 focus:ring-4 focus:ring-purple-100 transition-all resize-none"
                  placeholder="Add a description..."
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewHabitName('');
                    setNewHabitDescription('');
                  }}
                  className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-linear-to-r from-purple-600 to-indigo-700 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
                >
                  Crear
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
