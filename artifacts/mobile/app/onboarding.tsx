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

const BOARD_COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#8B5CF6', '#F97316', '#14B8A6'];

function getBoardColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return BOARD_COLORS[Math.abs(h) % BOARD_COLORS.length];
}

function getAbbrev(name: string) {
  if (name.length <= 6) return name.toUpperCase();
  const words = name.split(/\s+/).filter(w => w.length > 2);
  return words.slice(0, 4).map(w => w[0].toUpperCase()).join('');
}

function getClassNumber(name: string): string | null {
  const m = name.match(/\d+/);
  return m ? m[0] : null;
}

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
    Haptics.selectionAsync();
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

  const renderBoardItem = ({ item, index }: { item: Board; index: number }) => {
    const color = getBoardColor(item.name);
    const abbrev = getAbbrev(item.name);
    return (
      <Pressable
        style={[styles.boardCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => handleBoardSelect(item)}
      >
        <View style={[styles.boardBadge, { backgroundColor: color + '18', borderColor: color + '40' }]}>
          <Text style={[styles.boardBadgeText, { color }]}>{abbrev}</Text>
        </View>
        <View style={styles.boardInfo}>
          <Text style={[styles.boardName, { color: colors.text }]} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={[styles.boardTap, { color: colors.mutedForeground }]}>
            Tap to select
          </Text>
        </View>
        <View style={[styles.boardArrow, { backgroundColor: color + '18' }]}>
          <Ionicons name="chevron-forward" size={16} color={color} />
        </View>
      </Pressable>
    );
  };

  const renderStandardItem = ({ item }: { item: Standard }) => {
    const id = getId(item);
    const isSelected = selectedStandard?.id === id;
    const num = getClassNumber(item.name);
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
            <Text style={[styles.classNum, { color: isSelected ? '#FFFFFF' : colors.text }]}>
              {num}
            </Text>
            <Text style={[styles.classLabel, { color: isSelected ? 'rgba(255,255,255,0.75)' : colors.mutedForeground }]}>
              Class
            </Text>
          </>
        ) : (
          <Text style={[styles.classNumFull, { color: isSelected ? '#FFFFFF' : colors.text }]} numberOfLines={2}>
            {item.name}
          </Text>
        )}
        {isSelected && (
          <View style={styles.classCheck}>
            <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Hero header */}
      <View style={[styles.hero, { paddingTop: topPad + 24, backgroundColor: colors.primary }]}>
        <View style={styles.heroSteps}>
          <View style={[styles.stepDot, styles.stepDotActive]} />
          <View style={[styles.stepLine, step === 'standard' && styles.stepLineActive]} />
          <View style={[styles.stepDot, step === 'standard' && styles.stepDotActive]} />
        </View>
        <View style={[styles.heroIconWrap, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
          <Ionicons
            name={step === 'board' ? 'school' : 'layers'}
            size={30}
            color="#FFFFFF"
          />
        </View>
        <Text style={styles.heroTitle}>
          {step === 'board' ? 'Choose Your Board' : 'Select Your Class'}
        </Text>
        <Text style={styles.heroSub}>
          {step === 'board'
            ? 'Pick the education board you study under'
            : `${selectedBoard?.name} — choose your standard`}
        </Text>
      </View>

      {/* Back button for standard step */}
      {step === 'standard' && (
        <Pressable
          style={[styles.backRow, { borderBottomColor: colors.border }]}
          onPress={() => { setStep('board'); setSelectedStandard(null); }}
        >
          <View style={[styles.backCircle, { backgroundColor: colors.secondary }]}>
            <Ionicons name="arrow-back" size={15} color={colors.primary} />
          </View>
          <Text style={[styles.backText, { color: colors.primary }]}>Back to boards</Text>
        </Pressable>
      )}

      {/* Board list */}
      {step === 'board' && (
        boardsQuery.isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Loading boards…</Text>
          </View>
        ) : boardsQuery.error ? (
          <View style={styles.center}>
            <Ionicons name="cloud-offline-outline" size={40} color={colors.destructive} />
            <Text style={[styles.errorText, { color: colors.text }]}>Failed to load boards</Text>
            <Pressable style={[styles.retryBtn, { backgroundColor: colors.primary }]} onPress={() => boardsQuery.refetch()}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={boardsQuery.data}
            keyExtractor={(b) => getId(b)}
            renderItem={renderBoardItem}
            contentContainerStyle={[
              styles.list,
              { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 0) + 24 },
            ]}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              <Text style={[styles.listHint, { color: colors.mutedForeground }]}>
                {boardsQuery.data?.length ?? 0} boards available
              </Text>
            }
          />
        )
      )}

      {/* Standard grid */}
      {step === 'standard' && (
        standardsQuery.isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={standardsQuery.data}
            keyExtractor={(s) => getId(s)}
            numColumns={3}
            renderItem={renderStandardItem}
            contentContainerStyle={[
              styles.classGrid,
              { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 0) + 100 },
            ]}
            columnWrapperStyle={styles.classRow}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              <Text style={[styles.listHint, { color: colors.mutedForeground }]}>
                {standardsQuery.data?.length ?? 0} classes available
              </Text>
            }
          />
        )
      )}

      {/* Continue button */}
      {step === 'standard' && selectedStandard && (
        <View style={[
          styles.continueBar,
          {
            paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 0) + 8,
            backgroundColor: colors.card,
            borderTopColor: colors.border,
          },
        ]}>
          <View style={styles.continueInfo}>
            <Text style={[styles.continueLabel, { color: colors.mutedForeground }]}>Selected</Text>
            <Text style={[styles.continueValue, { color: colors.text }]}>{selectedStandard.name}</Text>
          </View>
          <Pressable style={[styles.continueBtn, { backgroundColor: colors.primary }]} onPress={handleContinue}>
            <Text style={styles.continueBtnText}>Let's Learn</Text>
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
    paddingHorizontal: 24,
    paddingBottom: 28,
    alignItems: 'center',
    gap: 10,
  },
  heroSteps: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    alignSelf: 'flex-end',
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  stepDotActive: { backgroundColor: '#FFFFFF' },
  stepLine: { width: 28, height: 2, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 2 },
  stepLineActive: { backgroundColor: '#FFFFFF' },
  heroIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Inter_700Bold',
  },
  heroSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.72)',
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backCircle: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  list: { padding: 16, gap: 10 },
  listHint: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginBottom: 8,
  },
  /* Board card */
  boardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  boardBadge: {
    width: 58,
    height: 58,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boardBadgeText: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.5,
  },
  boardInfo: { flex: 1 },
  boardName: { fontSize: 15, fontWeight: '700', fontFamily: 'Inter_700Bold', lineHeight: 22 },
  boardTap: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },
  boardArrow: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /* Class grid */
  classGrid: { padding: 16, gap: 10 },
  classRow: { gap: 10, marginBottom: 10 },
  classCell: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    padding: 8,
  },
  classNum: {
    fontSize: 28,
    fontWeight: '800',
    fontFamily: 'Inter_700Bold',
    lineHeight: 34,
  },
  classLabel: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  classNumFull: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
  },
  classCheck: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  /* Continue bar */
  continueBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    gap: 12,
  },
  continueInfo: { flex: 1 },
  continueLabel: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  continueValue: { fontSize: 15, fontWeight: '700', fontFamily: 'Inter_700Bold', marginTop: 1 },
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 16,
  },
  continueBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  /* States */
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  loadingText: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  errorText: { fontSize: 16, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 },
  retryText: { color: '#FFFFFF', fontWeight: '700', fontFamily: 'Inter_700Bold', fontSize: 14 },
});
