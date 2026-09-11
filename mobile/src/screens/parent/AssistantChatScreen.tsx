import React, { useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuthedApi } from '../../hooks/useAuthedApi';
import { colors, spacing } from '../../theme';
import { PrimaryButton } from '../../components/ui';

interface ChatMessage {
  id: string;
  role: 'user' | 'bot' | 'error';
  text: string;
}

export default function AssistantChatScreen() {
  const { request } = useAuthedApi();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  const send = async () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    setMessages((prev) => [...prev, { id: `${Date.now()}-u`, role: 'user', text }]);
    setSending(true);
    try {
      const res = await request<{ reply: string }>('/assistant/chat', {
        method: 'POST',
        body: { message: text },
      });
      setMessages((prev) => [...prev, { id: `${Date.now()}-b`, role: 'bot', text: res.reply }]);
    } catch (err) {
      if (err instanceof Error && err.message !== 'unauthorized') {
        setMessages((prev) => [...prev, { id: `${Date.now()}-e`, role: 'error', text: `Ошибка: ${err.message}` }]);
      }
    } finally {
      setSending(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <Text style={styles.hint}>Спросите, например: «когда в следующий раз нужно оплатить?»</Text>
        }
        renderItem={({ item }) => (
          <View
            style={[
              styles.bubble,
              item.role === 'user' ? styles.bubbleUser : styles.bubbleBot,
              item.role === 'error' && styles.bubbleError,
            ]}
          >
            <Text style={[styles.bubbleText, item.role === 'user' && styles.bubbleTextUser]}>{item.text}</Text>
          </View>
        )}
      />
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Напишите вопрос…"
          placeholderTextColor={colors.inkMuted}
          onSubmitEditing={send}
        />
        <View style={styles.sendButton}>
          <PrimaryButton title="→" onPress={send} loading={sending} disabled={!input.trim()} />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  list: { padding: spacing.md, gap: 8, flexGrow: 1 },
  hint: { color: colors.inkMuted, fontSize: 13.5, textAlign: 'center', marginTop: spacing.xl },
  bubble: { maxWidth: '85%', borderRadius: 12, paddingVertical: 9, paddingHorizontal: 12 },
  bubbleUser: { alignSelf: 'flex-end', backgroundColor: colors.accentSoft },
  bubbleBot: { alignSelf: 'flex-start', backgroundColor: colors.surfaceAlt },
  bubbleError: { alignSelf: 'flex-start', backgroundColor: colors.dangerSoft },
  bubbleText: { fontSize: 14, color: colors.ink, lineHeight: 19 },
  bubbleTextUser: { color: colors.accentInk },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.ink,
  },
  sendButton: { width: 56 },
});
