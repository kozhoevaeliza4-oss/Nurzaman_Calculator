import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuthedApi } from '../../hooks/useAuthedApi';
import { PrimaryButton, SectionTitle } from '../../components/ui';
import { colors, spacing } from '../../theme';

export default function NotificationsScreen() {
  const { request } = useAuthedApi();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    setSending(true);
    setError(null);
    setResult(null);
    try {
      const res = await request<{ recipientCount: number }>('/notifications/broadcast', {
        method: 'POST',
        body: { message: message.trim() },
      });
      setResult(`Отправлено получателям: ${res.recipientCount}`);
      setMessage('');
    } catch (err) {
      if (err instanceof Error && err.message !== 'unauthorized') setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.screen}>
      <SectionTitle>Новости сада для родителей</SectionTitle>
      <Text style={styles.label}>Текст сообщения</Text>
      <TextInput
        style={styles.textarea}
        value={message}
        onChangeText={setMessage}
        placeholder="Например: завтра родительское собрание в 18:00"
        placeholderTextColor={colors.inkMuted}
        multiline
        numberOfLines={4}
      />
      <PrimaryButton title="Отправить всем родителям" onPress={send} loading={sending} disabled={!message.trim()} />
      {result ? <Text style={styles.result}>{result}</Text> : null}
      {error ? <Text style={styles.error}>Ошибка: {error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, padding: spacing.md },
  label: { fontSize: 13, fontWeight: '600', color: colors.ink, marginBottom: 6 },
  textarea: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 9,
    padding: 12,
    fontSize: 14.5,
    color: colors.ink,
    backgroundColor: colors.surface,
    minHeight: 110,
    textAlignVertical: 'top',
    marginBottom: spacing.md,
  },
  result: { marginTop: spacing.md, fontSize: 13, color: colors.inkMuted },
  error: { marginTop: spacing.md, fontSize: 13, color: colors.danger },
});
