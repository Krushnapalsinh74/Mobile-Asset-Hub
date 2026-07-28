import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { eduApi, getId } from '@/services/api';
import type { Board, Standard } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
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

type Step = 'board' | 'standard';

/* ── Color palettes for board cards ── */
const PALETTES: Array<{ grad: [string, string, string]; icon: string }> = [
  { grad: ['#3730A3', '#4F46E5', '#6366F1'], icon: 'school' },
  { grad: ['#065F46', '#059669', '#10B981'], icon: 'leaf' },
  { grad: ['#92400E', '#D97706', '#F59E0B'], icon: 'sunny' },
  { grad: ['#7F1D1D', '#DC2626', '#EF4444'], icon: 'flame' },
  { grad: ['#0C4A6E', '#0284C7', '#38BDF8'], icon: 'water' },
  { grad: ['#581C87', '#7C3AED', '#A78BFA'], icon: 'sparkles' },
  { grad: ['#134E4A', '#0F766E', '#2DD4BF'], icon: 'planet' },
  { grad: ['#831843', '#BE185D', '#EC4899'], icon: 'heart' },
];

function getPalette(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return PALETTES[Math.abs(h) % PALETTES.length]!;
}

function getAbbrev(name: string) {
  if (name.length <= 5) return name.toUpperCase();
  return name.split(/\s+/).filter(w => w.length > 2).slice(0, 4).map(w => w[0]!.toUpperCase()).join('');
}

function getClassNum(name: string) { const m = name.match(/\d+/); return m ? m[0] : null; }

/* ── CLASS chip color cycles ── */
const CLASS_COLORS: Array<[string, string]> = [
  ['#4F46E5', '#7C3AED'],
  ['#059669', '#10B981'],
  ['#D97706', '#F59E0B'],
  ['#DC2626', '#EF4444'],
  ['#0284C7', '#38BDF8'],
  ['#7C3AED', '#A78BFA'],
  ['#0F766E', '#2DD4BF'],
  ['#BE185D', '#EC4899'],
  ['#1D4ED8', '#3B82F6'],
  ['#15803D', '#22C55E'],
  ['#B45309', '#FBBF24'],
  ['#9333EA', '#C084FC'],
];

export default function OnboardingScreen() {
  const [step, setStep] = useState<Step>('board');
  const [selectedBoard, setSelectedBoard] = useState<{ id: string; name: string } | null>(null);
  const [selectedStandard, setSelectedStandard] = useState<{ id: string; name: string } | null>(null);
  const { setBoard, setStandard } = useApp();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const boardsQuery = useQuery({ queryKey: ['boards'], queryFn: eduApi.getBoards });
  const standardsQuery = useQuery({
    queryKey: ['standards', selectedBoard?.id],
    queryFn: () => eduApi.getStandards(selectedBoard!.id),
    enabled: !!selectedBoard,
  });

  const handleBoardSelect = (board: Board) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedBoard({ id: getId(board), name: board.name });
    setSelectedStandard(null);
    setStep('standard');
  };

  const handleStandardSelect = (std: Standard) => {
    Haptics.selectionAsync();
    const id = getId(std);
    setSelectedStandard(prev => prev?.id === id ? null : { id, name: std.name });
  };

  const handleContinue = async () => {
    if (!selectedBoard || !selectedStandard) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await setBoard(selectedBoard.id, selectedBoard.name);
    await setStandard(selectedStandard.id, selectedStandard.name);
    router.replace('/subjects');
  };

  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const boardPalette = selectedBoard ? getPalette(selectedBoard.name) : PALETTES[0]!;

  /* ── BOARD STEP ── */
  if (step === 'board') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Hero */}
        <LinearGradient
          colors={['#3730A3', '#4F46E5', '#7C3AED']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { paddingTop: topPad + 24 }]}
        >
          <View style={styles.blob1} />
          <View style={styles.blob2} />

          {/* Step progress */}
          <View style={styles.stepProgress}>
            <View style={styles.stepPip} />
            <View style={[styles.stepLine, { backgroundColor: 'rgba(255,255,255,0.2)' }]} />
            <View style={[styles.stepPip, { backgroundColor: 'rgba(255,255,255,0.3)' }]} />
          </View>

          <View style={styles.heroIcon}>
            <Ionicons name="school" size={32} color="#FFFFFF" />
          </View>
          <Text style={styles.heroStep}>STEP 1 OF 2</Text>
          <Text style={styles.heroTitle}>Choose Your Board</Text>
          <Text style={styles.heroSub}>
            Select the education board you study under. This lets us personalise all quizzes and tests for you.
          </Text>

          {/* Board count pill */}
          {boardsQuery.data && (
            <View style={styles.countPill}>
              <Ionicons name="list-outline" size={13} color="rgba(255,255,255,0.8)" />
              <Text style={styles.countPillText}>{boardsQuery.data.length} boards available</Text>
            </View>
          )}
        </LinearGradient>

        {/* Board list */}
        {boardsQuery.isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#4F46E5" />
            <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Loading boards…</Text>
          </View>
        ) : boardsQuery.error ? (
          <View style={styles.center}>
            <View style={[styles.stateIconWrap, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="cloud-offline-outline" size={32} color="#EF4444" />
            </View>
            <Text style={[styles.stateTitle, { color: colors.text }]}>Couldn't load boards</Text>
            <Pressable style={styles.retryBtn} onPress={() => boardsQuery.refetch()}>
              <Text style={styles.retryText}>Try Again</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={boardsQuery.data}
            keyExtractor={(b) => getId(b)}
            contentContainerStyle={[
              styles.boardList,
              { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 0) + 24 },
            ]}
            showsVerticalScrollIndicator={false}
            renderItem={({ item, index }) => {
              const palette = getPalette(item.name);
              const abbrev = getAbbrev(item.name);
              return (
                <Pressable
                  style={[styles.boardCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => handleBoardSelect(item)}
                >
                  {/* Left gradient badge */}
                  <LinearGradient
                    colors={palette.grad}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.boardBadge}
                  >
                    <Text style={styles.boardAbbrev}>{abbrev}</Text>
                    <Ionicons name={palette.icon as any} size={11} color="rgba(255,255,255,0.7)" style={{ marginTop: 3 }} />
                  </LinearGradient>

                  {/* Name */}
                  <View style={styles.boardInfo}>
                    <Text style={[styles.boardName, { color: colors.text }]} numberOfLines={2}>
                      {item.name}
                    </Text>
                    <View style={styles.boardMeta}>
                      <View style={[styles.boardMetaDot, { backgroundColor: palette.grad[1] }]} />
                      <Text style={[styles.boardMetaText, { color: colors.mutedForeground }]}>
                        Tap to select board
                      </Text>
                    </View>
                  </View>

                  {/* Arrow */}
                  <LinearGradient
                    colors={[palette.grad[1] + '20', palette.grad[2] + '15']}
                    style={styles.boardArrow}
                  >
                    <Ionicons name="chevron-forward" size={17} color={palette.grad[1]} />
                  </LinearGradient>
                </Pressable>
              );
            }}
          />
        )}
      </View>
    );
  }

  /* ── STANDARD STEP ── */
  const standards = standardsQuery.data ?? [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Hero — uses selected board's palette */}
      <LinearGradient
        colors={boardPalette.grad}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { paddingTop: topPad + 24 }]}
      >
        <View style={styles.blob1} />
        <View style={styles.blob2} />

        {/* Step progress */}
        <View style={styles.stepProgress}>
          <View style={styles.stepPip} />
          <View style={[styles.stepLine, { backgroundColor: 'rgba(255,255,255,0.5)' }]} />
          <View style={styles.stepPip} />
        </View>

        {/* Back to boards */}
        <Pressable
          style={styles.backPill}
          onPress={() => { setStep('board'); setSelectedStandard(null); }}
        >
          <Ionicons name="arrow-back" size={13} color="rgba(255,255,255,0.9)" />
          <Text style={styles.backPillText}>Change board</Text>
        </Pressable>

        <View style={styles.heroIcon}>
          <Ionicons name={boardPalette.icon as any} size={32} color="#FFFFFF" />
        </View>
        <Text style={styles.heroStep}>STEP 2 OF 2</Text>
        <Text style={styles.heroTitle}>Select Your Class</Text>

        {/* Selected board pill */}
        <View style={styles.boardSelectedPill}>
          <Ionicons name="checkmark-circle" size={14} color="rgba(255,255,255,0.9)" />
          <Text style={styles.boardSelectedText}>{selectedBoard?.name}</Text>
        </View>

        <Text style={styles.heroSub}>
          Choose the class you're currently studying in.
        </Text>
      </LinearGradient>

      {/* Standard grid */}
      {standardsQuery.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={boardPalette.grad[1]} />
        </View>
      ) : standards.length === 0 ? (
        <View style={styles.center}>
          <Text style={[styles.stateTitle, { color: colors.mutedForeground }]}>No classes found</Text>
        </View>
      ) : (
        <FlatList
          data={standards}
          keyExtractor={(s) => getId(s)}
          numColumns={3}
          contentContainerStyle={[
            styles.classGrid,
            {
              paddingBottom:
                insets.bottom + (Platform.OS === 'web' ? 34 : 0) +
                (selectedStandard ? 120 : 24),
            },
          ]}
          columnWrapperStyle={styles.classRow}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={[styles.classHint, { color: colors.mutedForeground }]}>
              {standards.length} classes · tap to select
            </Text>
          }
          renderItem={({ item, index }) => {
            const id = getId(item);
            const isSelected = selectedStandard?.id === id;
            const num = getClassNum(item.name);
            const gradPair = CLASS_COLORS[index % CLASS_COLORS.length]!;

            return (
              <Pressable
                style={[
                  styles.classCell,
                  {
                    borderColor: isSelected ? gradPair[0] : colors.border,
                    backgroundColor: isSelected ? 'transparent' : colors.card,
                    shadowColor: isSelected ? gradPair[0] : '#000',
                    shadowOpacity: isSelected ? 0.2 : 0.04,
                  },
                ]}
                onPress={() => handleStandardSelect(item)}
              >
                {isSelected && (
                  <LinearGradient
                    colors={gradPair}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[StyleSheet.absoluteFill, { borderRadius: 20 }]}
                  />
                )}

                {num ? (
                  <>
                    <Text style={[styles.classNum, { color: isSelected ? '#FFFFFF' : colors.mutedForeground }]}>
                      Class
                    </Text>
                    <Text style={[styles.classBigNum, { color: isSelected ? '#FFFFFF' : colors.text }]}>
                      {num}
                    </Text>
                  </>
                ) : (
                  <Text
                    style={[styles.classFull, { color: isSelected ? '#FFFFFF' : colors.text }]}
                    numberOfLines={2}
                  >
                    {item.name}
                  </Text>
                )}

                {isSelected && (
                  <View style={styles.classCheckmark}>
                    <Ionicons name="checkmark-circle" size={16} color="rgba(255,255,255,0.9)" />
                  </View>
                )}
              </Pressable>
            );
          }}
        />
      )}

      {/* ── CONTINUE FLOATING BAR ── */}
      {selectedStandard && (
        <View
          style={[
            styles.continueBar,
            {
              paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 0) + 8,
              backgroundColor: colors.card,
              borderTopColor: colors.border,
            },
          ]}
        >
          <View style={styles.continueLeft}>
            <View style={[styles.continueBadge, { backgroundColor: boardPalette.grad[1] + '18' }]}>
              <Ionicons name="checkmark-circle" size={16} color={boardPalette.grad[1]} />
            </View>
            <View>
              <Text style={[styles.continueLabelSmall, { color: colors.mutedForeground }]}>Selected class</Text>
              <Text style={[styles.continueLabelBig, { color: colors.text }]}>{selectedStandard.name}</Text>
            </View>
          </View>

          <Pressable style={styles.continueBtn} onPress={handleContinue}>
            <LinearGradient
              colors={boardPalette.grad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.continueBtnGrad}
            >
              <Text style={styles.continueBtnText}>Start Learning</Text>
              <Ionicons name="rocket-outline" size={17} color="#FFFFFF" />
            </LinearGradient>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  /* ── Hero ── */
  hero: {
    paddingHorizontal: 24, paddingBottom: 28,
    gap: 10, overflow: 'hidden',
  },
  blob1: {
    position: 'absolute', width: 240, height: 240, borderRadius: 120,
    backgroundColor: 'rgba(255,255,255,0.07)', top: -70, right: -60,
  },
  blob2: {
    position: 'absolute', width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.05)', bottom: -30, left: -40,
  },
  stepProgress: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-end', marginBottom: 4,
  },
  stepPip: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#FFFFFF' },
  stepLine: { width: 30, height: 2.5, borderRadius: 2 },
  heroIcon: {
    width: 76, height: 76, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  heroStep: {
    fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1.2,
  },
  heroTitle: { fontSize: 26, fontWeight: '800', color: '#FFFFFF' },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.72)', lineHeight: 20 },
  countPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, marginTop: 4,
  },
  countPillText: { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },
  backPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, marginBottom: 4,
  },
  backPillText: { fontSize: 12, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },
  boardSelectedPill: {
    flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
  },
  boardSelectedText: { fontSize: 13, color: '#FFFFFF', fontWeight: '700' },

  /* ── Board cards ── */
  boardList: { padding: 16, gap: 12 },
  boardCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 14, borderRadius: 22, borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06, shadowRadius: 10, elevation: 2,
  },
  boardBadge: {
    width: 64, height: 64, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  boardAbbrev: { fontSize: 15, fontWeight: '900', color: '#FFFFFF', letterSpacing: 0.5 },
  boardInfo: { flex: 1 },
  boardName: { fontSize: 15, fontWeight: '700', lineHeight: 22, marginBottom: 4 },
  boardMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  boardMetaDot: { width: 5, height: 5, borderRadius: 3 },
  boardMetaText: { fontSize: 11 },
  boardArrow: {
    width: 38, height: 38, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
  },

  /* ── Class grid ── */
  classGrid: { padding: 16 },
  classRow: { gap: 10, marginBottom: 10 },
  classHint: {
    fontSize: 11, fontWeight: '700', textTransform: 'uppercase',
    letterSpacing: 0.5, marginBottom: 12,
  },
  classCell: {
    flex: 1, aspectRatio: 1, borderRadius: 20, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', position: 'relative',
    shadowOffset: { width: 0, height: 3 }, shadowRadius: 8, elevation: 3,
  },
  classNum: { fontSize: 11, fontWeight: '600', marginBottom: 2 },
  classBigNum: { fontSize: 32, fontWeight: '900', lineHeight: 38 },
  classFull: { fontSize: 12, fontWeight: '700', textAlign: 'center', paddingHorizontal: 4 },
  classCheckmark: { position: 'absolute', top: 6, right: 6 },

  /* ── Continue bar ── */
  continueBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 14, gap: 12,
    borderTopWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06, shadowRadius: 12, elevation: 10,
  },
  continueLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  continueBadge: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  continueLabelSmall: { fontSize: 11, marginBottom: 1 },
  continueLabelBig: { fontSize: 15, fontWeight: '700' },
  continueBtn: { borderRadius: 16, overflow: 'hidden' },
  continueBtnGrad: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 20, paddingVertical: 14,
  },
  continueBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },

  /* ── States ── */
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  stateIconWrap: { width: 72, height: 72, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  stateTitle: { fontSize: 16, fontWeight: '600' },
  loadingText: { fontSize: 14 },
  retryBtn: { backgroundColor: '#4F46E5', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 },
  retryText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
});
