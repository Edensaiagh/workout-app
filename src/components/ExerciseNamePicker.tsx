// src/components/ExerciseNamePicker.tsx
// מודאל לעריכת שם תרגיל: הקלדה חופשית, או בחירה מרשימה נפוצה / היסטוריה אישית.

import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from 'react-native';
import { COMMON_EXERCISES } from '../constants/commonExercises';

type Tab = 'common' | 'history';

interface Props {
  visible: boolean;
  currentName: string;
  personalHistory: string[];
  onClose: () => void;
  onConfirm: (name: string) => void;
}

export default function ExerciseNamePicker({
  visible,
  currentName,
  personalHistory,
  onClose,
  onConfirm,
}: Props) {
  const [text, setText] = useState(currentName);
  const [tab, setTab] = useState<Tab>('common');
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setText(currentName);
      setTab('common');
      // מסמנים את הטקסט הקיים לעריכה מיידית ברגע שהמודאל נפתח
      const focusTimer = setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.setNativeProps({ selection: { start: 0, end: currentName.length } });
      }, 50);
      return () => clearTimeout(focusTimer);
    }
  }, [visible, currentName]);

  const list = tab === 'common' ? COMMON_EXERCISES : personalHistory;
  const filtered = text.trim()
    ? list.filter((name) => name.includes(text.trim()))
    : list;

  const confirm = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onConfirm(trimmed);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>שם התרגיל</Text>

          <TextInput
            ref={inputRef}
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="הקלד/י שם תרגיל"
            placeholderTextColor="#888"
            selectTextOnFocus
            autoFocus
          />

          <View style={styles.tabsRow}>
            <TouchableOpacity
              style={[styles.tab, tab === 'common' && styles.tabActive]}
              onPress={() => setTab('common')}
            >
              <Text style={[styles.tabText, tab === 'common' && styles.tabTextActive]}>נפוצים</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, tab === 'history' && styles.tabActive]}
              onPress={() => setTab('history')}
            >
              <Text style={[styles.tabText, tab === 'history' && styles.tabTextActive]}>
                ההיסטוריה שלי
              </Text>
            </TouchableOpacity>
          </View>

          <FlatList
            style={styles.list}
            data={filtered}
            keyExtractor={(item) => item}
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                {tab === 'history' ? 'עוד אין היסטוריית תרגילים' : 'לא נמצאו תוצאות'}
              </Text>
            }
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.item} onPress={() => confirm(item)}>
                <Text style={styles.itemText}>{item}</Text>
              </TouchableOpacity>
            )}
          />

          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>ביטול</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmButton} onPress={() => confirm(text)}>
              <Text style={styles.confirmButtonText}>שמור</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1c1c1e',
    borderTopStartRadius: 20,
    borderTopEndRadius: 20,
    padding: 16,
    maxHeight: '80%',
  },
  title: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 12, textAlign: 'center' },
  input: {
    backgroundColor: '#2c2c2e',
    color: '#fff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 12,
  },
  tabsRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#2c2c2e',
  },
  tabActive: { backgroundColor: '#5b8cff' },
  tabText: { color: '#ccc', fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  list: { marginBottom: 12 },
  emptyText: { color: '#888', fontSize: 13, textAlign: 'center', paddingVertical: 16 },
  item: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2c2c2e',
  },
  itemText: { color: '#eee', fontSize: 15 },
  actionsRow: { flexDirection: 'row', gap: 8 },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#3a3a3c',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: { color: '#ccc', fontSize: 14, fontWeight: '600' },
  confirmButton: {
    flex: 1,
    backgroundColor: '#5b8cff',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  confirmButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
