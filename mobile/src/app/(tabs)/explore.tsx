import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { EmptyState, Loading, Screen } from '@/components/ui';
import { api, apiErrorMessage, isStatus } from '@/lib/api';
import { outletLabel } from '@/lib/format';
import type { PlaceSearchResult, RecommendationResponse } from '@/lib/types';
import { useDeviceLocation } from '@/lib/useLocation';
import { colors, font, radius, space } from '@/theme';

type Tab = 'near' | 'foryou';

export default function ExploreScreen() {
  const [tab, setTab] = useState<Tab>('near');
  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Text style={styles.brand}>Explore</Text>
        <View style={styles.segment}>
          <SegmentButton label="Near You" active={tab === 'near'} onPress={() => setTab('near')} />
          <SegmentButton
            label="For You"
            active={tab === 'foryou'}
            onPress={() => setTab('foryou')}
          />
        </View>
      </View>
      {tab === 'near' ? <NearYou /> : <ForYou />}
    </Screen>
  );
}

function SegmentButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.segmentBtn, active && styles.segmentBtnActive]}>
      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</Text>
    </Pressable>
  );
}

function NearYou() {
  const { coords, denied, request } = useDeviceLocation();
  const [spots, setSpots] = useState<PlaceSearchResult[] | null>(null);

  useEffect(() => {
    if (!coords) return;
    let active = true;
    (async () => {
      try {
        const { data } = await api.get<PlaceSearchResult[]>('/locations/search', {
          params: { q: 'study cafes and libraries', lat: coords.lat, lng: coords.lng },
        });
        if (active) setSpots(data);
        // Cold-start: seed these into the DB so For You has candidates to rank.
        if (data.length) {
          api
            .post('/locations/seed', {
              places: data.map((d) => ({
                google_place_id: d.google_place_id,
                name: d.name,
                type: 'other',
              })),
            })
            .catch(() => {});
        }
      } catch {
        if (active) setSpots([]);
      }
    })();
    return () => {
      active = false;
    };
  }, [coords]);

  if (denied && !coords) {
    return (
      <EmptyState
        icon="navigate-outline"
        title="Location is off"
        subtitle="Enable location to discover study spots near you."
        action={
          <Pressable onPress={request} style={styles.enableBtn}>
            <Text style={styles.enableText}>Enable location</Text>
          </Pressable>
        }
      />
    );
  }
  if (spots === null) return <Loading label="Finding spots near you…" />;

  return (
    <FlatList
      data={spots}
      keyExtractor={(s) => s.google_place_id}
      contentContainerStyle={styles.list}
      ItemSeparatorComponent={() => <View style={{ height: space.md }} />}
      renderItem={({ item }) => (
        <SpotCard
          name={item.name}
          address={item.address}
          photoUrl={item.photo_url}
          googleRating={item.rating}
        />
      )}
      ListEmptyComponent={
        <EmptyState icon="cafe-outline" title="No spots found" subtitle="Try again from campus." />
      }
    />
  );
}

function ForYou() {
  const [state, setState] = useState<RecommendationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const { data } = await api.get<RecommendationResponse>('/recommendations');
      setState(data);
    } catch (e) {
      if (isStatus(e, 503)) {
        setError('Personalized picks are warming up. Try again shortly.');
      } else {
        setError(apiErrorMessage(e, 'Could not load recommendations.'));
      }
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (error) {
    return <EmptyState icon="sparkles-outline" title="For You" subtitle={error} />;
  }
  if (state === null) return <Loading label="Personalizing…" />;

  if (!state.unlocked) {
    return (
      <EmptyState
        icon="lock-closed-outline"
        title="Unlock personalized picks"
        subtitle={`Review ${state.reviews_needed} more ${
          state.reviews_needed === 1 ? 'place' : 'places'
        } and we'll recommend spots tuned to your taste.`}
      />
    );
  }

  return (
    <FlatList
      data={state.recommendations}
      keyExtractor={(r) => r.id}
      contentContainerStyle={styles.list}
      ItemSeparatorComponent={() => <View style={{ height: space.md }} />}
      renderItem={({ item }) => (
        <SpotCard
          name={item.name}
          address={item.address}
          photoUrl={item.photo_url}
          googleRating={item.rating}
          caffinRating={item.caffin_rating}
          outlet={item.outlet_availability}
          match={item.similarity}
        />
      )}
      ListEmptyComponent={
        <EmptyState
          icon="sparkles-outline"
          title="Nothing yet"
          subtitle="Explore a few more spots and check back."
        />
      }
    />
  );
}

function SpotCard({
  name,
  address,
  photoUrl,
  googleRating,
  caffinRating,
  outlet,
  match,
}: {
  name: string;
  address?: string | null;
  photoUrl?: string | null;
  googleRating?: number | null;
  caffinRating?: number | null;
  outlet?: string | null;
  match?: number;
}) {
  return (
    <View style={styles.card}>
      {photoUrl ? (
        <Image source={{ uri: photoUrl }} style={styles.photo} contentFit="cover" />
      ) : (
        <View style={[styles.photo, styles.photoPlaceholder]}>
          <Ionicons name="cafe" size={28} color={colors.textMuted} />
        </View>
      )}
      <View style={{ padding: space.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.spotName} numberOfLines={1}>
            {name}
          </Text>
          {match != null ? (
            <View style={styles.matchBadge}>
              <Text style={styles.matchText}>{Math.round(match * 100)}% match</Text>
            </View>
          ) : null}
        </View>
        {address ? (
          <Text style={styles.spotAddr} numberOfLines={1}>
            {address}
          </Text>
        ) : null}
        <View style={styles.spotMeta}>
          {caffinRating != null ? (
            <Meta icon="star" text={`${caffinRating.toFixed(1)} Caffin`} gold />
          ) : null}
          {googleRating != null ? <Meta icon="logo-google" text={`${googleRating.toFixed(1)}`} /> : null}
          {outlet ? <Meta icon="flash-outline" text={outletLabel(outlet)} /> : null}
        </View>
      </View>
    </View>
  );
}

function Meta({ icon, text, gold }: { icon: any; text: string; gold?: boolean }) {
  return (
    <View style={styles.metaItem}>
      <Ionicons name={icon} size={13} color={gold ? colors.star : colors.textMuted} />
      <Text style={styles.metaText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: space.lg,
    paddingTop: space.xs,
    paddingBottom: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: space.md,
  },
  brand: { fontSize: font.xl, fontWeight: '800', color: colors.text },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: 3,
  },
  segmentBtn: { flex: 1, paddingVertical: space.sm, alignItems: 'center', borderRadius: radius.sm },
  segmentBtnActive: { backgroundColor: colors.surface },
  segmentText: { fontSize: font.sm, fontWeight: '600', color: colors.textMuted },
  segmentTextActive: { color: colors.primary },
  list: { padding: space.lg, flexGrow: 1 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  photo: { width: '100%', height: 140, backgroundColor: colors.surfaceAlt },
  photoPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  spotName: { flex: 1, fontSize: font.md, fontWeight: '700', color: colors.text },
  spotAddr: { fontSize: font.xs, color: colors.textMuted, marginTop: 2 },
  spotMeta: { flexDirection: 'row', gap: space.md, marginTop: space.sm, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: font.xs, color: colors.textMuted },
  matchBadge: {
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  matchText: { fontSize: font.xs, color: colors.primary, fontWeight: '700' },
  enableBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radius.md,
  },
  enableText: { color: '#fff', fontWeight: '700' },
});
