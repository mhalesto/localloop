import React from 'react';
import { ScrollView, StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import ScreenLayout from '../components/ScreenLayout';
import NeighborhoodExplorer from '../components/NeighborhoodExplorer';
import { useSettings } from '../contexts/SettingsContext';
import { useSensors } from '../contexts/SensorsContext';
import { Ionicons } from '@expo/vector-icons';

export default function NeighborhoodExplorerScreen({ navigation }) {
  const { themeColors } = useSettings();
  const {
    stepCounterEnabled,
    motionDetectionEnabled,
    barometerEnabled,
    compassEnabled,
    ambientLightEnabled,
  } = useSensors();

  const discoveryEnabled =
    stepCounterEnabled ||
    motionDetectionEnabled ||
    barometerEnabled ||
    compassEnabled ||
    ambientLightEnabled;

  return (
    <ScreenLayout
      title="Discovery"
      subtitle="Neighborhood exploration"
      navigation={navigation}
      showFooter
      contentStyle={styles.content}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {discoveryEnabled ? (
          <NeighborhoodExplorer />
        ) : (
          <View style={[styles.emptyState, { backgroundColor: themeColors.card, borderColor: themeColors.divider }]}>
            <Ionicons name="compass-outline" size={42} color={themeColors.textSecondary} style={styles.emptyIcon} />
            <Text style={[styles.emptyTitle, { color: themeColors.textPrimary }]}>
              Enable Neighborhood Discovery
            </Text>
            <Text style={[styles.emptyDescription, { color: themeColors.textSecondary }]}>
              Turn on any sensor option in Settings → Neighborhood Discovery to start tracking steps, activity, or compass data.
            </Text>
            <TouchableOpacity
              style={[
                styles.emptyButton,
                {
                  backgroundColor: themeColors.primary,
                }
              ]}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('Settings')}
            >
              <Text style={styles.emptyButtonLabel}>Open Settings</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 0,
    paddingHorizontal: 0,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 140,
  },
  emptyState: {
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  emptyButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
  },
  emptyButtonLabel: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});
