import React, { useCallback, useState } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useAuthedApi } from '../../hooks/useAuthedApi';
import { Card, EmptyNote, ErrorView, LinkButton, LoadingView, SecondaryButton, SectionTitle } from '../../components/ui';
import { colors, MENU_EDIT_ROLES, MEAL_LABELS, spacing } from '../../theme';
import { MenuItem } from '../../types';
import { fmtDate } from '../../utils/format';
import { StaffStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<StaffStackParamList>;

function weekRange(): { from: string; to: string; days: string[] } {
  const now = new Date();
  const day = now.getDay() || 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - day + 1);
  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(d.toISOString().slice(0, 10));
  }
  return { from: days[0], to: days[6], days };
}

export default function MenuScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<Nav>();
  const { request } = useAuthedApi();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { from, to, days } = weekRange();

  const canEdit = user ? MENU_EDIT_ROLES.includes(user.role) : false;

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await request<MenuItem[]>(`/menu?from=${from}&to=${to}`);
      setItems(res);
    } catch (err) {
      if (err instanceof Error && err.message !== 'unauthorized') setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const deleteItem = (id: string) => {
    Alert.alert('Удалить блюдо?', undefined, [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: async () => {
          try {
            await request(`/menu/${id}`, { method: 'DELETE' });
            load();
          } catch (err) {
            if (err instanceof Error && err.message !== 'unauthorized') Alert.alert('Ошибка', err.message);
          }
        },
      },
    ]);
  };

  if (loading) return <LoadingView />;
  if (error) return <ErrorView message={`Не удалось загрузить меню: ${error}`} />;

  const byDate = new Map<string, MenuItem[]>();
  items.forEach((item) => {
    const key = item.date.slice(0, 10);
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push(item);
  });

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.accent} />}
    >
      <SectionTitle action={canEdit ? <SecondaryButton small title="+ Блюдо" onPress={() => navigation.navigate('AddMenuItem')} /> : undefined}>
        Меню на неделю
      </SectionTitle>
      {days.map((date) => {
        const dayItems = (byDate.get(date) ?? []).sort((a, b) => a.mealType.localeCompare(b.mealType));
        return (
          <Card key={date} style={styles.dayCard}>
            <Text style={styles.dayHead}>{fmtDate(date)}</Text>
            {dayItems.length === 0 ? (
              <EmptyNote>Меню не заполнено</EmptyNote>
            ) : (
              dayItems.map((item) => (
                <View key={item.id} style={styles.itemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.mealLabel}>{MEAL_LABELS[item.mealType] ?? item.mealType}</Text>
                    <Text style={styles.dishName}>
                      {item.dishName}
                      {item.allergens.length > 0 ? ` (${item.allergens.join(', ')})` : ''}
                    </Text>
                  </View>
                  {canEdit && <LinkButton title="Удалить" danger onPress={() => deleteItem(item.id)} />}
                </View>
              ))
            )}
          </Card>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingBottom: spacing.xl * 2 },
  dayCard: { marginBottom: spacing.sm },
  dayHead: { fontSize: 12, fontWeight: '700', color: colors.inkMuted, marginBottom: 8, textTransform: 'uppercase' },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 6, gap: 8 },
  mealLabel: { fontSize: 10.5, fontWeight: '700', color: colors.inkMuted, textTransform: 'uppercase' },
  dishName: { fontSize: 14, color: colors.ink, marginTop: 2 },
});
