import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { DIETARY_PREFERENCES, EXPERIENCE_LEVELS, FITNESS_GOALS, } from '@fitcore/shared-types';
import { AlertTriangle, Bot, Camera, Dumbbell, Send, Sparkles, Utensils } from 'lucide-react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Button } from '../../components/ui/Button';
import { Badge, Card } from '../../components/ui/Card';
import { api, getApiErrorMessage } from '../../lib/api';
import { useToastStore } from '../../store/toastStore';
export const AIPage = () => {
    const pushToast = useToastStore((s) => s.pushToast);
    const [tab, setTab] = useState('diet');
    // Diet inputs
    const [age, setAge] = useState(26);
    const [weightKg, setWeightKg] = useState(72);
    const [heightCm, setHeightCm] = useState(175);
    const [fitnessGoal, setFitnessGoal] = useState('muscle_gain');
    const [dietaryPreference, setDietaryPreference] = useState('vegetarian');
    const [cuisine, setCuisine] = useState('indian');
    const [allergiesText, setAllergiesText] = useState('');
    const [dietResult, setDietResult] = useState(null);
    // Workout inputs
    const [workoutDays, setWorkoutDays] = useState(4);
    const [experienceLevel, setExperienceLevel] = useState('intermediate');
    const [limitations, setLimitations] = useState('');
    const [workoutResult, setWorkoutResult] = useState(null);
    // Chat state
    const [chatInput, setChatInput] = useState('');
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            text: 'Ask me to analyze your workout performance, suggest squat alternatives, or plan post-workout meals.',
        },
    ]);
    // Meal analyzer
    const [mealDesc, setMealDesc] = useState('');
    const [mealResult, setMealResult] = useState(null);
    const recsQuery = useQuery({
        queryKey: ['ai', 'recommendations'],
        queryFn: async () => {
            const res = await api.get('/ai/recommendations');
            return res.data.data.recommendations;
        },
    });
    const dietMutation = useMutation({
        mutationFn: async () => {
            const allergies = allergiesText
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean);
            const res = await api.post('/ai/diet/generate', {
                age,
                weightKg,
                heightCm,
                fitnessGoal,
                dietaryPreference,
                cuisine,
                allergies,
                saveAsActivePlan: true,
            });
            return res.data.data.plan;
        },
        onSuccess: (data) => {
            setDietResult(data);
            void recsQuery.refetch();
            pushToast({ variant: 'success', title: 'AI diet plan generated & saved' });
        },
        onError: (err) => {
            pushToast({ variant: 'error', title: 'Generation failed', description: getApiErrorMessage(err) });
        },
    });
    const workoutMutation = useMutation({
        mutationFn: async () => {
            const res = await api.post('/ai/workout/generate', {
                fitnessGoal,
                experienceLevel,
                workoutDays,
                limitations: limitations.trim() || undefined,
                savePlan: true,
            });
            return res.data.data.workout;
        },
        onSuccess: (data) => {
            setWorkoutResult(data);
            void recsQuery.refetch();
            pushToast({ variant: 'success', title: 'AI workout plan generated & saved' });
        },
        onError: (err) => {
            pushToast({ variant: 'error', title: 'Generation failed', description: getApiErrorMessage(err) });
        },
    });
    const chatMutation = useMutation({
        mutationFn: async (message) => {
            const res = await api.post('/ai/chat', { message });
            return res.data.data.reply;
        },
        onSuccess: (reply) => {
            setMessages((prev) => [...prev, { role: 'assistant', text: reply }]);
        },
        onError: (err) => {
            pushToast({ variant: 'error', title: 'Chat failed', description: getApiErrorMessage(err) });
        },
    });
    const mealMutation = useMutation({
        mutationFn: async () => {
            const res = await api.post('/ai/meal/analyze', {
                description: mealDesc,
            });
            return res.data.data;
        },
        onSuccess: (data) => {
            setMealResult(data);
            void recsQuery.refetch();
        },
        onError: (err) => {
            pushToast({ variant: 'error', title: 'Analysis failed', description: getApiErrorMessage(err) });
        },
    });
    const sendChat = (e) => {
        e.preventDefault();
        if (!chatInput.trim())
            return;
        const msg = chatInput.trim();
        setMessages((prev) => [...prev, { role: 'user', text: msg }]);
        setChatInput('');
        chatMutation.mutate(msg);
    };
    return (<DashboardLayout>
      <div className="space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-fitcore-accent">
            FITCORE Intelligence
          </p>
          <h1 className="mt-1 font-['Manrope'] text-2xl font-extrabold text-white">
            AI Fitness Studio
          </h1>
          <p className="mt-1 text-sm text-fitcore-muted">
            Generate diet & workout plans backed by verified data, analyze meals, and chat with
            your telemetry-grounded assistant.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            { id: 'diet', label: 'AI Diet Planner', icon: Utensils },
            { id: 'workout', label: 'AI Workout Planner', icon: Dumbbell },
            { id: 'chat', label: 'AI Fitness Assistant', icon: Bot },
            { id: 'meal', label: 'Meal Analyzer', icon: Camera },
        ].map((t) => {
            const Icon = t.icon;
            return (<button key={t.id} onClick={() => setTab(t.id)} className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition ${tab === t.id
                    ? 'border-fitcore-accent bg-fitcore-accent text-black font-semibold'
                    : 'border-fitcore-border bg-fitcore-card text-fitcore-muted hover:text-white'}`}>
                <Icon className="h-4 w-4"/>
                {t.label}
              </button>);
        })}
        </div>

        {tab === 'diet' && (<div className="grid gap-6 lg:grid-cols-2">
            <Card className="space-y-4">
              <h2 className="font-['Manrope'] text-lg font-bold text-white">
                Diet Parameters
              </h2>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-fitcore-muted">Age</label>
                  <input type="number" value={age} onChange={(e) => setAge(Number(e.target.value))} className="fitcore-input"/>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-fitcore-muted">Weight (kg)</label>
                  <input type="number" value={weightKg} onChange={(e) => setWeightKg(Number(e.target.value))} className="fitcore-input"/>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-fitcore-muted">Height (cm)</label>
                  <input type="number" value={heightCm} onChange={(e) => setHeightCm(Number(e.target.value))} className="fitcore-input"/>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-fitcore-muted">Goal</label>
                  <select value={fitnessGoal} onChange={(e) => setFitnessGoal(e.target.value)} className="fitcore-input">
                    {FITNESS_GOALS.map((g) => (<option key={g} value={g}>
                        {g.replace('_', ' ')}
                      </option>))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-fitcore-muted">Diet Preference</label>
                  <select value={dietaryPreference} onChange={(e) => setDietaryPreference(e.target.value)} className="fitcore-input">
                    {DIETARY_PREFERENCES.map((d) => (<option key={d} value={d}>
                        {d.replace('_', ' ')}
                      </option>))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-fitcore-muted">Cuisine</label>
                  <select value={cuisine} onChange={(e) => setCuisine(e.target.value)} className="fitcore-input">
                    <option value="indian">Indian</option>
                    <option value="international">International</option>
                    <option value="mixed">Mixed</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-fitcore-muted">
                    Allergies (comma-separated)
                  </label>
                  <input placeholder="peanut, shellfish" value={allergiesText} onChange={(e) => setAllergiesText(e.target.value)} className="fitcore-input"/>
                </div>
              </div>

              <Button onClick={() => dietMutation.mutate()} isLoading={dietMutation.isPending} className="w-full">
                <Sparkles className="h-4 w-4"/>
                Generate Verified Diet Plan
              </Button>
            </Card>

            <Card className="space-y-4">
              <h2 className="font-['Manrope'] text-lg font-bold text-white">
                Generated Plan Output
              </h2>
              {dietResult ? (<div className="space-y-3 text-sm">
                  <div className="rounded-xl border border-fitcore-accent/30 bg-fitcore-accent/10 p-3">
                    <p className="text-xs font-semibold text-fitcore-accent">DAILY TARGETS</p>
                    <p className="mt-1 font-bold text-white">
                      {dietResult.dailyTargets.calories} kcal · P{' '}
                      {dietResult.dailyTargets.proteinGrams}g · C{' '}
                      {dietResult.dailyTargets.carbsGrams}g · F{' '}
                      {dietResult.dailyTargets.fatsGrams}g
                    </p>
                  </div>
                  <div className="space-y-2 text-xs text-fitcore-muted">
                    {Object.entries(dietResult.meals).map(([slot, items]) => (<div key={slot} className="rounded-xl border border-fitcore-border bg-[#141618] p-3">
                        <p className="font-semibold capitalize text-white">{slot}</p>
                        <p className="mt-1">
                          {items.length > 0
                        ? items.map((i) => `${i.name} (${i.calories} kcal)`).join(', ')
                        : 'Flexible slot'}
                        </p>
                      </div>))}
                  </div>
                  <p className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0"/>
                    {dietResult.safety.medical_disclaimer}
                  </p>
                </div>) : (<p className="text-xs text-fitcore-muted">
                  Configure your parameters and generate a verified meal plan.
                </p>)}
            </Card>
          </div>)}

        {tab === 'workout' && (<div className="grid gap-6 lg:grid-cols-2">
            <Card className="space-y-4">
              <h2 className="font-['Manrope'] text-lg font-bold text-white">
                AI Workout Parameters
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-fitcore-muted">Goal</label>
                  <select value={fitnessGoal} onChange={(e) => setFitnessGoal(e.target.value)} className="fitcore-input">
                    {FITNESS_GOALS.map((g) => (<option key={g} value={g}>
                        {g.replace('_', ' ')}
                      </option>))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-fitcore-muted">Experience</label>
                  <select value={experienceLevel} onChange={(e) => setExperienceLevel(e.target.value)} className="fitcore-input">
                    {EXPERIENCE_LEVELS.map((l) => (<option key={l} value={l}>
                        {l}
                      </option>))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-fitcore-muted">Days per week</label>
                  <input type="number" min={1} max={7} value={workoutDays} onChange={(e) => setWorkoutDays(Number(e.target.value))} className="fitcore-input"/>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-fitcore-muted">
                    Limitations (optional)
                  </label>
                  <input placeholder="e.g. lower back sensitivity" value={limitations} onChange={(e) => setLimitations(e.target.value)} className="fitcore-input"/>
                </div>
              </div>
              <Button onClick={() => workoutMutation.mutate()} isLoading={workoutMutation.isPending} className="w-full">
                <Sparkles className="h-4 w-4"/>
                Generate Workout Split
              </Button>
            </Card>

            <Card className="space-y-3">
              <h2 className="font-['Manrope'] text-lg font-bold text-white">
                Generated Split
              </h2>
              {workoutResult ? (<div className="space-y-2.5 text-xs">
                  <Badge variant="accent">{String(workoutResult.planName)}</Badge>
                  {workoutResult.days.map((d) => (<div key={d.dayNumber} className="rounded-xl border border-fitcore-border bg-[#141618] p-3">
                      <p className="font-semibold text-white">{d.title}</p>
                      <p className="mt-1 text-fitcore-muted">
                        {d.exercises
                        .map((e) => `${e.exerciseName} (${e.sets}×${e.reps})`)
                        .join(' · ')}
                      </p>
                    </div>))}
                </div>) : (<p className="text-xs text-fitcore-muted">
                  Generate a structured split tailored to your training frequency and goals.
                </p>)}
            </Card>
          </div>)}

        {tab === 'chat' && (<Card className="space-y-4">
            <h2 className="font-['Manrope'] text-lg font-bold text-white">
              AI Fitness Assistant
            </h2>
            <div className="max-h-96 space-y-3 overflow-y-auto rounded-xl border border-fitcore-border bg-[#141618] p-4">
              {messages.map((m, i) => (<div key={i} className={`rounded-xl p-3 text-sm ${m.role === 'user'
                    ? 'ml-auto max-w-lg bg-fitcore-accent text-black font-medium'
                    : 'mr-auto max-w-xl border border-fitcore-border bg-fitcore-card text-white'}`}>
                  {m.text}
                </div>))}
            </div>
            <form onSubmit={sendChat} className="flex gap-2">
              <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Ask: Analyze my workout performance..." className="fitcore-input flex-1"/>
              <Button type="submit" isLoading={chatMutation.isPending}>
                <Send className="h-4 w-4"/>
                Ask
              </Button>
            </form>
          </Card>)}

        {tab === 'meal' && (<Card className="max-w-xl space-y-4">
            <h2 className="font-['Manrope'] text-lg font-bold text-white">Meal Analyzer</h2>
            <textarea rows={3} value={mealDesc} onChange={(e) => setMealDesc(e.target.value)} placeholder="Describe your meal (e.g. Paneer tikka bowl with basmati rice)..." className="fitcore-input"/>
            <Button onClick={() => mealMutation.mutate()} isLoading={mealMutation.isPending}>
              Estimate Macros
            </Button>
            {mealResult && (<div className="space-y-2 rounded-xl border border-fitcore-border bg-[#141618] p-4 text-xs">
                <p className="font-semibold text-white">
                  Identified: {mealResult.identifiedItems.join(', ')}
                </p>
                <p className="text-fitcore-accent">
                  Estimated: {mealResult.estimates.calories} kcal · P{' '}
                  {mealResult.estimates.proteinGrams}g · C{' '}
                  {mealResult.estimates.carbsGrams}g · F{' '}
                  {mealResult.estimates.fatsGrams}g
                </p>
                <p className="text-amber-300">{String(mealResult.uncertaintyDisclosure)}</p>
              </div>)}
          </Card>)}
      </div>
    </DashboardLayout>);
};
