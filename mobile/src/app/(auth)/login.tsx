import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Button, Screen, Subtitle, TextField, Title } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { colors, font, space } from '@/theme';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError(null);
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await signIn(email, password);
      // Navigation is handled by the auth guard in the root layout.
    } catch (e: any) {
      setError(e?.message ?? 'Could not sign in.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen scroll>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Text style={{ fontSize: 40, marginBottom: space.sm }}>☕</Text>
        <Title>Welcome back</Title>
        <Subtitle>Log your study sessions and keep your streak going.</Subtitle>

        <View style={{ height: space.xl }} />

        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@school.edu"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
        />
        <TextField
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          secureTextEntry
          textContentType="password"
        />

        <View style={styles.row}>
          <Pressable
            onPress={() => setRemember((r) => !r)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <View style={[styles.checkbox, remember && styles.checkboxOn]}>
              {remember ? <Text style={{ color: '#fff', fontSize: 12 }}>✓</Text> : null}
            </View>
            <Text style={styles.muted}>Remember me</Text>
          </Pressable>
          <Link href="/(auth)/forgot-password" style={styles.link}>
            Forgot password?
          </Link>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={{ height: space.md }} />
        <Button title="Log in" onPress={onSubmit} loading={loading} />

        <View style={styles.footer}>
          <Text style={styles.muted}>New to Caffin? </Text>
          <Pressable onPress={() => router.push('/(auth)/register')}>
            <Text style={styles.link}>Create an account</Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}

const styles = {
  row: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginTop: space.xs,
    marginBottom: space.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: colors.surface,
  },
  checkboxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  muted: { color: colors.textMuted, fontSize: font.sm },
  link: { color: colors.primary, fontWeight: '700' as const, fontSize: font.sm },
  error: { color: colors.danger, marginTop: space.sm, fontSize: font.sm },
  footer: {
    flexDirection: 'row' as const,
    justifyContent: 'center' as const,
    marginTop: space.xl,
  },
};
