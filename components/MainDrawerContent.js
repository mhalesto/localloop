import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import { useSettings } from '../contexts/SettingsContext';
import { getAvatarConfig } from '../constants/avatars';

export default function MainDrawerContent({ navigation, onSelectShortcut, accent }) {
  const { userProfile, accentPreset: globalAccent } = useSettings();
  const preset = accent ?? globalAccent;
  const avatarConfig = getAvatarConfig(userProfile?.avatarKey);

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

  return (
    <View style={[styles.container, { backgroundColor: preset.background }]}> 
      <View style={[styles.header, { backgroundColor: preset.background }]}> 
        <View style={[styles.avatar, { backgroundColor: avatarConfig.backgroundColor ?? colors.primary }]}> 
          {avatarConfig.icon ? (
            <Ionicons name={avatarConfig.icon.name} size={22} color={avatarConfig.icon.color ?? '#fff'} />
          ) : (
            <Text style={[styles.avatarEmoji, { color: avatarConfig.foregroundColor ?? '#fff' }]}>
              {avatarConfig.emoji ?? '🙂'}
            </Text>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.nameText}>{userProfile?.nickname?.trim() || 'Anonymous'}</Text>
          {userProfile?.city ? (
            <Text style={styles.metaText}>
              {[userProfile.city, userProfile.province, userProfile.country].filter(Boolean).join(', ')}
            </Text>
          ) : (
            <Text style={styles.metaText}>Add your location in settings</Text>
          )}
        </View>
      </View>

      <ScrollView style={[styles.body, { backgroundColor: colors.background }]} contentContainerStyle={{ paddingVertical: 12 }}>
        {shortcuts.map((item) => (
          <TouchableOpacity
            key={item.label}
            style={styles.shortcut}
            activeOpacity={0.85}
            onPress={item.onPress}
          >
            <Ionicons name={item.icon} size={20} color={colors.primaryDark} style={{ marginRight: 14 }} />
            <Text style={styles.shortcutLabel}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider
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
    color: colors.textPrimary
  },
  metaText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4
  },
  body: {
    flex: 1
  },
  shortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14
  },
  shortcutLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary
  }
});
