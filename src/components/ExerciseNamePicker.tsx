// src/components/ExerciseNamePicker.tsx
// מודאל לעריכת שם תרגיל: הקלדה חופשית, או בחירה מספריית התרגילים (עם סינון לפי קבוצת שרירים) / היסטוריה אישית.
// נשמר תמיד השם העברי בלבד. השם באנגלית משמש להצגה ולחיפוש.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  StyleSheet,
} from 'react-native';
import {
  EXERCISE_COUNT_BY_GROUP,
  EXERCISE_EN_BY_NAME,
  EXERCISE_LIBRARY,
  MUSCLE_GROUPS,
  MuscleGroup,
} from '../constants/exerciseLibrary';

type Tab = 'library' | 'history';

// null = "הכול"
type GroupFilter = MuscleGroup | null;

interface ListItem {
  name: string;
  en?: string;
  group?: MuscleGroup;
}

const CHIPS: { group: GroupFilter; label: string; count: number }[] = [
  { group: null, label: 'הכול', count: EXERCISE_LIBRARY.length },
  ...MUSCLE_GROUPS.map((g) => ({ group: g as GroupFilter, label: g as string, count: EXERCISE_COUNT_BY_GROUP[g] })),
];

// LRM סביב השם באנגלית, כדי שהסוגריים לא יתהפכו בתוך טקסט RTL
const LRM = '‎';

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
  const [tab, setTab] = useState<Tab>('library');
  const [group, setGroup] = useState<GroupFilter>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setText(currentName);
      setTab('library');
      setGroup(null);
      // מסמנים את הטקסט הקיים לעריכה מיידית ברגע שהמודאל נפתח
      const focusTimer = setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.setNativeProps({ selection: { start: 0, end: currentName.length } });
      }, 50);
      return () => clearTimeout(focusTimer);
    }
  }, [visible, currentName]);

  const items: ListItem[] = useMemo(() => {
    const base: ListItem[] =
      tab === 'library'
        ? EXERCISE_LIBRARY.filter((e) => group === null || e.group === group)
        : personalHistory.map((name) => ({ name, en: EXERCISE_EN_BY_NAME[name] }));
    const query = text.trim();
    if (!query) return base;
    const queryLower = query.toLowerCase();
    return base.filter(
      (e) => e.name.includes(query) || (e.en ? e.en.toLowerCase().includes(queryLower) : false),
    );
  }, [tab, group, text, personalHistory]);

  const showGroupLabel = tab === 'library' && group === null;

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
              style={[styles.tab, tab === 'library' && styles.tabActive]}
              onPress={() => setTab('library')}
            >
              <Text style={[styles.tabText, tab === 'library' && styles.tabTextActive]}>כל התרגילים</Text>
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

          {tab === 'library' && (
            <>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                style={styles.chipsScroll}
                contentContainerStyle={styles.chipsContent}
              >
                {CHIPS.map((chip) => {
                  const active = group === chip.group;
                  return (
                    <TouchableOpacity
                      key={chip.label}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => setGroup(chip.group)}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{chip.label}</Text>
                      <Text style={[styles.chipCount, active && styles.chipCountActive]}>{chip.count}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <Text style={styles.countText}>{items.length} תרגילים</Text>
            </>
          )}

          <FlatList
            style={styles.list}
            data={items}
            keyExtractor={(item) => item.name}
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                {tab === 'history' ? 'עוד אין היסטוריית תרגילים' : 'לא נמצאו תוצאות'}
              </Text>
            }
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.item} onPress={() => confirm(item.name)}>
                <View style={styles.itemTextWrap}>
                  <Text style={styles.itemText}>{item.name}</Text>
                  {item.en ? <Text style={styles.itemTextEn}>{`${LRM}(${item.en})${LRM}`}</Text> : null}
                </View>
                {showGroupLabel && item.group ? <Text style={styles.itemGroup}>{item.group}</Text> : null}
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
  // flexShrink: 0 - אחרת שורת הצ'יפים מתכווצת כשהרשימה הארוכה תופסת את המקום במודאל
  chipsScroll: { flexGrow: 0, flexShrink: 0, marginBottom: 8 },
  chipsContent: { gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    borderWidth: 1,
    borderColor: '#3a3a3c',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  chipActive: { backgroundColor: '#5b8cff', borderColor: '#5b8cff' },
  chipText: { color: '#ccc', fontSize: 13 },
  chipTextActive: { color: '#fff' },
  chipCount: { color: '#8e8e93', fontSize: 11 },
  chipCountActive: { color: '#dbe5ff' },
  countText: { color: '#8e8e93', fontSize: 12, marginBottom: 4 },
  list: { marginBottom: 12 },
  emptyText: { color: '#888', fontSize: 13, textAlign: 'center', paddingVertical: 16 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2c2c2e',
  },
  itemTextWrap: { flexShrink: 1 },
  itemText: { color: '#eee', fontSize: 15 },
  itemTextEn: { color: '#8e8e93', fontSize: 12, marginTop: 2 },
  itemGroup: { color: '#8e8e93', fontSize: 11 },
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
