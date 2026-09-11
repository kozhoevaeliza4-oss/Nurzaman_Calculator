import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { downloadToCache } from '../utils/download';
import { colors, spacing } from '../theme';

interface Props {
  visible: boolean;
  documentId: string | null;
  fileName: string;
  onClose: () => void;
}

// Shows a document (PDF/image) inline via a local WebView instead of routing
// through the OS share sheet — the file still has to be fetched once with
// the auth header (WebView can't send it), but the user never sees a
// download/save step, just a viewer.
export default function DocumentPreviewModal({ visible, documentId, fileName, onClose }: Props) {
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !documentId) {
      setLocalUri(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLocalUri(null);
    setError(null);
    downloadToCache(`/documents/${documentId}/download`, fileName)
      .then((uri) => {
        if (!cancelled) setLocalUri(uri);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Не удалось открыть файл');
      });
    return () => {
      cancelled = true;
    };
  }, [visible, documentId, fileName]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.screen}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>
            {fileName}
          </Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <Text style={styles.close}>Закрыть</Text>
          </Pressable>
        </View>
        {error ? (
          <View style={styles.centered}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : !localUri ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : (
          <WebView source={{ uri: localUri }} style={styles.webview} originWhitelist={['*']} />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  title: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.ink },
  close: { fontSize: 14, fontWeight: '600', color: colors.accentInk },
  webview: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  errorText: { fontSize: 14, color: colors.inkMuted, textAlign: 'center' },
});
