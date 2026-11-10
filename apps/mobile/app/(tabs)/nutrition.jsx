import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FITCORE_THEME } from '@fitcore/shared-types';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { BadgePill, FitButton, FitCard, FitInput, ScreenContainer } from '../../src/components/ui';
import { mobileApi } from '../../src/lib/api';
export default function MobileNutritionScreen() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const summaryQuery = useQuery({
        queryKey: ['mobile', 'nutrition-summary'],
        queryFn: async () => {
            const res = await mobileApi.get('/nutrition/daily-summary');
            return res.data.data.summary;
        },
    });
    const foodsQuery = useQuery({
        queryKey: ['mobile', 'foods', search],
        queryFn: async () => {
            const res = await mobileApi.get('/nutrition/foods', { params: { search: search.trim() || undefined, limit: 15 } });
            return res.data.data.foods;
        },
    });
    const logFoodMutation = useMutation({
        mutationFn: async (foodItemId) => {
            await mobileApi.post('/nutrition/food-logs', {
                mealType: 'lunch',
                foodItemId,
                servings: 1,
            });
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['mobile', 'nutrition-summary'] });
            Alert.alert('Logged', 'Added 1 serving to today’s nutrition log.');
        },
    });
    const waterMutation = useMutation({
        mutationFn: async () => {
            await mobileApi.post('/nutrition/food-logs', { mealType: 'water', waterMl: 250 });
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['mobile', 'nutrition-summary'] });
        },
    });
    const summary = summaryQuery.data;
    return (<ScreenContainer>
      <BadgePill label="VERIFIED NUTRITION" accent/>
      <Text style={styles.title}>Daily Nutrition</Text>

      <FitCard>
        <Text style={styles.cardLabel}>TODAY&apos;S MACROS & HYDRATION</Text>
        <Text style={styles.big}>
          {summary?.consumed.calories ?? 0}{' '}
          <Text style={styles.sub}>/ {summary?.targets.calories ?? 2200} kcal</Text>
        </Text>
        <Text style={styles.sub}>
          Protein: {summary?.consumed.proteinGrams ?? 0}g · Carbs:{' '}
          {summary?.consumed.carbsGrams ?? 0}g · Fats: {summary?.consumed.fatsGrams ?? 0}g
        </Text>
        <Text style={[styles.sub, { marginBottom: 12 }]}>
          Water: {summary?.consumed.waterMl ?? 0} / {summary?.targets.waterMl ?? 3000} ml
        </Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <FitButton label="+250ml Water" variant="secondary" onPress={() => waterMutation.mutate()} loading={waterMutation.isPending}/>
          </View>
          <View style={{ flex: 1 }}>
            <FitButton label="AI Diet Plan" onPress={() => router.push('/ai-diet')}/>
          </View>
        </View>
      </FitCard>

      <FitInput label="Search Verified Foods" placeholder="Paneer, Oats, Chicken, Dal..." value={search} onChangeText={setSearch}/>

      {(foodsQuery.data || []).map((food) => (<FitCard key={food.id}>
          <Text style={styles.foodName}>{food.name}</Text>
          <Text style={styles.sub}>
            {food.servingLabel} · {food.calories} kcal · P {food.proteinGrams}g
          </Text>
          <View style={{ marginTop: 10 }}>
            <FitButton label="Log 1 Serving" variant="secondary" onPress={() => logFoodMutation.mutate(food.id)}/>
          </View>
        </FitCard>))}
    </ScreenContainer>);
}
const styles = StyleSheet.create({
    title: { color: FITCORE_THEME.primaryText, fontSize: 24, fontWeight: '800', marginTop: 10, marginBottom: 14 },
    cardLabel: { color: FITCORE_THEME.secondaryText, fontSize: 11, fontWeight: '700' },
    big: { color: FITCORE_THEME.primaryAccent, fontSize: 26, fontWeight: '800', marginTop: 6 },
    sub: { color: FITCORE_THEME.secondaryText, fontSize: 13, marginTop: 4 },
    foodName: { color: FITCORE_THEME.primaryText, fontSize: 15, fontWeight: '700' },
});
