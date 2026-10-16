import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { Button, Screen, Subtitle, TextField, Title } from '@/components/ui';
import { apiErrorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { colors, font, space } from '@/theme';

const USERNAME_RE = /^[a-z0-9_]{3,30}$/;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const router = useRouter();
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function validate(): string | null {
    if (!first.trim() || !last.trim()) return 'Enter your first and last name.';
    if (!EMAIL_RE.test(email.trim())) return 'Enter a valid email address.';
    const u = username.trim().toLowerCase();
    if (!USERNAME_RE.test(u))
      return 'Username must be 3–30 chars: lowercase letters, numbers, underscores.';
    if (password.length < 6) return 'Password must be at least 6 characters.';
    if (password !== confirm) return 'Passwords do not match.';
    return null;
  }

  async function onSubmit() {
    setError(null);
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setLoading(true);
    try {
      const { needsConfirm } = await signUp(email, password, first, last, username);
      if (needsConfirm) {
        Alert.alert(
          'Confirm your email',
          'We sent you a confirmation link. Confirm it, then log in to finish setting up your profile.',
          [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }],
        );
      }
      // Otherwise the root guard switches to the app automatically.
    } catch (e: any) {
      // Supabase auth errors carry `message`; backend errors go through axios.
      setError(e?.message ?? apiErrorMessage(e, 'Could not create account.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen scroll>
      <Title>Create your account</Title>
      <Subtitle>Start tracking where you do your best work.</Subtitle>
      <View style={{ height: space.lg }} />

      <View style={{ flexDirection: 'row', gap: space.md }}>
        <View style={{ flex: 1 }}>
          <TextField label="First name" value={first} onChangeText={setFirst} placeholder="Sneh" />
        </View>
        <View style={{ flex: 1 }}>
          <TextField label="Last name" value={last} onChangeText={setLast} placeholder="Jetwani" />
        </View>
      </View>

      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="you@school.edu"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
      />
      <TextField
        label="Username"
        value={username}
        onChangeText={(t) => setUsername(t.toLowerCase())}
        placeholder="sneh"
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={30}
      />
      <TextField
        label="Password"
        value={password}
        onChangeText={setPassword}
        placeholder="At least 6 characters"
        secureTextEntry
      />
      <TextField
        label="Confirm password"
        value={confirm}
        onChangeText={setConfirm}
        placeholder="Re-enter password"
        secureTextEntry
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={{ height: space.md }} />
      <Button title="Create account" onPress={onSubmit} loading={loading} />

      <View style={styles.footer}>
        <Text style={styles.muted}>Already have an account? </Text>
        <Pressable onPress={() => router.replace('/(auth)/login')}>
          <Text style={styles.link}>Log in</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = {
  muted: { color: colors.textMuted, fontSize: font.sm },
  link: { color: colors.primary, fontWeight: '700' as const, fontSize: font.sm },
  error: { color: colors.danger, marginTop: space.sm, fontSize: font.sm },
  footer: {
    flexDirection: 'row' as const,
    justifyContent: 'center' as const,
    marginTop: space.xl,
    marginBottom: space.xl,
  },
};
