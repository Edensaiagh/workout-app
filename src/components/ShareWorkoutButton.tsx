import React, { useRef, useState } from 'react';
import { View, TouchableOpacity, Modal, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { ShareCard, ShareCardData } from './ShareCard';
import { colors, common, spacing, Text } from '../theme';

interface ShareWorkoutButtonProps {
  data: ShareCardData;
  appName?: string;
}

export function ShareWorkoutButton({ data, appName }: ShareWorkoutButtonProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [sharing, setSharing] = useState(false);
  const cardRef = useRef<View>(null);

  const openPreview = () => {
    setExpanded(false);
    setModalVisible(true);
  };

  const closePreview = () => {
    if (sharing) return; // לא סוגרים באמצע שיתוף
    setModalVisible(false);
  };

  const handleShare = async () => {
    if (!cardRef.current) return;
    setSharing(true);
    let tmpUri: string | null = null;
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('שיתוף לא זמין', 'שיתוף לא נתמך על המכשיר הזה.');
        return;
      }

      tmpUri = await captureRef(cardRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });

      await Sharing.shareAsync(tmpUri, {
        mimeType: 'image/png',
        dialogTitle: 'שתף אימון',
        UTI: 'public.png',
      });
    } catch (err) {
      console.error('שגיאה בשיתוף האימון', err);
      Alert.alert('משהו השתבש', 'לא הצלחנו ליצור את התמונה לשיתוף. נסו שוב.');
    } finally {
      if (tmpUri) {
        FileSystem.deleteAsync(tmpUri, { idempotent: true }).catch(() => {});
      }
      setSharing(false);
      setModalVisible(false);
    }
  };

  return (
    <>
      <TouchableOpacity style={[common.primaryButton, styles.row, styles.fullWidth]} onPress={openPreview} activeOpacity={0.85}>
        <Ionicons name="share-social" size={18} color={colors.onAccent} />
        <Text style={common.primaryButtonText}>שתף אימון</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={closePreview}>
        <View style={styles.overlay}>
          <View style={styles.previewWrap} ref={cardRef} collapsable={false}>
            <ShareCard data={data} expanded={expanded} onToggleExpand={() => setExpanded((v) => !v)} appName={appName} />
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity style={[common.secondaryButton, styles.actionBtn]} onPress={closePreview} disabled={sharing}>
              <Text style={common.secondaryButtonText}>ביטול</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[common.primaryButton, styles.row, styles.actionBtn]} onPress={handleShare} disabled={sharing}>
              {sharing ? (
                <ActivityIndicator color={colors.onAccent} />
              ) : (
                <>
                  <Ionicons name="share-social" size={16} color={colors.onAccent} />
                  <Text style={common.primaryButtonText}>שתף</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fullWidth: { width: '100%' },
  // flexDirection 'row' כבר מסדר מימין לשמאל כי האפליקציה רצה ב-RTL כפוי
  row: { flexDirection: 'row', gap: spacing.sm },
  overlay: { flex: 1, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center' },
  previewWrap: { borderRadius: 22, overflow: 'hidden' },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 18, width: 270 },
  actionBtn: { flex: 1 },
});
