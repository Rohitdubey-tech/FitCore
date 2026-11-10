import { useMutation } from '@tanstack/react-query';
import { FITCORE_THEME } from '@fitcore/shared-types';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { FitButton, FitInput, ScreenContainer } from '../src/components/ui';
import { mobileApi } from '../src/lib/api';
import { useMobileAuthStore } from '../src/store/authStore';
export default function MobileRegisterScreen() {
    const router = useRouter();
    const setSession = useMobileAuthStore((s) => s.setSession);
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const registerMutation = useMutation({
        mutationFn: async () => {
            const res = await mobileApi.post('/auth/register', {
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                email: email.trim(),
                password,
                role: 'member',
            });
            return res.data.data;
        },
        onSuccess: async (data) => {
            setError(null);
            await setSession({
                user: data.user,
                accessToken: data.tokens.accessToken,
                refreshToken: data.tokens.refreshToken,
            });
            router.replace('/fitness-setup');
        },
        onError: () => {
            setError('Registration failed. Check password strength (8+ chars, uppercase, number).');
        },
    });
    return (<ScreenContainer>
      <Text style={styles.brand}>FITCORE</Text>
      <Text style={styles.title}>Create your account</Text>
      <Text style={styles.subtitle}>Start tracking workouts, macros, and gym progress.</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FitInput label="First name" placeholder="Ananya" value={firstName} onChangeText={setFirstName}/>
      <FitInput label="Last name" placeholder="Nair" value={lastName} onChangeText={setLastName}/>
      <FitInput label="Email address" placeholder="you@domain.com" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail}/>
      <FitInput label="Password" placeholder="Min 8 chars, 1 uppercase, 1 number" secureTextEntry value={password} onChangeText={setPassword}/>

      <FitButton label="Create account" onPress={() => registerMutation.mutate()} loading={registerMutation.isPending}/>

      <Link href="/login" style={styles.link}>
        Already have an account? Sign in
      </Link>
    </ScreenContainer>);
}
const styles = StyleSheet.create({
    brand: { color: FITCORE_THEME.primaryAccent, fontSize: 13, fontWeight: '700', marginTop: 12 },
    title: { color: FITCORE_THEME.primaryText, fontSize: 28, fontWeight: '800', marginTop: 8 },
    subtitle: { color: FITCORE_THEME.secondaryText, fontSize: 14, marginBottom: 24, marginTop: 4 },
    error: { color: FITCORE_THEME.danger, marginBottom: 12, fontSize: 13 },
    link: {
        color: FITCORE_THEME.primaryAccent,
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
        marginTop: 20,
    },
});
