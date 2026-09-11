import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useAuth } from '../api/AuthContext';
import { colors } from '../theme/colors';
import { ROLE_LABELS } from '../theme/labels';
import { PrimaryButton, Card } from '../components/ui';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  if (!user) return null;

  return (
    <View style={styles.screen}>
      <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
      <Card style={styles.card}>
        <Text style={styles.name}>{user.fullName}</Text>
        <Text style={styles.role}>{ROLE_LABELS[user.role] || user.role}</Text>
        <Text style={styles.email}>{user.email}</Text>
      </Card>
      <PrimaryButton title="Выйти" onPress={signOut} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, padding: 20, gap: 20, justifyContent: 'center' },
  logo: { width: 72, height: 76, alignSelf: 'center', marginBottom: 8 },
  card: { alignItems: 'center', gap: 4 },
  name: { fontSize: 18, fontWeight: '800', color: colors.ink },
  role: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.accentInk,
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    marginTop: 4,
    overflow: 'hidden',
  },
  email: { fontSize: 13, color: colors.inkMuted, marginTop: 8 },
});
