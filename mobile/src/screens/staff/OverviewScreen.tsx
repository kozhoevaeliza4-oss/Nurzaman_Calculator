import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useAuthedApi } from '../../hooks/useAuthedApi';
import { Badge, Card, EmptyNote, ErrorView, Field, LoadingView, SecondaryButton, SectionTitle, StatTile } from '../../components/ui';
import { ATTENDANCE_SCAN_ROLES, colors, spacing, STATUS_LABELS, CAN_MANAGE_ROLES } from '../../theme';
import { StaffStackParamList } from '../../navigation/types';
import { Child, DashboardSummary, Group, Paginated, Parent } from '../../types';
import { fmtDate, monthStartISO, todayISO } from '../../utils/format';

type Nav = NativeStackNavigationProp<StaffStackParamList>;

export default function OverviewScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<Nav>();
  const { request } = useAuthedApi();

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [parents, setParents] = useState<Parent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const canManage = user ? CAN_MANAGE_ROLES.includes(user.role) : false;
  const canSeeDashboard = user?.role === 'director' || user?.role === 'admin';

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [search]);

  const load = useCallback(async () => {
    try {
      setError(null);
      const today = todayISO();
      const monthStart = monthStartISO();
      const searchParam = debouncedSearch ? `&search=${encodeURIComponent(debouncedSearch)}` : '';
      const [summaryRes, childrenRes, groupsRes, parentsRes] = await Promise.all([
        canSeeDashboard ? request<DashboardSummary>(`/dashboard/summary?from=${monthStart}&to=${today}`) : Promise.resolve(null),
        request<Paginated<Child>>(`/children?pageSize=50${searchParam}`),
        request<Group[]>('/groups'),
        canManage ? request<Paginated<Parent>>('/parents?pageSize=50') : Promise.resolve(null),
      ]);
      setSummary(summaryRes);
      setChildren(childrenRes.items);
      setGroups(groupsRes);
      setParents(parentsRes?.items ?? []);
    } catch (err) {
      if (err instanceof Error && err.message !== 'unauthorized') setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManage, canSeeDashboard, debouncedSearch]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  if (loading) return <LoadingView />;
  if (error) return <ErrorView message={`Не удалось загрузить данные: ${error}`} />;

  const groupNameById = new Map(groups.map((g) => [g.id, g.name]));

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
    >
      {user && ATTENDANCE_SCAN_ROLES.includes(user.role) && (
        <View style={styles.section}>
          <SecondaryButton title="📷 Сканировать QR ребёнка" onPress={() => navigation.navigate('Scanner')} />
        </View>
      )}

      {summary && (
        <View style={styles.section}>
          <SectionTitle>Сводка за месяц</SectionTitle>
          <View style={styles.statsGrid}>
            <StatTile value={`${summary.income} сом`} label="Доходы" />
            <StatTile value={`${summary.expenses} сом`} label="Расходы" />
            <StatTile value={`${summary.profit} сом`} label="Прибыль" />
            <StatTile value={`${summary.debt.total} сом`} label={`Задолженность (${summary.debt.debtorCount})`} />
            <StatTile value={`${summary.attendance.present}/${summary.attendance.total}`} label="Присутствует" />
            <StatTile
              value={String(summary.freeSpots.reduce((s, g) => s + g.freeSpots, 0))}
              label="Своб. мест"
            />
          </View>
        </View>
      )}

      <View style={styles.section}>
        <SectionTitle
          action={canManage ? <SecondaryButton small title="+ Группа" onPress={() => navigation.navigate('AddGroup')} /> : undefined}
        >
          {`Группы (${groups.length})`}
        </SectionTitle>
        <Card>
          {groups.length === 0 ? (
            <EmptyNote>Групп пока нет</EmptyNote>
          ) : (
            groups.map((g, i) => (
              <View key={g.id} style={[styles.listRow, i > 0 && styles.listRowBorder]}>
                <Text style={styles.rowTitle}>{g.name}</Text>
                <Text style={styles.rowMuted}>{g.capacity} мест</Text>
              </View>
            ))
          )}
        </Card>
      </View>

      <View style={styles.section}>
        <SectionTitle
          action={canManage ? <SecondaryButton small title="+ Ребёнок" onPress={() => navigation.navigate('AddChild')} /> : undefined}
        >
          {`Дети (${children.length})`}
        </SectionTitle>
        <View style={{ marginBottom: spacing.sm }}>
          <Field label="Поиск" value={search} onChangeText={setSearch} placeholder="ФИО ребёнка…" />
        </View>
        <Card>
          {children.length === 0 ? (
            <EmptyNote>{debouncedSearch ? 'Ничего не найдено' : 'Пока нет ни одного ребёнка'}</EmptyNote>
          ) : (
            children.map((c, i) => (
              <Pressable
                key={c.id}
                onPress={() => navigation.navigate('ChildDetail', { childId: c.id })}
                style={({ pressed }) => [styles.listRow, i > 0 && styles.listRowBorder, pressed && styles.rowPressed]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{c.fullName}</Text>
                  <Text style={styles.rowMuted}>
                    {groupNameById.get(c.groupId ?? '') ?? 'без группы'} · {fmtDate(c.dateOfBirth)}
                  </Text>
                </View>
                <View style={styles.rowEnd}>
                  <Badge tone={c.status === 'active' ? 'success' : 'default'}>
                    {STATUS_LABELS[c.status] ?? c.status}
                  </Badge>
                  {c.allergies.length > 0 && <Badge tone="danger">{c.allergies[0]}</Badge>}
                </View>
              </Pressable>
            ))
          )}
        </Card>
      </View>

      {canManage && (
        <View style={styles.section}>
          <SectionTitle action={<SecondaryButton small title="+ Родитель" onPress={() => navigation.navigate('AddParent')} />}>
            {`Родители (${parents.length})`}
          </SectionTitle>
          <Card>
            {parents.length === 0 ? (
              <EmptyNote>Родителей пока нет</EmptyNote>
            ) : (
              parents.map((p, i) => (
                <View key={p.id} style={[styles.listRow, i > 0 && styles.listRowBorder]}>
                  <Text style={styles.rowTitle}>{p.fullName}</Text>
                  <Text style={styles.rowMuted}>{p.phone || p.email || '—'}</Text>
                </View>
              ))
            )}
          </Card>
        </View>
      )}

      {canManage && (
        <View style={styles.section}>
          <SectionTitle action={<SecondaryButton small title="+ Сотрудник" onPress={() => navigation.navigate('AddStaff')} />}>
            Сотрудники
          </SectionTitle>
          <Text style={styles.hint}>
            Заведите учётные записи для администратора, бухгалтера, воспитателя или медработника
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingBottom: spacing.xl * 2 },
  section: { marginBottom: spacing.lg },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  listRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  listRowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  rowPressed: { backgroundColor: colors.surfaceAlt },
  rowTitle: { fontSize: 14, fontWeight: '600', color: colors.ink },
  rowMuted: { fontSize: 12, color: colors.inkMuted, marginTop: 2 },
  rowEnd: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  hint: { fontSize: 12.5, color: colors.inkMuted, marginTop: 4 },
});
