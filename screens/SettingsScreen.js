import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import ScreenLayout from '../components/ScreenLayout';
import { colors } from '../constants/colors';
import { useSettings } from '../contexts/SettingsContext';

export default function SettingsScreen({ navigation }) {
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const { showAddShortcut, setShowAddShortcut } = useSettings();
  const ghostIdentifier = useMemo(
    () => `Ghost #${Math.floor(Math.random() * 999)}`,
    []
  );

  return (
    <ScreenLayout
      title="Settings"
      subtitle="Control your experience"
      navigation={navigation}
      activeTab="settings"
      showFooter
    >
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Permissions</Text>
        <View style={styles.item}>
          <View>
            <Text style={styles.itemTitle}>Location access</Text>
            <Text style={styles.itemSubtitle}>
              Helps suggest nearby rooms and surface local chatter.
            </Text>
          </View>
          <Switch
            value={locationEnabled}
            onValueChange={setLocationEnabled}
            trackColor={{ true: colors.primaryLight }}
            thumbColor={locationEnabled ? colors.primaryDark : '#f4f3f4'}
          />
        </View>
        <View style={styles.item}>
          <View>
            <Text style={styles.itemTitle}>Notifications</Text>
            <Text style={styles.itemSubtitle}>
              Get nudges when someone replies to your anonymous posts.
            </Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ true: colors.primaryLight }}
            thumbColor={notificationsEnabled ? colors.primaryDark : '#f4f3f4'}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick actions</Text>
        <View style={styles.itemLast}>
          <View>
            <Text style={styles.itemTitle}>Show add post shortcut</Text>
            <Text style={styles.itemSubtitle}>
              Keep the floating action handy for rapid posting anywhere.
            </Text>
          </View>
          <Switch
            value={showAddShortcut}
            onValueChange={setShowAddShortcut}
            trackColor={{ true: colors.primaryLight }}
            thumbColor={showAddShortcut ? colors.primaryDark : '#f4f3f4'}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Privacy</Text>
        <View style={styles.itemLast}>
          <View>
            <Text style={styles.itemTitle}>Anonymous identity</Text>
            <Text style={styles.itemSubtitle}>
              You&apos;re currently posting as {ghostIdentifier}.
            </Text>
          </View>
        </View>
        <View style={[styles.itemLast, styles.itemDisabled]}>
          <View>
            <Text style={styles.itemTitle}>Coming soon</Text>
            <Text style={styles.itemSubtitle}>
              More privacy controls arrive when we connect to a backend.
            </Text>
          </View>
        </View>
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 16
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  itemLast: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  itemDisabled: {
    opacity: 0.6,
    marginTop: 16
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 6
  },
  itemSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    maxWidth: 220
  }
});
