import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Modal,
  TextInput,
  Pressable,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { api, ApiError, API_URL, getToken } from '../../api/client';
import { useAuth } from '../../api/AuthContext';
import { Card, SectionTitle, Badge, PrimaryButton, SecondaryButton, EmptyNote } from '../../components/ui';
import { colors } from '../../theme/colors';
import {
  CHARGE_TYPE_LABELS,
  PAYMENT_METHOD_LABELS,
  DOCUMENT_TYPE_LABELS,
  fmtDate,
  fmtDateTime,
} from '../../theme/labels';
import { StaffStackParamList } from '../../navigation/StaffStack';

const FINANCE_ROLES = ['director', 'admin', 'accountant'];
const DOCS_VIEW_ROLES = ['director', 'admin', 'teacher', 'medic'];
const DOCS_EDIT_ROLES = ['director', 'admin'];
const ATTENDANCE_VIEW_ROLES = ['director', 'admin', 'teacher', 'accountant', 'medic'];
const ATTENDANCE_SCAN_ROLES = ['director', 'admin', 'teacher'];

type Child = {
  id: string;
  fullName: string;
  dateOfBirth: string;
  enrollmentDate: string;
  allergies: string[];
  qrCode: string;
};
type Balance = { charged: string; paid: string; debt: string };
type Charge = { id: string; type: string; amount: string; description: string | null; dueDate: string };
type Payment = { id: string; method: string; amount: string; paidAt: string };
type AttendanceRecord = { eventType: 'check_in' | 'check_out'; occurredAt: string };
type DocMeta = { id: string; fileName: string; type: string };

type Props = NativeStackScreenProps<StaffStackParamList, 'ChildDetail'>;

export default function ChildDetailScreen({ route }: Props) {
  const { childId } = route.params;
  const { user } = useAuth();
  const role = user!.role;

  const canFinance = FINANCE_ROLES.includes(role);
  const canDocsView = DOCS_VIEW_ROLES.includes(role);
  const canDocsEdit = DOCS_EDIT_ROLES.includes(role);
  const canAttendanceView = ATTENDANCE_VIEW_ROLES.includes(role);
  const canScan = ATTENDANCE_SCAN_ROLES.includes(role);

  const [child, setChild] = useState<Child | null>(null);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [charges, setCharges] = useState<Charge[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [docs, setDocs] = useState<DocMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [chargeModal, setChargeModal] = useState(false);
  const [paymentModal, setPaymentModal] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const c = await api<Child>(`/children/${childId}`);
      setChild(c);
      const tasks: Promise<any>[] = [];
      if (canFinance) {
        tasks.push(
          api<Balance>(`/finance/children/${childId}/balance`).then(setBalance),
          api<{ charges: Charge[]; payments: Payment[] }>(`/finance/children/${childId}/history`).then((h) => {
            setCharges(h.charges);
            setPayments(h.payments);
          }),
        );
      }
      if (canAttendanceView) {
        tasks.push(api<AttendanceRecord[]>(`/attendance/children/${childId}/history`).then(setAttendance));
      }
      if (canDocsView) {
        tasks.push(api<DocMeta[]>(`/documents/children/${childId}`).then(setDocs));
      }
      await Promise.all(tasks);
    } catch (e: any) {
      if (e instanceof ApiError && e.status === 401) return;
      setError(e.message || 'Не удалось загрузить карточку ребёнка');
    }
  }, [childId, canFinance, canAttendanceView, canDocsView]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [load]);

  const scan = async () => {
    if (!child) return;
    try {
      const record = await api<{ eventType: string }>('/attendance/scan', {
        method: 'POST',
        body: { code: child.qrCode },
      });
      Alert.alert(record.eventType === 'check_in' ? 'Отмечен приход' : 'Отмечен уход');
      load();
    } catch (e: any) {
      Alert.alert('Ошибка', e.message);
    }
  };

  const pickAndUpload = async (type: string) => {
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (result.canceled || !result.assets?.[0]) return;
    const file = result.assets[0];
    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append('type', type);
      // @ts-expect-error React Native's fetch accepts this file-shaped object
      formData.append('file', { uri: file.uri, name: file.name, type: file.mimeType || 'application/octet-stream' });
      const res = await fetch(`${API_URL}/documents/children/${childId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || `Ошибка ${res.status}`);
      }
      Alert.alert('Документ загружен');
      load();
    } catch (e: any) {
      Alert.alert('Ошибка загрузки', e.message);
    }
  };

  const downloadDoc = async (docId: string, fileName: string) => {
    try {
      const token = await getToken();
      const destination = new File(Paths.cache, fileName);
      const file = await File.downloadFileAsync(`${API_URL}/documents/${docId}/download`, destination, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        idempotent: true,
      });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(file.uri);
    } catch (e: any) {
      Alert.alert('Ошибка', e.message);
    }
  };

  const deleteDoc = (docId: string) => {
    Alert.alert('Удалить документ?', undefined, [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: async () => {
          try {
            await api(`/documents/${docId}`, { method: 'DELETE' });
            load();
          } catch (e: any) {
            Alert.alert('Ошибка', e.message);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }
  if (error || !child) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error || 'Не найдено'}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.headRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{child.fullName}</Text>
          <Text style={styles.subtitle}>
            Родился: {fmtDate(child.dateOfBirth)} · Зачислен: {fmtDate(child.enrollmentDate)}
          </Text>
        </View>
        {child.allergies.length > 0 && (
          <View style={{ gap: 4, alignItems: 'flex-end' }}>
            {child.allergies.map((a) => (
              <Badge key={a} tone="danger">
                {a}
              </Badge>
            ))}
          </View>
        )}
      </View>

      {canFinance && balance && (
        <View>
          <View style={styles.sectionHeader}>
            <SectionTitle>Финансы</SectionTitle>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <SecondaryButton title="+ Начислить" onPress={() => setChargeModal(true)} small />
              <PrimaryButton title="+ Оплата" onPress={() => setPaymentModal(true)} small />
            </View>
          </View>
          <View style={styles.balanceRow}>
            <View style={styles.balanceCell}>
              <Text style={styles.balanceValue}>{balance.charged} сом</Text>
              <Text style={styles.balanceLabel}>Начислено</Text>
            </View>
            <View style={styles.balanceCell}>
              <Text style={styles.balanceValue}>{balance.paid} сом</Text>
              <Text style={styles.balanceLabel}>Оплачено</Text>
            </View>
            <View style={styles.balanceCell}>
              <Text style={[styles.balanceValue, Number(balance.debt) > 0 && { color: colors.danger }]}>
                {balance.debt} сом
              </Text>
              <Text style={styles.balanceLabel}>Долг</Text>
            </View>
          </View>
          <Card>
            {charges.length === 0 && payments.length === 0 ? (
              <EmptyNote>Нет начислений и оплат</EmptyNote>
            ) : (
              <>
                {charges.map((c) => (
                  <View key={c.id} style={styles.historyRow}>
                    <Text style={styles.historyMain}>{CHARGE_TYPE_LABELS[c.type] || c.type}</Text>
                    <Text style={styles.historySide}>
                      {c.amount} сом · {fmtDate(c.dueDate)}
                    </Text>
                  </View>
                ))}
                {payments.map((p) => (
                  <View key={p.id} style={styles.historyRow}>
                    <Text style={styles.historyMain}>{PAYMENT_METHOD_LABELS[p.method] || p.method}</Text>
                    <Text style={[styles.historySide, { color: colors.success }]}>
                      +{p.amount} сом · {fmtDate(p.paidAt)}
                    </Text>
                  </View>
                ))}
              </>
            )}
          </Card>
        </View>
      )}

      {canAttendanceView && (
        <View>
          <View style={styles.sectionHeader}>
            <SectionTitle>Посещаемость</SectionTitle>
            {canScan && <PrimaryButton title="Отметить" onPress={scan} small />}
          </View>
          <Card>
            {attendance.length === 0 ? (
              <EmptyNote>Записей пока нет</EmptyNote>
            ) : (
              attendance.slice(0, 8).map((r, i) => (
                <View key={i} style={styles.historyRow}>
                  <Text style={styles.historyMain}>{r.eventType === 'check_in' ? 'Пришёл' : 'Ушёл'}</Text>
                  <Text style={styles.historySide}>{fmtDateTime(r.occurredAt)}</Text>
                </View>
              ))
            )}
          </Card>
        </View>
      )}

      {canDocsView && (
        <View>
          <SectionTitle>Документы</SectionTitle>
          <Card>
            {docs.length === 0 ? (
              <EmptyNote>Документов пока нет</EmptyNote>
            ) : (
              docs.map((d) => (
                <View key={d.id} style={styles.docRow}>
                  <Text style={styles.docName} numberOfLines={1}>
                    {d.fileName}
                  </Text>
                  <Text style={styles.docLink} onPress={() => downloadDoc(d.id, d.fileName)}>
                    скачать
                  </Text>
                  {canDocsEdit && (
                    <Text style={styles.docLinkDanger} onPress={() => deleteDoc(d.id)}>
                      удалить
                    </Text>
                  )}
                </View>
              ))
            )}
          </Card>
          {canDocsEdit && (
            <View style={{ marginTop: 10 }}>
              <SecondaryButton title="+ Загрузить документ" onPress={() => pickAndUpload('other')} small />
            </View>
          )}
        </View>
      )}

      <ChargeModal
        visible={chargeModal}
        onClose={() => setChargeModal(false)}
        childId={childId}
        onDone={() => {
          setChargeModal(false);
          load();
        }}
      />
      <PaymentModal
        visible={paymentModal}
        onClose={() => setPaymentModal(false)}
        childId={childId}
        onDone={() => {
          setPaymentModal(false);
          load();
        }}
      />
    </ScrollView>
  );
}

function ChargeModal({
  visible,
  onClose,
  childId,
  onDone,
}: {
  visible: boolean;
  onClose: () => void;
  childId: string;
  onDone: () => void;
}) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    setSaving(true);
    try {
      await api('/finance/charges', {
        method: 'POST',
        body: {
          childId,
          type: 'monthly_tariff',
          amount,
          dueDate: new Date().toISOString().slice(0, 10),
          description: description || undefined,
        },
      });
      setAmount('');
      setDescription('');
      onDone();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormModal visible={visible} onClose={onClose} title="Новое начисление">
      {err && <Text style={styles.modalError}>{err}</Text>}
      <Text style={styles.modalLabel}>Сумма (сом)</Text>
      <TextInput style={styles.modalInput} keyboardType="numeric" value={amount} onChangeText={setAmount} />
      <Text style={styles.modalLabel}>Комментарий</Text>
      <TextInput style={styles.modalInput} value={description} onChangeText={setDescription} placeholder="Необязательно" />
      <PrimaryButton title="Начислить" onPress={submit} disabled={saving || !amount} />
    </FormModal>
  );
}

function PaymentModal({
  visible,
  onClose,
  childId,
  onDone,
}: {
  visible: boolean;
  onClose: () => void;
  childId: string;
  onDone: () => void;
}) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    setSaving(true);
    try {
      await api('/finance/payments', {
        method: 'POST',
        body: {
          childId,
          method: 'cash',
          amount,
          paidAt: new Date().toISOString().slice(0, 10),
          note: note || undefined,
        },
      });
      setAmount('');
      setNote('');
      onDone();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormModal visible={visible} onClose={onClose} title="Принять оплату">
      {err && <Text style={styles.modalError}>{err}</Text>}
      <Text style={styles.modalLabel}>Сумма (сом)</Text>
      <TextInput style={styles.modalInput} keyboardType="numeric" value={amount} onChangeText={setAmount} />
      <Text style={styles.modalLabel}>Комментарий</Text>
      <TextInput style={styles.modalInput} value={note} onChangeText={setNote} placeholder="Необязательно" />
      <PrimaryButton title="Принять оплату" onPress={submit} disabled={saving || !amount} />
    </FormModal>
  );
}

function FormModal({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{title}</Text>
          {children}
          <Pressable onPress={onClose} style={{ marginTop: 10, alignItems: 'center' }}>
            <Text style={{ color: colors.inkMuted, fontWeight: '600' }}>Отмена</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg, padding: 24 },
  errorText: { color: colors.danger, fontSize: 14, textAlign: 'center' },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  title: { fontSize: 19, fontWeight: '800', color: colors.ink },
  subtitle: { fontSize: 12, color: colors.inkMuted, marginTop: 4 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 },
  balanceRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  balanceCell: { flex: 1, backgroundColor: colors.surfaceAlt, borderRadius: 10, padding: 10 },
  balanceValue: { fontSize: 13.5, fontWeight: '700', color: colors.ink },
  balanceLabel: { fontSize: 10.5, color: colors.inkMuted, marginTop: 2 },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  historyMain: { fontSize: 13.5, color: colors.ink },
  historySide: { fontSize: 12.5, color: colors.inkMuted },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  docName: { flex: 1, fontSize: 13.5, color: colors.ink },
  docLink: { color: colors.accentInk, fontWeight: '700', fontSize: 12.5 },
  docLinkDanger: { color: colors.danger, fontWeight: '700', fontSize: 12.5 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(27,22,16,0.5)', justifyContent: 'center', padding: 24 },
  modalCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 16.5, fontWeight: '800', color: colors.ink, marginBottom: 14 },
  modalLabel: { fontSize: 12.5, fontWeight: '600', color: colors.ink, marginBottom: 6, marginTop: 10 },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14.5,
    color: colors.ink,
  },
  modalError: { color: colors.danger, fontSize: 13, marginBottom: 6 },
});
