import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { KNOWLEDGE_PARK_LOGO_IMAGE } from '@/constants/branding';

export type DesktopNavTab = 'home' | 'history' | 'saved' | 'mistakes' | 'chat' | 'settings';

interface DesktopHeaderNavProps {
  activeTab?: DesktopNavTab;
}

export function DesktopHeaderNav({ activeTab }: DesktopHeaderNavProps) {
  const { studentName, boardName, standardName, savedQuestions, mistakeQuestions } = useApp();

  return (
    <View style={styles.desktopNav}>
      {/* ── LEFT: BRAND & BOARD PILL ── */}
      <View style={styles.desktopNavLeft}>
        <Pressable
          style={styles.desktopLogoGroup}
          onPress={() => router.replace('/subjects')}
          accessibilityLabel="Go to Knowledge Park home"
        >
          <Image
            source={KNOWLEDGE_PARK_LOGO_IMAGE}
            style={styles.desktopLogoImg}
            resizeMode="contain"
          />
        </Pressable>

        <View style={styles.desktopBoardPill}>
          <View style={styles.desktopBoardDot} />
          <Text style={styles.desktopBoardText} numberOfLines={1}>
            {boardName || 'Gujarat Board'} • {standardName || 'Class 11'}
          </Text>
        </View>
      </View>

      {/* ── RIGHT: DESKTOP NAVIGATION LINKS ── */}
      <View style={styles.desktopNavRight}>
        {/* Home */}
        <Pressable
          style={({ hovered }: any) => [
            styles.desktopNavLink,
            activeTab === 'home' && styles.desktopNavLinkActive,
            hovered && styles.desktopNavLinkHovered,
          ]}
          onPress={() => router.replace('/subjects')}
        >
          <Ionicons
            name={activeTab === 'home' ? 'home' : 'home-outline'}
            size={16}
            color={activeTab === 'home' ? '#C85C3E' : '#5E4B42'}
          />
          <Text
            style={[
              styles.desktopNavLinkText,
              activeTab === 'home' && styles.desktopNavLinkTextActive,
            ]}
          >
            Home
          </Text>
        </Pressable>

        {/* History */}
        <Pressable
          style={({ hovered }: any) => [
            styles.desktopNavLink,
            activeTab === 'history' && styles.desktopNavLinkActive,
            hovered && styles.desktopNavLinkHovered,
          ]}
          onPress={() => router.push('/history')}
        >
          <Ionicons
            name={activeTab === 'history' ? 'time' : 'time-outline'}
            size={16}
            color={activeTab === 'history' ? '#C85C3E' : '#5E4B42'}
          />
          <Text
            style={[
              styles.desktopNavLinkText,
              activeTab === 'history' && styles.desktopNavLinkTextActive,
            ]}
          >
            History
          </Text>
        </Pressable>

        {/* Saved */}
        <Pressable
          style={({ hovered }: any) => [
            styles.desktopNavLink,
            activeTab === 'saved' && styles.desktopNavLinkActive,
            hovered && styles.desktopNavLinkHovered,
          ]}
          onPress={() => router.push('/saved')}
        >
          <Ionicons
            name={activeTab === 'saved' ? 'bookmark' : 'bookmark-outline'}
            size={16}
            color={activeTab === 'saved' ? '#C85C3E' : '#5E4B42'}
          />
          <Text
            style={[
              styles.desktopNavLinkText,
              activeTab === 'saved' && styles.desktopNavLinkTextActive,
            ]}
          >
            Saved
          </Text>
          {savedQuestions.length > 0 && (
            <View style={styles.desktopNavBadge}>
              <Text style={styles.desktopNavBadgeText}>{savedQuestions.length}</Text>
            </View>
          )}
        </Pressable>

        {/* Mistake Notebook */}
        <Pressable
          style={({ hovered }: any) => [
            styles.desktopNavLink,
            activeTab === 'mistakes' && styles.desktopNavLinkMistakeActive,
            hovered && styles.desktopNavLinkHovered,
          ]}
          onPress={() => router.push('/mistakes' as any)}
        >
          <Ionicons
            name={activeTab === 'mistakes' ? 'alert-circle' : 'alert-circle-outline'}
            size={16}
            color={activeTab === 'mistakes' ? '#DC2626' : '#5E4B42'}
          />
          <Text
            style={[
              styles.desktopNavLinkText,
              activeTab === 'mistakes' && styles.desktopNavLinkTextMistakeActive,
            ]}
          >
            Mistakes
          </Text>
          {mistakeQuestions.length > 0 && (
            <View style={styles.desktopNavBadgeMistake}>
              <Text style={styles.desktopNavBadgeText}>{mistakeQuestions.length}</Text>
            </View>
          )}
        </Pressable>

        {/* AI Tutor */}
        <Pressable
          style={({ hovered }: any) => [
            styles.desktopNavLink,
            activeTab === 'chat' && styles.desktopNavLinkActive,
            hovered && styles.desktopNavLinkHovered,
          ]}
          onPress={() => router.push('/chat')}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={16} color="#9333EA" />
          <Text style={[styles.desktopNavLinkText, { color: '#9333EA' }]}>AI Tutor</Text>
        </Pressable>

        {/* Profile / Settings */}
        <Pressable
          style={({ hovered }: any) => [
            styles.desktopProfileBtn,
            activeTab === 'settings' && styles.desktopProfileBtnActive,
            hovered && styles.desktopProfileBtnHovered,
          ]}
          onPress={() => router.push('/settings')}
        >
          <View style={styles.desktopAvatarWrap}>
            <Ionicons name="person" size={15} color="#C85C3E" />
          </View>
          <Text style={styles.desktopStudentName}>{studentName || 'Learner'}</Text>
          <Ionicons name="chevron-down" size={13} color="#8B786D" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  desktopNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFDF9',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8DFD5',
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 20,
    shadowColor: '#3D2D27',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    width: '100%',
    alignSelf: 'stretch',
  },
  desktopNavLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  desktopLogoGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  desktopLogoImg: {
    width: 175,
    height: 42,
  },
  desktopLogoWrap: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: '#C85C3E',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#C85C3E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  desktopLogoText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#3D2D27',
    letterSpacing: -0.3,
    lineHeight: 18,
  },
  desktopLogoAccent: {
    color: '#C85C3E',
  },
  desktopLogoTagline: {
    fontSize: 9.5,
    color: '#8B786D',
    fontWeight: '600',
    marginTop: 1,
  },
  desktopBoardPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F5ECE3',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginLeft: 6,
  },
  desktopBoardDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#C85C3E',
  },
  desktopBoardText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#785A4E',
  },

  desktopNavRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  desktopNavLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  desktopNavLinkActive: {
    backgroundColor: '#FFF2EB',
  },
  desktopNavLinkMistakeActive: {
    backgroundColor: '#FEE2E2',
  },
  desktopNavLinkHovered: {
    backgroundColor: '#F5ECE4',
  },
  desktopNavLinkText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#5E4B42',
  },
  desktopNavLinkTextActive: {
    color: '#C85C3E',
    fontWeight: '800',
  },
  desktopNavLinkTextMistakeActive: {
    color: '#DC2626',
    fontWeight: '800',
  },
  desktopNavBadge: {
    backgroundColor: '#C85C3E',
    borderRadius: 9,
    minWidth: 17,
    height: 17,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    marginLeft: 2,
  },
  desktopNavBadgeMistake: {
    backgroundColor: '#DC2626',
    borderRadius: 9,
    minWidth: 17,
    height: 17,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    marginLeft: 2,
  },
  desktopNavBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '800',
  },
  desktopProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#FAF4ED',
    borderWidth: 1,
    borderColor: '#EBE0D5',
    marginLeft: 4,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  desktopProfileBtnActive: {
    borderColor: '#C85C3E',
    backgroundColor: '#FFF2EB',
  },
  desktopProfileBtnHovered: {
    backgroundColor: '#F3E9DD',
  },
  desktopAvatarWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F6DFD2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  desktopStudentName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3D2D27',
  },
});
