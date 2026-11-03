import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Screen, Subtitle, Title } from '@/components/ui';
import { api, apiErrorMessage } from '@/lib/api';
import { useDeviceLocation } from '@/lib/useLocation';
import type { Location, PlaceSearchResult } from '@/lib/types';
import { colors, font, radius, space } from '@/theme';

export default function StudyScreen() {
  const router = useRouter();
  const { coords, denied, request } = useDeviceLocation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<PlaceSearchResult | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounced place search. Skips when a result is already selected (the text
  // box then shows the chosen name) or the query is too short.
  useEffect(() => {
    if (selected && query === selected.name) return;
    const q = query.trim();
    if (q.length < 2 || !coords) {
      setResults([]);
      return;
    }
    let active = true;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get<PlaceSearchResult[]>('/locations/search', {
          params: { q, lat: coords.lat, lng: coords.lng },
        });
        if (active) setResults(data);
      } catch {
        if (active) setResults([]);
      } finally {
        if (active) setSearching(false);
      }
    }, 350);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [query, coords, selected]);

  function onChangeText(t: string) {
    setQuery(t);
    if (selected && t !== selected.name) setSelected(null);
  }

  function pick(place: PlaceSearchResult) {
    setSelected(place);
    setQuery(place.name);
    setResults([]);
  }

  function clear() {
    setSelected(null);
    setQuery('');
    setResults([]);
  }

  // Play is enabled for a private session (empty box) or a selected place.
  const isPrivate = query.trim().length === 0;
  const canStart = isPrivate || selected !== null;

  async function onStart() {
    setError(null);
    setStarting(true);
    try {
      let locationId: string | null = null;
      let locationName: string | null = null;
      if (selected) {
        // Create-or-get the DB location, then start the session against it.
        const { data: loc } = await api.post<Location>('/locations', {
          google_place_id: selected.google_place_id,
          name: selected.name,
          type: 'other',
        });
        locationId = loc.id;
        locationName = loc.name;
      }
      const { data: session } = await api.post<{ id: string }>('/sessions', {
        location_id: locationId,
      });
      clear();
      router.push({
        pathname: '/session/active',
        params: {
          id: session.id,
          locationId: locationId ?? '',
          locationName: locationName ?? '',
        },
      });
    } catch (e) {
      setError(apiErrorMessage(e, 'Could not start the session.'));
    } finally {
      setStarting(false);
    }
  }

  return (
    <Screen padded={false}>
      <View style={{ padding: space.lg, flex: 1 }}>
        <Title>Start studying</Title>
        <Subtitle>Pick a spot, or leave it blank for a private session.</Subtitle>

        <View style={{ height: space.lg }} />

        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={onChangeText}
            placeholder="Search cafes, libraries…"
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
            autoCorrect={false}
          />
          {searching ? (
            <ActivityIndicator color={colors.textMuted} />
          ) : query.length > 0 ? (
            <Pressable onPress={clear} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>

        {denied && !coords ? (
          <Pressable onPress={request} style={styles.hint}>
            <Text style={styles.hintText}>
              Location is off, so search is disabled. Tap to enable, or start a private session.
            </Text>
          </Pressable>
        ) : null}

        {results.length > 0 ? (
          <FlatList
            style={styles.dropdown}
            data={results}
            keyExtractor={(item) => item.google_place_id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable style={styles.resultRow} onPress={() => pick(item)}>
                <Ionicons name="location-outline" size={18} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.resultName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  {item.address ? (
                    <Text style={styles.resultAddr} numberOfLines={1}>
                      {item.address}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            )}
          />
        ) : null}

        <View style={{ flex: 1 }} />

        <View style={{ alignItems: 'center' }}>
          <Text style={styles.selectedLabel}>
            {selected ? `Studying at ${selected.name}` : 'Private session'}
          </Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable
            onPress={onStart}
            disabled={!canStart || starting}
            style={[styles.playButton, (!canStart || starting) && { opacity: 0.4 }]}>
            {starting ? (
              <ActivityIndicator color="#fff" size="large" />
            ) : (
              <Ionicons name="play" size={52} color="#fff" style={{ marginLeft: 6 }} />
            )}
          </Pressable>
          {!canStart ? (
            <Text style={styles.playHint}>Choose a result from the list to continue</Text>
          ) : (
            <Text style={styles.playHint}>Tap to start</Text>
          )}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  searchInput: { flex: 1, fontSize: font.md, color: colors.text, paddingVertical: space.xs },
  dropdown: {
    marginTop: space.sm,
    maxHeight: 280,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  resultName: { fontSize: font.md, color: colors.text, fontWeight: '600' },
  resultAddr: { fontSize: font.xs, color: colors.textMuted },
  hint: { marginTop: space.sm, padding: space.md, backgroundColor: colors.surfaceAlt, borderRadius: radius.md },
  hintText: { color: colors.textMuted, fontSize: font.sm },
  selectedLabel: { fontSize: font.md, fontWeight: '600', color: colors.text, marginBottom: space.md },
  error: { color: colors.danger, fontSize: font.sm, marginBottom: space.sm, textAlign: 'center' },
  playButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  playHint: { marginTop: space.md, color: colors.textMuted, fontSize: font.sm },
});
