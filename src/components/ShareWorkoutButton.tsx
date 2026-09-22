import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { ShareCard, ShareCardData } from './ShareCard';

interface ShareWorkoutButtonProps {
  data: ShareCardData;
  appName?: string;
}

const AMBER = '#ffb454';

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
      <TouchableOpacity style={styles.shareButton} onPress={openPreview} activeOpacity={0.85}>
        <Ionicons name="share-social" size={18} color="#241704" />
        <Text style={styles.shareButtonText}>שתף אימון</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={closePreview}>
        <View style={styles.overlay}>
          <View style={styles.previewWrap} ref={cardRef} collapsable={false}>
            <ShareCard data={data} expanded={expanded} onToggleExpand={() => setExpanded((v) => !v)} appName={appName} />
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={closePreview} disabled={sharing}>
              <Text style={styles.cancelBtnText}>ביטול</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} onPress={handleShare} disabled={sharing}>
              {sharing ? (
                <ActivityIndicator color="#241704" />
              ) : (
                <>
                  <Ionicons name="share-social" size={16} color="#241704" />
                  <Text style={styles.confirmBtnText}>שתף</Text>
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
  shareButton: {
    width: '100%', backgroundColor: AMBER, borderRadius: 14, paddingVertical: 14,
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  shareButtonText: { fontSize: 15, fontWeight: '500', color: '#241704' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  previewWrap: { borderRadius: 22, overflow: 'hidden' },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 18, width: 270 },
  cancelBtn: {
    flex: 1, backgroundColor: 'transparent', borderWidth: 1, borderColor: '#3a3a3a',
    borderRadius: 12, paddingVertical: 12, alignItems: 'center',
  },
  cancelBtnText: { color: '#cfcfcf', fontSize: 14 },
  confirmBtn: {
    flex: 1, backgroundColor: AMBER, borderRadius: 12, paddingVertical: 12,
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  confirmBtnText: { color: '#241704', fontSize: 14, fontWeight: '500' },
});
