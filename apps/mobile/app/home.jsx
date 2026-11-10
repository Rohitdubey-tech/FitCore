import { useQuery } from '@tanstack/react-query';
import { FITCORE_THEME } from '@fitcore/shared-types';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { mobileApi } from '../src/lib/api';
import { useMobileAuthStore } from '../src/store/authStore';
export default function MobileHomeScreen() {
    const router = useRouter();
    const clearSession = useMobileAuthStore((s) => s.clearSession);
    const meQuery = useQuery({
        queryKey: ['mobile', 'auth', 'me'],
        queryFn: async () => {
            const res = await mobileApi.get('/auth/me');
            return res.data.data.user;
        },
    });
    const handleLogout = async () => {
        await clearSession();
        router.replace('/login');
    };
    return (<View style={styles.container}>
      <Text style={styles.badge}>FITCORE MOBILE</Text>
      <Text style={styles.title}>
        {meQuery.data ? `Welcome, ${meQuery.data.firstName}` : 'Loading profile...'}
      </Text>
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Role</Text>
        <Text style={styles.cardValue}>{meQuery.data?.role ?? '—'}</Text>
        <Text style={[styles.cardLabel, { marginTop: 12 }]}>Email</Text>
        <Text style={styles.cardValue}>{meQuery.data?.email ?? '—'}</Text>
      </View>

      <Pressable style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Sign out</Text>
      </Pressable>
    </View>);
}
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: FITCORE_THEME.background,
        padding: 24,
        paddingTop: 72,
    },
    badge: {
        color: FITCORE_THEME.primaryAccent,
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1.2,
    },
    title: {
        color: FITCORE_THEME.primaryText,
        fontSize: 26,
        fontWeight: '800',
        marginTop: 8,
        marginBottom: 20,
    },
    card: {
        backgroundColor: FITCORE_THEME.cardBackground,
        borderColor: FITCORE_THEME.border,
        borderWidth: 1,
        borderRadius: 16,
        padding: 18,
    },
    cardLabel: {
        color: FITCORE_THEME.secondaryText,
        fontSize: 12,
    },
    cardValue: {
        color: FITCORE_THEME.primaryText,
        fontSize: 16,
        fontWeight: '600',
        marginTop: 2,
    },
    logoutBtn: {
        marginTop: 24,
        borderColor: FITCORE_THEME.border,
        borderWidth: 1,
        borderRadius: 12,
        paddingVertical: 12,
        alignItems: 'center',
    },
    logoutText: {
        color: FITCORE_THEME.primaryText,
        fontWeight: '600',
    },
});
