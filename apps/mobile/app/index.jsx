import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { FITCORE_THEME } from '@fitcore/shared-types';
import { useMobileAuthStore } from '../src/store/authStore';
export default function SplashScreen() {
    const { hydrated, accessToken, hasOnboarded } = useMobileAuthStore();
    if (!hydrated) {
        return (<View style={styles.container}>
        <Text style={styles.logo}>FITCORE</Text>
        <Text style={styles.tagline}>Your Gym. Your Goals. Your Progress.</Text>
        <ActivityIndicator color={FITCORE_THEME.primaryAccent} style={{ marginTop: 24 }}/>
      </View>);
    }
    if (accessToken) {
        return <Redirect href="/(tabs)/home"/>;
    }
    if (!hasOnboarded) {
        return <Redirect href="/onboarding"/>;
    }
    return <Redirect href="/login"/>;
}
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: FITCORE_THEME.background,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    logo: {
        fontSize: 34,
        fontWeight: '800',
        color: FITCORE_THEME.primaryAccent,
        letterSpacing: 1.5,
    },
    tagline: {
        marginTop: 8,
        fontSize: 14,
        color: FITCORE_THEME.secondaryText,
    },
});
