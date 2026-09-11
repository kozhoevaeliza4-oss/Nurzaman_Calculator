import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { api, ApiError, API_URL, getToken } from '../../api/client';
import { Card, SectionTitle, Badge, EmptyNote } from '../../components/ui';
import { colors } from '../../theme/colors';
import { MEAL_LABELS, fmtDate, fmtDateTime } from '../../theme/labels';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

type ChildDashboard = {
  childId: string;
  fullName: string;
  allergies: string[];
  relationType: string;
  balance: { charged: string; paid: string; debt: string };
  recentAttendance: { eventType: 'check_in' | 'check_out'; occurredAt: string }[];
};

type DashboardResponse = {
  children: ChildDashboard[];
  todayMenu: { mealType: string; dishName: string }[];
  notifications: { message: string; createdAt: string }[];
};

type DocMeta = { id: string; fileName: string; type: string };

export default function DashboardScreen() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [docs, setDocs] = useState<Record<string, DocMeta[]>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api<DashboardResponse>('/me/dashboard');
      setData(res);
      const docsEntries = await Promise.all(
        res.children.map(async (c) => {
          try {
            const list = await api<DocMeta[]>(`/documents/me/children/${c.childId}`);
            return [c.childId, list] as const;
          } catch {
            return [c.childId, []] as const;
          }
        }),
      );
      setDocs(Object.fromEntries(docsEntries));
    } catch (e: any) {
      if (e instanceof ApiError && e.status === 401) return;
      setError(e.message || 'Не удалось загрузить данные');
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const downloadDoc = async (docId: string, fileName: string) => {
    try {
      const token = await getToken();
      const destination = new File(Paths.cache, fileName);
      const file = await File.downloadFileAsync(`${API_URL}/documents/${docId}/download`, destination, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        idempotent: true,
      });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri);
      }
    } catch (e) {
      // Silently ignored — a failed download isn't worth a blocking alert here.
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!data || data.children.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>К вашему аккаунту пока не привязан ни один ребёнок.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
    >
      {data.children.map((child) => {
        const lastEvent = child.recentAttendance[0];
        const childDocs = docs[child.childId] || [];
        return (
          <Card key={child.childId} style={styles.childCard}>
            <View style={styles.childHead}>
              <Text style={styles.childName}>{child.fullName}</Text>
              {child.allergies.length > 0 && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                  {child.allergies.map((a) => (
                    <Badge key={a} tone="danger">
                      {a}
                    </Badge>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.balanceRow}>
              <View style={styles.balanceCell}>
                <Text style={styles.balanceValue}>{child.balance.charged} сом</Text>
                <Text style={styles.balanceLabel}>Начислено</Text>
              </View>
              <View style={styles.balanceCell}>
                <Text style={styles.balanceValue}>{child.balance.paid} сом</Text>
                <Text style={styles.balanceLabel}>Оплачено</Text>
              </View>
              <View style={styles.balanceCell}>
                <Text style={[styles.balanceValue, Number(child.balance.debt) > 0 && { color: colors.danger }]}>
                  {child.balance.debt} сом
                </Text>
                <Text style={styles.balanceLabel}>Задолженность</Text>
              </View>
            </View>

            <SectionTitle>Посещаемость</SectionTitle>
            <Text style={styles.plainLine}>
              {lastEvent
                ? `${lastEvent.eventType === 'check_in' ? 'Пришёл' : 'Ушёл'} · ${fmtDateTime(lastEvent.occurredAt)}`
                : 'Сегодня отметок ещё нет'}
            </Text>

            <SectionTitle>Меню сегодня</SectionTitle>
            {data.todayMenu.length > 0 ? (
              data.todayMenu.map((m, i) => (
                <View key={i} style={styles.menuLine}>
                  <Text style={styles.menuMeal}>{MEAL_LABELS[m.mealType] || m.mealType}</Text>
                  <Text style={styles.menuDish}>{m.dishName}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.plainLine}>Меню на сегодня ещё не опубликовано</Text>
            )}

            <SectionTitle>Документы</SectionTitle>
            {childDocs.length > 0 ? (
              childDocs.map((d) => (
                <View key={d.id} style={styles.docLine}>
                  <Text style={styles.docName} numberOfLines={1}>
                    {d.fileName}
                  </Text>
                  <Text style={styles.docLink} onPress={() => downloadDoc(d.id, d.fileName)}>
                    скачать
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.plainLine}>Документов пока нет</Text>
            )}
          </Card>
        );
      })}

      <Card>
        <SectionTitle>Уведомления</SectionTitle>
        {data.notifications.length > 0 ? (
          data.notifications.slice(0, 8).map((n, i) => (
            <View key={i} style={styles.notifLine}>
              <Text style={styles.notifMessage}>{n.message}</Text>
              <Text style={styles.notifDate}>{fmtDateTime(n.createdAt)}</Text>
            </View>
          ))
        ) : (
          <EmptyNote>Пока нет уведомлений</EmptyNote>
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 14 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg, padding: 24 },
  errorText: { color: colors.danger, fontSize: 14, textAlign: 'center' },
  childCard: { gap: 4 },
  childHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, flexWrap: 'wrap', gap: 6 },
  childName: { fontSize: 17, fontWeight: '800', color: colors.ink },
  balanceRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  balanceCell: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 10,
    padding: 10,
  },
  balanceValue: { fontSize: 14, fontWeight: '700', color: colors.ink },
  balanceLabel: { fontSize: 10.5, color: colors.inkMuted, marginTop: 2 },
  plainLine: { fontSize: 13.5, color: colors.ink, marginBottom: 12 },
  menuLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuMeal: { fontSize: 11, color: colors.inkMuted, textTransform: 'uppercase', fontWeight: '700' },
  menuDish: { fontSize: 13.5, color: colors.ink, flexShrink: 1, textAlign: 'right' },
  docLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 8,
  },
  docName: { flex: 1, fontSize: 13.5, color: colors.ink },
  docLink: { color: colors.accentInk, fontWeight: '700', fontSize: 12.5 },
  notifLine: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  notifMessage: { fontSize: 13.5, color: colors.ink },
  notifDate: { fontSize: 11, color: colors.inkMuted, marginTop: 3 },
});
