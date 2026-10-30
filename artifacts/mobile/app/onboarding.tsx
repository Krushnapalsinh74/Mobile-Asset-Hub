import { useApp } from '@/context/AppContext';
import { eduApi, getId, Board, Standard } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { KNOWLEDGE_PARK_LOGO_IMAGE, APP_SUB_TAGLINE } from '@/constants/branding';

function getBoardIcon(name: string): keyof typeof Ionicons.glyphMap {
  const l = name.toLowerCase();
  if (l.includes('gseb') || l.includes('gujarat')) return 'business';
  if (l.includes('cbse') || l.includes('central board')) return 'book';
  if (l.includes('icse') || l.includes('indian certificate')) return 'medal';
  if (l.includes('state')) return 'map';
  if (l.includes('nios')) return 'globe';
  return 'ellipsis-horizontal-circle';
}

function getBoardSubtitle(name: string): string {
  const l = name.toLowerCase();
  if (l.includes('gseb') || l.includes('gujarat')) return 'Gujarat Secondary and Higher Secondary Education';
  if (l.includes('cbse') || l.includes('central board')) return 'Central Board of Secondary Education';
  if (l.includes('icse') || l.includes('indian certificate')) return 'Indian Certificate of Secondary Education';
  if (l.includes('state') || l.includes('maharashtra')) return 'State education board';
  if (l.includes('nios') || l.includes('open schooling')) return 'National Institute of Open Schooling';
  return 'Custom / Other Board';
}

function getClassNum(name: string) {
  const m = name.match(/\d+/);
  return m ? m[0] : name;
}

export default function OnboardingScreen() {
  const { setBoard, setStandard } = useApp();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 900;
  const selectionWidth = isDesktop ? Math.max((width - 72) * 0.49 - 68, 260) : Math.max(width - 72, 0);
  const boardGap = 10;
  const boardCardWidth = (selectionWidth - boardGap) / 2;
  const standardGap = 10;
  const standardCardWidth = Math.min(104, (selectionWidth - standardGap * 2) / 3);

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

  const topPad = insets.top + (Platform.OS === 'web' ? 16 : 10);
  const boards = boardsQuery.data ?? [];
  const standards = standardsQuery.data ?? [];

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          isDesktop && styles.desktopScrollContent,
          { paddingTop: topPad, paddingBottom: insets.bottom + 20 },
          isDesktop && { minHeight: Math.max(height - topPad - insets.bottom, 640) },
        ]}
      >
        <View style={[styles.layout, isDesktop && styles.desktopLayout]}>
          {isDesktop && (
            <LinearGradient colors={['#C85C3E', '#9E3F2B']} style={styles.brandPanel}>
              <View style={styles.brandPanelCurve} />
              <View>
                <View style={[styles.headerLeft, { backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, alignSelf: 'flex-start', marginBottom: 12 }]}>
                  <Image
                    source={KNOWLEDGE_PARK_LOGO_IMAGE}
                    style={{ width: 180, height: 44 }}
                    resizeMode="contain"
                  />
                </View>
                <Text style={styles.brandEyebrow}>YOUR LEARNING JOURNEY</Text>
                <Text style={styles.brandTitle}>Your success{'\n'}starts here.</Text>
                <Text style={styles.brandDescription}>Choose the right board and class to make your learning experience personal.</Text>
                <View style={styles.brandHighlights}>
                  {[
                    ['sparkles-outline', 'Personalized learning'],
                    ['trophy-outline', 'Practice with confidence'],
                    ['trending-up-outline', 'See your progress'],
                  ].map(([icon, label]) => (
                    <View style={styles.brandHighlight} key={label}>
                      <View style={styles.brandHighlightIcon}>
                        <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={16} color="#C85C3E" />
                      </View>
                      <Text style={styles.brandHighlightText}>{label}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <View style={styles.brandQuote}>
                <Ionicons name="library" size={34} color="#F6DFD2" />
                <Text style={styles.brandQuoteText}>Learn today.{'\n'}Lead tomorrow.</Text>
              </View>
            </LinearGradient>
          )}

          <View style={[styles.formPanel, isDesktop && styles.desktopFormPanel]}>
            {!isDesktop && (
              <View style={[styles.mobileBrand, { backgroundColor: '#FFFFFF', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, alignSelf: 'flex-start', marginBottom: 12 }]}>
                <Image
                  source={KNOWLEDGE_PARK_LOGO_IMAGE}
                  style={{ width: 155, height: 38 }}
                  resizeMode="contain"
                />
              </View>
            )}
            <View style={styles.formHeading}>
              <View style={styles.formBadge}>
                <Ionicons name="lock-closed-outline" size={13} color="#C85C3E" />
                <Text style={styles.formBadgeText}>PERSONALIZE YOUR EXPERIENCE</Text>
              </View>
              <Text style={styles.formTitle}>Build your learning path</Text>
              <Text style={styles.formSubtitle}>Choose your education board and class to get started.</Text>
            </View>

            <View style={styles.selectionSection}>
              <View style={styles.sectionHeading}>
                <View style={styles.stepBadge}><Text style={styles.stepBadgeText}>01</Text></View>
                <View style={styles.sectionHeadingText}>
                  <Text style={styles.sectionTitle}>Choose your board</Text>
                  <Text style={styles.sectionSub}>Select the curriculum you study.</Text>
                </View>
              </View>

              {boardsQuery.isLoading ? (
                <ActivityIndicator style={{ marginTop: 20 }} color="#C85C3E" />
              ) : (
                <View style={styles.boardGrid}>
                  {boards.map((b) => {
                    const isSelected = !!selectedBoard && getId(selectedBoard) === getId(b);
                    const iconName = getBoardIcon(b.name);
                    return (
                      <Pressable
                        key={getId(b)}
                        style={[
                          styles.boardCard,
                          { width: boardCardWidth },
                          isSelected && styles.boardCardSelected,
                        ]}
                        onPress={() => handleBoardSelect(b)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isSelected }}
                      >
                        <View style={[styles.boardIconWrap, isSelected && styles.boardIconWrapSelected]}>
                          <Ionicons name={iconName} size={18} color={isSelected ? '#FFF8EF' : '#C85C3E'} />
                        </View>
                        <View style={styles.boardCardCopy}>
                          <Text style={[styles.boardName, isSelected && styles.boardNameSelected]} numberOfLines={2}>{b.name}</Text>
                          <Text style={styles.boardSub} numberOfLines={1}>{getBoardSubtitle(b.name)}</Text>
                        </View>
                        <View style={[styles.boardSelectMark, isSelected && styles.boardSelectMarkSelected]}>
                          {isSelected && <Ionicons name="checkmark" size={12} color="#FFF" />}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>

            {selectedBoard && (
              <View style={styles.selectionSection}>
                <View style={styles.sectionHeading}>
                  <View style={styles.stepBadge}><Text style={styles.stepBadgeText}>02</Text></View>
                  <View style={styles.sectionHeadingText}>
                    <Text style={styles.sectionTitle}>Choose your class</Text>
                    <Text style={styles.sectionSub}>Your grade in {selectedBoard.name}.</Text>
                  </View>
                </View>

                {standardsQuery.isLoading ? (
              <ActivityIndicator style={{ marginTop: 20 }} color="#C85C3E" />
                ) : (
                  <View style={styles.stdGrid}>
                    {standards.map((s) => {
                      const isSelected = selectedStandard?.id === s.id;
                      return (
                        <Pressable
                          key={getId(s)}
                          style={[
                            styles.stdCard,
                            { width: standardCardWidth },
                            isSelected && styles.stdCardSelected,
                          ]}
                          onPress={() => handleStandardSelect(s)}
                          accessibilityRole="button"
                          accessibilityState={{ selected: isSelected }}
                        >
                          <Text style={styles.stdEyebrow}>CLASS</Text>
                          <Text style={[styles.stdText, isSelected && styles.stdTextSelected]}>{getClassNum(s.name)}</Text>
                          <View style={[styles.stdCheck, isSelected && styles.stdCheckSelected]}>
                            {isSelected && <Ionicons name="checkmark" size={12} color="#C85C3E" />}
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>
            )}

            <View style={[styles.footer, isDesktop && styles.desktopFooter]}>
              <View style={styles.selectionSummary}>
                <Ionicons name="sparkles-outline" size={17} color="#C85C3E" />
                <Text style={styles.selectionSummaryText} numberOfLines={2}>
                  {selectedBoard && selectedStandard
                    ? `${selectedBoard.name} • ${selectedStandard.name}`
                    : selectedBoard
                      ? `${selectedBoard.name} selected`
                      : 'Your choices will personalize your learning'}
                </Text>
              </View>
              <Pressable
                style={[styles.nextBtn, (!selectedBoard || !selectedStandard) && styles.nextBtnDisabled]}
                onPress={handleNext}
                disabled={!selectedBoard || !selectedStandard}
              >
                <Text style={styles.nextBtnText}>Continue</Text>
                <Ionicons name="arrow-forward" size={17} color="#FFF" />
              </Pressable>
            </View>
          </View>

        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4EEE5' },
  scrollContent: { flexGrow: 1, paddingHorizontal: 16, justifyContent: 'center' },
  desktopScrollContent: { paddingHorizontal: 24, paddingVertical: 16 },
  layout: { width: '100%', maxWidth: 1440, alignSelf: 'center' },
  desktopLayout: { flex: 1, flexDirection: 'row', alignItems: 'stretch', gap: 20, maxHeight: 900 },
  brandPanel: {
    flex: 0.9,
    minWidth: 0,
    borderRadius: 26,
    padding: 34,
    justifyContent: 'space-between',
    overflow: 'hidden',
    ...Platform.select({
      web: { boxShadow: '0px 12px 36px rgba(98, 51, 35, 0.16)' },
      default: { elevation: 5 },
    }),
  },
  brandPanelCurve: { position: 'absolute', top: -120, right: -100, width: 320, height: 320, backgroundColor: '#F5D7C8', opacity: 0.18, borderRadius: 180 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoContainer: { width: 46, height: 46, backgroundColor: '#FFF8EF', borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  logoText: { fontSize: 21, fontWeight: '800', color: '#FFF8EF', letterSpacing: -0.5, lineHeight: 23 },
  logoAccent: { color: '#F2B08E' },
  logoTagline: { fontSize: 10, color: '#F8DCCE', fontWeight: '600', marginTop: 3 },
  brandEyebrow: { color: '#F6DFD2', fontSize: 10, fontWeight: '800', letterSpacing: 1.3, marginTop: 48, marginBottom: 12 },
  brandTitle: { color: '#FFF8EF', fontSize: 36, fontWeight: '800', lineHeight: 42, letterSpacing: -0.7 },
  brandDescription: { color: '#F8DCCE', fontSize: 15, lineHeight: 23, marginTop: 14, maxWidth: 390 },
  brandHighlights: { marginTop: 26, gap: 12 },
  brandHighlight: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  brandHighlightIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#FFF8EF', alignItems: 'center', justifyContent: 'center' },
  brandHighlightText: { color: '#FFF8EF', fontSize: 13, fontWeight: '700' },
  brandQuote: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 17, borderRadius: 16, backgroundColor: 'rgba(255, 248, 239, 0.13)', borderWidth: 1, borderColor: 'rgba(255, 248, 239, 0.2)' },
  brandQuoteText: { color: '#FFF8EF', fontSize: 16, fontWeight: '700', lineHeight: 22 },
  formPanel: {
    backgroundColor: '#FFFDF9',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E6DCD2',
    padding: 20,
    ...Platform.select({
      web: { boxShadow: '0px 10px 28px rgba(75, 48, 34, 0.09)' },
      default: { elevation: 3 },
    }),
  },
  desktopFormPanel: { flex: 1.1, minWidth: 0, paddingHorizontal: 34, paddingVertical: 28, justifyContent: 'center' },
  mobileBrand: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 24 },
  mobileLogoIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#C85C3E', alignItems: 'center', justifyContent: 'center' },
  mobileLogoText: { fontSize: 17, fontWeight: '800', color: '#3D2D27', letterSpacing: -0.4 },
  mobileLogoAccent: { color: '#C85C3E' },
  mobileLogoTagline: { fontSize: 9, color: '#8B786B', fontWeight: '600', marginTop: 2 },
  formHeading: { marginBottom: 22 },
  formBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 9, paddingVertical: 6, backgroundColor: '#F8E7DC', borderRadius: 20, marginBottom: 11 },
  formBadgeText: { fontSize: 9, color: '#9E3F2B', fontWeight: '800', letterSpacing: 0.6 },
  formTitle: { fontSize: 25, fontWeight: '800', color: '#3D2D27', letterSpacing: -0.5 },
  formSubtitle: { fontSize: 12, color: '#76645B', lineHeight: 18, marginTop: 5 },
  selectionSection: { marginBottom: 18 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  stepBadge: { width: 32, height: 32, borderRadius: 11, backgroundColor: '#F6DFD2', alignItems: 'center', justifyContent: 'center' },
  stepBadgeText: { color: '#B54F35', fontSize: 11, fontWeight: '800' },
  sectionHeadingText: { flex: 1 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#3D2D27', marginBottom: 2 },
  sectionSub: { fontSize: 11, color: '#76645B' },
  boardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  boardCard: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 11,
    paddingVertical: 10,
    backgroundColor: '#FFFCF8',
    borderWidth: 1,
    borderColor: '#E7DCD2',
    borderRadius: 14,
    ...Platform.select({
      web: { boxShadow: '0px 3px 10px rgba(75, 48, 34, 0.04)' },
      default: { elevation: 1 },
    }),
  },
  boardCardSelected: { borderColor: '#C85C3E', backgroundColor: '#FFF3EA' },
  boardIconWrap: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#F7E8DE', alignItems: 'center', justifyContent: 'center' },
  boardIconWrapSelected: { backgroundColor: '#C85C3E' },
  boardCardCopy: { flex: 1 },
  boardName: { fontSize: 11, fontWeight: '700', color: '#3D2D27', lineHeight: 14, marginBottom: 3 },
  boardNameSelected: { color: '#9E3F2B' },
  boardSub: { fontSize: 9, color: '#8B786B' },
  boardSelectMark: { width: 17, height: 17, borderRadius: 9, borderWidth: 1.3, borderColor: '#D9C9BB', alignItems: 'center', justifyContent: 'center' },
  boardSelectMarkSelected: { borderColor: '#C85C3E', backgroundColor: '#C85C3E' },
  stdGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stdCard: {
    height: 68,
    backgroundColor: '#FFFCF8',
    borderWidth: 1,
    borderColor: '#E7DCD2',
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  stdCardSelected: { backgroundColor: '#FFF3EA', borderColor: '#C85C3E', borderWidth: 1.5 },
  stdEyebrow: { fontSize: 8, color: '#A28D7E', fontWeight: '800', letterSpacing: 1, marginBottom: 2 },
  stdText: { fontSize: 20, fontWeight: '800', color: '#3D2D27' },
  stdTextSelected: { color: '#B54F35' },
  stdCheck: { position: 'absolute', top: 6, right: 6, width: 16, height: 16, borderRadius: 8, borderWidth: 1, borderColor: '#E6DCD2', alignItems: 'center', justifyContent: 'center' },
  stdCheckSelected: { backgroundColor: '#F6DFD2', borderColor: '#F6DFD2' },
  footer: { marginTop: 4, gap: 10 },
  desktopFooter: { flexDirection: 'row', alignItems: 'center' },
  selectionSummary: { minHeight: 38, flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 11, backgroundColor: '#F7EEE5', borderRadius: 11 },
  selectionSummaryText: { flex: 1, color: '#76645B', fontSize: 10, fontWeight: '600' },
  nextBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#C85C3E', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12 },
  nextBtnDisabled: { backgroundColor: '#A49186' },
  nextBtnText: { color: '#FFF', fontSize: 13, fontWeight: '800' },
});
