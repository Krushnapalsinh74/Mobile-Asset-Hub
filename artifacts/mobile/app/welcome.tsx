import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <View style={[styles.content, { paddingTop: insets.top + 60 }]}>
        <View style={styles.iconContainer}>
          <Ionicons name="school" size={80} color="#5B4AF0" />
        </View>

        <Text style={styles.title}>One App{'\n'}Endless{'\n'}Possibilities</Text>

        <View style={styles.list}>
          {['Learn Better', 'Practice Smarter', 'Track Progress', 'Achieve More'].map((item, i) => (
            <View key={i} style={styles.listItem}>
              <View style={styles.checkCircle}>
                <Ionicons name="checkmark" size={16} color="#5B4AF0" />
              </View>
              <Text style={styles.listText}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={styles.handwrittenWrap}>
          <Text style={styles.handwrittenText}>Your Future Starts Here</Text>
          <View style={styles.underline} />
        </View>
      </View>

      <View style={[styles.bottomBlock, { paddingBottom: insets.bottom + 24 }]}>
        <Pressable style={styles.startBtn} onPress={() => router.push('/login' as any)}>
          <Text style={styles.startBtnText}>Get Started</Text>
          <Ionicons name="arrow-forward" size={18} color="#FFF" style={{ marginLeft: 8 }} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { flex: 1, paddingHorizontal: 40 },
  
  iconContainer: { marginBottom: 24 },
  
  title: {
    fontSize: 42,
    fontWeight: '900',
    color: '#3B27ED',
    lineHeight: 48,
    marginBottom: 40,
    letterSpacing: -1,
  },

  list: { gap: 16, marginBottom: 40 },
  listItem: { flexDirection: 'row', alignItems: 'center' },
  checkCircle: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#EEF2FF',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 16,
  },
  listText: { fontSize: 18, color: '#334155', fontWeight: '500' },

  handwrittenWrap: { alignItems: 'flex-start', transform: [{ rotate: '-4deg' }], marginTop: 20 },
  handwrittenText: {
    fontSize: 28,
    color: '#5B4AF0',
    fontStyle: 'italic',
    fontWeight: '700',
  },
  underline: {
    height: 3,
    backgroundColor: '#5B4AF0',
    width: '110%',
    marginTop: 4,
    borderRadius: 2,
  },

  bottomBlock: { paddingHorizontal: 24, paddingTop: 20 },
  startBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#5B4AF0', paddingVertical: 18, borderRadius: 20,
    shadowColor: '#5B4AF0', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  startBtnText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
});
