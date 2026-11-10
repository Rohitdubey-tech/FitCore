import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MEAL_TYPES, } from '@fitcore/shared-types';
import { Droplets, Plus, Search, Trash2, Utensils } from 'lucide-react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Button } from '../../components/ui/Button';
import { Badge, Card, Skeleton } from '../../components/ui/Card';
import { EmptyState, ErrorState } from '../../components/ui/StateViews';
import { api, getApiErrorMessage } from '../../lib/api';
import { useToastStore } from '../../store/toastStore';
export const NutritionPage = () => {
    const queryClient = useQueryClient();
    const pushToast = useToastStore((s) => s.pushToast);
    const [dateKey, setDateKey] = useState(() => new Date().toISOString().slice(0, 10));
    const [search, setSearch] = useState('');
    const [cuisineFilter, setCuisineFilter] = useState('');
    const [mealType, setMealType] = useState('lunch');
    const [servings, setServings] = useState(1);
    const summaryQuery = useQuery({
        queryKey: ['nutrition', 'summary', dateKey],
        queryFn: async () => {
            const res = await api.get('/nutrition/daily-summary', { params: { dateKey } });
            return res.data.data.summary;
        },
    });
    const foodsQuery = useQuery({
        queryKey: ['nutrition', 'foods', search, cuisineFilter],
        queryFn: async () => {
            const res = await api.get('/nutrition/foods', {
                params: {
                    search: search.trim() || undefined,
                    cuisine: cuisineFilter || undefined,
                    limit: 30,
                },
            });
            return res.data.data.foods;
        },
    });
    const logFoodMutation = useMutation({
        mutationFn: async (foodItemId) => {
            await api.post('/nutrition/food-logs', {
                dateKey,
                mealType,
                foodItemId,
                servings,
            });
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['nutrition', 'summary'] });
            pushToast({ variant: 'success', title: `Logged to ${mealType}` });
        },
        onError: (err) => {
            pushToast({
                variant: 'error',
                title: 'Log failed',
                description: getApiErrorMessage(err),
            });
        },
    });
    const logWaterMutation = useMutation({
        mutationFn: async (waterMl) => {
            await api.post('/nutrition/food-logs', {
                dateKey,
                mealType: 'water',
                waterMl,
            });
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['nutrition', 'summary'] });
            pushToast({ variant: 'success', title: 'Hydration updated' });
        },
        onError: (err) => {
            pushToast({
                variant: 'error',
                title: 'Hydration log failed',
                description: getApiErrorMessage(err),
            });
        },
    });
    const deleteLogMutation = useMutation({
        mutationFn: async (logId) => {
            await api.delete(`/nutrition/food-logs/${logId}`);
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['nutrition', 'summary'] });
            pushToast({ variant: 'success', title: 'Entry removed' });
        },
    });
    const summary = summaryQuery.data;
    const foods = foodsQuery.data || [];
    const pct = (val, target) => Math.min(100, Math.round((val / Math.max(1, target)) * 100));
    return (<DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-fitcore-accent">
              Verified Nutrition Engine
            </p>
            <h1 className="mt-1 font-['Manrope'] text-2xl font-extrabold text-white">
              Nutrition & Hydration Tracking
            </h1>
            <p className="mt-1 text-sm text-fitcore-muted">
              Log Indian and international foods with verified macro data and track daily targets.
            </p>
          </div>
          <input type="date" value={dateKey} onChange={(e) => setDateKey(e.target.value)} className="fitcore-input max-w-[180px]"/>
        </div>

        {/* Daily Macro Progress */}
        {summaryQuery.isLoading ? (<Skeleton className="h-36"/>) : summaryQuery.isError ? (<ErrorState message={getApiErrorMessage(summaryQuery.error)} onRetry={() => void summaryQuery.refetch()}/>) : summary ? (<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
                {
                    label: 'Calories',
                    val: summary.consumed.calories,
                    target: summary.targets.calories,
                    unit: 'kcal',
                },
                {
                    label: 'Protein',
                    val: summary.consumed.proteinGrams,
                    target: summary.targets.proteinGrams,
                    unit: 'g',
                },
                {
                    label: 'Carbs',
                    val: summary.consumed.carbsGrams,
                    target: summary.targets.carbsGrams,
                    unit: 'g',
                },
                {
                    label: 'Fats',
                    val: summary.consumed.fatsGrams,
                    target: summary.targets.fatsGrams,
                    unit: 'g',
                },
                {
                    label: 'Water',
                    val: summary.consumed.waterMl,
                    target: summary.targets.waterMl,
                    unit: 'ml',
                },
            ].map((m) => (<Card key={m.label}>
                <p className="text-xs text-fitcore-muted">{m.label}</p>
                <p className="mt-1 font-['Manrope'] text-xl font-extrabold text-white">
                  {m.val}{' '}
                  <span className="text-xs font-normal text-fitcore-muted">
                    / {m.target} {m.unit}
                  </span>
                </p>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-fitcore-accent transition-all" style={{ width: `${pct(m.val, m.target)}%` }}/>
                </div>
              </Card>))}
          </div>) : null}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Verified Food Search */}
          <div className="space-y-4 lg:col-span-2">
            <Card className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-['Manrope'] text-lg font-bold text-white">
                  Verified Food Database
                </h2>
                <div className="flex items-center gap-2">
                  <select value={mealType} onChange={(e) => setMealType(e.target.value)} className="fitcore-input py-1.5 text-xs">
                    {MEAL_TYPES.map((mt) => (<option key={mt} value={mt}>
                        {mt}
                      </option>))}
                  </select>
                  <input type="number" min={0.25} step={0.25} value={servings} onChange={(e) => setServings(Number(e.target.value) || 1)} className="fitcore-input w-20 py-1.5 text-xs" title="Servings"/>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="relative sm:col-span-2">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fitcore-muted"/>
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search paneer, chicken, oats, dal..." className="fitcore-input pl-10"/>
                </div>
                <select value={cuisineFilter} onChange={(e) => setCuisineFilter(e.target.value)} className="fitcore-input">
                  <option value="">All cuisines</option>
                  <option value="indian">Indian</option>
                  <option value="international">International</option>
                </select>
              </div>

              {foodsQuery.isLoading ? (<Skeleton className="h-48"/>) : (<div className="max-h-96 space-y-2.5 overflow-y-auto pr-1">
                  {foods.map((food) => (<div key={food.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-fitcore-border bg-[#141618] p-3.5">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white">{food.name}</span>
                          <Badge variant="accent">{food.source}</Badge>
                        </div>
                        <p className="mt-1 text-xs text-fitcore-muted">
                          {food.servingLabel} · {food.calories} kcal · P {food.proteinGrams}g · C{' '}
                          {food.carbsGrams}g · F {food.fatsGrams}g
                        </p>
                      </div>
                      <Button size="sm" onClick={() => logFoodMutation.mutate(food.id)} isLoading={logFoodMutation.isPending}>
                        <Plus className="h-3.5 w-3.5"/>
                        Log {servings}×
                      </Button>
                    </div>))}
                </div>)}
            </Card>
          </div>

          {/* Water & Today's Meal Logs */}
          <div className="space-y-4">
            <Card className="space-y-3">
              <div className="flex items-center gap-2">
                <Droplets className="h-5 w-5 text-fitcore-accent"/>
                <h2 className="font-['Manrope'] text-lg font-bold text-white">Water Intake</h2>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button size="sm" variant="secondary" onClick={() => logWaterMutation.mutate(250)} isLoading={logWaterMutation.isPending}>
                  +250 ml
                </Button>
                <Button size="sm" variant="secondary" onClick={() => logWaterMutation.mutate(500)} isLoading={logWaterMutation.isPending}>
                  +500 ml
                </Button>
              </div>
            </Card>

            <Card className="space-y-3">
              <div className="flex items-center gap-2">
                <Utensils className="h-5 w-5 text-fitcore-accent"/>
                <h2 className="font-['Manrope'] text-lg font-bold text-white">
                  Logged Entries
                </h2>
              </div>
              {!summary || summary.logs.length === 0 ? (<EmptyState title="No entries logged" description="Pick a food item or add water to track today's intake."/>) : (<div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                  {summary.logs.map((log) => (<div key={log.id} className="flex items-center justify-between rounded-xl border border-fitcore-border bg-[#141618] px-3 py-2.5 text-xs">
                      <div>
                        <p className="font-medium text-white">{log.foodName}</p>
                        <p className="capitalize text-fitcore-muted">
                          {log.mealType} ·{' '}
                          {log.mealType === 'water'
                    ? `${log.waterMl} ml`
                    : `${log.calories} kcal (P ${log.proteinGrams}g)`}
                        </p>
                      </div>
                      <button onClick={() => deleteLogMutation.mutate(log.id)} className="rounded-lg p-1.5 text-red-400 hover:bg-red-500/15" aria-label="Delete log">
                        <Trash2 className="h-3.5 w-3.5"/>
                      </button>
                    </div>))}
                </div>)}
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>);
};
