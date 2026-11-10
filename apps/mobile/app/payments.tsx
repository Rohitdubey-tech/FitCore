import { useQuery } from '@tanstack/react-query';
import type { ApiSuccessResponse, PaymentDTO } from '@fitcore/shared-types';
import { FITCORE_THEME } from '@fitcore/shared-types';
import { useRouter } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import { BadgePill, FitButton, FitCard, ScreenContainer } from '../src/components/ui';
import { mobileApi } from '../src/lib/api';

export default function MobilePaymentsScreen() {
  const router = useRouter();
  const query = useQuery({
    queryKey: ['mobile', 'payments'],
    queryFn: async () => {
      const res = await mobileApi.get<ApiSuccessResponse<{ payments: PaymentDTO[] }>>(
        '/payments/history'
      );
      return res.data.data.payments;
    },
  });

  const payments = query.data || [];

  return (
    <ScreenContainer>
      <FitButton label="← Back" variant="secondary" onPress={() => router.back()} />
      <Text style={styles.title}>Payment History</Text>
      {payments.length === 0 ? (
        <Text style={styles.sub}>No payment records found.</Text>
      ) : (
        payments.map((p) => (
          <FitCard key={p.id}>
            <BadgePill label={p.status.toUpperCase()} accent={p.status === 'paid'} />
            <Text style={styles.amount}>
              {p.currency} {p.amount.toLocaleString()}
            </Text>
            <Text style={styles.sub}>{p.plan?.name || p.razorpayOrderId}</Text>
            {p.invoiceNumber ? (
              <Text style={styles.inv}>Invoice: {p.invoiceNumber}</Text>
            ) : null}
          </FitCard>
        ))
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { color: FITCORE_THEME.primaryText, fontSize: 24, fontWeight: '800', marginTop: 16, marginBottom: 14 },
  amount: { color: FITCORE_THEME.primaryText, fontSize: 20, fontWeight: '800', marginTop: 8 },
  sub: { color: FITCORE_THEME.secondaryText, fontSize: 13, marginTop: 4 },
  inv: { color: FITCORE_THEME.primaryAccent, fontSize: 12, marginTop: 4 },
});

