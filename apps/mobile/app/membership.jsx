import { useQuery } from '@tanstack/react-query';
import { FITCORE_THEME } from '@fitcore/shared-types';
import { useRouter } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import { BadgePill, FitButton, FitCard, ScreenContainer } from '../src/components/ui';
import { mobileApi } from '../src/lib/api';
export default function MembershipDetailsScreen() {
    const router = useRouter();
    const query = useQuery({
        queryKey: ['mobile', 'subscriptions'],
        queryFn: async () => {
            const res = await mobileApi.get('/subscriptions');
            return res.data.data.subscriptions;
        },
    });
    const subs = query.data || [];
    return (<ScreenContainer>
      <FitButton label="← Back" variant="secondary" onPress={() => router.back()}/>
      <Text style={styles.title}>Membership Details</Text>
      {subs.length === 0 ? (<Text style={styles.sub}>No active gym subscriptions found.</Text>) : (subs.map((sub) => (<FitCard key={sub.id}>
            <BadgePill label={sub.status.toUpperCase()} accent={sub.status === 'active'}/>
            <Text style={styles.planName}>{sub.plan?.name || 'Membership Plan'}</Text>
            <Text style={styles.sub}>
              Start: {new Date(sub.startDate).toLocaleDateString()} · Expires:{' '}
              {new Date(sub.endDate).toLocaleDateString()}
            </Text>
            <Text style={styles.sub}>Renewals: {sub.renewalCount}</Text>
          </FitCard>)))}
    </ScreenContainer>);
}
const styles = StyleSheet.create({
    title: { color: FITCORE_THEME.primaryText, fontSize: 24, fontWeight: '800', marginTop: 16, marginBottom: 14 },
    planName: { color: FITCORE_THEME.primaryText, fontSize: 18, fontWeight: '700', marginTop: 10 },
    sub: { color: FITCORE_THEME.secondaryText, fontSize: 13, marginTop: 4 },
});
