// src/components/ExerciseNamePicker.tsx
// מודאל לעריכת שם תרגיל: הקלדה חופשית, או בחירה מספריית התרגילים (עם סינון לפי קבוצת שרירים) / היסטוריה אישית.
// נשמר תמיד השם העברי בלבד. השם באנגלית משמש להצגה ולחיפוש.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Modal,
  View,
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
import type { TextInput as RNTextInput } from 'react-native';
import { fontSize, radius, spacing, touch, Text, TextInput, useTheme } from '../theme';
import type { Palette } from '../theme';

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
const LRM = '\u200E';

// הגיליון התחתון, עם ריווח תחתון לפי סרגל הניווט של המכשיר
function SafeSheet({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  return <View style={[styles.sheet, { paddingBottom: 16 + insets.bottom }]}>{children}</View>;
}

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
  const { colors, common } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [text, setText] = useState(currentName);
  const [tab, setTab] = useState<Tab>('library');
  const [group, setGroup] = useState<GroupFilter>(null);
  const inputRef = useRef<RNTextInput>(null);

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
      {/* Modal הוא חלון נפרד באנדרואיד, ולכן צריך SafeAreaProvider משלו כדי שכפתורי השמירה לא יישארו מתחת לסרגל הניווט */}
      <SafeAreaProvider>
      <View style={styles.backdrop}>
        <SafeSheet>
          <Text style={styles.title}>שם התרגיל</Text>

          <TextInput
            ref={inputRef}
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="הקלד/י שם תרגיל"
            placeholderTextColor={colors.textFaint}
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
            <TouchableOpacity style={[common.secondaryButton, styles.actionButton]} onPress={onClose}>
              <Text style={common.secondaryButtonText}>ביטול</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[common.primaryButton, styles.actionButton]} onPress={() => confirm(text)}>
              <Text style={common.primaryButtonText}>שמור</Text>
            </TouchableOpacity>
          </View>
        </SafeSheet>
      </View>
    </SafeAreaProvider>
  </Modal>
  );
}

const createStyles = (colors: Palette) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopStartRadius: 20,
    borderTopEndRadius: 20,
    padding: spacing.lg,
    maxHeight: '80%',
  },
  title: { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: spacing.md, textAlign: 'center' },
  input: {
    backgroundColor: colors.surfaceHigh,
    color: colors.text,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: touch.button,
    fontSize: 16,
    marginBottom: spacing.md,
  },
  tabsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm, flexShrink: 0 },
  tab: {
    flex: 1,
    minHeight: touch.min,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceHigh,
  },
  tabActive: { backgroundColor: colors.accent },
  tabText: { color: colors.textDim, fontSize: fontSize.sm + 1, fontWeight: '600' },
  tabTextActive: { color: colors.onAccent },
  // גובה קבוע, כדי ששורת הצ'יפים לא תתכווץ כשהרשימה הארוכה תופסת את המקום במודאל
  chipsScroll: { height: touch.min, flexGrow: 0, flexShrink: 0, marginBottom: spacing.sm },
  chipsContent: { gap: spacing.sm, alignItems: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    borderRadius: radius.pill,
    minHeight: 40,
    paddingHorizontal: spacing.md + 2,
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.textDim, fontSize: fontSize.sm + 1 },
  chipTextActive: { color: colors.onAccent, fontWeight: '700' },
  chipCount: { color: colors.textFaint, fontSize: fontSize.xs },
  chipCountActive: { color: colors.onAccent },
  countText: { color: colors.textFaint, fontSize: 12, marginBottom: spacing.xs },
  list: { marginBottom: spacing.md, flexGrow: 0, flexShrink: 1, minHeight: 120 },
  emptyText: { color: colors.textDim, fontSize: fontSize.sm, textAlign: 'center', paddingVertical: spacing.lg },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    minHeight: touch.button,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  itemTextWrap: { flexShrink: 1 },
  itemText: { color: colors.text, fontSize: fontSize.md },
  itemTextEn: { color: colors.textFaint, fontSize: 12, marginTop: 2 },
  itemGroup: { color: colors.textFaint, fontSize: fontSize.xs },
  actionsRow: { flexDirection: 'row', gap: spacing.sm, flexShrink: 0 },
  actionButton: { flex: 1 },
});
