import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
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
      icon: 'compass-outline',
      key: 'home',
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
      icon: 'storefront-outline',
      key: 'markets',
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
        {shortcuts.map((item, index) => (
          <BlurView
            key={item.key}
            intensity={isDarkMode ? 60 : 40}
            tint={isDarkMode ? 'dark' : 'light'}
            style={[
              styles.glassCard,
              {
                marginTop: index === 0 ? 24 : 12,
                backgroundColor: isDarkMode
                  ? 'rgba(255,255,255,0.08)'
                  : 'rgba(255,255,255,0.6)'
              }
            ]}
          >
            <TouchableOpacity
              style={styles.shortcut}
              activeOpacity={0.7}
              onPress={item.onPress}
            >
              <View style={[styles.iconCircle, { backgroundColor: preset.iconTint || themeColors.primary }]}>
                <Ionicons name={item.icon} size={22} color="#ffffff" />
              </View>
              <Text style={[styles.shortcutLabel, { color: themeColors.textPrimary }]}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={20} color={themeColors.textSecondary} />
            </TouchableOpacity>
          </BlurView>
        ))}

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
      backgroundColor: palette.background
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingVertical: 32,
      backgroundColor: palette.card,
      shadowColor: '#000',
      shadowOpacity: isDarkMode ? 0.3 : 0.12,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 6,
      overflow: 'hidden'
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
      paddingHorizontal: 16,
      paddingBottom: 32
    },
    glassCard: {
      borderRadius: 20,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.3)',
      shadowColor: '#000',
      shadowOpacity: isDarkMode ? 0.3 : 0.08,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3
    },
    shortcut: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 18,
      gap: 14
    },
    iconCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.15,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2
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
