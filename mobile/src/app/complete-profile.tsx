import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Button, Screen, Subtitle, TextField, Title } from '@/components/ui';
import { apiErrorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { colors, font, space } from '@/theme';

const USERNAME_RE = /^[a-z0-9_]{3,30}$/;

/**
 * Shown when a user is authenticated with Supabase but has no app-row yet
 * (step 2 of registration failed earlier). Completing this creates the row and
 * the root guard then switches to the app.
 */
export default function CompleteProfileScreen() {
  const { createProfile, signOut, session } = useAuth();
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError(null);
    if (!first.trim() || !last.trim()) {
      setError('Enter your first and last name.');
      return;
    }
    if (!USERNAME_RE.test(username.trim().toLowerCase())) {
      setError('Username must be 3–30 chars: lowercase letters, numbers, underscores.');
      return;
    }
    setLoading(true);
    try {
      await createProfile(first, last, username);
    } catch (e: any) {
      setError(apiErrorMessage(e, 'Could not finish setting up your profile.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen scroll>
      <Title>Finish your profile</Title>
      <Subtitle>
        You're signed in as {session?.user?.email}. Just a couple more details.
      </Subtitle>
      <View style={{ height: space.lg }} />

      <View style={{ flexDirection: 'row', gap: space.md }}>
        <View style={{ flex: 1 }}>
          <TextField label="First name" value={first} onChangeText={setFirst} />
        </View>
        <View style={{ flex: 1 }}>
          <TextField label="Last name" value={last} onChangeText={setLast} />
        </View>
      </View>
      <TextField
        label="Username"
        value={username}
        onChangeText={(t) => setUsername(t.toLowerCase())}
        placeholder="sneh"
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={30}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={{ height: space.md }} />
      <Button title="Finish setup" onPress={onSubmit} loading={loading} />

      <Pressable onPress={() => signOut()} style={{ marginTop: space.xl }}>
        <Text style={[styles.link, { textAlign: 'center' }]}>Sign out</Text>
      </Pressable>
    </Screen>
  );
}

const styles = {
  link: { color: colors.textMuted, fontWeight: '700' as const, fontSize: font.sm },
  error: { color: colors.danger, marginTop: space.sm, fontSize: font.sm },
};
