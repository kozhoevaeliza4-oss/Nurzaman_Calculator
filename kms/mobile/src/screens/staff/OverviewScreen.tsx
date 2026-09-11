import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { api, ApiError } from '../../api/client';
import { useAuth } from '../../api/AuthContext';
import { Card, SectionTitle, Badge, StatTile } from '../../components/ui';
import { colors } from '../../theme/colors';
import { STATUS_LABELS, fmtDate } from '../../theme/labels';
import { StaffStackParamList } from '../../navigation/StaffStack';

type Group = { id: string; name: string; capacity: number };
type Child = {
  id: string;
  fullName: string;
  dateOfBirth: string;
  groupId: string | null;
  status: string;
  allergies: string[];
};
type DashboardSummary = {
  income: string;
  expenses: string;
  profit: string;
  debt: { total: string; debtorCount: number };
  attendance: { present: number; total: number };
  freeSpots: { groupId: string; freeSpots: number }[];
};

export default function OverviewScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<StaffStackParamList>>();
  const canSeeDashboard = user?.role === 'director' || user?.role === 'admin';

  const [groups, setGroups] = useState<Group[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const monthStart = today.slice(0, 8) + '01';
      const [groupsRes, childrenRes, summaryRes] = await Promise.all([
        api<Group[]>('/groups'),
        api<{ items: Child[]; total: number }>('/children?pageSize=100'),
        canSeeDashboard
          ? api<DashboardSummary>(`/dashboard/summary?from=${monthStart}&to=${today}`).catch(() => null)
          : Promise.resolve(null),
      ]);
      setGroups(groupsRes);
      setChildren(childrenRes.items);
      setSummary(summaryRes);
    } catch (e: any) {
      if (e instanceof ApiError && e.status === 401) return;
      setError(e.message || 'Не удалось загрузить данные');
    }
  }, [canSeeDashboard]);

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

  const groupName = (id: string | null) => groups.find((g) => g.id === id)?.name || '—';

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

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
    >
      {summary && (
        <View>
          <SectionTitle>Сводка за месяц</SectionTitle>
          <View style={styles.statsGrid}>
            <StatTile value={`${summary.income} сом`} label="Доходы" />
            <StatTile value={`${summary.profit} сом`} label="Прибыль" />
            <StatTile
              value={`${summary.debt.total} сом`}
              label={`Задолженность (${summary.debt.debtorCount})`}
            />
            <StatTile value={`${summary.attendance.present}/${summary.attendance.total}`} label="Присутствует" />
          </View>
        </View>
      )}

      <View>
        <SectionTitle>Группы ({groups.length})</SectionTitle>
        <Card>
          {groups.length === 0 ? (
            <Text style={styles.emptyText}>Групп пока нет</Text>
          ) : (
            groups.map((g, i) => (
              <View key={g.id} style={[styles.groupRow, i === groups.length - 1 && { borderBottomWidth: 0 }]}>
                <Text style={styles.groupName}>{g.name}</Text>
                <Text style={styles.groupCap}>{g.capacity} мест</Text>
              </View>
            ))
          )}
        </Card>
      </View>

      <View>
        <SectionTitle>Дети ({children.length})</SectionTitle>
        <Card style={{ padding: 0 }}>
          {children.length === 0 ? (
            <Text style={[styles.emptyText, { padding: 16 }]}>Пока нет ни одного ребёнка</Text>
          ) : (
            children.map((c, i) => (
              <Pressable
                key={c.id}
                style={[styles.childRow, i === children.length - 1 && { borderBottomWidth: 0 }]}
                onPress={() => navigation.navigate('ChildDetail', { childId: c.id, fullName: c.fullName })}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.childName}>{c.fullName}</Text>
                  <Text style={styles.childMeta}>
                    {groupName(c.groupId)} · {fmtDate(c.dateOfBirth)}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Badge tone={c.status === 'active' ? 'success' : 'neutral'}>
                    {STATUS_LABELS[c.status] || c.status}
                  </Badge>
                  {c.allergies.length > 0 && <Badge tone="danger">{c.allergies.join(', ')}</Badge>}
                </View>
              </Pressable>
            ))
          )}
        </Card>
        <Text style={styles.hint}>Нажмите на ребёнка, чтобы открыть карточку</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg, padding: 24 },
  errorText: { color: colors.danger, fontSize: 14, textAlign: 'center' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  groupRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  groupName: { fontSize: 14, color: colors.ink, fontWeight: '600' },
  groupCap: { fontSize: 13, color: colors.inkMuted },
  emptyText: { fontSize: 13.5, color: colors.inkMuted, textAlign: 'center' },
  childRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 8,
  },
  childName: { fontSize: 14.5, fontWeight: '700', color: colors.ink },
  childMeta: { fontSize: 12, color: colors.inkMuted, marginTop: 2 },
  hint: { fontSize: 11.5, color: colors.inkMuted, marginTop: 8, textAlign: 'center' },
});
