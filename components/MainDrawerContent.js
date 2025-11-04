import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useSettings } from '../contexts/SettingsContext';
import { getAvatarConfig } from '../constants/avatars';
import AccentBackground from './AccentBackground';

export default function MainDrawerContent({ navigation, onSelectShortcut, accent }) {
  const { userProfile, accentPreset: globalAccent, themeColors, isDarkMode, themeDarkness = 0 } = useSettings();
  const preset = accent ?? globalAccent;
  const avatarConfig = getAvatarConfig(userProfile?.avatarKey);
  const styles = React.useMemo(() => createStyles(themeColors, { isDarkMode }), [themeColors, isDarkMode]);

  const shortcuts = [
    {
      label: 'Explore',
      icon: 'earth-outline',
      key: 'home',
      iconBackground: Platform.OS === 'android' ? 'rgba(56, 189, 248, 0.35)' : 'rgba(56, 189, 248, 0.25)',
      iconColor: '#38bdf8',
      onPress: () => {
        if (onSelectShortcut) {
          onSelectShortcut('home');
        } else if (navigation) {
          navigation.closeDrawer?.();
          navigation.navigate('Country');
        }
      }
    },
    {
      label: 'Neighborhood Explorer',
      icon: 'location-outline',
      key: 'neighborhoodExplorer',
      iconBackground: Platform.OS === 'android' ? 'rgba(99, 102, 241, 0.35)' : 'rgba(99, 102, 241, 0.25)',
      iconColor: '#6366f1',
      onPress: () => {
        if (onSelectShortcut) {
          onSelectShortcut('neighborhoodExplorer');
        } else if (navigation) {
          navigation.closeDrawer?.();
          navigation.navigate('NeighborhoodExplorer');
        }
      }
    },
    {
      label: 'LocalLoop Markets',
      icon: 'bag-handle-outline',
      key: 'markets',
      iconBackground: Platform.OS === 'android' ? 'rgba(245, 158, 11, 0.35)' : 'rgba(245, 158, 11, 0.25)',
      iconColor: '#f59e0b',
      onPress: () => {
        if (onSelectShortcut) {
          onSelectShortcut('markets');
        } else if (navigation) {
          navigation.closeDrawer?.();
          navigation.navigate('LocalLoopMarkets');
        }
      }
    },
    {
      label: 'Top Statuses',
      icon: 'megaphone-outline',
      key: 'topStatuses',
      iconBackground: Platform.OS === 'android' ? 'rgba(244, 114, 182, 0.35)' : 'rgba(244, 114, 182, 0.25)',
      iconColor: '#f472b6',
      onPress: () => {
        if (onSelectShortcut) {
          onSelectShortcut('topStatuses');
        } else if (navigation) {
          navigation.closeDrawer?.();
          navigation.navigate('TopStatuses');
        }
      }
    },
    {
      label: 'My Replies',
      icon: 'chatbubble-ellipses-outline',
      key: 'myComments',
      iconBackground: Platform.OS === 'android' ? 'rgba(45, 212, 191, 0.35)' : 'rgba(45, 212, 191, 0.25)',
      iconColor: '#2dd4bf',
      onPress: () => {
        if (onSelectShortcut) {
          onSelectShortcut('myComments');
        } else if (navigation) {
          navigation.closeDrawer?.();
          navigation.navigate('MyComments');
        }
      }
    },
    {
      label: 'My Posts',
      icon: 'document-text-outline',
      key: 'myPosts',
      iconBackground: Platform.OS === 'android' ? 'rgba(251, 191, 36, 0.35)' : 'rgba(251, 191, 36, 0.25)',
      iconColor: '#fbbf24',
      onPress: () => {
        if (onSelectShortcut) {
          onSelectShortcut('myPosts');
        } else if (navigation) {
          navigation.closeDrawer?.();
          navigation.navigate('MyPosts');
        }
      }
    }
  ];

  const headerTextColor = preset.onPrimary ?? '#fff';
  const headerMetaColor = preset.subtitleColor ?? 'rgba(255,255,255,0.8)';

  return (
    <View style={styles.container}>
      {/* Header with accent background */}
      <View style={[styles.header, { backgroundColor: preset.background }]}>
        <AccentBackground accent={preset} style={styles.headerBackground} darkness={themeDarkness} />
        <View style={[styles.avatar, { backgroundColor: avatarConfig.backgroundColor ?? themeColors.primary }]}>
          {avatarConfig.icon ? (
            <Ionicons name={avatarConfig.icon.name} size={26} color={avatarConfig.icon.color ?? '#fff'} />
          ) : (
            <Text style={[styles.avatarEmoji, { color: avatarConfig.foregroundColor ?? '#fff' }]}>
              {avatarConfig.emoji ?? '🙂'}
            </Text>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.nameText, { color: headerTextColor }]}>{userProfile?.nickname?.trim() || 'Anonymous'}</Text>
          {userProfile?.city ? (
            <Text style={[styles.metaText, { color: headerMetaColor }]}>
              {[userProfile.city, userProfile.province, userProfile.country].filter(Boolean).join(', ')}
            </Text>
          ) : (
            <Text style={[styles.metaText, { color: headerMetaColor }]}>Add your location in settings</Text>
          )}
        </View>
      </View>

      {/* Glassmorphic menu items */}
      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.menuContainer}
        showsVerticalScrollIndicator={false}
      >
        {shortcuts.map((item, index) => {
          const CardWrapper = Platform.OS === 'android' ? View : BlurView;
          const cardProps = Platform.OS === 'android'
            ? {}
            : {
              intensity: isDarkMode ? 60 : 40,
              tint: isDarkMode ? 'dark' : 'light'
            };

          return (
            <CardWrapper
              key={item.key}
              {...cardProps}
              style={[
                styles.glassCard,
                {
                  marginTop: index === 0 ? 24 : (Platform.OS === 'android' ? 14 : 12),
                  backgroundColor: Platform.OS === 'android'
                    ? (isDarkMode ? '#1e1e2e' : '#ffffff')
                    : (isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.6)')
                }
              ]}
            >
              <TouchableOpacity
                style={styles.shortcut}
                activeOpacity={0.7}
                onPress={item.onPress}
              >
                <View
                  style={[styles.iconCircle, { backgroundColor: item.iconBackground || preset.iconTint || themeColors.primary }]}
                >
                  <Ionicons name={item.icon} size={22} color={item.iconColor || '#0f172a'} />
                </View>
                <Text style={[styles.shortcutLabel, { color: themeColors.textPrimary }]}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={20} color={themeColors.textSecondary} />
              </TouchableOpacity>
            </CardWrapper>
          );
        })}

        {/* Decorative gradient */}
        <View style={styles.decorativeGradient} />
      </ScrollView>
    </View>
  );
}

const createStyles = (palette, { isDarkMode } = {}) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: palette.background,
      ...(Platform.OS === 'android' && {
        marginTop: 0,
        paddingTop: 0
      })
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingVertical: 32,
      paddingTop: Platform.OS === 'android' ? 60 : 32,
      paddingBottom: 32,
      backgroundColor: palette.card,
      shadowColor: '#000',
      shadowOpacity: isDarkMode ? 0.3 : 0.12,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: Platform.OS === 'android' ? 10 : 6,
      overflow: 'hidden',
      zIndex: 10
    },
    headerBackground: {
      ...StyleSheet.absoluteFillObject
    },
    avatar: {
      width: 60,
      height: 60,
      borderRadius: 30,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 16,
      shadowColor: '#000',
      shadowOpacity: 0.2,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4
    },
    avatarEmoji: {
      fontSize: 28
    },
    nameText: {
      fontSize: 18,
      fontWeight: '700',
      color: palette.textPrimary,
      marginBottom: 4
    },
    metaText: {
      fontSize: 13,
      color: palette.textSecondary,
      opacity: 0.9
    },
    body: {
      flex: 1,
      backgroundColor: palette.background
    },
    menuContainer: {
      paddingHorizontal: Platform.OS === 'android' ? 18 : 16,
      paddingBottom: 32
    },
    glassCard: {
      borderRadius: Platform.OS === 'android' ? 28 : 20,
      overflow: Platform.OS === 'android' ? 'visible' : 'hidden',
      borderWidth: Platform.OS === 'android' ? 0 : 1,
      borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.3)',
      shadowColor: '#000',
      shadowOpacity: Platform.OS === 'android' ? (isDarkMode ? 0.4 : 0.12) : (isDarkMode ? 0.3 : 0.08),
      shadowRadius: Platform.OS === 'android' ? 8 : 12,
      shadowOffset: { width: 0, height: Platform.OS === 'android' ? 3 : 4 },
      elevation: Platform.OS === 'android' ? 4 : 3,
      ...(Platform.OS === 'android' && {
        backgroundColor: isDarkMode ? '#1e1e2e' : '#ffffff',
        marginHorizontal: 2,
      })
    },
    shortcut: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Platform.OS === 'android' ? 20 : 20,
      paddingVertical: Platform.OS === 'android' ? 18 : 18,
      gap: 14
    },
    iconCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: Platform.OS === 'android' ? 'transparent' : '#000',
      shadowOpacity: Platform.OS === 'android' ? 0 : 0.15,
      shadowRadius: Platform.OS === 'android' ? 0 : 6,
      shadowOffset: { width: 0, height: Platform.OS === 'android' ? 0 : 2 },
      elevation: Platform.OS === 'android' ? 0 : 2,
    },
    shortcutLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: palette.textPrimary,
      flex: 1
    },
    decorativeGradient: {
      height: 60,
      marginTop: 24
    }
  });
