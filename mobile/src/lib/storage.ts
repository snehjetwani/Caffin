import { decode } from 'base64-arraybuffer';
import * as ImagePicker from 'expo-image-picker';

import { supabase } from './supabase';

export const REVIEW_PHOTO_BUCKET = 'review-photos';

/**
 * Upload a picked image (base64) to Supabase Storage and return its public URL.
 * Requires a public bucket named `review-photos` with an insert policy for
 * authenticated users (see mobile/README or CONTEXT.md for the SQL).
 */
export async function uploadReviewPhoto(
  asset: ImagePicker.ImagePickerAsset,
  userId: string,
): Promise<string> {
  if (!asset.base64) throw new Error('Image has no data');
  const ext = (asset.uri.split('.').pop() || 'jpg').toLowerCase().split('?')[0];
  const contentType = asset.mimeType ?? (ext === 'png' ? 'image/png' : 'image/jpeg');
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabase.storage
    .from(REVIEW_PHOTO_BUCKET)
    .upload(path, decode(asset.base64), { contentType, upsert: false });
  if (error) throw error;

  const { data } = supabase.storage.from(REVIEW_PHOTO_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/** Launch the picker (library), up to `remaining` photos, with base64 for upload. */
export async function pickReviewPhotos(
  remaining: number,
): Promise<ImagePicker.ImagePickerAsset[]> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) throw new Error('Photo library permission denied');
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: remaining,
    quality: 0.6,
    base64: true,
  });
  if (result.canceled) return [];
  return result.assets.slice(0, remaining);
}
