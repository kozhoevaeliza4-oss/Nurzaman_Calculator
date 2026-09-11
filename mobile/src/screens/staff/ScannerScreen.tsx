import React, { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useAuthedApi } from '../../hooks/useAuthedApi';
import { colors, spacing } from '../../theme';
import { PrimaryButton, SecondaryButton } from '../../components/ui';

interface ScanResult {
  fullName: string;
  eventType: 'check_in' | 'check_out';
}

export default function ScannerScreen() {
  const navigation = useNavigation();
  const { request } = useAuthedApi();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onScanned = async (code: string) => {
    if (scanned) return;
    setScanned(true);
    setError(null);
    try {
      const res = await request<ScanResult>('/attendance/scan', { method: 'POST', body: { code } });
      setResult(res);
    } catch (err) {
      if (err instanceof Error && err.message !== 'unauthorized') setError(err.message);
    }
  };

  if (!permission) {
    return <View style={styles.screen} />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <Text style={styles.permissionText}>Нужен доступ к камере, чтобы сканировать QR-код ребёнка</Text>
        <PrimaryButton title="Разрешить доступ" onPress={requestPermission} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {!scanned ? (
        <CameraView
          style={StyleSheet.absoluteFill}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={(e) => onScanned(e.data)}
        />
      ) : (
        <View style={styles.resultBox}>
          {error ? (
            <>
              <Text style={styles.errorText}>Ошибка: {error}</Text>
            </>
          ) : result ? (
            <>
              <Text style={styles.resultName}>{result.fullName}</Text>
              <Text style={styles.resultEvent}>
                {result.eventType === 'check_in' ? '✅ Отмечен приход' : '👋 Отмечен уход'}
              </Text>
            </>
          ) : (
            <Text style={styles.resultName}>Обработка…</Text>
          )}
          <View style={styles.resultActions}>
            <SecondaryButton
              title="Сканировать ещё"
              onPress={() => {
                setScanned(false);
                setResult(null);
                setError(null);
              }}
            />
            <SecondaryButton title="Закрыть" onPress={() => navigation.goBack()} />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  centered: { alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  permissionText: { color: colors.white, fontSize: 15, textAlign: 'center' },
  resultBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  resultName: { color: colors.white, fontSize: 22, fontWeight: '800', textAlign: 'center' },
  resultEvent: { color: colors.accent, fontSize: 17, fontWeight: '700' },
  errorText: { color: '#ff8a75', fontSize: 15, textAlign: 'center' },
  resultActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
});
