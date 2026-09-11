import React, { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuthedApi } from '../../hooks/useAuthedApi';
import { downloadAndShare } from '../../utils/download';
import { Card, EmptyNote, ErrorView, LoadingView, SecondaryButton, SectionTitle, StatTile } from '../../components/ui';
import { colors, spacing } from '../../theme';
import { Debtor } from '../../types';
import { monthStartISO, todayISO } from '../../utils/format';

interface FinanceReport {
  income: string;
  charged: string;
}

export default function ReportsScreen() {
  const { request } = useAuthedApi();
  const [finance, setFinance] = useState<FinanceReport | null>(null);
  const [debtors, setDebtors] = useState<Debtor[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [debtorsLoading, setDebtorsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const monthStart = monthStartISO();
  const today = todayISO();

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await request<FinanceReport>(`/reports/finance?from=${monthStart}&to=${today}`);
      setFinance(res);
    } catch (err) {
      if (err instanceof Error && err.message !== 'unauthorized') setError(err.message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthStart, today]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const showDebtors = async () => {
    setDebtorsLoading(true);
    try {
      const res = await request<Debtor[]>('/reports/debt');
      setDebtors(res);
    } catch (err) {
      if (err instanceof Error && err.message !== 'unauthorized') Alert.alert('Ошибка', err.message);
    } finally {
      setDebtorsLoading(false);
    }
  };

  const download = async (path: string, filename: string) => {
    try {
      await downloadAndShare(path, filename);
    } catch (err) {
      if (err instanceof Error && err.message !== 'unauthorized') Alert.alert('Ошибка', err.message);
    }
  };

  if (loading) return <LoadingView />;
  if (error) return <ErrorView message={error} />;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <SectionTitle>Отчёты</SectionTitle>

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Финансовый отчёт</Text>
        {finance && (
          <View style={styles.statsGrid}>
            <StatTile value={`${finance.income} сом`} label="Доходы" />
            <StatTile value={`${finance.charged} сом`} label="Начислено" />
          </View>
        )}
      </Card>

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Должники</Text>
        <View style={styles.actionRow}>
          <SecondaryButton small title="Показать" onPress={showDebtors} disabled={debtorsLoading} />
          <SecondaryButton small title="Скачать CSV" onPress={() => download('/reports/debt?format=csv', 'debt.csv')} />
        </View>
        {debtors && (
          debtors.length === 0 ? (
            <EmptyNote>Должников нет</EmptyNote>
          ) : (
            debtors.map((d, i) => (
              <View key={d.childId} style={[styles.row, i > 0 && styles.rowBorder]}>
                <Text style={styles.rowTitle}>{d.fullName}</Text>
                <Text style={styles.rowDebt}>{d.debt} сом</Text>
              </View>
            ))
          )
        )}
      </Card>

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Посещаемость за месяц</Text>
        <SecondaryButton
          small
          title="Скачать CSV"
          onPress={() => download(`/reports/attendance?from=${monthStart}&to=${today}&format=csv`, 'attendance.csv')}
        />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingBottom: spacing.xl * 2, gap: spacing.md },
  card: { gap: spacing.sm },
  cardTitle: { fontSize: 14, fontWeight: '700', color: colors.ink },
  actionRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  rowTitle: { fontSize: 13.5, color: colors.ink },
  rowDebt: { fontSize: 13.5, fontWeight: '700', color: colors.danger },
});
