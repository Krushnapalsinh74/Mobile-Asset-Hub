import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { eduApi, getId } from '@/services/api';
import type { Subject } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SUBJECT_THEMES: Array<{
  color: string;
  icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap;
}> = [
  { color: '#6366F1', icon: 'calculator-outline' },
  { color: '#F59E0B', icon: 'flask-outline' },
  { color: '#10B981', icon: 'leaf-outline' },
  { color: '#EF4444', icon: 'reader-outline' },
  { color: '#06B6D4', icon: 'globe-outline' },
  { color: '#8B5CF6', icon: 'planet-outline' },
  { color: '#F97316', icon: 'people-outline' },
  { color: '#14B8A6', icon: 'code-outline' },
];

function getTheme(name: string, index: number) {
  const l = name.toLowerCase();
  if (l.includes('math')) return SUBJECT_THEMES[0];
  if (l.includes('physics')) return SUBJECT_THEMES[5];
  if (l.includes('chem')) return SUBJECT_THEMES[1];
  if (l.includes('bio') || l.includes('life')) return SUBJECT_THEMES[2];
  if (l.includes('english') || l.includes('lang')) return SUBJECT_THEMES[3];
  if (l.includes('geo') || l.includes('social') || l.includes('evs')) return SUBJECT_THEMES[4];
  if (l.includes('history') || l.includes('civics')) return SUBJECT_THEMES[6];
  if (l.includes('computer') || l.includes('it') || l.includes('tech')) return SUBJECT_THEMES[7];
  return SUBJECT_THEMES[index % SUBJECT_THEMES.length];
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function SubjectCard({ subject, index }: { subject: Subject; index: number }) {
  const colors = useColors();
  const theme = getTheme(subject.name, index);
  const bg = theme.color + '18';
  const border = theme.color + '35';

  return (
    <Pressable
      style={[styles.cardWrap]}
      onPress={() => {
        Haptics.selectionAsync();
        router.push({
          pathname: '/subject' as any,
          params: { subjectId: getId(subject), subjectName: subject.name },
        });
      }}
    >
      <View
        style={[
          styles.card,
          { backgroundColor: bg, borderColor: border },
        ]}
      >
        <View style={[styles.iconWrap, { backgroundColor: theme.color + '28' }]}>
          <Ionicons name={theme.icon} size={30} color={theme.color} />
        </View>
        <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={2}>
          {subject.name}
        </Text>
        <View style={[styles.goBtn, { backgroundColor: theme.color }]}>
          <Ionicons name="arrow-forward" size={12} color="#FFFFFF" />
        </View>
      </View>
    </Pressable>
  );
}

export default function SubjectsScreen() {
  const { studentName, boardId, standardId, boardName, standardName, clearAll } = useApp();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const subjectsQuery = useQuery({
    queryKey: ['subjects', boardId, standardId],
    queryFn: () => eduApi.getSubjects(boardId!, standardId!),
    enabled: !!boardId && !!standardId,
  });

  const firstName = (studentName ?? 'Student').split(/[\s@_0-9]/)[0] || studentName?.charAt(0).toUpperCase() + (studentName?.slice(1, 12) ?? '');

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 0) + 16,
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={[styles.greeting, { color: colors.mutedForeground }]}>
              {getGreeting()} 👋
            </Text>
            <Text style={[styles.studentName, { color: colors.text }]} numberOfLines={1}>
              {firstName}
            </Text>
          </View>
          <Pressable onPress={clearAll} style={[styles.settingsBtn, { backgroundColor: colors.secondary }]}>
            <Ionicons name="settings-outline" size={18} color={colors.mutedForeground} />
          </Pressable>
        </View>

        <View style={styles.metaRow}>
          <View style={[styles.metaChip, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="school-outline" size={12} color={colors.primary} />
            <Text style={[styles.metaText, { color: colors.primary }]}>{boardName}</Text>
          </View>
          <View style={[styles.metaChip, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="layers-outline" size={12} color={colors.primary} />
            <Text style={[styles.metaText, { color: colors.primary }]}>{standardName}</Text>
          </View>
        </View>

        <Text style={[styles.subheading, { color: colors.mutedForeground }]}>
          Choose a subject to start studying
        </Text>
      </View>

      {subjectsQuery.isLoading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
            Loading subjects...
          </Text>
        </View>
      )}

      {subjectsQuery.error && (
        <View style={styles.center}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
            <Ionicons name="cloud-offline-outline" size={34} color={colors.destructive} />
          </View>
          <Text style={[styles.errorTitle, { color: colors.text }]}>Couldn't load subjects</Text>
          <Text style={[styles.errorSub, { color: colors.mutedForeground }]}>
            Check your internet connection
          </Text>
          <Pressable
            onPress={() => subjectsQuery.refetch()}
            style={[styles.retryBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.retryText}>Try Again</Text>
          </Pressable>
        </View>
      )}

      {subjectsQuery.data && subjectsQuery.data.length === 0 && (
        <View style={styles.center}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
            <Ionicons name="book-outline" size={34} color={colors.mutedForeground} />
          </View>
          <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
            No subjects found for this class
          </Text>
        </View>
      )}

      {subjectsQuery.data && subjectsQuery.data.length > 0 && (
        <FlatList
          data={subjectsQuery.data}
          keyExtractor={(item) => getId(item)}
          numColumns={2}
          contentContainerStyle={[
            styles.grid,
            { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 0) + 16 },
          ]}
          columnWrapperStyle={styles.row}
          renderItem={({ item, index }) => <SubjectCard subject={item} index={index} />}
          refreshing={subjectsQuery.isFetching}
          onRefresh={() => subjectsQuery.refetch()}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 18,
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerLeft: { flex: 1, paddingRight: 12 },
  greeting: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    marginBottom: 2,
  },
  studentName: {
    fontSize: 22,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  settingsBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  metaText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  subheading: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  grid: { padding: 12 },
  row: { gap: 12, marginBottom: 12 },
  cardWrap: { flex: 1 },
  card: {
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 18,
    paddingBottom: 16,
    minHeight: 160,
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
  },
  iconWrap: {
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  cardName: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    lineHeight: 21,
    flex: 1,
  },
  goBtn: {
    alignSelf: 'flex-end',
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  hintText: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  errorTitle: { fontSize: 17, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  errorSub: { fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  retryBtn: {
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 4,
  },
  retryText: { color: '#FFFFFF', fontWeight: '700', fontFamily: 'Inter_700Bold', fontSize: 14 },
});
