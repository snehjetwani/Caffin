import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, font, radius, seededColor, space } from '@/theme';

/** Screen wrapper: safe-area, background, padding, optional scroll. */
export function Screen({
  children,
  scroll,
  padded = true,
  style,
}: {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  style?: ViewStyle;
}) {
  const inner = (
    <View style={[padded && { padding: space.lg }, { flexGrow: 1 }, style]}>{children}</View>
  );
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      {scroll ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}>
          {inner}
        </ScrollView>
      ) : (
        inner
      )}
    </SafeAreaView>
  );
}

export function Title({ children }: { children: ReactNode }) {
  return <Text style={styles.title}>{children}</Text>;
}

export function Subtitle({ children }: { children: ReactNode }) {
  return <Text style={styles.subtitle}>{children}</Text>;
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  icon,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: ViewStyle;
}) {
  const isDisabled = disabled || loading;
  const v = BUTTON_VARIANTS[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: v.bg, borderColor: v.border },
        pressed && !isDisabled && { opacity: 0.85 },
        isDisabled && { opacity: 0.5 },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <View style={styles.buttonInner}>
          {icon && <Ionicons name={icon} size={18} color={v.fg} />}
          <Text style={[styles.buttonText, { color: v.fg }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

const BUTTON_VARIANTS: Record<ButtonVariant, { bg: string; fg: string; border: string }> = {
  primary: { bg: colors.primary, fg: colors.primaryText, border: colors.primary },
  secondary: { bg: colors.surface, fg: colors.primary, border: colors.border },
  ghost: { bg: 'transparent', fg: colors.primary, border: 'transparent' },
  danger: { bg: colors.danger, fg: '#fff', border: colors.danger },
};

export function TextField({
  label,
  error,
  style,
  ...props
}: TextInputProps & { label?: string; error?: string | null }) {
  return (
    <View style={{ marginBottom: space.md }}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        placeholderTextColor={colors.textMuted}
        style={[styles.input, error ? { borderColor: colors.danger } : null, style]}
        {...props}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

export function Avatar({
  first,
  last,
  seed,
  size = 44,
}: {
  first?: string | null;
  last?: string | null;
  seed?: string;
  size?: number;
}) {
  const a = (first ?? '').trim();
  const b = (last ?? '').trim();
  const text = ((a ? a[0] : '') + (b ? b[0] : '')).toUpperCase() || '?';
  const bg = seededColor(seed || `${a}${b}` || '?');
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: size * 0.4 }}>{text}</Text>
    </View>
  );
}

/** Star rating. Read-only unless `onChange` is given. */
export function Stars({
  value,
  onChange,
  size = 18,
}: {
  value: number;
  onChange?: (n: number) => void;
  size?: number;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= value;
        const star = (
          <Ionicons
            name={filled ? 'star' : 'star-outline'}
            size={size}
            color={filled ? colors.star : colors.textMuted}
          />
        );
        return onChange ? (
          <Pressable key={n} onPress={() => onChange(n)} hitSlop={6}>
            {star}
          </Pressable>
        ) : (
          <View key={n}>{star}</View>
        );
      })}
    </View>
  );
}

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'accent' }) {
  const bg = tone === 'accent' ? colors.surfaceAlt : colors.surfaceAlt;
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

export function Loading({ label }: { label?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.primary} />
      {label ? <Text style={[styles.subtitle, { marginTop: space.sm }]}>{label}</Text> : null}
    </View>
  );
}

export function EmptyState({
  icon = 'cafe-outline',
  title,
  subtitle,
  action,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.center}>
      <Ionicons name={icon} size={44} color={colors.textMuted} />
      <Text style={[styles.title, { fontSize: font.lg, marginTop: space.md }]}>{title}</Text>
      {subtitle ? (
        <Text style={[styles.subtitle, { textAlign: 'center', marginTop: space.xs }]}>
          {subtitle}
        </Text>
      ) : null}
      {action ? <View style={{ marginTop: space.lg }}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  title: { fontSize: font.xl, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: font.sm, color: colors.textMuted },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  button: {
    minHeight: 50,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.lg,
  },
  buttonInner: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  buttonText: { fontSize: font.md, fontWeight: '700' },
  label: { fontSize: font.sm, fontWeight: '600', color: colors.text, marginBottom: space.xs },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
    fontSize: font.md,
    color: colors.text,
  },
  errorText: { color: colors.danger, fontSize: font.xs, marginTop: space.xs },
  badge: {
    paddingHorizontal: space.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  badgeText: { fontSize: font.xs, color: colors.text, fontWeight: '600' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: space.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl },
});
