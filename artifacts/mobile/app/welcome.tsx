import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const benefits = [
  { icon: 'book-outline' as const, label: 'Learn better' },
  { icon: 'flash-outline' as const, label: 'Practice smarter' },
  { icon: 'trending-up-outline' as const, label: 'Track progress' },
];

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 800;
  const Root = isDesktop ? View : ScrollView;

  return (
    <Root
      style={[styles.root, isDesktop && styles.desktopRoot]}
      contentContainerStyle={!isDesktop ? styles.mobileScrollContent : undefined}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.content, isDesktop && styles.desktopContent, { paddingTop: insets.top + (isDesktop ? 32 : 24) }]}>
        <View style={styles.brand}>
          <View style={styles.brandMark}>
            <Ionicons name="school" size={20} color="#FFF8EF" />
          </View>
          <Text style={styles.brandText}>Knowledge<Text style={styles.brandAccent}>Park</Text></Text>
        </View>

        <View style={styles.copy}>
          <Text style={styles.eyebrow}>YOUR PERSONAL STUDY SPACE</Text>
          <Text style={[styles.title, isDesktop && styles.desktopTitle]}>
            Learn with{'\n'}purpose. Grow with{'\n'}confidence.
          </Text>
          <Text style={styles.description}>
            A calmer, smarter way to master every subject and make steady progress every day.
          </Text>

          <View style={styles.benefits}>
            {benefits.map((benefit) => (
              <View key={benefit.label} style={styles.benefit}>
                <View style={styles.benefitIcon}>
                  <Ionicons name={benefit.icon} size={16} color="#C85C3E" />
                </View>
                <Text style={styles.benefitLabel}>{benefit.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {!isDesktop && <WelcomeButton />}
      </View>

      <View style={[styles.visualSide, isDesktop && styles.desktopVisualSide]}>
        <View style={styles.visualGlow} />
        <View style={styles.visualHeader}>
          <Text style={styles.visualHeaderLabel}>TODAY'S FOCUS</Text>
          <Ionicons name="ellipsis-horizontal" size={20} color="#A49186" />
        </View>
        <View style={styles.progressRow}>
          <View style={styles.progressIcon}>
            <Ionicons name="bulb-outline" size={22} color="#C85C3E" />
          </View>
          <View style={styles.progressCopy}>
            <Text style={styles.progressTitle}>Keep going</Text>
            <Text style={styles.progressSubtitle}>You are building a great habit</Text>
          </View>
          <Text style={styles.progressValue}>72%</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={styles.progressFill} />
        </View>
        <View style={styles.visualCards}>
          <View style={[styles.subjectCard, styles.subjectCardPrimary]}>
            <View style={styles.subjectIcon}>
              <Ionicons name="calculator-outline" size={22} color="#7B5BB7" />
            </View>
            <Text style={styles.subjectName}>Mathematics</Text>
            <Text style={styles.subjectMeta}>Chapter 4 · 8 topics</Text>
            <View style={styles.cardArrow}>
              <Ionicons name="arrow-forward" size={15} color="#FFF8EF" />
            </View>
          </View>
          <View style={[styles.subjectCard, styles.subjectCardSecondary]}>
            <View style={styles.subjectIconGreen}>
              <Ionicons name="flask-outline" size={22} color="#249A7A" />
            </View>
            <Text style={styles.subjectName}>Physics</Text>
            <Text style={styles.subjectMeta}>Continue learning</Text>
          </View>
        </View>
        <View style={styles.streakBadge}>
          <Ionicons name="flame" size={18} color="#C85C3E" />
          <Text style={styles.streakText}>5 day streak</Text>
        </View>
      </View>

      {isDesktop && <View style={styles.desktopButton}><WelcomeButton /></View>}
    </Root>
  );
}

function WelcomeButton() {
  return (
    <Pressable style={styles.startBtn} onPress={() => router.push('/login' as any)}>
      <Text style={styles.startBtnText}>Get Started</Text>
      <Ionicons name="arrow-forward" size={18} color="#FFF" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4EEE5' },
  mobileScrollContent: { flexGrow: 1 },
  desktopRoot: {
    flexDirection: 'row',
    paddingHorizontal: '7%',
    position: 'relative',
  },
  content: {
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: 'auto',
    paddingHorizontal: 24,
    paddingBottom: 28,
  },
  desktopContent: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    flex: 1,
    maxWidth: 600,
    paddingHorizontal: 0,
    paddingRight: 56,
    justifyContent: 'center',
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandMark: {
    width: 38, height: 38, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#C85C3E',
  },
  brandText: { color: '#3D2D27', fontSize: 18, fontWeight: '800', letterSpacing: -0.5 },
  brandAccent: { color: '#C85C3E' },
  copy: { paddingVertical: 34 },
  eyebrow: {
    color: '#C85C3E', fontSize: 11, fontWeight: '800',
    letterSpacing: 1.6, marginBottom: 18,
  },
  title: {
    color: '#3D2D27', fontSize: 43, lineHeight: 47,
    fontWeight: '800', letterSpacing: -1.4,
  },
  desktopTitle: { fontSize: 58, lineHeight: 61, letterSpacing: -2 },
  description: {
    maxWidth: 440, color: '#76645B', fontSize: 17,
    lineHeight: 26, marginTop: 22,
  },
  benefits: { gap: 12, marginTop: 28 },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  benefitIcon: {
    width: 30, height: 30, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F6DFD2',
  },
  benefitLabel: { color: '#4D403A', fontSize: 15, fontWeight: '600' },
  visualSide: {
    minHeight: 380,
    marginTop: 24,
    padding: 22,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#FFF8EF',
    borderWidth: 1,
    borderColor: '#E7D7C8',
  },
  desktopVisualSide: {
    flex: 0.9,
    maxWidth: 530,
    minHeight: 0,
    alignSelf: 'center',
    marginTop: 0,
    marginBottom: 50,
    padding: 30,
    borderRadius: 34,
    shadowColor: '#8E422E',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.12,
    shadowRadius: 30,
    elevation: 6,
  },
  visualGlow: {
    position: 'absolute', width: 260, height: 260, borderRadius: 130,
    right: -80, top: -90, backgroundColor: '#F6DFD2',
  },
  visualHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  visualHeaderLabel: { color: '#8B786D', fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  progressRow: { flexDirection: 'row', alignItems: 'center', marginTop: 28 },
  progressIcon: {
    width: 48, height: 48, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#F6DFD2',
  },
  progressCopy: { flex: 1, marginLeft: 12 },
  progressTitle: { color: '#3D2D27', fontSize: 17, fontWeight: '800' },
  progressSubtitle: { color: '#8B786D', fontSize: 12, marginTop: 3 },
  progressValue: { color: '#C85C3E', fontSize: 15, fontWeight: '800' },
  progressTrack: { height: 8, borderRadius: 5, backgroundColor: '#F0E4D9', marginTop: 16 },
  progressFill: { width: '72%', height: '100%', borderRadius: 5, backgroundColor: '#C85C3E' },
  visualCards: { flexDirection: 'row', gap: 12, marginTop: 22 },
  subjectCard: {
    flex: 1, minHeight: 150, padding: 16, borderRadius: 20,
    position: 'relative',
  },
  subjectCardPrimary: { backgroundColor: '#EEE7FA' },
  subjectCardSecondary: { backgroundColor: '#E3F4EE' },
  subjectIcon: {
    width: 42, height: 42, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF8EF',
  },
  subjectIconGreen: {
    width: 42, height: 42, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4FFFA',
  },
  subjectName: { color: '#3D2D27', fontSize: 15, fontWeight: '800', marginTop: 18 },
  subjectMeta: { color: '#76645B', fontSize: 11, marginTop: 4 },
  cardArrow: {
    position: 'absolute', right: 14, bottom: 14, width: 28, height: 28,
    borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#C85C3E',
  },
  streakBadge: {
    alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7,
    marginTop: 20, paddingHorizontal: 13, paddingVertical: 9,
    borderRadius: 20, backgroundColor: '#FFF1E7',
  },
  streakText: { color: '#8E422E', fontSize: 12, fontWeight: '800' },
  startBtn: {
    height: 58, borderRadius: 17, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#C85C3E',
    shadowColor: '#8E422E', shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.24, shadowRadius: 9, elevation: 4,
  },
  startBtnText: { color: '#FFF', fontSize: 17, fontWeight: '800' },
  desktopButton: {
    position: 'absolute', left: '7%', bottom: 26, width: 230,
  },
});
