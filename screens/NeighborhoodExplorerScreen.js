import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import ScreenLayout from '../components/ScreenLayout';
import NeighborhoodExplorer from '../components/NeighborhoodExplorer';
import { useSettings } from '../contexts/SettingsContext';

export default function NeighborhoodExplorerScreen({ navigation }) {
  const { themeColors } = useSettings();

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
        <NeighborhoodExplorer />
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
  }
});
