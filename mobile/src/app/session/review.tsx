import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import type { ImagePickerAsset } from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, Screen, Stars, Subtitle, Title } from '@/components/ui';
import { api, apiErrorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { pickReviewPhotos, uploadReviewPhoto } from '@/lib/storage';
import type { OutletAvailability } from '@/lib/types';
import { colors, font, radius, space } from '@/theme';

const OUTLETS: { value: OutletAvailability; label: string }[] = [
  { value: 'NONE', label: 'None' },
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
];
const MAX_PHOTOS = 3;

export default function ReviewScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const params = useLocalSearchParams<{
    sessionId: string;
    locationId: string;
    locationName: string;
  }>();

  const [stars, setStars] = useState(0);
  const [outlet, setOutlet] = useState<OutletAvailability | null>(null);
  const [opinion, setOpinion] = useState('');
  const [photos, setPhotos] = useState<ImagePickerAsset[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function done() {
    router.replace('/(tabs)');
  }

  async function addPhotos() {
    try {
      const picked = await pickReviewPhotos(MAX_PHOTOS - photos.length);
      if (picked.length) setPhotos((p) => [...p, ...picked].slice(0, MAX_PHOTOS));
    } catch (e: any) {
      Alert.alert('Photos', e?.message ?? 'Could not open the photo library.');
    }
  }

  async function onSubmit() {
    setError(null);
    if (stars < 1) {
      setError('Tap a star to rate this spot.');
      return;
    }
    setSubmitting(true);
    try {
      // Upload photos first; failures are non-fatal (review still saves).
      let photoUrls: string[] = [];
      let photoFailed = false;
      if (photos.length && profile) {
        for (const asset of photos) {
          try {
            photoUrls.push(await uploadReviewPhoto(asset, profile.id));
          } catch {
            photoFailed = true;
          }
        }
      }

      await api.post('/reviews', {
        location_id: params.locationId,
        session_id: params.sessionId,
        stars,
        opinion: opinion.trim() || null,
        outlet_availability: outlet,
        photo_urls: photoUrls.length ? photoUrls : null,
      });

      if (photoFailed) {
        Alert.alert('Review saved', 'Some photos could not be uploaded, but your review was saved.', [
          { text: 'OK', onPress: done },
        ]);
      } else {
        done();
      }
    } catch (e) {
      setError(apiErrorMessage(e, 'Could not submit your review.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen scroll>
      <Title>How was it?</Title>
      <Subtitle>{params.locationName || 'Your study spot'}</Subtitle>

      <View style={{ height: space.xl }} />

      <Text style={styles.label}>Rating</Text>
      <Stars value={stars} onChange={setStars} size={40} />

      <View style={{ height: space.xl }} />
      <Text style={styles.label}>Power outlets</Text>
      <View style={styles.pillRow}>
        {OUTLETS.map((o) => {
          const on = outlet === o.value;
          return (
            <Pressable
              key={o.value}
              onPress={() => setOutlet(on ? null : o.value)}
              style={[styles.pill, on && styles.pillOn]}>
              <Text style={[styles.pillText, on && styles.pillTextOn]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ height: space.xl }} />
      <Text style={styles.label}>Your thoughts</Text>
      <TextInput
        value={opinion}
        onChangeText={setOpinion}
        placeholder="Quiet corner, great coffee, fast wifi…"
        placeholderTextColor={colors.textMuted}
        multiline
        maxLength={300}
        style={styles.textArea}
      />
      <Text style={styles.counter}>{opinion.length}/300</Text>

      <View style={{ height: space.lg }} />
      <Text style={styles.label}>Photos ({photos.length}/{MAX_PHOTOS})</Text>
      <View style={styles.photoRow}>
        {photos.map((p, i) => (
          <View key={p.assetId ?? p.uri} style={styles.thumbWrap}>
            <Image source={{ uri: p.uri }} style={styles.thumb} contentFit="cover" />
            <Pressable
              style={styles.thumbRemove}
              onPress={() => setPhotos((arr) => arr.filter((_, idx) => idx !== i))}>
              <Ionicons name="close" size={14} color="#fff" />
            </Pressable>
          </View>
        ))}
        {photos.length < MAX_PHOTOS ? (
          <Pressable style={styles.addPhoto} onPress={addPhotos}>
            <Ionicons name="camera-outline" size={24} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={{ height: space.xl }} />
      <Button title="Submit review" onPress={onSubmit} loading={submitting} />
      <Button title="Skip" onPress={done} variant="ghost" style={{ marginTop: space.sm }} />
      <View style={{ height: space.xl }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: font.sm, fontWeight: '700', color: colors.text, marginBottom: space.sm },
  pillRow: { flexDirection: 'row', gap: space.sm },
  pill: {
    flex: 1,
    paddingVertical: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  pillOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillText: { color: colors.text, fontWeight: '600', fontSize: font.sm },
  pillTextOn: { color: '#fff' },
  textArea: {
    minHeight: 100,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: space.md,
    fontSize: font.md,
    color: colors.text,
    backgroundColor: colors.surface,
    textAlignVertical: 'top',
  },
  counter: { alignSelf: 'flex-end', color: colors.textMuted, fontSize: font.xs, marginTop: space.xs },
  photoRow: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
  thumbWrap: { position: 'relative' },
  thumb: { width: 72, height: 72, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  thumbRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhoto: {
    width: 72,
    height: 72,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  error: { color: colors.danger, fontSize: font.sm, marginTop: space.md },
});
