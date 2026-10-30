import { useColors } from '@/hooks/useColors';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const BOTTOM_TAB_INNER_HEIGHT = 64;

type TabDef = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
};

const TABS: TabDef[] = [
  { key: 'home',    label: 'Home',    icon: 'home-outline',     activeIcon: 'home'     },
  { key: 'history', label: 'History', icon: 'time-outline',     activeIcon: 'time'     },
  { key: 'saved',   label: 'Saved',   icon: 'bookmark-outline', activeIcon: 'bookmark' },
  { key: 'profile', label: 'Profile', icon: 'person-outline',   activeIcon: 'person'   },
];

function handleTabPress(key: string) {
  if (key === 'home') router.replace('/subjects' as any);
  if (key === 'history') router.replace('/history' as any);
  if (key === 'saved') router.replace('/saved' as any);
  if (key === 'profile') router.replace('/settings' as any);
}

export function BottomTabBar({ activeTab = 'home' }: { activeTab?: string }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const selectedTab = activeTab === 'settings' ? 'profile' : activeTab;

  return (
    <View style={[
      styles.bar,
      {
        backgroundColor: colors.card,
        borderColor: colors.border,
        paddingBottom: insets.bottom + 7,
      },
    ]}>
      {TABS.map(tab => {
        const isActive = tab.key === selectedTab;
        const color = isActive ? '#FFF8EF' : '#8B786D';
        
        return (
          <Pressable
            key={tab.key}
            style={[styles.tabItem, isActive && styles.tabItemActive]}
            onPress={() => handleTabPress(tab.key)}
            accessibilityRole="button"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: isActive }}
          >
            <View style={styles.iconContainer}>
              <Ionicons
                name={isActive ? tab.activeIcon : tab.icon}
                size={20}
                color={color}
              />
            </View>
            <Text style={[styles.label, { color }]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 22,
    marginHorizontal: 12,
    maxWidth: 520,
    width: '94%',
    alignSelf: 'center',
    marginBottom: Platform.OS === 'web' ? 12 : 0,
    paddingHorizontal: 8,
    paddingTop: 7,
    shadowColor: '#3D2D27',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.09,
    shadowRadius: 12,
    elevation: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 16,
    gap: 2,
  },
  tabItemActive: { backgroundColor: '#C85C3E' },
  iconContainer: {
    position: 'relative',
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
  },
});
