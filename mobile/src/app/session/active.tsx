import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState, Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/ui';
import { api } from '@/lib/api';
import { elapsedHMS } from '@/lib/format';
import type { StudySession } from '@/lib/types';
import { colors, font, space } from '@/theme';

export default function ActiveSessionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; locationId: string; locationName: string }>();
  const sessionId = params.id;
  const locationId = params.locationId || '';
  const locationName = params.locationName || '';

  const [startMs, setStartMs] = useState<number>(() => Date.now());
  const [now, setNow] = useState<number>(() => Date.now());
  const [ending, setEnding] = useState(false);
  const endedRef = useRef(false);

  // Use the authoritative server start_time so the timer survives re-entry.
  useEffect(() => {
    let active = true;
    api
      .get<StudySession>(`/sessions/${sessionId}`)
      .then(({ data }) => {
        if (active && data.start_time) setStartMs(new Date(data.start_time).getTime());
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [sessionId]);

  // Tick every second until the session ends.
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // End the session exactly once (PATCH end_time=now).
  const endSession = useCallback(async () => {
    if (endedRef.current) return;
    endedRef.current = true;
    try {
      await api.patch(`/sessions/${sessionId}`, { end_time: new Date().toISOString() });
    } catch {
      // Session may already be ended; ignore.
    }
  }, [sessionId]);

  function goAfterEnd() {
    // A location-backed session can be reviewed; a private one can't.
    if (locationId) {
      router.replace({
        pathname: '/session/review',
        params: { sessionId, locationId, locationName },
      });
    } else {
      router.replace('/(tabs)');
    }
  }

  // Background/close => terminate the session immediately (spec requirement).
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') {
        void endSession();
      }
    });
    return () => sub.remove();
  }, [endSession]);

  async function onStop() {
    Alert.alert('End session?', 'Your study time will be saved.', [
      { text: 'Keep studying', style: 'cancel' },
      {
        text: 'End session',
        style: 'destructive',
        onPress: async () => {
          setEnding(true);
          await endSession();
          goAfterEnd();
        },
      },
    ]);
  }

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.locationChip}>
          <Ionicons
            name={locationName ? 'location' : 'lock-closed'}
            size={16}
            color={colors.primary}
          />
          <Text style={styles.locationText}>{locationName || 'Private session'}</Text>
        </View>

        <Text style={styles.timer}>{elapsedHMS(now - startMs)}</Text>
        <Text style={styles.subtle}>Focus time</Text>

        <Pressable onPress={onStop} disabled={ending} style={styles.stopButton}>
          <Ionicons name="stop" size={44} color="#fff" />
        </Pressable>
        <Text style={styles.subtle}>Tap to stop</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: 999,
    marginBottom: space.xl,
  },
  locationText: { color: colors.text, fontWeight: '600', fontSize: font.sm },
  timer: { fontSize: 64, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] },
  subtle: { color: colors.textMuted, fontSize: font.sm },
  stopButton: {
    marginTop: space.xxl,
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
  },
});
