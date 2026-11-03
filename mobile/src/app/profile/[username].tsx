import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { Avatar, Button, Card, EmptyState, Loading, Screen } from '@/components/ui';
import { api, apiErrorMessage, isStatus } from '@/lib/api';
import type { UserSearchResult } from '@/lib/types';
import { colors, font, space } from '@/theme';

export default function ProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const [user, setUser] = useState<UserSearchResult | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<UserSearchResult>('/users/search', {
        params: { username },
      });
      setUser(data);
    } catch (e) {
      if (isStatus(e, 404)) setNotFound(true);
    }
  }, [username]);

  useEffect(() => {
    load();
  }, [load]);

  async function addFriend() {
    if (!user) return;
    setAdding(true);
    try {
      await api.post(`/friends/${user.id}`);
      setUser({ ...user, is_friend: true });
      await load();
    } catch (e) {
      if (isStatus(e, 409)) setUser({ ...user, is_friend: true });
      else Alert.alert('Error', apiErrorMessage(e, 'Could not add friend.'));
    } finally {
      setAdding(false);
    }
  }

  if (notFound) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Profile' }} />
        <EmptyState icon="person-outline" title="User not found" />
      </Screen>
    );
  }
  if (!user) return <Loading />;

  const canSeeStats = user.is_self || user.is_friend;

  return (
    <Screen>
      <Stack.Screen options={{ title: `@${user.username}` }} />
      <View style={{ alignItems: 'center', marginTop: space.lg }}>
        <Avatar first={user.first_name} last={user.last_name} seed={user.id} size={88} />
        <Text style={styles.name}>
          {user.first_name} {user.last_name}
        </Text>
        <Text style={styles.username}>@{user.username}</Text>
      </View>

      <View style={{ height: space.xl }} />

      {canSeeStats ? (
        <View style={{ flexDirection: 'row', gap: space.md }}>
          <Stat icon="time-outline" value={String(user.total_sessions ?? 0)} label="Sessions" />
          <Stat icon="heart-outline" value={user.favorite_spot ?? '—'} label="Favorite spot" />
        </View>
      ) : (
        <Card>
          <View style={{ alignItems: 'center', gap: space.sm }}>
            <Ionicons name="lock-closed-outline" size={28} color={colors.textMuted} />
            <Text style={styles.locked}>This profile is private</Text>
            <Text style={styles.lockedSub}>Add them as a friend to see their study stats.</Text>
          </View>
        </Card>
      )}

      <View style={{ height: space.xl }} />

      {user.is_self ? null : user.is_friend ? (
        <View style={styles.friendRow}>
          <Ionicons name="checkmark-circle" size={20} color={colors.success} />
          <Text style={styles.friendText}>You're friends</Text>
        </View>
      ) : (
        <Button title="Add friend" icon="person-add" onPress={addFriend} loading={adding} />
      )}
    </Screen>
  );
}

function Stat({ icon, value, label }: { icon: any; value: string; label: string }) {
  return (
    <Card style={{ flex: 1 }}>
      <Ionicons name={icon} size={20} color={colors.primary} />
      <Text style={styles.statValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  name: { fontSize: font.xl, fontWeight: '800', color: colors.text, marginTop: space.md },
  username: { fontSize: font.md, color: colors.textMuted },
  statValue: { fontSize: font.lg, fontWeight: '800', color: colors.text, marginTop: space.sm },
  statLabel: { fontSize: font.xs, color: colors.textMuted, marginTop: 2 },
  locked: { fontSize: font.md, fontWeight: '700', color: colors.text },
  lockedSub: { fontSize: font.sm, color: colors.textMuted, textAlign: 'center' },
  friendRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm },
  friendText: { color: colors.success, fontWeight: '700', fontSize: font.md },
});
