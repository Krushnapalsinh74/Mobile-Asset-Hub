import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ActionConfig = {
  key: string;
  label: string;
  desc: string;
  icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap;
  color: string;
  route: string;
  extra?: Record<string, string>;
};

const ACTIONS: ActionConfig[] = [
  {
    key: 'chapters',
    label: 'Chapters & Topics',
    desc: 'Browse all chapters and explore topics',
    icon: 'list',
    color: '#5B4AF0',
    route: '/chapters',
  },
  {
    key: 'explanation',
    label: 'Explanation',
    desc: 'Deep-dive study guide for any topic',
    icon: 'bulb-outline',
    color: '#10B981',
    route: '/chapters',
    extra: { mode: 'explanation' },
  },
  {
    key: 'test',
    label: 'Live Test',
    desc: 'AI-generated questions to test yourself',
    icon: 'trophy-outline',
    color: '#F59E0B',
    route: '/test-config',
  },
  {
    key: 'chat',
    label: 'AI Tutor',
    desc: 'Ask anything, get instant AI help',
    icon: 'chatbubble-ellipses-outline',
    color: '#5B4AF0',
    route: '/chat',
  },
];

export default function SubjectScreen() {
  const { subjectId, subjectName } = useLocalSearchParams<{
    subjectId: string;
    subjectName: string;
  }>();
  const { boardName, standardName, setLastStudied } = useApp();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (subjectId && subjectName) {
      setLastStudied({
        subjectId,
        subjectName,
        timestamp: Date.now(),
      });
    }
  }, [subjectId]);

  const topPad = insets.top + (Platform.OS === 'web' ? 24 : 0);

  return (
    <View style={styles.root}>
      {/* ── TOP HEADER CARD ── */}
      <View style={[styles.headerCard, { paddingTop: topPad + 16 }]}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              if (router.canGoBack()) router.back();
              else router.replace('/subjects');
            }}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={20} color="#334155" />
          </Pressable>
          
          <View style={styles.subjectIconWrap}>
            <Ionicons name="document-text" size={20} color="#5B4AF0" />
          </View>
          
          <View style={styles.titleBlock}>
            <Text style={styles.subjectName} numberOfLines={1}>{subjectName || 'Subject'}</Text>
            <Text style={styles.breadcrumb} numberOfLines={1}>
              {boardName || 'Central Board of Secondary Education'} • {standardName || 'Class 11'}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40, gap: 12 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionLabel}>Choose what to do</Text>
        
        {ACTIONS.map((action) => (
          <Pressable
            key={action.key}
            style={styles.actionCard}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push({
                pathname: action.route as any,
                params: {
                  subjectId,
                  subjectName,
                  ...(action.extra ?? {}),
                },
              });
            }}
          >
            <View style={[styles.actionIcon, { backgroundColor: action.color + '1A' }]}>
              <Ionicons name={action.icon} size={22} color={action.color} />
            </View>
            
            <View style={styles.actionText}>
              <Text style={styles.actionLabel}>{action.label}</Text>
              <Text style={styles.actionDesc}>{action.desc}</Text>
            </View>
            
            <View style={styles.actionChevron}>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },

  /* HEADER */
  headerCard: {
    backgroundColor: '#FFF',
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center', justifyContent: 'center',
  },
  subjectIconWrap: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: '#EEF2FF',
    alignItems: 'center', justifyContent: 'center',
  },
  titleBlock: { flex: 1 },
  subjectName: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 2 },
  breadcrumb: { fontSize: 11, fontWeight: '500', color: '#64748B' },

  /* CONTENT */
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 4, marginTop: 8 },
  
  actionCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#FFF', borderRadius: 20, padding: 16,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02, shadowRadius: 6, elevation: 1,
  },
  actionIcon: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  actionText: { flex: 1 },
  actionLabel: { fontSize: 15, fontWeight: '800', color: '#1E293B', marginBottom: 3 },
  actionDesc: { fontSize: 12, color: '#64748B', lineHeight: 17 },
  actionChevron: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: '#F8FAFC',
    alignItems: 'center', justifyContent: 'center',
  },
});
