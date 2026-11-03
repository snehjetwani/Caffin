import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Avatar, Button, EmptyState, Loading, Screen } from '@/components/ui';
import { api, apiErrorMessage, isStatus } from '@/lib/api';
import type { Friend, UserSearchResult } from '@/lib/types';
import { colors, font, radius, space } from '@/theme';

export default function FriendsScreen() {
  const [adding, setAdding] = useState(false);
  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Text style={styles.brand}>Friends</Text>
        <Pressable onPress={() => setAdding((a) => !a)} hitSlop={8}>
          <Ionicons name={adding ? 'close' : 'person-add'} size={24} color={colors.primary} />
        </Pressable>
      </View>
      {adding ? <AddFriend onAdded={() => {}} /> : <FriendList />}
    </Screen>
  );
}

function FriendList() {
  const router = useRouter();
  const [friends, setFriends] = useState<Friend[] | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<Friend[]>('/friends');
      setFriends(data);
    } catch {
      setFriends([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  function openMenu(friend: Friend) {
    Alert.alert(`${friend.first_name} ${friend.last_name}`, `@${friend.username}`, [
      { text: 'View profile', onPress: () => router.push(`/profile/${friend.username}`) },
      {
        text: 'Remove friend',
        style: 'destructive',
        onPress: () => confirmRemove(friend),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  function confirmRemove(friend: Friend) {
    Alert.alert('Remove friend?', `Remove @${friend.username} from your friends?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/friends/${friend.user_id}`);
            setFriends((f) => (f ? f.filter((x) => x.user_id !== friend.user_id) : f));
          } catch (e) {
            Alert.alert('Error', apiErrorMessage(e, 'Could not remove friend.'));
          }
        },
      },
    ]);
  }

  if (friends === null) return <Loading />;

  return (
    <FlatList
      data={friends}
      keyExtractor={(f) => f.user_id}
      contentContainerStyle={{ padding: space.lg, flexGrow: 1 }}
      ItemSeparatorComponent={() => <View style={{ height: space.sm }} />}
      renderItem={({ item }) => (
        <Pressable style={styles.row} onPress={() => router.push(`/profile/${item.username}`)}>
          <Avatar first={item.first_name} last={item.last_name} seed={item.user_id} />
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>
              {item.first_name} {item.last_name}
            </Text>
            <Text style={styles.username}>@{item.username}</Text>
          </View>
          <Pressable onPress={() => openMenu(item)} hitSlop={10}>
            <Ionicons name="ellipsis-horizontal" size={20} color={colors.textMuted} />
          </Pressable>
        </Pressable>
      )}
      ListEmptyComponent={
        <EmptyState
          icon="people-outline"
          title="No friends yet"
          subtitle="Tap the + above and search a username to add your first friend."
        />
      }
    />
  );
}

function AddFriend({ onAdded }: { onAdded: () => void }) {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [result, setResult] = useState<UserSearchResult | null>(null);
  const [status, setStatus] = useState<'idle' | 'searching' | 'notfound'>('idle');
  const [adding, setAdding] = useState(false);

  async function search() {
    const u = username.trim().toLowerCase();
    if (!u) return;
    setStatus('searching');
    setResult(null);
    try {
      const { data } = await api.get<UserSearchResult>('/users/search', {
        params: { username: u },
      });
      setResult(data);
      setStatus('idle');
    } catch (e) {
      if (isStatus(e, 404)) setStatus('notfound');
      else {
        setStatus('idle');
        Alert.alert('Error', apiErrorMessage(e, 'Search failed.'));
      }
    }
  }

  async function add() {
    if (!result) return;
    setAdding(true);
    try {
      await api.post(`/friends/${result.id}`);
      setResult({ ...result, is_friend: true });
      onAdded();
    } catch (e) {
      if (isStatus(e, 409)) setResult({ ...result, is_friend: true });
      else Alert.alert('Error', apiErrorMessage(e, 'Could not add friend.'));
    } finally {
      setAdding(false);
    }
  }

  return (
    <View style={{ padding: space.lg, flex: 1 }}>
      <View style={styles.searchBox}>
        <Ionicons name="at" size={18} color={colors.textMuted} />
        <TextInput
          value={username}
          onChangeText={(t) => setUsername(t.toLowerCase())}
          placeholder="exact username"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          onSubmitEditing={search}
          returnKeyType="search"
          style={styles.searchInput}
        />
        <Pressable onPress={search} hitSlop={8}>
          <Ionicons name="search" size={18} color={colors.primary} />
        </Pressable>
      </View>

      <View style={{ height: space.lg }} />

      {status === 'searching' ? <Loading /> : null}
      {status === 'notfound' ? (
        <EmptyState icon="search" title="No match" subtitle={`No user with that exact username.`} />
      ) : null}

      {result ? (
        <Pressable
          style={styles.row}
          onPress={() => router.push(`/profile/${result.username}`)}>
          <Avatar first={result.first_name} last={result.last_name} seed={result.id} />
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>
              {result.first_name} {result.last_name}
            </Text>
            <Text style={styles.username}>@{result.username}</Text>
          </View>
          {result.is_self ? (
            <Text style={styles.tag}>You</Text>
          ) : result.is_friend ? (
            <Text style={styles.tag}>Friends</Text>
          ) : (
            <Button title="Add" onPress={add} loading={adding} style={{ paddingHorizontal: space.lg, minHeight: 38 }} />
          )}
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingTop: space.xs,
    paddingBottom: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  brand: { fontSize: font.xl, fontWeight: '800', color: colors.text },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: space.md,
  },
  name: { fontSize: font.md, fontWeight: '700', color: colors.text },
  username: { fontSize: font.sm, color: colors.textMuted },
  tag: { color: colors.textMuted, fontWeight: '700', fontSize: font.sm },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  searchInput: { flex: 1, fontSize: font.md, color: colors.text },
});
