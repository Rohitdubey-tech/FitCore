import { useMutation } from '@tanstack/react-query';
import type { ApiSuccessResponse, AuthResponseDTO } from '@fitcore/shared-types';
import { FITCORE_THEME } from '@fitcore/shared-types';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FitButton, FitInput, ScreenContainer } from '../src/components/ui';
import { mobileApi } from '../src/lib/api';
import { useMobileAuthStore } from '../src/store/authStore';

export default function MobileLoginScreen() {
  const router = useRouter();
  const setSession = useMobileAuthStore((s) => s.setSession);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loginMutation = useMutation({
    mutationFn: async () => {
      const res = await mobileApi.post<ApiSuccessResponse<AuthResponseDTO>>('/auth/login', {
        email: email.trim(),
        password,
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
      router.replace('/(tabs)/home');
    },
    onError: () => {
      setError('Invalid credentials or server unreachable.');
    },
  });

  return (
    <ScreenContainer scroll={false}>
      <View style={styles.container}>
        <Text style={styles.brand}>FITCORE</Text>
        <Text style={styles.title}>Sign in to train</Text>
        <Text style={styles.subtitle}>Your Gym. Your Goals. Your Progress.</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <FitInput
          label="Email address"
          placeholder="member@ironpulse.dev"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <FitInput
          label="Password"
          placeholder="••••••••"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <FitButton
          label="Sign in"
          onPress={() => loginMutation.mutate()}
          loading={loginMutation.isPending}
        />

        <Link href="/register" style={styles.link}>
          New to FITCORE? Create an account
        </Link>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center' },
  brand: {
    color: FITCORE_THEME.primaryAccent,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
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
