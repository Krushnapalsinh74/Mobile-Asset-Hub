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
      <LinearGradient
        colors={['#312E81', '#4F46E5']}
        style={[styles.header, { paddingTop: topPad }]}
      >
        <Text style={styles.headerTitle}>
          {step === 'board' ? 'Select Your Board' : 'Select Your Class'}
        </Text>
        <Text style={styles.headerSub}>
          {step === 'board'
            ? 'Choose your education board'
            : `Setting up for ${selectedBoard?.name}`}
        </Text>
        <View style={styles.stepRow}>
          <View style={[styles.stepDot, styles.stepDotActive]} />
          <View style={[styles.stepLine, step === 'standard' && styles.stepLineActive]} />
          <View style={[styles.stepDot, step === 'standard' && styles.stepDotActive]} />
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 0) + 24 },
        ]}
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
                <Ionicons name="cloud-offline-outline" size={44} color={colors.destructive} />
                <Text style={[styles.errorText, { color: colors.destructive }]}>
                  Failed to load boards
                </Text>
                <Pressable
                  onPress={() => boardsQuery.refetch()}
                  style={[styles.retryBtn, { backgroundColor: colors.primary }]}
                >
                  <Text style={styles.retryText}>Retry</Text>
                </Pressable>
              </View>
            )}
            {boardsQuery.data?.map((board) => (
              <Pressable
                key={getId(board)}
                style={[
                  styles.selCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
                onPress={() => handleBoardSelect(board)}
              >
                <View style={[styles.selIcon, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="school-outline" size={22} color={colors.primary} />
                </View>
                <Text style={[styles.selText, { color: colors.text }]}>{board.name}</Text>
                <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
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
              <Ionicons name="arrow-back" size={16} color={colors.primary} />
              <Text style={[styles.backText, { color: colors.primary }]}>{selectedBoard?.name}</Text>
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
                      size={22}
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
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
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
  header: { paddingHorizontal: 24, paddingBottom: 28 },
  headerTitle: {
    fontSize: 27,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Inter_700Bold',
    marginBottom: 6,
  },
  headerSub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.72)',
    fontFamily: 'Inter_400Regular',
    marginBottom: 20,
  },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  stepDotActive: { backgroundColor: '#FFFFFF' },
  stepLine: { flex: 1, height: 2, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 2 },
  stepLineActive: { backgroundColor: '#FFFFFF' },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, gap: 10 },
  loaderWrap: { alignItems: 'center', paddingTop: 40, gap: 12 },
  loaderText: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  errorWrap: { alignItems: 'center', paddingTop: 40, gap: 14 },
  errorText: { fontSize: 15, fontFamily: 'Inter_500Medium' },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 11, borderRadius: 10 },
  retryText: { color: '#FFFFFF', fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  selCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  selIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'Inter_500Medium',
  },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4, paddingVertical: 4 },
  backText: { fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    padding: 17,
    gap: 8,
    marginTop: 8,
  },
  continueBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
});
