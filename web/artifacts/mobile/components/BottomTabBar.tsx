import { useColors } from '@/hooks/useColors';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const BOTTOM_TAB_INNER_HEIGHT = 65;

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
        const color = isActive ? '#2563EB' : '#94A3B8';
        
        return (
          <Pressable
            key={tab.key}
            style={styles.tabItem}
            onPress={() => handleTabPress(tab.key)}
          >
            <View style={styles.iconContainer}>
              <Ionicons
                name={isActive ? tab.activeIcon : tab.icon}
                size={22}
                color={color}
              />
              {/* Notification badge mock for specific icons */}
              {tab.key === 'notifications' && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>3</Text>
                </View>
              )}
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
    borderTopWidth: 1,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 10,
    backgroundColor: '#FFF'
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 4,
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: '#EF4444',
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFF',
  },
  badgeText: {
    color: '#FFF',
    fontSize: 8,
    fontWeight: 'bold',
  }
});
