import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useAuthedApi } from '../../hooks/useAuthedApi';
import { Badge, Card, LoadingView, ErrorView, LinkButton, SectionTitle } from '../../components/ui';
import { colors, MEAL_LABELS, spacing } from '../../theme';
import { fmtDateTime } from '../../utils/format';
import { downloadAndShare } from '../../utils/download';

interface Balance {
  charged: string;
  paid: string;
  debt: string;
}
interface AttendanceRecord {
  eventType: 'check_in' | 'check_out';
  occurredAt: string;
}
interface ChildCard {
  childId: string;
  fullName: string;
  allergies: string[];
  balance: Balance;
  recentAttendance: AttendanceRecord[];
}
interface MenuItem {
  mealType: string;
  dishName: string;
}
interface NotificationItem {
  message: string;
  createdAt: string;
}
interface DashboardData {
  children: ChildCard[];
  todayMenu: MenuItem[];
  notifications: NotificationItem[];
}
interface DocItem {
  id: string;
  fileName: string;
}

export default function ParentDashboardScreen() {
  const { request } = useAuthedApi();
  const [data, setData] = useState<DashboardData | null>(null);
  const [docsByChild, setDocsByChild] = useState<Record<string, DocItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const dashboard = await request<DashboardData>('/me/dashboard');
      setData(dashboard);
      const docsEntries = await Promise.all(
        dashboard.children.map(async (c) => {
          try {
            const docs = await request<DocItem[]>(`/documents/me/children/${c.childId}`);
            return [c.childId, docs] as const;
          } catch {
            return [c.childId, []] as const;
          }
        }),
      );
      setDocsByChild(Object.fromEntries(docsEntries));
    } catch (err) {
      if (err instanceof Error && err.message !== 'unauthorized') setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [request]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  if (loading) return <LoadingView />;
  if (error) return <ErrorView message={`Не удалось загрузить данные: ${error}`} />;
  if (!data || data.children.length === 0) {
    return <ErrorView message="К вашему аккаунту пока не привязан ни один ребёнок." />;
  }

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.content}
      data={data.children}
      keyExtractor={(c) => c.childId}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      renderItem={({ item: child }) => {
        const lastEvent = child.recentAttendance[0];
        const docs = docsByChild[child.childId] ?? [];
        return (
          <Card style={styles.card}>
            <View style={styles.head}>
              <Text style={styles.name}>{child.fullName}</Text>
              {child.allergies.length > 0 && (
                <View style={styles.allergyRow}>
                  {child.allergies.map((a) => (
                    <Badge key={a} tone="danger">
                      {a}
                    </Badge>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.balanceRow}>
              <BalanceCell label="Начислено" value={`${child.balance.charged} сом`} />
              <BalanceCell label="Оплачено" value={`${child.balance.paid} сом`} />
              <BalanceCell
                label="Задолженность"
                value={`${child.balance.debt} сом`}
                danger={Number(child.balance.debt) > 0}
              />
            </View>

            <SectionTitle>Посещаемость</SectionTitle>
            <Text style={styles.rowText}>
              {lastEvent
                ? `${lastEvent.eventType === 'check_in' ? 'Пришёл' : 'Ушёл'} · ${fmtDateTime(lastEvent.occurredAt)}`
                : 'Сегодня отметок ещё нет'}
            </Text>

            <SectionTitle>Меню сегодня</SectionTitle>
            {data.todayMenu.length ? (
              data.todayMenu.map((m, i) => (
                <Text key={i} style={styles.rowText}>
                  {MEAL_LABELS[m.mealType] || m.mealType}: {m.dishName}
                </Text>
              ))
            ) : (
              <Text style={styles.rowText}>Меню на сегодня ещё не опубликовано</Text>
            )}

            <SectionTitle>Документы</SectionTitle>
            {docs.length ? (
              docs.map((d) => (
                <View key={d.id} style={styles.docRow}>
                  <Text style={[styles.rowText, styles.docName]} numberOfLines={1}>
                    {d.fileName}
                  </Text>
                  <LinkButton
                    title="Скачать"
                    onPress={() =>
                      downloadAndShare(`/documents/${d.id}/download`, d.fileName).catch(() => undefined)
                    }
                  />
                </View>
              ))
            ) : (
              <Text style={styles.rowText}>Документов пока нет</Text>
            )}

            <SectionTitle>Уведомления</SectionTitle>
            {data.notifications.length ? (
              data.notifications.slice(0, 5).map((n, i) => (
                <Text key={i} style={styles.rowText}>
                  {n.message}
                </Text>
              ))
            ) : (
              <Text style={styles.rowText}>Пока нет уведомлений</Text>
            )}
          </Card>
        );
      }}
    />
  );
}

function BalanceCell({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <View style={styles.balanceCell}>
      <Text style={[styles.balanceValue, danger && { color: colors.danger }]}>{value}</Text>
      <Text style={styles.balanceLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, gap: spacing.md },
  card: { gap: 4 },
  head: { marginBottom: spacing.sm },
  name: { fontSize: 17, fontWeight: '800', color: colors.ink },
  allergyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  balanceRow: {
    flexDirection: 'row',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  balanceCell: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  balanceValue: { fontWeight: '700', fontSize: 14, color: colors.ink },
  balanceLabel: { fontSize: 10.5, color: colors.inkMuted, marginTop: 2 },
  rowText: { fontSize: 13.5, color: colors.ink, paddingVertical: 3 },
  docRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 3 },
  docName: { flex: 1, marginRight: 8 },
});
