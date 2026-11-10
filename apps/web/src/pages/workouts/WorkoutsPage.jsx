import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { EQUIPMENT_TYPES, MUSCLE_GROUPS, } from '@fitcore/shared-types';
import { Award, CheckCircle2, Clock, Dumbbell, Flame, History, Info, Pause, Play, Plus, RotateCcw, Search, Trash2, X, } from 'lucide-react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Button } from '../../components/ui/Button';
import { Badge, Card, Skeleton } from '../../components/ui/Card';
import { EmptyState, ErrorState } from '../../components/ui/StateViews';
import { api, getApiErrorMessage } from '../../lib/api';
import { useToastStore } from '../../store/toastStore';
export const WorkoutsPage = () => {
    const queryClient = useQueryClient();
    const pushToast = useToastStore((s) => s.pushToast);
    const [tab, setTab] = useState('tracker');
    const [search, setSearch] = useState('');
    const [muscleFilter, setMuscleFilter] = useState('');
    const [equipmentFilter, setEquipmentFilter] = useState('');
    const [selectedExercise, setSelectedExercise] = useState(null);
    // Rest timer state
    const [restDuration, setRestDuration] = useState(90);
    const [restRemaining, setRestRemaining] = useState(90);
    const [timerRunning, setTimerRunning] = useState(false);
    // Active workout logger state
    const [sessionTitle, setSessionTitle] = useState('Push & Strength Session');
    const [durationMinutes, setDurationMinutes] = useState(45);
    const [activeExercises, setActiveExercises] = useState([]);
    const [selectedAddExerciseId, setSelectedAddExerciseId] = useState('');
    // Create Plan modal state
    const [planModalOpen, setPlanModalOpen] = useState(false);
    const [planName, setPlanName] = useState('');
    const [planDaysPerWeek, setPlanDaysPerWeek] = useState(3);
    const [planExerciseIds, setPlanExerciseIds] = useState([]);
    useEffect(() => {
        if (!timerRunning)
            return;
        const interval = setInterval(() => {
            setRestRemaining((prev) => {
                if (prev <= 1) {
                    setTimerRunning(false);
                    pushToast({ variant: 'info', title: 'Rest timer finished — next set!' });
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [timerRunning, pushToast]);
    const exercisesQuery = useQuery({
        queryKey: ['exercises', search, muscleFilter, equipmentFilter],
        queryFn: async () => {
            const res = await api.get('/exercises', {
                params: {
                    limit: 50,
                    search: search.trim() || undefined,
                    muscleGroup: muscleFilter || undefined,
                    equipment: equipmentFilter || undefined,
                },
            });
            return res.data.data.exercises;
        },
    });
    const plansQuery = useQuery({
        queryKey: ['workouts', 'plans'],
        queryFn: async () => {
            const res = await api.get('/workouts');
            return res.data.data.workouts;
        },
    });
    const historyQuery = useQuery({
        queryKey: ['workout-sessions', 'history'],
        queryFn: async () => {
            const res = await api.get('/workout-sessions/history');
            return res.data.data;
        },
    });
    const logSessionMutation = useMutation({
        mutationFn: async () => {
            const res = await api.post('/workout-sessions', {
                title: sessionTitle.trim() || 'Workout Session',
                durationMinutes,
                status: 'completed',
                exercises: activeExercises,
            });
            return res.data.data.session;
        },
        onSuccess: (session) => {
            void queryClient.invalidateQueries({ queryKey: ['workout-sessions'] });
            setActiveExercises([]);
            pushToast({
                variant: 'success',
                title: session.personalRecordsHit > 0
                    ? `Workout logged! ${session.personalRecordsHit} new PR(s)!`
                    : 'Workout session logged',
                description: `Total volume: ${session.totalVolumeKg.toLocaleString()} kg`,
            });
        },
        onError: (err) => {
            pushToast({
                variant: 'error',
                title: 'Failed to log workout',
                description: getApiErrorMessage(err),
            });
        },
    });
    const createPlanMutation = useMutation({
        mutationFn: async () => {
            const res = await api.post('/workouts', {
                name: planName.trim(),
                daysPerWeek: planDaysPerWeek,
                difficulty: 'intermediate',
                days: [
                    {
                        dayNumber: 1,
                        title: 'Day 1 — Core Session',
                        exercises: planExerciseIds.map((id) => ({
                            exerciseId: id,
                            sets: 3,
                            reps: '8-12',
                            restSeconds: 90,
                        })),
                    },
                ],
            });
            return res.data.data.workout;
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['workouts'] });
            setPlanModalOpen(false);
            setPlanName('');
            setPlanExerciseIds([]);
            pushToast({ variant: 'success', title: 'Workout plan created' });
        },
        onError: (err) => {
            pushToast({
                variant: 'error',
                title: 'Plan creation failed',
                description: getApiErrorMessage(err),
            });
        },
    });
    const exercises = exercisesQuery.data || [];
    const plans = plansQuery.data || [];
    const sessions = historyQuery.data?.sessions || [];
    const stats = historyQuery.data?.stats;
    const addExerciseToLogger = (exerciseId) => {
        const ex = exercises.find((e) => e.id === exerciseId);
        if (!ex)
            return;
        setActiveExercises((prev) => [
            ...prev,
            {
                exerciseId: ex.id,
                exerciseName: ex.name,
                sets: [{ setNumber: 1, reps: 10, weightKg: 40, isCompleted: true }],
            },
        ]);
    };
    const addSetToExercise = (exIndex) => {
        setActiveExercises((prev) => prev.map((item, idx) => {
            if (idx !== exIndex)
                return item;
            const lastSet = item.sets[item.sets.length - 1];
            return {
                ...item,
                sets: [
                    ...item.sets,
                    {
                        setNumber: item.sets.length + 1,
                        reps: lastSet?.reps ?? 10,
                        weightKg: lastSet?.weightKg ?? 40,
                        isCompleted: true,
                    },
                ],
            };
        }));
    };
    const startFromPlan = (plan) => {
        const firstDay = plan.days[0];
        if (!firstDay)
            return;
        setSessionTitle(`${plan.name} — ${firstDay.title}`);
        setActiveExercises(firstDay.exercises.map((ex) => ({
            exerciseId: ex.exerciseId,
            exerciseName: ex.exerciseName || 'Exercise',
            sets: Array.from({ length: ex.sets }, (_, i) => ({
                setNumber: i + 1,
                reps: 10,
                weightKg: ex.targetWeightKg ?? 40,
                isCompleted: true,
            })),
        })));
        setTab('tracker');
        pushToast({ variant: 'info', title: `Loaded "${plan.name}" into active tracker` });
    };
    const formatClock = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };
    return (<DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-fitcore-accent">
              Training Engine
            </p>
            <h1 className="mt-1 font-['Manrope'] text-2xl font-extrabold text-white">
              Workouts & Exercise Library
            </h1>
            <p className="mt-1 text-sm text-fitcore-muted">
              Browse exercises, build split plans, run rest timers, and track progressive overload PRs.
            </p>
          </div>
          <Button onClick={() => setPlanModalOpen(true)}>
            <Plus className="h-4 w-4"/>
            Create workout plan
          </Button>
        </div>

        {/* Stats KPI Row */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <div className="flex items-center justify-between text-xs text-fitcore-muted">
              <span>Current Streak</span>
              <Flame className="h-4 w-4 text-fitcore-accent"/>
            </div>
            <p className="mt-2 font-['Manrope'] text-2xl font-extrabold text-fitcore-accent">
              {stats?.currentStreakDays ?? 0} days
            </p>
          </Card>
          <Card>
            <div className="flex items-center justify-between text-xs text-fitcore-muted">
              <span>Completed Workouts</span>
              <CheckCircle2 className="h-4 w-4 text-fitcore-accent"/>
            </div>
            <p className="mt-2 font-['Manrope'] text-2xl font-extrabold text-white">
              {stats?.totalCompletedSessions ?? 0}
            </p>
          </Card>
          <Card>
            <div className="flex items-center justify-between text-xs text-fitcore-muted">
              <span>Total Volume Lifted</span>
              <Dumbbell className="h-4 w-4 text-fitcore-accent"/>
            </div>
            <p className="mt-2 font-['Manrope'] text-2xl font-extrabold text-white">
              {(stats?.totalVolumeKg ?? 0).toLocaleString()} kg
            </p>
          </Card>
          <Card>
            <div className="flex items-center justify-between text-xs text-fitcore-muted">
              <span>Personal Records</span>
              <Award className="h-4 w-4 text-fitcore-accent"/>
            </div>
            <p className="mt-2 font-['Manrope'] text-2xl font-extrabold text-white">
              {stats?.totalPersonalRecords ?? 0} PRs
            </p>
          </Card>
        </div>

        {/* Tabs */}
        <div className="inline-flex rounded-xl border border-fitcore-border bg-fitcore-card p-1">
          {[
            { id: 'tracker', label: 'Workout Tracker & History' },
            { id: 'plans', label: `Workout Plans (${plans.length})` },
            { id: 'library', label: `Exercise Library (${exercises.length})` },
        ].map((t) => (<button key={t.id} onClick={() => setTab(t.id)} className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${tab === t.id
                ? 'bg-fitcore-accent text-black font-semibold'
                : 'text-fitcore-muted hover:text-white'}`}>
              {t.label}
            </button>))}
        </div>

        {tab === 'tracker' && (<div className="grid gap-6 lg:grid-cols-3">
            {/* Active Logger */}
            <div className="space-y-4 lg:col-span-2">
              <Card className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="font-['Manrope'] text-lg font-bold text-white">
                    Log Workout Session
                  </h2>
                  <div className="flex items-center gap-2">
                    <select value={selectedAddExerciseId} onChange={(e) => setSelectedAddExerciseId(e.target.value)} className="fitcore-input max-w-xs py-1.5 text-xs">
                      <option value="">Select exercise to add...</option>
                      {exercises.map((ex) => (<option key={ex.id} value={ex.id}>
                          {ex.name} ({ex.muscleGroup})
                        </option>))}
                    </select>
                    <Button size="sm" variant="secondary" disabled={!selectedAddExerciseId} onClick={() => {
                if (selectedAddExerciseId)
                    addExerciseToLogger(selectedAddExerciseId);
            }}>
                      <Plus className="h-3.5 w-3.5"/>
                      Add
                    </Button>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs text-fitcore-muted">Session title</label>
                    <input value={sessionTitle} onChange={(e) => setSessionTitle(e.target.value)} className="fitcore-input"/>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-fitcore-muted">Duration (min)</label>
                    <input type="number" value={durationMinutes} onChange={(e) => setDurationMinutes(Number(e.target.value) || 0)} className="fitcore-input"/>
                  </div>
                </div>

                {activeExercises.length === 0 ? (<EmptyState title="No exercises in this session" description="Add an exercise above or load a workout plan to log sets, reps, and weights."/>) : (<div className="space-y-4">
                    {activeExercises.map((ex, exIdx) => (<div key={`${ex.exerciseId}-${exIdx}`} className="rounded-xl border border-fitcore-border bg-[#141618] p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <h3 className="font-semibold text-white">{ex.exerciseName}</h3>
                          <div className="flex gap-2">
                            <Button size="sm" variant="secondary" onClick={() => addSetToExercise(exIdx)}>
                              + Set
                            </Button>
                            <Button size="sm" variant="danger" onClick={() => setActiveExercises((prev) => prev.filter((_, i) => i !== exIdx))}>
                              <Trash2 className="h-3.5 w-3.5"/>
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          {ex.sets.map((s, sIdx) => (<div key={sIdx} className="grid grid-cols-4 items-center gap-2 text-xs">
                              <span className="font-mono text-fitcore-muted">
                                Set {s.setNumber}
                              </span>
                              <input type="number" value={s.weightKg} onChange={(e) => {
                            const val = Number(e.target.value) || 0;
                            setActiveExercises((prev) => prev.map((item, i) => i === exIdx
                                ? {
                                    ...item,
                                    sets: item.sets.map((st, j) => j === sIdx ? { ...st, weightKg: val } : st),
                                }
                                : item));
                        }} placeholder="kg" className="fitcore-input py-1.5 text-xs"/>
                              <input type="number" value={s.reps} onChange={(e) => {
                            const val = Number(e.target.value) || 0;
                            setActiveExercises((prev) => prev.map((item, i) => i === exIdx
                                ? {
                                    ...item,
                                    sets: item.sets.map((st, j) => j === sIdx ? { ...st, reps: val } : st),
                                }
                                : item));
                        }} placeholder="reps" className="fitcore-input py-1.5 text-xs"/>
                              <label className="flex items-center justify-end gap-1.5 text-fitcore-muted">
                                <input type="checkbox" checked={s.isCompleted} onChange={(e) => {
                            const checked = e.target.checked;
                            setActiveExercises((prev) => prev.map((item, i) => i === exIdx
                                ? {
                                    ...item,
                                    sets: item.sets.map((st, j) => j === sIdx ? { ...st, isCompleted: checked } : st),
                                }
                                : item));
                        }}/>
                                Done
                              </label>
                            </div>))}
                        </div>
                      </div>))}

                    <div className="flex justify-end">
                      <Button onClick={() => logSessionMutation.mutate()} isLoading={logSessionMutation.isPending}>
                        <CheckCircle2 className="h-4 w-4"/>
                        Complete & Save Workout
                      </Button>
                    </div>
                  </div>)}
              </Card>

              {/* Recent History */}
              <Card className="space-y-4">
                <div className="flex items-center gap-2">
                  <History className="h-5 w-5 text-fitcore-accent"/>
                  <h2 className="font-['Manrope'] text-lg font-bold text-white">
                    Workout History
                  </h2>
                </div>
                {historyQuery.isLoading ? (<Skeleton className="h-32"/>) : sessions.length === 0 ? (<p className="text-xs text-fitcore-muted">
                    No workouts logged yet. Complete your first session above!
                  </p>) : (<div className="space-y-3">
                    {sessions.map((s) => (<div key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-fitcore-border bg-[#141618] p-3.5">
                        <div>
                          <p className="font-semibold text-white">{s.title}</p>
                          <p className="text-xs text-fitcore-muted">
                            {new Date(s.startedAt).toLocaleDateString()} · {s.durationMinutes} min ·{' '}
                            {s.exercises.length} exercises
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="neutral">{s.totalVolumeKg.toLocaleString()} kg</Badge>
                          {s.personalRecordsHit > 0 && (<Badge variant="accent">
                              <Award className="h-3 w-3"/>
                              {s.personalRecordsHit} PR
                            </Badge>)}
                        </div>
                      </div>))}
                  </div>)}
              </Card>
            </div>

            {/* Rest Timer Widget */}
            <div>
              <Card className="space-y-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-fitcore-accent"/>
                  <h2 className="font-['Manrope'] text-lg font-bold text-white">Rest Timer</h2>
                </div>

                <div className="rounded-2xl border border-fitcore-border bg-[#141618] py-6 text-center">
                  <p className="font-mono text-4xl font-extrabold text-fitcore-accent">
                    {formatClock(restRemaining)}
                  </p>
                  <p className="mt-1 text-xs text-fitcore-muted">
                    {timerRunning ? 'Resting between sets...' : 'Ready'}
                  </p>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {[30, 60, 90, 120].map((sec) => (<Button key={sec} size="sm" variant={restDuration === sec ? 'primary' : 'secondary'} onClick={() => {
                    setTimerRunning(false);
                    setRestDuration(sec);
                    setRestRemaining(sec);
                }}>
                      {sec}s
                    </Button>))}
                </div>

                <div className="flex gap-2">
                  <Button className="flex-1" onClick={() => setTimerRunning((r) => !r)} variant={timerRunning ? 'secondary' : 'primary'}>
                    {timerRunning ? (<>
                        <Pause className="h-4 w-4"/> Pause
                      </>) : (<>
                        <Play className="h-4 w-4"/> Start
                      </>)}
                  </Button>
                  <Button variant="secondary" onClick={() => {
                setTimerRunning(false);
                setRestRemaining(restDuration);
            }}>
                    <RotateCcw className="h-4 w-4"/>
                  </Button>
                </div>
              </Card>
            </div>
          </div>)}

        {tab === 'plans' && (<div>
            {plansQuery.isLoading ? (<Skeleton className="h-48"/>) : plans.length === 0 ? (<EmptyState title="No workout plans created yet" description="Create a structured training split with exercises, sets, reps, and rest periods." actionLabel="Create workout plan" onAction={() => setPlanModalOpen(true)}/>) : (<div className="grid gap-4 md:grid-cols-2">
                {plans.map((plan) => (<Card key={plan.id} className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-['Manrope'] text-lg font-bold text-white">
                          {plan.name}
                        </h3>
                        <p className="text-xs capitalize text-fitcore-muted">
                          {plan.daysPerWeek} days/week · {plan.difficulty}
                        </p>
                      </div>
                      <Badge variant="accent">{plan.status}</Badge>
                    </div>
                    <div className="space-y-2">
                      {plan.days.map((day) => (<div key={day.dayNumber} className="rounded-xl border border-fitcore-border bg-[#141618] p-3 text-xs">
                          <p className="font-semibold text-white">{day.title}</p>
                          <p className="mt-1 text-fitcore-muted">
                            {day.exercises
                            .map((e) => `${e.exerciseName || 'Exercise'} (${e.sets}×${e.reps})`)
                            .join(' · ')}
                          </p>
                        </div>))}
                    </div>
                    <Button size="sm" onClick={() => startFromPlan(plan)}>
                      <Play className="h-3.5 w-3.5"/>
                      Start Workout from Plan
                    </Button>
                  </Card>))}
              </div>)}
          </div>)}

        {tab === 'library' && (<div className="space-y-4">
            <Card className="grid gap-3 p-4 md:grid-cols-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fitcore-muted"/>
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search exercises..." className="fitcore-input pl-10"/>
              </div>
              <select value={muscleFilter} onChange={(e) => setMuscleFilter(e.target.value)} className="fitcore-input">
                <option value="">All muscle groups</option>
                {MUSCLE_GROUPS.map((m) => (<option key={m} value={m}>
                    {m.replace('_', ' ')}
                  </option>))}
              </select>
              <select value={equipmentFilter} onChange={(e) => setEquipmentFilter(e.target.value)} className="fitcore-input">
                <option value="">All equipment</option>
                {EQUIPMENT_TYPES.map((eq) => (<option key={eq} value={eq}>
                    {eq.replace('_', ' ')}
                  </option>))}
              </select>
            </Card>

            {exercisesQuery.isLoading ? (<div className="grid gap-4 md:grid-cols-3">
                <Skeleton className="h-40"/>
                <Skeleton className="h-40"/>
                <Skeleton className="h-40"/>
              </div>) : exercisesQuery.isError ? (<ErrorState message={getApiErrorMessage(exercisesQuery.error)} onRetry={() => void exercisesQuery.refetch()}/>) : (<div className="grid gap-4 md:grid-cols-3">
                {exercises.map((ex) => (<Card key={ex.id} className="flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-['Manrope'] text-base font-bold text-white">
                          {ex.name}
                        </h3>
                        <Badge variant="accent">{ex.muscleGroup.replace('_', ' ')}</Badge>
                      </div>
                      <p className="mt-1 text-xs capitalize text-fitcore-muted">
                        {ex.equipment.replace('_', ' ')} · {ex.difficulty}
                      </p>
                      <p className="mt-2 line-clamp-2 text-xs text-fitcore-muted">
                        {ex.description}
                      </p>
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => setSelectedExercise(ex)}>
                      <Info className="h-3.5 w-3.5"/>
                      Instructions
                    </Button>
                  </Card>))}
              </div>)}
          </div>)}
      </div>

      {/* Exercise Details Modal */}
      {selectedExercise && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-fitcore-border bg-fitcore-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <Badge variant="accent">{selectedExercise.muscleGroup.replace('_', ' ')}</Badge>
                <h2 className="mt-2 font-['Manrope'] text-xl font-bold text-white">
                  {selectedExercise.name}
                </h2>
              </div>
              <button onClick={() => setSelectedExercise(null)} className="rounded-lg p-1 text-fitcore-muted hover:text-white">
                <X className="h-5 w-5"/>
              </button>
            </div>
            <p className="text-sm text-fitcore-muted">{selectedExercise.description}</p>
            <div className="mt-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white">
                Step-by-Step Form
              </h3>
              <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-xs text-fitcore-muted">
                {selectedExercise.instructions.map((step, i) => (<li key={i}>{step}</li>))}
              </ol>
            </div>
            {selectedExercise.tips.length > 0 && (<div className="mt-4 rounded-xl border border-fitcore-accent/30 bg-fitcore-accent/10 p-3 text-xs">
                <p className="font-semibold text-fitcore-accent">Coaching Tips</p>
                <ul className="mt-1 list-disc pl-4 text-white">
                  {selectedExercise.tips.map((tip, i) => (<li key={i}>{tip}</li>))}
                </ul>
              </div>)}
          </div>
        </div>)}

      {/* Create Workout Plan Modal */}
      {planModalOpen && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-fitcore-border bg-fitcore-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-['Manrope'] text-lg font-bold text-white">
                Create Workout Plan
              </h2>
              <button onClick={() => setPlanModalOpen(false)} className="rounded-lg p-1 text-fitcore-muted hover:text-white">
                <X className="h-5 w-5"/>
              </button>
            </div>

            <div className="space-y-3.5">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="mb-1 block text-xs text-fitcore-muted">Plan name</label>
                  <input value={planName} onChange={(e) => setPlanName(e.target.value)} placeholder="Push Pull Legs Split" className="fitcore-input"/>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-fitcore-muted">Days / week</label>
                  <input type="number" min={1} max={7} value={planDaysPerWeek} onChange={(e) => setPlanDaysPerWeek(Number(e.target.value) || 3)} className="fitcore-input"/>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs text-fitcore-muted">
                  Select exercises ({planExerciseIds.length} selected)
                </label>
                <div className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
                  {exercises.map((ex) => {
                const checked = planExerciseIds.includes(ex.id);
                return (<label key={ex.id} className="flex cursor-pointer items-center justify-between rounded-xl border border-fitcore-border bg-[#141618] px-3 py-2 text-xs">
                        <span className="text-white">
                          {ex.name}{' '}
                          <span className="text-fitcore-muted">({ex.muscleGroup})</span>
                        </span>
                        <input type="checkbox" checked={checked} onChange={() => setPlanExerciseIds((prev) => checked ? prev.filter((id) => id !== ex.id) : [...prev, ex.id])}/>
                      </label>);
            })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={() => setPlanModalOpen(false)}>
                  Cancel
                </Button>
                <Button disabled={!planName.trim() || planExerciseIds.length === 0} isLoading={createPlanMutation.isPending} onClick={() => createPlanMutation.mutate()}>
                  Save workout plan
                </Button>
              </div>
            </div>
          </div>
        </div>)}
    </DashboardLayout>);
};
