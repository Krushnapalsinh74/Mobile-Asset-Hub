import { useColors } from '@/hooks/useColors';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const BOTTOM_TAB_INNER_HEIGHT = 58;

type TabDef = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
};

const TABS: TabDef[] = [
  { key: 'home',     label: 'Home',     icon: 'home-outline',     activeIcon: 'home' },
  { key: 'practice', label: 'Practice', icon: 'trophy-outline',   activeIcon: 'trophy' },
  { key: 'settings', label: 'Settings', icon: 'settings-outline', activeIcon: 'settings' },
];

function handleTabPress(key: string) {
  if (key === 'home' || key === 'practice') router.push('/subjects' as any);
  else if (key === 'settings') router.push('/settings' as any);
}

export function BottomTabBar({ activeTab = 'home' }: { activeTab?: string }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <View style={[
      styles.bar,
      {
        backgroundColor: colors.card,
        borderTopColor: colors.border,
        paddingBottom: insets.bottom + (Platform.OS === 'web' ? 8 : 0),
      },
    ]}>
      {TABS.map(tab => {
        const isActive = tab.key === activeTab;
        return (
          <Pressable
            key={tab.key}
            style={styles.tabItem}
            onPress={() => handleTabPress(tab.key)}
          >
            <View style={[
              styles.iconWrap,
              { backgroundColor: isActive ? colors.primary + '18' : 'transparent' },
            ]}>
              <Ionicons
                name={isActive ? tab.activeIcon : tab.icon}
                size={22}
                color={isActive ? colors.primary : colors.mutedForeground}
              />
            </View>
            <Text style={[
              styles.label,
              { color: isActive ? colors.primary : colors.mutedForeground },
            ]}>
              {tab.label}
            </Text>
            {isActive && <View style={[styles.activeDot, { backgroundColor: colors.primary }]} />}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingBottom: 2,
  },
  iconWrap: {
    width: 48,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 1,
  },
});
