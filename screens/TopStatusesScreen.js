import React, { useCallback, useMemo } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import ScreenLayout from '../components/ScreenLayout';
import StatusCard from '../components/StatusCard';
import FeedSkeleton from '../components/FeedSkeleton';
import { useStatuses } from '../contexts/StatusesContext';
import { useSettings } from '../contexts/SettingsContext';
import { buildDreamyAccent } from '../utils/dreamyPalette';

export default function TopStatusesScreen({ navigation }) {
  const { themeColors, accentPreset } = useSettings();
  const {
    statuses,
    isLoading,
    toggleStatusReaction,
    reportStatus,
    statusesError,
  } = useStatuses();

  const statusList = useMemo(
    () =>
      [...statuses]
        .filter(Boolean)
        .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)),
    [statuses]
  );

  const dreamyAccent = useMemo(
    () => buildDreamyAccent(accentPreset, themeColors),
    [accentPreset, themeColors]
  );

  const styles = useMemo(() => createStyles(themeColors, dreamyAccent), [themeColors, dreamyAccent]);
  const statusesEmpty = statusList.length === 0;

  const handleOpenStatus = useCallback(
    (status) => {
      navigation.navigate('StatusDetail', { statusId: status.id });
    },
    [navigation]
  );

  const handleReactToStatus = useCallback(
    async (status) => {
      await toggleStatusReaction(status.id, 'heart');
    },
    [toggleStatusReaction]
  );

  const handleReportStatus = useCallback(
    async (status) => {
      await reportStatus(status.id, 'inappropriate');
    },
    [reportStatus]
  );

  const handleAddStatusPress = useCallback(() => {
    navigation.navigate('StatusComposer');
  }, [navigation]);

  return (
    <ScreenLayout
      title="Top statuses"
      subtitle="Fresh updates nearby"
      navigation={navigation}
      onBack={() => navigation.goBack?.()}
      activeTab="home"
    >
      {isLoading ? (
        <FeedSkeleton count={3} />
      ) : (
        <FlatList
          data={statusList}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <StatusCard
              status={item}
              onPress={handleOpenStatus}
              onReact={handleReactToStatus}
              onReport={handleReportStatus}
            />
          )}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <LinearGradient
                colors={dreamyAccent.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroBanner}
              >
                <View style={styles.heroTag}>
                  <Ionicons name="sparkles-outline" size={16} color="#fff" />
                  <Text style={styles.heroTagText}>Neighborhood vibes</Text>
                </View>
                <Text style={styles.heroTitle}>Share a new status</Text>
                <Text style={styles.heroSubtitle}>
                  Paint a quick update and brighten someone’s timeline.
                </Text>
                <TouchableOpacity
                  style={styles.heroButton}
                  onPress={handleAddStatusPress}
                  activeOpacity={0.9}
                >
                  <Ionicons name="create-outline" size={16} color={themeColors.primaryDark} />
                  <Text style={styles.heroButtonText}>Start writing</Text>
                </TouchableOpacity>
              </LinearGradient>

              <View style={styles.sectionRow}>
                <Text style={styles.sectionLabel}>Trending feed</Text>
                <View style={styles.sectionChip}>
                  <Ionicons name="flash-outline" size={14} color={themeColors.primaryDark} />
                  <Text style={styles.sectionChipText}>{statusList.length} live</Text>
                </View>
              </View>

              {statusesError ? <Text style={styles.errorText}>{statusesError}</Text> : null}
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="chatbubble-ellipses-outline" size={36} color={themeColors.textSecondary} />
              <Text style={styles.emptyTitle}>No statuses yet</Text>
              <Text style={styles.emptyBody}>
                {statusesError || 'Be the first to share what’s happening around you.'}
              </Text>
            </View>
          }
          contentContainerStyle={[
            styles.listContent,
            statusesEmpty && styles.listContentEmpty
          ]}
          showsVerticalScrollIndicator={false}
        />
      )}
    </ScreenLayout>
  );
}

const createStyles = (palette, accent) =>
  StyleSheet.create({
    loader: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    listHeader: {
      marginBottom: 20,
      gap: 14,
    },
    heroBanner: {
      borderRadius: 24,
      padding: 20,
      shadowColor: accent.glow,
      shadowOpacity: 0.35,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 12 },
    },
    heroTag: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: 'rgba(0,0,0,0.25)',
      marginBottom: 14,
    },
    heroTagText: { marginLeft: 6, color: '#fff', fontSize: 12, fontWeight: '600' },
    heroTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
    heroSubtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 14, lineHeight: 20, marginTop: 6 },
    heroButton: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      backgroundColor: '#fff',
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 12,
      marginTop: 16,
    },
    heroButtonText: { marginLeft: 8, fontWeight: '700', color: palette.primaryDark },
    sectionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 4,
    },
    sectionLabel: { fontSize: 16, fontWeight: '700', color: palette.textPrimary },
    sectionChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: palette.card,
      borderWidth: 1,
      borderColor: palette.divider,
    },
    sectionChipText: { fontSize: 12, fontWeight: '600', color: palette.primaryDark },
    errorText: {
      marginTop: 12,
      fontSize: 12,
      color: '#ef4444',
    },
    listContent: {
      paddingBottom: 120,
      paddingHorizontal: 20,
    },
    listContentEmpty: {
      flexGrow: 1,
      justifyContent: 'center',
    },
    emptyState: {
      alignItems: 'center',
      paddingHorizontal: 32,
      paddingVertical: 80,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: palette.textPrimary,
      marginTop: 12,
    },
    emptyBody: {
      fontSize: 14,
      color: palette.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
      marginTop: 6,
    },
  });
