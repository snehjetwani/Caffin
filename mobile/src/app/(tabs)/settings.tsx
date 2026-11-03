import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { Avatar, Button, Card, Screen, TextField } from '@/components/ui';
import { api, apiErrorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { colors, font, space } from '@/theme';

export default function SettingsScreen() {
  const { profile, refreshProfile, signOut } = useAuth();
  const router = useRouter();

  const [first, setFirst] = useState(profile?.first_name ?? '');
  const [last, setLast] = useState(profile?.last_name ?? '');
  const [savingName, setSavingName] = useState(false);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [savingPw, setSavingPw] = useState(false);

  async function saveName() {
    if (!first.trim() || !last.trim()) {
      Alert.alert('Name', 'First and last name are required.');
      return;
    }
    setSavingName(true);
    try {
      await api.patch('/users/me', { first_name: first.trim(), last_name: last.trim() });
      await refreshProfile();
      Alert.alert('Saved', 'Your name has been updated.');
    } catch (e) {
      Alert.alert('Error', apiErrorMessage(e, 'Could not update your name.'));
    } finally {
      setSavingName(false);
    }
  }

  async function changePassword() {
    if (password.length < 6) {
      Alert.alert('Password', 'Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Password', 'Passwords do not match.');
      return;
    }
    setSavingPw(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPassword('');
      setConfirm('');
      Alert.alert('Done', 'Your password has been changed.');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not change password.');
    } finally {
      setSavingPw(false);
    }
  }

  function confirmLogout() {
    Alert.alert('Log out?', 'You can log back in anytime.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => signOut() },
    ]);
  }

  return (
    <Screen scroll>
      <Text style={styles.title}>Settings</Text>

      <Card style={{ marginBottom: space.lg }}>
        <View style={styles.profileRow}>
          <Avatar first={profile?.first_name} last={profile?.last_name} seed={profile?.id} size={56} />
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>
              {profile?.first_name} {profile?.last_name}
            </Text>
            <Text style={styles.username}>@{profile?.username}</Text>
          </View>
        </View>
        {profile ? (
          <Button
            title="View my profile"
            variant="secondary"
            icon="person-circle-outline"
            onPress={() => router.push(`/profile/${profile.username}`)}
            style={{ marginTop: space.md }}
          />
        ) : null}
      </Card>

      <Card style={{ marginBottom: space.lg }}>
        <Text style={styles.section}>Edit name</Text>
        <View style={{ flexDirection: 'row', gap: space.md }}>
          <View style={{ flex: 1 }}>
            <TextField label="First" value={first} onChangeText={setFirst} />
          </View>
          <View style={{ flex: 1 }}>
            <TextField label="Last" value={last} onChangeText={setLast} />
          </View>
        </View>
        <Button title="Save name" onPress={saveName} loading={savingName} />
      </Card>

      <Card style={{ marginBottom: space.lg }}>
        <Text style={styles.section}>Change password</Text>
        <TextField
          label="New password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="At least 6 characters"
        />
        <TextField
          label="Confirm new password"
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
        />
        <Button title="Change password" onPress={changePassword} loading={savingPw} />
      </Card>

      <Button title="Log out" variant="danger" icon="log-out-outline" onPress={confirmLogout} />
      <View style={{ height: space.xl }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: font.xl, fontWeight: '800', color: colors.text, marginBottom: space.lg },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  name: { fontSize: font.lg, fontWeight: '700', color: colors.text },
  username: { fontSize: font.sm, color: colors.textMuted },
  section: { fontSize: font.md, fontWeight: '700', color: colors.text, marginBottom: space.md },
});
