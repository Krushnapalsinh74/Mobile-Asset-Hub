import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { eduApi, getId, Board, Standard } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function getBoardIcon(name: string): keyof typeof Ionicons.glyphMap {
  const l = name.toLowerCase();
  if (l.includes('gseb') || l.includes('gujarat')) return 'business';
  if (l.includes('cbse')) return 'book';
  if (l.includes('icse')) return 'medal';
  if (l.includes('state')) return 'map';
  if (l.includes('nios')) return 'globe';
  return 'ellipsis-horizontal-circle';
}

function getBoardSubtitle(name: string): string {
  const l = name.toLowerCase();
  if (l.includes('gseb')) return 'Gujarat Secondary and Higher Secondary...';
  if (l.includes('cbse')) return 'Central Board of Secondary Education';
  if (l.includes('icse')) return 'Indian Certificate of Secondary Education';
  if (l.includes('state')) return 'Other State Boards';
  if (l.includes('nios')) return 'National Institute of Open Schooling';
  return 'Custom / Other Board';
}

function getClassNum(name: string) {
  const m = name.match(/\d+/);
  return m ? m[0] : name;
}

export default function OnboardingScreen() {
  const { setBoard, setStandard, activePlanId, isPremium } = useApp();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);
  const [selectedStandard, setSelectedStandard] = useState<Standard | null>(null);

  const boardsQuery = useQuery({ queryKey: ['boards'], queryFn: eduApi.getBoards });
  const standardsQuery = useQuery({
    queryKey: ['standards', selectedBoard?.id],
    queryFn: () => eduApi.getStandards(getId(selectedBoard!)),
    enabled: !!selectedBoard,
  });

  // Removed aggressive paywall redirect to allow free exploration

  const handleBoardSelect = (board: Board) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedBoard(board);
    setSelectedStandard(null);
  };

  const handleStandardSelect = (std: Standard) => {
    Haptics.selectionAsync();
    setSelectedStandard(std);
  };

  const handleNext = async () => {
    if (!selectedBoard || !selectedStandard) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await setBoard(getId(selectedBoard), selectedBoard.name);
    await setStandard(getId(selectedStandard), selectedStandard.name);
    router.replace('/subjects');
  };

  const topPad = insets.top + (Platform.OS === 'web' ? 24 : 16);
  const boards = boardsQuery.data ?? [];
  const standards = standardsQuery.data ?? [];

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: topPad, paddingBottom: insets.bottom + 40 }}
      >
        {/* TOP HEADER (with light blue curve) */}
        <View style={styles.headerArea}>
          <View style={styles.headerCurve} />
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <View style={styles.logoContainer}>
                <Ionicons name="school" size={28} color="#2563EB" />
              </View>
              <View>
                <Text style={styles.logoText}>Knowledge<Text style={{color: '#3B82F6'}}>Park</Text></Text>
                <Text style={styles.logoSubtitle}>Edu</Text>
                <Text style={styles.logoTagline}>Learn  •  Practice  •  Grow</Text>
              </View>
            </View>
            <View style={styles.headerRight}>
              <Ionicons name="library" size={60} color="#93C5FD" style={{ opacity: 0.8 }} />
            </View>
          </View>
        </View>

        {/* BOARD SELECTION */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Your Board</Text>
          <Text style={styles.sectionSub}>Choose your education board to get started.</Text>

          {boardsQuery.isLoading ? (
            <ActivityIndicator style={{ marginTop: 20 }} color="#2563EB" />
          ) : (
            <View style={styles.boardGrid}>
              {boards.map((b) => {
                const isSelected = selectedBoard?.id === b.id;
                const iconName = getBoardIcon(b.name);
                const sub = getBoardSubtitle(b.name);
                
                return (
                  <Pressable
                    key={getId(b)}
                    style={[styles.boardCard, isSelected && styles.boardCardSelected]}
                    onPress={() => handleBoardSelect(b)}
                  >
                    {isSelected && (
                      <View style={styles.boardCheckmark}>
                        <Ionicons name="checkmark-circle" size={18} color="#2563EB" />
                      </View>
                    )}
                    <Ionicons name={iconName} size={32} color={isSelected ? '#2563EB' : '#64748B'} style={{ marginBottom: 8 }} />
                    <Text style={[styles.boardName, isSelected && { color: '#1E293B' }]} numberOfLines={1}>{b.name}</Text>
                    <Text style={styles.boardSub} numberOfLines={3} ellipsizeMode="tail">{sub}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        {/* STANDARD SELECTION */}
        {selectedBoard && (
          <View style={[styles.section, { marginTop: 32 }]}>
            <Text style={styles.sectionTitle}>Select Your Standard</Text>
            <Text style={styles.sectionSub}>Choose your class/grade.</Text>

            {standardsQuery.isLoading ? (
              <ActivityIndicator style={{ marginTop: 20 }} color="#2563EB" />
            ) : (
              <View style={styles.stdGrid}>
                {standards.map((s) => {
                  const isSelected = selectedStandard?.id === s.id;
                  const classNum = getClassNum(s.name);
                  
                  return (
                    <Pressable
                      key={getId(s)}
                      style={[styles.stdCard, isSelected && styles.stdCardSelected]}
                      onPress={() => handleStandardSelect(s)}
                    >
                      <Text style={[styles.stdText, isSelected && styles.stdTextSelected]}>{classNum}</Text>
                      {isSelected && (
                        <Ionicons name="checkmark" size={14} color="#FFF" style={{ position: 'absolute', right: 8 }} />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* NEXT BUTTON */}
        <View style={styles.footer}>
          <Pressable
            style={[styles.nextBtn, (!selectedBoard || !selectedStandard) && styles.nextBtnDisabled]}
            onPress={handleNext}
            disabled={!selectedBoard || !selectedStandard}
          >
            <Text style={styles.nextBtnText}>Next</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFF" />
          </Pressable>

          <View style={styles.footerTagline}>
            <View style={styles.footerLine} />
            <Text style={styles.footerTagText}>Knowledge builds your future</Text>
            <View style={styles.footerLine} />
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FAFAFA' },
  
  /* HEADER */
  headerArea: { position: 'relative', overflow: 'hidden', paddingHorizontal: 20, marginBottom: 24, paddingBottom: 24 },
  headerCurve: { position: 'absolute', top: -100, left: -50, right: -50, height: 250, backgroundColor: '#F0F9FF', borderRadius: 200, transform: [{ scaleX: 1.5 }] },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoContainer: { width: 44, height: 44, backgroundColor: '#3B82F6', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  logoText: { fontSize: 20, fontWeight: '800', color: '#0F172A', letterSpacing: -0.5, lineHeight: 22 },
  logoSubtitle: { fontSize: 20, fontWeight: '800', color: '#3B82F6', lineHeight: 22 },
  logoTagline: { fontSize: 10, color: '#64748B', fontWeight: '600', marginTop: 2 },
  headerRight: { alignItems: 'flex-end', justifyContent: 'center' },

  section: { paddingHorizontal: 20 },
  sectionTitle: { fontSize: 22, fontWeight: '800', color: '#1E293B', marginBottom: 4 },
  sectionSub: { fontSize: 14, color: '#64748B', marginBottom: 16 },

  /* BOARDS GRID (3 Columns) */
  boardGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    marginHorizontal: -6, // To offset card margins
  },
  boardCard: {
    width: (SCREEN_WIDTH - 40) / 3 - 12, // 40 = 20px padding * 2, 12 = 6px margin * 2
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5, borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingVertical: 16, paddingHorizontal: 8,
    alignItems: 'center',
    margin: 6,
    position: 'relative',
  },
  boardCardSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  boardCheckmark: {
    position: 'absolute', top: 6, right: 6,
    backgroundColor: '#EFF6FF', borderRadius: 10,
  },
  boardName: { fontSize: 13, fontWeight: '700', color: '#334155', textAlign: 'center', marginBottom: 4 },
  boardSub: { fontSize: 10, color: '#64748B', textAlign: 'center', lineHeight: 14 },

  /* STANDARD GRID (4 Columns) */
  stdGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    marginHorizontal: -5,
  },
  stdCard: {
    width: (SCREEN_WIDTH - 40) / 4 - 10,
    height: 44,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5, borderColor: '#E2E8F0',
    borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    margin: 5,
    position: 'relative',
  },
  stdCardSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  stdText: { fontSize: 15, fontWeight: '600', color: '#334155' },
  stdTextSelected: { color: '#FFFFFF' },

  /* FOOTER */
  footer: {
    paddingHorizontal: 20,
    marginTop: 40,
  },
  nextBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 16,
  },
  nextBtnDisabled: {
    backgroundColor: '#94A3B8',
  },
  nextBtnText: {
    color: '#FFF', fontSize: 16, fontWeight: '700',
  },
  footerTagline: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
    marginTop: 24,
  },
  footerLine: {
    height: 1, width: 40, backgroundColor: '#E2E8F0',
  },
  footerTagText: {
    fontSize: 12, color: '#94A3B8', fontWeight: '500',
  }
});
