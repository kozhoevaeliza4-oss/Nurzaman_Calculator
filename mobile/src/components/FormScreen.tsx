import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { PrimaryButton, SecondaryButton } from './ui';
import { colors, spacing } from '../theme';

// Shared shell for every "add/edit X" screen pushed as a modal: title,
// scrollable field area, error banner, and a submit/cancel row pinned to
// the bottom. `onSubmit` throwing surfaces its message in the banner
// instead of leaving the screen to look like it silently did nothing.
export function FormScreen({
  title,
  children,
  onSubmit,
  onCancel,
  submitLabel = 'Сохранить',
  submitDisabled,
}: {
  title: string;
  children: React.ReactNode;
  onSubmit: () => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
  submitDisabled?: boolean;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{title}</Text>
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
        {children}
      </ScrollView>
      <View style={styles.actions}>
        <View style={styles.actionButton}>
          <SecondaryButton title="Отмена" onPress={onCancel} />
        </View>
        <View style={[styles.actionButton, { flex: 1.4 }]}>
          <PrimaryButton title={submitLabel} onPress={handleSubmit} loading={submitting} disabled={submitDisabled} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg },
  title: { fontSize: 19, fontWeight: '800', color: colors.ink, marginBottom: spacing.md },
  errorBox: { backgroundColor: colors.dangerSoft, borderRadius: 9, padding: 10, marginBottom: spacing.md },
  errorText: { color: colors.danger, fontSize: 13.5 },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  actionButton: { flex: 1 },
});
