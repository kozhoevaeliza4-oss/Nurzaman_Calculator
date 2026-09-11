import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useAuth } from '../api/AuthContext';
import { colors } from '../theme/colors';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
    } catch (e: any) {
      setError(e.message || 'Не удалось войти');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
        <Text style={styles.title}>Асыл-Аманат</Text>
        <Text style={styles.subtitle}>ДЕТСКИЙ САД</Text>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder="director@asyl-amanat.kg"
            placeholderTextColor={colors.inkMuted}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Пароль</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
            placeholderTextColor={colors.inkMuted}
          />
        </View>

        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={onSubmit}
          disabled={submitting}
        >
          {submitting ? <ActivityIndicator color={colors.ink} /> : <Text style={styles.buttonText}>Войти</Text>}
        </Pressable>

        <Text style={styles.hint}>
          Логин выдаёт директор или администратор сада
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 28 },
  logo: { width: 88, height: 92, alignSelf: 'center', marginBottom: 12 },
  title: { fontSize: 24, fontWeight: '800', color: colors.ink, textAlign: 'center' },
  subtitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.inkMuted,
    textAlign: 'center',
    letterSpacing: 1.5,
    marginTop: 2,
    marginBottom: 28,
  },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: colors.ink, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.ink,
    backgroundColor: colors.surface,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  buttonPressed: { opacity: 0.85 },
  buttonText: { color: colors.ink, fontWeight: '700', fontSize: 15.5 },
  errorBox: {
    backgroundColor: colors.dangerSoft,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorText: { color: colors.danger, fontSize: 13.5 },
  hint: { textAlign: 'center', color: colors.inkMuted, fontSize: 12, marginTop: 22, lineHeight: 18 },
});
