import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '../contexts/SettingsContext';
import { getAvatarConfig } from '../constants/avatars';

export default function MainDrawerContent({ navigation, onSelectShortcut, accent }) {
  const { userProfile, accentPreset: globalAccent, themeColors, isDarkMode } = useSettings();
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
      label: 'My replies',
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
      label: 'Settings',
      icon: 'settings-outline',
      key: 'settings',
      onPress: () => {
        if (onSelectShortcut) {
          onSelectShortcut('settings');
        } else if (navigation) {
          navigation.closeDrawer?.();
          navigation.navigate('Settings');
        }
      }
    }
  ];

  const headerTextColor = preset.onPrimary ?? '#fff';
  const headerMetaColor = preset.subtitleColor ?? 'rgba(255,255,255,0.8)';

  return (
    <View style={styles.container}>
      <View style={[styles.header, { backgroundColor: preset.background }]}>
        <View style={[styles.avatar, { backgroundColor: avatarConfig.backgroundColor ?? themeColors.primary }]}>
          {avatarConfig.icon ? (
            <Ionicons name={avatarConfig.icon.name} size={22} color={avatarConfig.icon.color ?? '#fff'} />
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

      <ScrollView style={styles.body} contentContainerStyle={{ paddingVertical: 12 }}>
        {shortcuts.map((item) => (
          <TouchableOpacity
            key={item.label}
            style={styles.shortcut}
            activeOpacity={0.85}
            onPress={item.onPress}
          >
            <Ionicons name={item.icon} size={20} color={themeColors.primaryDark} style={{ marginRight: 14 }} />
            <Text style={styles.shortcutLabel}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={18} color={themeColors.textSecondary} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        ))}
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
      paddingHorizontal: 20,
      paddingVertical: 24,
      backgroundColor: palette.card,
      borderBottomWidth: 1,
      borderBottomColor: palette.divider,
      shadowColor: '#000',
      shadowOpacity: isDarkMode ? 0.2 : 0.08,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 4
    },
    avatar: {
      width: 52,
      height: 52,
      borderRadius: 26,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 16
    },
    avatarEmoji: {
      fontSize: 24
    },
    nameText: {
      fontSize: 16,
      fontWeight: '700',
      color: palette.textPrimary
    },
    metaText: {
      fontSize: 12,
      color: palette.textSecondary,
      marginTop: 4
    },
    body: {
      flex: 1,
      backgroundColor: palette.background
    },
    shortcut: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: palette.divider
    },
    shortcutLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: palette.textPrimary
    }
  });
