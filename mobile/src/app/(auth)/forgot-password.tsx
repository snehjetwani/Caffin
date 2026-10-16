import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Button, Screen, Subtitle, TextField, Title } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { colors, font, space } from '@/theme';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError(null);
    if (!email.trim()) {
      setError('Enter your email address.');
      return;
    }
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim());
      if (err) throw err;
      setSent(true);
    } catch (e: any) {
      setError(e?.message ?? 'Could not send reset email.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen scroll>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Title>Reset password</Title>
        <Subtitle>We'll email you a link to set a new password.</Subtitle>
        <View style={{ height: space.xl }} />

        {sent ? (
          <Text style={styles.success}>
            If an account exists for {email.trim()}, a reset link is on its way. Check your inbox.
          </Text>
        ) : (
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@school.edu"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={{ height: space.md }} />
        {!sent && <Button title="Send reset link" onPress={onSubmit} loading={loading} />}

        <Pressable onPress={() => router.replace('/(auth)/login')} style={{ marginTop: space.xl }}>
          <Text style={[styles.link, { textAlign: 'center' }]}>Back to log in</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = {
  link: { color: colors.primary, fontWeight: '700' as const, fontSize: font.sm },
  error: { color: colors.danger, marginTop: space.sm, fontSize: font.sm },
  success: { color: colors.success, fontSize: font.md, lineHeight: 22 },
};
