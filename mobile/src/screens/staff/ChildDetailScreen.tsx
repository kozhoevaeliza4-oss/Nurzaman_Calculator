import React, { useCallback, useState } from 'react';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '../../context/AuthContext';
import { useAuthedApi } from '../../hooks/useAuthedApi';
import { API_BASE_URL, getToken } from '../../api';
import { downloadAndShare } from '../../utils/download';
import {
  Badge,
  Card,
  EmptyNote,
  ErrorView,
  LinkButton,
  LoadingView,
  SecondaryButton,
  SectionTitle,
  StatTile,
} from '../../components/ui';
import {
  ATTENDANCE_SCAN_ROLES,
  ATTENDANCE_VIEW_ROLES,
  CHARGE_TYPE_LABELS,
  colors,
  DOCS_EDIT_ROLES,
  DOCS_VIEW_ROLES,
  DOCUMENT_TYPE_LABELS,
  FINANCE_ROLES,
  PAYMENT_METHOD_LABELS,
  spacing,
  STATUS_LABELS,
} from '../../theme';
import { AttendanceRecord, Balance, Charge, Child, DocumentItem, Payment } from '../../types';
import { fmtDate, fmtDateTime } from '../../utils/format';
import { StaffStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<StaffStackParamList>;
type Route = RouteProp<StaffStackParamList, 'ChildDetail'>;

export default function ChildDetailScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { childId } = route.params;
  const { request, upload } = useAuthedApi();

  const [child, setChild] = useState<Child | null>(null);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [charges, setCharges] = useState<Charge[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const canFinance = user ? FINANCE_ROLES.includes(user.role) : false;
  const canDocsView = user ? DOCS_VIEW_ROLES.includes(user.role) : false;
  const canDocsEdit = user ? DOCS_EDIT_ROLES.includes(user.role) : false;
  const canAttendanceView = user ? ATTENDANCE_VIEW_ROLES.includes(user.role) : false;
  const canScan = user ? ATTENDANCE_SCAN_ROLES.includes(user.role) : false;

  const load = useCallback(async () => {
    try {
      setError(null);
      const childRes = await request<Child>(`/children/${childId}`);
      setChild(childRes);

      const [balanceRes, historyRes, attendanceRes, documentsRes] = await Promise.all([
        canFinance ? request<Balance>(`/finance/children/${childId}/balance`) : Promise.resolve(null),
        canFinance
          ? request<{ charges: Charge[]; payments: Payment[] }>(`/finance/children/${childId}/history`)
          : Promise.resolve(null),
        canAttendanceView ? request<AttendanceRecord[]>(`/attendance/children/${childId}/history`) : Promise.resolve(null),
        canDocsView ? request<DocumentItem[]>(`/documents/children/${childId}`) : Promise.resolve(null),
      ]);
      setBalance(balanceRes);
      setCharges(historyRes?.charges ?? []);
      setPayments(historyRes?.payments ?? []);
      setAttendance(attendanceRes ?? []);
      setDocuments(documentsRes ?? []);
    } catch (err) {
      if (err instanceof Error && err.message !== 'unauthorized') setError(err.message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childId, canFinance, canAttendanceView, canDocsView]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const scan = async () => {
    if (!child) return;
    try {
      const res = await request<{ eventType: 'check_in' | 'check_out' }>('/attendance/scan', {
        method: 'POST',
        body: { code: child.qrCode },
      });
      Alert.alert(res.eventType === 'check_in' ? 'Отмечен приход' : 'Отмечен уход');
      load();
    } catch (err) {
      if (err instanceof Error && err.message !== 'unauthorized') Alert.alert('Ошибка', err.message);
    }
  };

  const pickAndUpload = async () => {
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false });
    if (result.canceled || !result.assets?.[0]) return;
    const file = result.assets[0];
    setUploading(true);
    try {
      const token = await getToken();
      const form = new FormData();
      form.append('type', 'other');
      form.append('file', {
        uri: file.uri,
        name: file.name ?? 'document',
        type: file.mimeType ?? 'application/octet-stream',
      } as unknown as Blob);
      await upload(`/documents/children/${childId}`, form);
      load();
    } catch (err) {
      Alert.alert('Ошибка загрузки', err instanceof Error ? err.message : 'Не удалось загрузить файл');
    } finally {
      setUploading(false);
    }
  };

  const deleteDocument = (id: string) => {
    Alert.alert('Удалить документ?', undefined, [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: async () => {
          try {
            await request(`/documents/${id}`, { method: 'DELETE' });
            load();
          } catch (err) {
            if (err instanceof Error && err.message !== 'unauthorized') Alert.alert('Ошибка', err.message);
          }
        },
      },
    ]);
  };

  if (loading) return <LoadingView />;
  if (error || !child) return <ErrorView message={error ? `Не удалось загрузить: ${error}` : 'Ребёнок не найден'} />;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{child.fullName}</Text>
          <Text style={styles.subtitle}>
            Рождение: {fmtDate(child.dateOfBirth)} · Зачислен: {fmtDate(child.enrollmentDate)}
          </Text>
        </View>
        <Badge tone={child.status === 'active' ? 'success' : 'default'}>{STATUS_LABELS[child.status] ?? child.status}</Badge>
      </View>
      {child.allergies.length > 0 && (
        <View style={styles.allergyRow}>
          {child.allergies.map((a) => (
            <Badge key={a} tone="danger">
              {a}
            </Badge>
          ))}
        </View>
      )}

      {canFinance && balance && (
        <View style={styles.section}>
          <SectionTitle
            action={
              <View style={styles.actionRow}>
                <SecondaryButton small title="+ Начислить" onPress={() => navigation.navigate('AddCharge', { childId, childName: child.fullName })} />
                <SecondaryButton small title="+ Оплата" onPress={() => navigation.navigate('AddPayment', { childId, childName: child.fullName })} />
              </View>
            }
          >
            Финансы
          </SectionTitle>
          <View style={styles.statsGrid}>
            <StatTile value={`${balance.charged} сом`} label="Начислено" />
            <StatTile value={`${balance.paid} сом`} label="Оплачено" />
            <StatTile value={`${balance.debt} сом`} label="Задолженность" />
          </View>
          <Card style={{ marginTop: spacing.sm }}>
            <Text style={styles.miniTitle}>Начисления</Text>
            {charges.length === 0 ? (
              <EmptyNote>Нет начислений</EmptyNote>
            ) : (
              charges.map((c, i) => (
                <View key={c.id} style={[styles.listRow, i > 0 && styles.listRowBorder]}>
                  <Text style={styles.rowTitle}>{CHARGE_TYPE_LABELS[c.type] ?? c.type}</Text>
                  <Text style={styles.rowMuted}>
                    {fmtDate(c.dueDate)} · {c.amount} сом
                  </Text>
                </View>
              ))
            )}
          </Card>
          <Card style={{ marginTop: spacing.sm }}>
            <Text style={styles.miniTitle}>Оплаты</Text>
            {payments.length === 0 ? (
              <EmptyNote>Нет оплат</EmptyNote>
            ) : (
              payments.map((p, i) => (
                <View key={p.id} style={[styles.listRow, i > 0 && styles.listRowBorder]}>
                  <Text style={styles.rowTitle}>{PAYMENT_METHOD_LABELS[p.method] ?? p.method}</Text>
                  <Text style={styles.rowMuted}>
                    {fmtDate(p.paidAt)} · {p.amount} сом
                  </Text>
                </View>
              ))
            )}
          </Card>
        </View>
      )}

      {canAttendanceView && (
        <View style={styles.section}>
          <SectionTitle
            action={canScan ? <SecondaryButton small title="Отметить сейчас" onPress={scan} /> : undefined}
          >
            Посещаемость
          </SectionTitle>
          <Card>
            {attendance.length === 0 ? (
              <EmptyNote>Записей пока нет</EmptyNote>
            ) : (
              attendance.slice(0, 10).map((r, i) => (
                <View key={r.id} style={[styles.listRow, i > 0 && styles.listRowBorder]}>
                  <Text style={styles.rowTitle}>{r.eventType === 'check_in' ? 'Пришёл' : 'Ушёл'}</Text>
                  <Text style={styles.rowMuted}>{fmtDateTime(r.occurredAt)}</Text>
                </View>
              ))
            )}
          </Card>
        </View>
      )}

      {canDocsView && (
        <View style={styles.section}>
          <SectionTitle
            action={canDocsEdit ? <SecondaryButton small title={uploading ? 'Загрузка…' : '+ Файл'} onPress={pickAndUpload} disabled={uploading} /> : undefined}
          >
            Документы
          </SectionTitle>
          <Card>
            {documents.length === 0 ? (
              <EmptyNote>Документов пока нет</EmptyNote>
            ) : (
              documents.map((d, i) => (
                <View key={d.id} style={[styles.listRow, i > 0 && styles.listRowBorder]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {d.fileName}
                    </Text>
                    <Text style={styles.rowMuted}>{DOCUMENT_TYPE_LABELS[d.type] ?? d.type}</Text>
                  </View>
                  <View style={styles.actionRow}>
                    <LinkButton title="Скачать" onPress={() => downloadAndShare(`/documents/${d.id}/download`, d.fileName).catch(() => undefined)} />
                    {canDocsEdit && <LinkButton title="Удалить" danger onPress={() => deleteDocument(d.id)} />}
                  </View>
                </View>
              ))
            )}
          </Card>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingBottom: spacing.xl * 2 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: 6 },
  name: { fontSize: 19, fontWeight: '800', color: colors.ink },
  subtitle: { fontSize: 12, color: colors.inkMuted, marginTop: 3 },
  allergyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.md },
  section: { marginBottom: spacing.lg },
  actionRow: { flexDirection: 'row', gap: 6 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  miniTitle: { fontSize: 11, fontWeight: '700', color: colors.inkMuted, textTransform: 'uppercase', marginBottom: 6 },
  listRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, gap: 8 },
  listRowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  rowTitle: { fontSize: 13.5, fontWeight: '600', color: colors.ink },
  rowMuted: { fontSize: 12, color: colors.inkMuted, marginTop: 2 },
});
