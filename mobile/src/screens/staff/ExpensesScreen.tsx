import React, { useCallback, useState } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useAuthedApi } from '../../hooks/useAuthedApi';
import { Card, EmptyNote, ErrorView, LoadingView, SecondaryButton, SectionTitle } from '../../components/ui';
import { colors, spacing } from '../../theme';
import { PlanVsFactRow } from '../../types';
import { currentPeriod } from '../../utils/format';
import { StaffStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<StaffStackParamList>;

export default function ExpensesScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<Nav>();
  const { request } = useAuthedApi();
  const [rows, setRows] = useState<PlanVsFactRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const period = currentPeriod();
  const canCreateCategory = user?.role === 'director' || user?.role === 'admin';

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await request<PlanVsFactRow[]>(`/expenses/plan-vs-fact?period=${period}`);
      setRows(res);
    } catch (err) {
      if (err instanceof Error && err.message !== 'unauthorized') setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (loading) return <LoadingView />;
  if (error) return <ErrorView message={`Не удалось загрузить расходы: ${error}`} />;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.accent} />}
    >
      <SectionTitle
        action={
          <View style={styles.actionRow}>
            {canCreateCategory && <SecondaryButton small title="+ Категория" onPress={() => navigation.navigate('AddCategory')} />}
            <SecondaryButton small title="План" onPress={() => navigation.navigate('SetPlan')} />
            <SecondaryButton small title="+ Расход" onPress={() => navigation.navigate('AddFact')} />
          </View>
        }
      >
        {`Расходы за ${period}`}
      </SectionTitle>
      <Card>
        {rows.length === 0 ? (
          <EmptyNote>Категорий расходов пока нет</EmptyNote>
        ) : (
          rows.map((r, i) => (
            <View key={r.categoryId} style={[styles.row, i > 0 && styles.rowBorder]}>
              <Text style={styles.rowTitle}>{r.categoryName}</Text>
              <View style={styles.rowNumbers}>
                <Text style={styles.rowMuted}>План: {r.planned} сом</Text>
                <Text style={styles.rowMuted}>Факт: {r.actual} сом</Text>
                <Text style={[styles.rowMuted, Number(r.deviation) > 0 && { color: colors.danger }]}>
                  Откл.: {r.deviation} сом
                </Text>
              </View>
            </View>
          ))
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingBottom: spacing.xl * 2 },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-end' },
  row: { paddingVertical: 10 },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  rowTitle: { fontSize: 14, fontWeight: '600', color: colors.ink },
  rowNumbers: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 },
  rowMuted: { fontSize: 12, color: colors.inkMuted },
});
