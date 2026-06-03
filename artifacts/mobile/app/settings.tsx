import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  const { studentName, studentEmail, boardName, standardName, clearAll } = useApp();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const handleClearData = () => {
    const doSignOut = async () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      await clearAll();
      router.replace('/login' as any);
    };
    if (Platform.OS === 'web') {
      if (window.confirm('This will sign you out and clear all saved data. Continue?')) doSignOut();
    } else {
      Alert.alert(
        'Clear All Data',
        'This will sign you out and clear all saved data. You will need to log in again.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Clear & Sign Out', style: 'destructive', onPress: doSignOut },
        ],
      );
    }
  };

  const handleChangeBoard = () => {
    const doChange = async () => {
      await clearAll();
      router.replace('/login' as any);
    };
    if (Platform.OS === 'web') {
      if (window.confirm('This will clear your board and class selection. Continue?')) doChange();
    } else {
      Alert.alert(
        'Change Board / Class',
        'This will clear your current board and class so you can pick a new one.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Change', onPress: doChange },
        ],
      );
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 0) + 16,
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <View style={[styles.backCircle, { backgroundColor: colors.secondary }]}>
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </View>
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Settings</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 0) + 24 },
        ]}
      >
        {/* Profile card */}
        <View style={[styles.profileCard, { backgroundColor: colors.primaryLight, borderColor: colors.primary + '30' }]}>
          <View style={[styles.avatarCircle, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>
              {(studentName ?? 'S').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: colors.text }]} numberOfLines={1}>
              {studentName ?? 'Student'}
            </Text>
            {studentEmail ? (
              <Text style={[styles.profileEmail, { color: colors.mutedForeground }]} numberOfLines={1}>
                {studentEmail}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Board & class */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Education</Text>
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.infoRow}>
            <View style={[styles.infoIcon, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="school-outline" size={16} color={colors.primary} />
            </View>
            <View style={styles.infoText}>
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Board</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{boardName ?? '—'}</Text>
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.infoRow}>
            <View style={[styles.infoIcon, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="layers-outline" size={16} color={colors.primary} />
            </View>
            <View style={styles.infoText}>
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Class</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{standardName ?? '—'}</Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Account</Text>
        <View style={[styles.actionsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Pressable
            style={styles.actionRow}
            onPress={() => { Haptics.selectionAsync(); handleChangeBoard(); }}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#6366F1' + '18' }]}>
              <Ionicons name="swap-horizontal-outline" size={18} color="#6366F1" />
            </View>
            <View style={styles.actionText}>
              <Text style={[styles.actionLabel, { color: colors.text }]}>Change Board / Class</Text>
              <Text style={[styles.actionDesc, { color: colors.mutedForeground }]}>
                Switch to a different board or standard
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
          </Pressable>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <Pressable
            style={styles.actionRow}
            onPress={() => { Haptics.selectionAsync(); handleClearData(); }}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#EF4444' + '18' }]}>
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
            </View>
            <View style={styles.actionText}>
              <Text style={[styles.actionLabel, { color: '#EF4444' }]}>Sign Out & Clear Data</Text>
              <Text style={[styles.actionDesc, { color: colors.mutedForeground }]}>
                Remove all saved data from this device
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
          </Pressable>
        </View>

        <Text style={[styles.version, { color: colors.mutedForeground }]}>EduApp Student</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backBtn: {},
  backCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  content: { padding: 16, gap: 0 },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 22, fontWeight: '700', color: '#FFFFFF', fontFamily: 'Inter_700Bold' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 16, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  profileEmail: { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 2 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 4,
  },
  infoCard: {
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 20,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: { flex: 1 },
  infoLabel: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  infoValue: { fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold', marginTop: 1 },
  divider: { height: 1, marginLeft: 62 },
  actionsCard: {
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 24,
    overflow: 'hidden',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  actionIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: { flex: 1 },
  actionLabel: { fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  actionDesc: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 1 },
  version: { fontSize: 12, fontFamily: 'Inter_400Regular', textAlign: 'center', marginTop: 8 },
});
