import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FITCORE_THEME } from '@fitcore/shared-types';

export const ScreenContainer: React.FC<{
  children: React.ReactNode;
  scroll?: boolean;
}> = ({ children, scroll = true }) => (
  <SafeAreaView style={styles.safeArea}>
    {scroll ? (
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    ) : (
      <View style={styles.fixedContent}>{children}</View>
    )}
  </SafeAreaView>
);

export const FitCard: React.FC<{ children: React.ReactNode; style?: object }> = ({
  children,
  style,
}) => <View style={[styles.card, style]}>{children}</View>;

export const FitButton: React.FC<{
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
  disabled?: boolean;
}> = ({ label, onPress, variant = 'primary', loading = false, disabled = false }) => (
  <Pressable
    onPress={onPress}
    disabled={disabled || loading}
    style={({ pressed }) => [
      styles.button,
      variant === 'primary'
        ? styles.buttonPrimary
        : variant === 'danger'
        ? styles.buttonDanger
        : styles.buttonSecondary,
      (disabled || loading) && { opacity: 0.5 },
      pressed && { opacity: 0.85 },
    ]}
  >
    {loading ? (
      <ActivityIndicator color={variant === 'primary' ? '#000' : '#fff'} />
    ) : (
      <Text
        style={[
          styles.buttonText,
          variant === 'primary'
            ? { color: '#000' }
            : variant === 'danger'
            ? { color: '#F87171' }
            : { color: '#FFF' },
        ]}
      >
        {label}
      </Text>
    )}
  </Pressable>
);

export const FitInput: React.FC<TextInputProps & { label?: string }> = ({
  label,
  style,
  ...props
}) => (
  <View style={{ marginBottom: 12 }}>
    {label ? <Text style={styles.inputLabel}>{label}</Text> : null}
    <TextInput
      placeholderTextColor="#71717A"
      style={[styles.input, style]}
      {...props}
    />
  </View>
);

export const BadgePill: React.FC<{ label: string; accent?: boolean }> = ({
  label,
  accent = false,
}) => (
  <View
    style={[
      styles.badge,
      accent ? styles.badgeAccent : styles.badgeNeutral,
    ]}
  >
    <Text
      style={[
        styles.badgeText,
        { color: accent ? FITCORE_THEME.primaryAccent : FITCORE_THEME.secondaryText },
      ]}
    >
      {label}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: FITCORE_THEME.background,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  fixedContent: {
    flex: 1,
    padding: 20,
  },
  card: {
    backgroundColor: FITCORE_THEME.cardBackground,
    borderColor: FITCORE_THEME.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: FITCORE_THEME.primaryAccent,
  },
  buttonSecondary: {
    backgroundColor: '#24282A',
    borderColor: FITCORE_THEME.border,
    borderWidth: 1,
  },
  buttonDanger: {
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderColor: 'rgba(239,68,68,0.35)',
    borderWidth: 1,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  inputLabel: {
    color: FITCORE_THEME.secondaryText,
    fontSize: 12,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#141618',
    borderColor: FITCORE_THEME.border,
    borderWidth: 1,
    borderRadius: 12,
    color: FITCORE_THEME.primaryText,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeAccent: {
    backgroundColor: 'rgba(198,255,69,0.12)',
    borderColor: 'rgba(198,255,69,0.35)',
  },
  badgeNeutral: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: FITCORE_THEME.border,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
});

