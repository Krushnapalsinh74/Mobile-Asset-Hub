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
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Step = 'board' | 'standard';

export default function OnboardingScreen() {
  const [step, setStep] = useState<Step>('board');
  const [selectedBoard, setSelectedBoard] = useState<{ id: string; name: string } | null>(null);
  const [selectedStandard, setSelectedStandard] = useState<{ id: string; name: string } | null>(null);
  const { setBoard, setStandard } = useApp();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const boardsQuery = useQuery({
    queryKey: ['boards'],
    queryFn: eduApi.getBoards,
  });

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
    setSelectedStandard({ id: getId(std), name: std.name });
  };

  const handleContinue = async () => {
    if (!selectedBoard || !selectedStandard) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await setBoard(selectedBoard.id, selectedBoard.name);
    await setStandard(selectedStandard.id, selectedStandard.name);
    router.replace('/subjects');
  };

  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0) + 20;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: topPad, backgroundColor: colors.primary },
        ]}
      >
        <View style={styles.headerTop}>
          <View style={[styles.headerIcon, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
            <Ionicons
              name={step === 'board' ? 'school-outline' : 'layers-outline'}
              size={22}
              color="#FFFFFF"
            />
          </View>
          <View style={styles.stepIndicator}>
            <View style={[styles.stepDot, styles.stepDotActive]} />
            <View style={[styles.stepLine, step === 'standard' && styles.stepLineActive]} />
            <View style={[styles.stepDot, step === 'standard' && styles.stepDotActive]} />
          </View>
        </View>
        <Text style={styles.headerTitle}>
          {step === 'board' ? 'Select Your Board' : 'Select Your Class'}
        </Text>
        <Text style={styles.headerSub}>
          {step === 'board'
            ? 'Choose your education board to get started'
            : `Setting up for ${selectedBoard?.name}`}
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 0) + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {step === 'board' && (
          <>
            {boardsQuery.isLoading && (
              <View style={styles.loaderWrap}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loaderText, { color: colors.mutedForeground }]}>
                  Loading boards...
                </Text>
              </View>
            )}
            {boardsQuery.error && (
              <View style={styles.errorWrap}>
                <View style={[styles.errorIcon, { backgroundColor: colors.secondary }]}>
                  <Ionicons name="cloud-offline-outline" size={32} color={colors.destructive} />
                </View>
                <Text style={[styles.errorText, { color: colors.text }]}>
                  Failed to load boards
                </Text>
                <Pressable
                  onPress={() => boardsQuery.refetch()}
                  style={[styles.retryBtn, { backgroundColor: colors.primary }]}
                >
                  <Text style={styles.retryText}>Try Again</Text>
                </Pressable>
              </View>
            )}
            {boardsQuery.data?.map((board) => (
              <Pressable
                key={getId(board)}
                style={[styles.selCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => handleBoardSelect(board)}
              >
                <View style={[styles.selIcon, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="school-outline" size={20} color={colors.primary} />
                </View>
                <Text style={[styles.selText, { color: colors.text }]}>{board.name}</Text>
                <View style={[styles.selChevron, { backgroundColor: colors.secondary }]}>
                  <Ionicons name="chevron-forward" size={15} color={colors.mutedForeground} />
                </View>
              </Pressable>
            ))}
          </>
        )}

        {step === 'standard' && (
          <>
            <Pressable
              style={styles.backRow}
              onPress={() => { setStep('board'); setSelectedStandard(null); }}
            >
              <View style={[styles.backCircle, { backgroundColor: colors.secondary }]}>
                <Ionicons name="arrow-back" size={15} color={colors.primary} />
              </View>
              <Text style={[styles.backText, { color: colors.primary }]}>
                {selectedBoard?.name}
              </Text>
            </Pressable>

            {standardsQuery.isLoading && (
              <View style={styles.loaderWrap}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            )}

            {standardsQuery.data?.map((std) => {
              const isSelected = selectedStandard?.id === getId(std);
              return (
                <Pressable
                  key={getId(std)}
                  style={[
                    styles.selCard,
                    {
                      backgroundColor: isSelected ? colors.primaryLight : colors.card,
                      borderColor: isSelected ? colors.primary : colors.border,
                      borderWidth: isSelected ? 2 : 1,
                    },
                  ]}
                  onPress={() => handleStandardSelect(std)}
                >
                  <View
                    style={[
                      styles.selIcon,
                      { backgroundColor: isSelected ? colors.primary : colors.secondary },
                    ]}
                  >
                    <Ionicons
                      name="layers-outline"
                      size={20}
                      color={isSelected ? '#FFFFFF' : colors.primary}
                    />
                  </View>
                  <Text
                    style={[
                      styles.selText,
                      {
                        color: colors.text,
                        fontWeight: isSelected ? '700' : '500',
                        fontFamily: isSelected ? 'Inter_700Bold' : 'Inter_500Medium',
                      },
                    ]}
                  >
                    {std.name}
                  </Text>
                  {isSelected ? (
                    <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                  ) : (
                    <View style={[styles.selChevron, { backgroundColor: colors.secondary }]}>
                      <Ionicons name="chevron-forward" size={15} color={colors.mutedForeground} />
                    </View>
                  )}
                </Pressable>
              );
            })}

            {selectedStandard && (
              <Pressable
                style={[styles.continueBtn, { backgroundColor: colors.primary }]}
                onPress={handleContinue}
              >
                <Text style={styles.continueBtnText}>Let's Learn</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </Pressable>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 24 },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIndicator: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  stepDotActive: { backgroundColor: '#FFFFFF' },
  stepLine: { width: 32, height: 2, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 2 },
  stepLineActive: { backgroundColor: '#FFFFFF' },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Inter_700Bold',
    marginBottom: 6,
  },
  headerSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.72)',
    fontFamily: 'Inter_400Regular',
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 10 },
  loaderWrap: { alignItems: 'center', paddingTop: 40, gap: 12 },
  loaderText: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  errorWrap: { alignItems: 'center', paddingTop: 40, gap: 14 },
  errorIcon: {
    width: 68,
    height: 68,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  errorText: { fontSize: 15, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14, marginTop: 4 },
  retryText: { color: '#FFFFFF', fontWeight: '700', fontFamily: 'Inter_700Bold', fontSize: 14 },
  selCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  selIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selText: { flex: 1, fontSize: 15, fontWeight: '500', fontFamily: 'Inter_500Medium' },
  selChevron: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4, paddingVertical: 4 },
  backCircle: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    padding: 16,
    gap: 8,
    marginTop: 6,
  },
  continueBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', fontFamily: 'Inter_700Bold' },
});
