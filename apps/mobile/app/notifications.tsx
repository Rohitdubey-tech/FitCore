import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ApiSuccessResponse } from '@fitcore/shared-types';
import { FITCORE_THEME } from '@fitcore/shared-types';
import { useRouter } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import { BadgePill, FitButton, FitCard, ScreenContainer } from '../src/components/ui';
import { mobileApi } from '../src/lib/api';

interface NotificationDTO {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

export default function MobileNotificationsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['mobile', 'notifications'],
    queryFn: async () => {
      const res = await mobileApi.get<
        ApiSuccessResponse<{ notifications: NotificationDTO[]; unreadCount: number }>
      >('/notifications');
      return res.data.data;
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await mobileApi.patch(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['mobile', 'notifications'] });
    },
  });

  const items = query.data?.notifications || [];

  return (
    <ScreenContainer>
      <FitButton label="← Back" variant="secondary" onPress={() => router.back()} />
      <Text style={styles.title}>
        Notifications ({query.data?.unreadCount ?? 0} unread)
      </Text>
      {items.length === 0 ? (
        <FitCard>
          <Text style={styles.cardTitle}>No alerts yet</Text>
          <Text style={styles.sub}>
            Attendance confirmations, membership reminders, and trainer messages appear here.
          </Text>
        </FitCard>
      ) : (
        items.map((n) => (
          <FitCard
            key={n.id}
            style={!n.isRead ? { borderColor: FITCORE_THEME.primaryAccent } : undefined}
          >
            <BadgePill label={n.type.replace('_', ' ')} accent={!n.isRead} />
            <Text style={[styles.cardTitle, { marginTop: 8 }]}>{n.title}</Text>
            <Text style={styles.sub}>{n.body}</Text>
            {!n.isRead && (
              <FitButton
                label="Mark as read"
                variant="secondary"
                onPress={() => markReadMutation.mutate(n.id)}
              />
            )}
          </FitCard>
        ))
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { color: FITCORE_THEME.primaryText, fontSize: 24, fontWeight: '800', marginTop: 16, marginBottom: 14 },
  cardTitle: { color: FITCORE_THEME.primaryText, fontSize: 15, fontWeight: '700' },
  sub: { color: FITCORE_THEME.secondaryText, fontSize: 13, marginTop: 6, marginBottom: 10, lineHeight: 19 },
});
