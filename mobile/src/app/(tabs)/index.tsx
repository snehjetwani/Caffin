import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { Avatar, Button, EmptyState, Loading, Screen, Stars } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatDuration, timeAgo } from '@/lib/format';
import type { FeedItem } from '@/lib/types';
import { colors, font, radius, space } from '@/theme';

export default function HomeScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const [feed, setFeed] = useState<FeedItem[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<FeedItem[]>('/feed');
      setFeed(data);
    } catch {
      setFeed([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  if (feed === null) return <Loading label="Loading your feed…" />;

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Text style={styles.brand}>☕ Caffin</Text>
      </View>
      <FlatList
        data={feed}
        keyExtractor={(item) => item.session_id}
        contentContainerStyle={{ padding: space.lg, flexGrow: 1 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ItemSeparatorComponent={() => <View style={{ height: space.md }} />}
        renderItem={({ item }) => (
          <FeedCard item={item} isSelf={item.user_id === profile?.id} />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="people-outline"
            title="Your feed is quiet"
            subtitle="Add some friends to see their study sessions here."
            action={
              <Button
                title="Find friends"
                icon="person-add"
                onPress={() => router.push('/(tabs)/friends')}
              />
            }
          />
        }
      />
    </Screen>
  );
}

function FeedCard({ item, isSelf }: { item: FeedItem; isSelf: boolean }) {
  const name = isSelf ? 'You' : `${item.first_name} ${item.last_name}`;
  const ongoing = !item.end_time;
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <Avatar first={item.first_name} last={item.last_name} seed={item.user_id} />
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.meta}>{timeAgo(item.start_time)}</Text>
        </View>
        {item.stars ? <Stars value={item.stars} size={16} /> : null}
      </View>

      <View style={styles.locationRow}>
        <Ionicons
          name={item.location_name ? 'location' : 'lock-closed'}
          size={15}
          color={colors.primary}
        />
        <Text style={styles.location}>{item.location_name ?? 'Private session'}</Text>
        <View style={styles.durationChip}>
          <Ionicons name="time-outline" size={13} color={colors.textMuted} />
          <Text style={styles.duration}>
            {ongoing ? 'studying…' : formatDuration(item.duration_minutes)}
          </Text>
        </View>
      </View>

      {item.opinion ? (
        <Text style={styles.opinion} numberOfLines={3}>
          “{item.opinion}”
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: space.lg,
    paddingBottom: space.sm,
    paddingTop: space.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  brand: { fontSize: font.lg, fontWeight: '800', color: colors.primary },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  name: { fontSize: font.md, fontWeight: '700', color: colors.text },
  meta: { fontSize: font.xs, color: colors.textMuted },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginTop: space.md },
  location: { flex: 1, fontSize: font.sm, color: colors.text, fontWeight: '600' },
  durationChip: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  duration: { fontSize: font.xs, color: colors.textMuted },
  opinion: {
    marginTop: space.sm,
    fontSize: font.sm,
    color: colors.textMuted,
    fontStyle: 'italic',
    lineHeight: 20,
  },
});
