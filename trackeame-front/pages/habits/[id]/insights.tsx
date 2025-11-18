import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { TooltipProps } from 'recharts';
import type { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';
import { habitsAPI, Habit } from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';
import {
  buildHabitMetricSummary,
  HabitMetricSummary,
  HabitMetricPoint,
} from '../../../lib/metrics';

const formatDuration = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours === 0) {
    return `${minutes}m`;
  }
  return `${hours}h ${minutes}m`;
};

type ChartPayload = {
  hours: number;
  minutes: number;
  totalSeconds: number;
  dateLabel: string;
};

const ChartTooltip = ({ active, payload, label }: TooltipProps<ValueType, NameType>) => {
  if (!active || !payload?.length) {
    return null;
  }

  const data = payload[0].payload as ChartPayload;

  return (
    <div className="rounded-lg bg-white px-4 py-3 shadow-lg border border-gray-100 text-sm">
      <p className="font-semibold text-gray-900">{label}</p>
      <p className="text-gray-600">{data.dateLabel}</p>
      <p className="mt-1 text-purple-600 font-semibold">
        {data.hours}h ({data.minutes}m)
      </p>
    </div>
  );
};

export default function HabitInsights() {
  const router = useRouter();
  const { id } = router.query;
  const { user, loading: authLoading } = useAuth();
  const [habit, setHabit] = useState<Habit | null>(null);
  const [metrics, setMetrics] = useState<HabitMetricSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    const habitId = Array.isArray(id) ? id[0] : id;
    if (!habitId) {
      return;
    }

    const loadHabit = async () => {
      setLoading(true);
      setError('');

      try {
        const [habitRes, metricsRes] = await Promise.all([
          habitsAPI.getOne(habitId),
          habitsAPI.getMetrics(habitId),
        ]);

        setHabit(habitRes.data);
        setMetrics(buildHabitMetricSummary(metricsRes.data.entries));
      } catch (err) {
        console.error(err);
        setError('No pudimos cargar las métricas de este hábito. Intenta nuevamente.');
      } finally {
        setLoading(false);
      }
    };

    loadHabit();
  }, [id]);

  const buildChartDataset = (series?: HabitMetricPoint[]) => {
    if (!series) return [];

    return series.map((point) => {
      const hours = Number((point.totalSeconds / 3600).toFixed(2));
      const minutes = Math.round(point.totalSeconds / 60);
      return {
        label: point.label,
        hours,
        minutes,
        totalSeconds: point.totalSeconds,
        dateLabel: new Date(point.date).toLocaleDateString(),
      } satisfies ChartPayload & { label: string };
    });
  };

  const weeklyChartData = useMemo(() => buildChartDataset(metrics?.weekSeries), [metrics]);
  const monthlyChartData = useMemo(() => buildChartDataset(metrics?.monthSeries), [metrics]);
  const quarterlyChartData = useMemo(() => buildChartDataset(metrics?.quarterSeries), [metrics]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-xl text-gray-600">Cargando métricas...</div>
      </div>
    );
  }

  if (!habit || !metrics) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-6">
        <p className="text-gray-600 text-lg">{error || 'No encontramos este hábito.'}</p>
        <Link
          href="/dashboard"
          className="px-6 py-3 rounded-lg bg-purple-600 text-white font-semibold shadow"
        >
          Volver al panel
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>{habit.name} · Insights</title>
      </Head>

      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-wide text-gray-500">Hábito</p>
            <h1 className="text-2xl font-bold text-gray-900">{habit.name}</h1>
          </div>
          <Link
            href="/dashboard"
            className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-100 font-semibold"
          >
            ← Volver
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        <section className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl bg-white border shadow-sm p-6">
            <p className="text-sm font-medium text-gray-500">Semana actual</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {formatDuration(metrics.weekTotal.seconds)}
            </p>
            <p className="text-sm text-gray-500 mt-3">
              El gráfico semanal siempre inicia en lunes y reinicia la próxima semana, descartando los datos anteriores.
            </p>
          </div>

          <div className="rounded-2xl bg-white border shadow-sm p-6">
            <p className="text-sm font-medium text-gray-500">Mes actual</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {formatDuration(metrics.monthTotal.seconds)}
            </p>
            <p className="text-sm text-gray-500 mt-3">
              El gráfico mensual comienza el día 01 y se limpia automáticamente al iniciar el siguiente mes.
            </p>
          </div>

          <div className="rounded-2xl bg-white border shadow-sm p-6">
            <p className="text-sm font-medium text-gray-500">Últimos 3 meses</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {formatDuration(metrics.quarterTotal.seconds)}
            </p>
            <p className="text-sm text-gray-500 mt-3">
              Este período cubre los últimos 3 meses completos. Al iniciar un nuevo mes, se descarta la ventana más antigua.
            </p>
          </div>
        </section>

        <section className="rounded-2xl bg-white border shadow-sm p-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Tendencia semanal</h2>
              <p className="text-sm text-gray-500">Actividad diaria (horas) de lunes a domingo.</p>
            </div>
          </div>
          <div className="h-80 mt-6">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyChartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="label" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" unit="h" allowDecimals />
                <Tooltip content={<ChartTooltip />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="hours"
                  name="Horas"
                  stroke="#8B5CF6"
                  strokeWidth={3}
                  dot={{ strokeWidth: 2, stroke: '#7C3AED' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-2xl bg-white border shadow-sm p-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Tendencia mensual</h2>
              <p className="text-sm text-gray-500">Horas registradas para cada día del mes en curso.</p>
            </div>
          </div>
          <div className="h-96 mt-6">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="label" stroke="#9CA3AF" tick={{ fontSize: 12 }} interval="preserveStartEnd" />
                <YAxis stroke="#9CA3AF" unit="h" allowDecimals />
                <Tooltip content={<ChartTooltip />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="hours"
                  name="Horas"
                  stroke="#34D399"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-2xl bg-white border shadow-sm p-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Tendencia trimestral</h2>
              <p className="text-sm text-gray-500">Resumen diario de los últimos tres meses completos.</p>
            </div>
          </div>
          <div className="h-96 mt-6">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={quarterlyChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="label" stroke="#9CA3AF" tick={{ fontSize: 10 }} interval="preserveStart" />
                <YAxis stroke="#9CA3AF" unit="h" allowDecimals />
                <Tooltip content={<ChartTooltip />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="hours"
                  name="Horas"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      </main>
    </div>
  );
}
