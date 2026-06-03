import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { eduApi, getId } from '@/services/api';
import type { Subject } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
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
  colors: [string, string];
  icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap;
}> = [
  { colors: ['#4F46E5', '#7C3AED'], icon: 'calculator-outline' },
  { colors: ['#F59E0B', '#D97706'], icon: 'flask-outline' },
  { colors: ['#10B981', '#059669'], icon: 'leaf-outline' },
  { colors: ['#EF4444', '#DC2626'], icon: 'reader-outline' },
  { colors: ['#06B6D4', '#0891B2'], icon: 'globe-outline' },
  { colors: ['#8B5CF6', '#6D28D9'], icon: 'planet-outline' },
  { colors: ['#F97316', '#EA580C'], icon: 'people-outline' },
  { colors: ['#14B8A6', '#0D9488'], icon: 'code-outline' },
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

function SubjectCard({ subject, index }: { subject: Subject; index: number }) {
  const theme = getTheme(subject.name, index);
  return (
    <Pressable
      style={styles.cardWrap}
      onPress={() => {
        Haptics.selectionAsync();
        router.push({
          pathname: '/subject' as any,
          params: { subjectId: getId(subject), subjectName: subject.name },
        });
      }}
    >
      <LinearGradient colors={theme.colors} style={styles.card}>
        <View style={styles.cardIcon}>
          <Ionicons name={theme.icon} size={30} color="rgba(255,255,255,0.92)" />
        </View>
        <Text style={styles.cardName} numberOfLines={3}>
          {subject.name}
        </Text>
      </LinearGradient>
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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={['#312E81', '#4F46E5']}
        style={[
          styles.header,
          {
            paddingTop:
              insets.top + (Platform.OS === 'web' ? 67 : 0) + 20,
          },
        ]}
      >
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>Hello, {studentName?.split(' ')[0]}</Text>
            <Text style={styles.breadcrumb}>
              {boardName} • {standardName}
            </Text>
          </View>
          <Pressable onPress={clearAll} style={styles.settingsBtn}>
            <Ionicons name="settings-outline" size={20} color="rgba(255,255,255,0.8)" />
          </Pressable>
        </View>
        <Text style={styles.headerSub}>What would you like to learn today?</Text>
      </LinearGradient>

      {subjectsQuery.isLoading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
            Loading subjects...
          </Text>
        </View>
      )}

      {subjectsQuery.error && (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={52} color={colors.destructive} />
          <Text style={[styles.errorText, { color: colors.text }]}>Failed to load subjects</Text>
          <Text style={[styles.errorSub, { color: colors.mutedForeground }]}>
            Check your internet connection
          </Text>
          <Pressable
            onPress={() => subjectsQuery.refetch()}
            style={[styles.retryBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      )}

      {subjectsQuery.data && subjectsQuery.data.length === 0 && (
        <View style={styles.center}>
          <Ionicons name="book-outline" size={52} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
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
            {
              paddingBottom:
                insets.bottom + (Platform.OS === 'web' ? 34 : 0) + 16,
            },
          ]}
          renderItem={({ item, index }) => (
            <SubjectCard subject={item} index={index} />
          )}
          refreshing={subjectsQuery.isFetching}
          onRefresh={() => subjectsQuery.refetch()}
          scrollEnabled={!!subjectsQuery.data?.length}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 24, paddingBottom: 24 },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  headerLeft: { flex: 1 },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Inter_700Bold',
  },
  breadcrumb: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.68)',
    fontFamily: 'Inter_400Regular',
    marginTop: 3,
  },
  settingsBtn: {
    padding: 9,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 11,
  },
  headerSub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    fontFamily: 'Inter_400Regular',
  },
  grid: { padding: 10 },
  cardWrap: { flex: 0.5, padding: 6 },
  card: { borderRadius: 22, padding: 18, aspectRatio: 0.95, justifyContent: 'flex-end' },
  cardIcon: {
    width: 52,
    height: 52,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Inter_700Bold',
    lineHeight: 22,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 32,
  },
  loadingText: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  errorText: { fontSize: 17, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  errorSub: { fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  emptyText: { fontSize: 15, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  retryBtn: { paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12, marginTop: 4 },
  retryText: { color: '#FFFFFF', fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
});
