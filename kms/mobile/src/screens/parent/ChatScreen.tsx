import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { api } from '../../api/client';
import { colors } from '../../theme/colors';

type Msg = { id: string; role: 'user' | 'bot' | 'error'; text: string };

export default function ChatScreen() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: 'welcome',
      role: 'bot',
      text: 'Здравствуйте! Спросите про баланс, меню, посещаемость или что-то ещё о вашем ребёнке.',
    },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    const userMsg: Msg = { id: `${Date.now()}-u`, role: 'user', text };
    setMessages((prev) => [...prev, userMsg]);
    setSending(true);
    try {
      const res = await api<{ reply: string }>('/assistant/chat', { method: 'POST', body: { message: text } });
      setMessages((prev) => [...prev, { id: `${Date.now()}-b`, role: 'bot', text: res.reply }]);
    } catch (e: any) {
      setMessages((prev) => [...prev, { id: `${Date.now()}-e`, role: 'error', text: `Ошибка: ${e.message}` }]);
    } finally {
      setSending(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => (
          <View
            style={[
              styles.bubble,
              item.role === 'user' ? styles.bubbleUser : styles.bubbleBot,
              item.role === 'error' && styles.bubbleError,
            ]}
          >
            <Text style={item.role === 'user' ? styles.bubbleTextUser : styles.bubbleTextBot}>{item.text}</Text>
          </View>
        )}
      />
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Например: когда нужно оплатить?"
          placeholderTextColor={colors.inkMuted}
          onSubmitEditing={send}
          returnKeyType="send"
        />
        <Pressable style={styles.sendButton} onPress={send} disabled={sending}>
          {sending ? <ActivityIndicator color={colors.ink} size="small" /> : <Text style={styles.sendText}>→</Text>}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  list: { padding: 16, gap: 8 },
  bubble: { maxWidth: '82%', borderRadius: 12, paddingVertical: 9, paddingHorizontal: 13, marginBottom: 8 },
  bubbleUser: { alignSelf: 'flex-end', backgroundColor: colors.accentSoft },
  bubbleBot: { alignSelf: 'flex-start', backgroundColor: colors.surfaceAlt },
  bubbleError: { backgroundColor: colors.dangerSoft },
  bubbleTextUser: { color: colors.accentInk, fontSize: 14.5 },
  bubbleTextBot: { color: colors.ink, fontSize: 14.5 },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14.5,
    color: colors.ink,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendText: { fontSize: 18, fontWeight: '800', color: colors.ink },
});
