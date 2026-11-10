import { FITCORE_THEME } from '@fitcore/shared-types';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { BadgePill, FitButton, FitCard, ScreenContainer } from '../src/components/ui';
import { useMobileAuthStore } from '../src/store/authStore';
export default function OnboardingScreen() {
    const router = useRouter();
    const setOnboarded = useMobileAuthStore((s) => s.setOnboarded);
    const handleContinue = async (target) => {
        await setOnboarded();
        router.replace(target);
    };
    return (<ScreenContainer scroll={false}>
      <View style={styles.container}>
        <View>
          <BadgePill label="FITCORE ECOSYSTEM" accent/>
          <Text style={styles.title}>
            Your Gym. Your Goals.{' '}
            <Text style={{ color: FITCORE_THEME.primaryAccent }}>Your Progress.</Text>
          </Text>
          <Text style={styles.subtitle}>
            Track every set, hit personal records even offline, monitor nutrition, and get AI
            training insights synced with your gym.
          </Text>

          <FitCard>
            <Text style={styles.cardTitle}>Offline Workout Logging</Text>
            <Text style={styles.cardBody}>
              Log sets and rest timers inside low-signal gym basements—FITCORE syncs automatically
              once reconnected.
            </Text>
          </FitCard>

          <FitCard>
            <Text style={styles.cardTitle}>Connected Memberships & Trainers</Text>
            <Text style={styles.cardBody}>
              View your active gym plan, invoices, and coach-assigned workout splits in one place.
            </Text>
          </FitCard>
        </View>

        <View style={{ gap: 10 }}>
          <FitButton label="Get Started — Create Account" onPress={() => void handleContinue('/register')}/>
          <FitButton label="I already have an account" variant="secondary" onPress={() => void handleContinue('/login')}/>
        </View>
      </View>
    </ScreenContainer>);
}
const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'space-between', paddingVertical: 16 },
    title: {
        color: FITCORE_THEME.primaryText,
        fontSize: 32,
        fontWeight: '800',
        marginTop: 16,
        lineHeight: 38,
    },
    subtitle: {
        color: FITCORE_THEME.secondaryText,
        fontSize: 15,
        marginTop: 10,
        marginBottom: 24,
        lineHeight: 22,
    },
    cardTitle: { color: FITCORE_THEME.primaryText, fontSize: 15, fontWeight: '700' },
    cardBody: { color: FITCORE_THEME.secondaryText, fontSize: 13, marginTop: 4, lineHeight: 19 },
});
