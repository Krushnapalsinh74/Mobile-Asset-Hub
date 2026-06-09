import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { eduApi, getId } from '@/services/api';
import type { Board, Standard } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
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

function getAbbrev(name: string) {
  if (name.length <= 5) return name.toUpperCase();
  return name.split(/\s+/).filter(w => w.length > 2).slice(0, 4).map(w => w[0]!.toUpperCase()).join('');
}

function getClassNum(name: string) { const m = name.match(/\d+/); return m ? m[0] : null; }

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

  /* ── BOARD STEP ── */
  if (step === 'board') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.hero, { paddingTop: topPad + 24 }]}>
          <View style={styles.stepProgress}>
            <View style={[styles.stepPip, { backgroundColor: '#FFF' }]} />
            <View style={[styles.stepLine, { backgroundColor: 'rgba(255,255,255,0.2)' }]} />
            <View style={[styles.stepPip, { backgroundColor: 'rgba(255,255,255,0.25)' }]} />
          </View>

          <View style={styles.heroIcon}>
            <Ionicons name="school-outline" size={28} color="#FFFFFF" />
          </View>
          <Text style={styles.heroStep}>STEP 1 OF 2</Text>
          <Text style={styles.heroTitle}>Choose Your Board</Text>
          <Text style={styles.heroSub}>
            Select the education board you study under.
          </Text>
        </View>

        {boardsQuery.isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Loading boards…</Text>
          </View>
        ) : boardsQuery.error ? (
          <View style={styles.center}>
            <View style={[styles.stateIconWrap, { backgroundColor: colors.muted }]}>
              <Ionicons name="cloud-offline-outline" size={28} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.stateTitle, { color: colors.text }]}>Couldn't load boards</Text>
            <Pressable
              style={[styles.retryBtn, { backgroundColor: colors.primary }]}
              onPress={() => boardsQuery.refetch()}
            >
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
            renderItem={({ item }) => {
              const abbrev = getAbbrev(item.name);
              return (
                <Pressable
                  style={[styles.boardCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => handleBoardSelect(item)}
                >
                  <View style={[styles.boardBadge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.boardAbbrev}>{abbrev}</Text>
                  </View>

                  <View style={styles.boardInfo}>
                    <Text style={[styles.boardName, { color: colors.text }]} numberOfLines={2}>
                      {item.name}
                    </Text>
                    <Text style={[styles.boardMetaText, { color: colors.mutedForeground }]}>
                      Tap to select board
                    </Text>
                  </View>

                  <View style={[styles.boardArrow, { backgroundColor: colors.muted }]}>
                    <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
                  </View>
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
      <View style={[styles.hero, { paddingTop: topPad + 24 }]}>
        <View style={styles.stepProgress}>
          <View style={[styles.stepPip, { backgroundColor: '#FFF' }]} />
          <View style={[styles.stepLine, { backgroundColor: 'rgba(255,255,255,0.6)' }]} />
          <View style={[styles.stepPip, { backgroundColor: '#FFF' }]} />
        </View>

        <Pressable
          style={styles.backPill}
          onPress={() => { setStep('board'); setSelectedStandard(null); }}
        >
          <Ionicons name="arrow-back" size={13} color="rgba(255,255,255,0.7)" />
          <Text style={styles.backPillText}>Change board</Text>
        </Pressable>

        <View style={styles.heroIcon}>
          <Ionicons name="ribbon-outline" size={28} color="#FFFFFF" />
        </View>
        <Text style={styles.heroStep}>STEP 2 OF 2</Text>
        <Text style={styles.heroTitle}>Select Your Class</Text>

        {selectedBoard && (
          <View style={styles.boardSelectedPill}>
            <Ionicons name="checkmark" size={12} color="rgba(255,255,255,0.8)" />
            <Text style={styles.boardSelectedText}>{selectedBoard.name}</Text>
          </View>
        )}
      </View>

      {standardsQuery.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
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
          renderItem={({ item }) => {
            const id = getId(item);
            const isSelected = selectedStandard?.id === id;
            const num = getClassNum(item.name);

            return (
              <Pressable
                style={[
                  styles.classCell,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.card,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => handleStandardSelect(item)}
              >
                {num ? (
                  <>
                    <Text style={[styles.classNum, { color: isSelected ? 'rgba(255,255,255,0.6)' : colors.mutedForeground }]}>
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
                    <Ionicons name="checkmark-circle" size={15} color="rgba(255,255,255,0.9)" />
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
            <View style={[styles.continueBadge, { backgroundColor: colors.muted }]}>
              <Ionicons name="checkmark" size={16} color={colors.text} />
            </View>
            <View>
              <Text style={[styles.continueLabelSmall, { color: colors.mutedForeground }]}>Selected class</Text>
              <Text style={[styles.continueLabelBig, { color: colors.text }]}>{selectedStandard.name}</Text>
            </View>
          </View>

          <Pressable
            style={[styles.continueBtn, { backgroundColor: colors.primary }]}
            onPress={handleContinue}
          >
            <Text style={styles.continueBtnText}>Start Learning</Text>
            <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  hero: {
    backgroundColor: '#0F0F0F',
    paddingHorizontal: 24, paddingBottom: 28,
    gap: 10,
  },
  stepProgress: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-end', marginBottom: 4,
  },
  stepPip: { width: 8, height: 8, borderRadius: 4 },
  stepLine: { width: 28, height: 2, borderRadius: 1 },
  heroIcon: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  heroStep: {
    fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1.2,
  },
  heroTitle: { fontSize: 24, fontWeight: '800', color: '#FFFFFF' },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 20 },
  backPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, marginBottom: 4,
  },
  backPillText: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  boardSelectedPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
  },
  boardSelectedText: { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },

  boardList: { padding: 16, gap: 10 },
  boardCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 14, borderRadius: 18, borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  boardBadge: {
    width: 56, height: 56, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  boardAbbrev: { fontSize: 13, fontWeight: '900', color: '#FFFFFF', letterSpacing: 0.5 },
  boardInfo: { flex: 1 },
  boardName: { fontSize: 15, fontWeight: '700', lineHeight: 21, marginBottom: 3 },
  boardMetaText: { fontSize: 11 },
  boardArrow: {
    width: 34, height: 34, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },

  classGrid: { padding: 16 },
  classRow: { gap: 10, marginBottom: 10 },
  classHint: {
    fontSize: 11, fontWeight: '700', textTransform: 'uppercase',
    letterSpacing: 0.5, marginBottom: 12,
  },
  classCell: {
    flex: 1, aspectRatio: 1, borderRadius: 18, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', position: 'relative',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  classNum: { fontSize: 11, fontWeight: '600', marginBottom: 1 },
  classBigNum: { fontSize: 30, fontWeight: '900', lineHeight: 36 },
  classFull: { fontSize: 11, fontWeight: '700', textAlign: 'center', paddingHorizontal: 4 },
  classCheckmark: { position: 'absolute', top: 6, right: 6 },

  continueBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 14, gap: 12,
    borderTopWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05, shadowRadius: 10, elevation: 8,
  },
  continueLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  continueBadge: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  continueLabelSmall: { fontSize: 11, marginBottom: 1 },
  continueLabelBig: { fontSize: 14, fontWeight: '700' },
  continueBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 18, paddingVertical: 13, borderRadius: 14,
  },
  continueBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  stateIconWrap: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  stateTitle: { fontSize: 16, fontWeight: '600' },
  loadingText: { fontSize: 14 },
  retryBtn: { paddingHorizontal: 22, paddingVertical: 11, borderRadius: 12 },
  retryText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
});
