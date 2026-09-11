import React from 'react';
import { View, Text, StyleSheet, Pressable, ViewStyle } from 'react-native';
import { colors } from '../theme/colors';

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode;
  tone?: 'neutral' | 'success' | 'danger' | 'warning';
}) {
  const toneStyles: Record<string, ViewStyle> = {
    neutral: { backgroundColor: colors.surfaceAlt },
    success: { backgroundColor: colors.successSoft },
    danger: { backgroundColor: colors.dangerSoft },
    warning: { backgroundColor: colors.warningSoft },
  };
  const toneTextColor: Record<string, string> = {
    neutral: colors.inkMuted,
    success: colors.success,
    danger: colors.danger,
    warning: colors.warning,
  };
  return (
    <View style={[styles.badge, toneStyles[tone]]}>
      <Text style={[styles.badgeText, { color: toneTextColor[tone] }]}>{children}</Text>
    </View>
  );
}

export function StatTile({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.statTile}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export function PrimaryButton({
  title,
  onPress,
  disabled,
  small,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  small?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.primaryButton,
        small && styles.primaryButtonSmall,
        disabled && styles.buttonDisabled,
        pressed && !disabled && styles.buttonPressed,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[styles.primaryButtonText, small && styles.primaryButtonTextSmall]}>{title}</Text>
    </Pressable>
  );
}

export function SecondaryButton({
  title,
  onPress,
  disabled,
  small,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  small?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.secondaryButton,
        small && styles.primaryButtonSmall,
        disabled && styles.buttonDisabled,
        pressed && !disabled && styles.buttonPressed,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[styles.secondaryButtonText, small && styles.primaryButtonTextSmall]}>{title}</Text>
    </Pressable>
  );
}

export function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.emptyNote}>
      <Text style={styles.emptyNoteText}>{children}</Text>
    </View>
  );
}

export function Row({ left, right }: { left: React.ReactNode; right?: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>{left}</View>
      {right ? <View>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.inkMuted,
    marginBottom: 10,
  },
  badge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  badgeText: { fontSize: 11.5, fontWeight: '700' },
  statTile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    minWidth: 100,
  },
  statValue: { fontSize: 18, fontWeight: '800', color: colors.ink },
  statLabel: { fontSize: 11, color: colors.inkMuted, marginTop: 3 },
  primaryButton: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 13,
    paddingHorizontal: 18,
    alignItems: 'center',
  },
  primaryButtonSmall: { paddingVertical: 9, paddingHorizontal: 13, borderRadius: 8 },
  primaryButtonText: { color: colors.ink, fontWeight: '700', fontSize: 14.5 },
  primaryButtonTextSmall: { fontSize: 12.5 },
  secondaryButton: {
    backgroundColor: colors.accentSoft,
    borderRadius: 10,
    paddingVertical: 13,
    paddingHorizontal: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.accent,
  },
  secondaryButtonText: { color: colors.accentInk, fontWeight: '700', fontSize: 14.5 },
  buttonDisabled: { opacity: 0.5 },
  buttonPressed: { opacity: 0.85 },
  emptyNote: { paddingVertical: 16, alignItems: 'center' },
  emptyNoteText: { color: colors.inkMuted, fontSize: 13.5 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
});
