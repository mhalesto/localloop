import React, { useCallback, useMemo } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import ScreenLayout from '../components/ScreenLayout';
import StatusCard from '../components/StatusCard';
import FeedSkeleton from '../components/FeedSkeleton';
import { useStatuses } from '../contexts/StatusesContext';
import { useSettings } from '../contexts/SettingsContext';

export default function TopStatusesScreen({ navigation }) {
  const { themeColors } = useSettings();
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

  const styles = useMemo(() => createStyles(themeColors), [themeColors]);
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
              <TouchableOpacity
                style={styles.newStatusButton}
                onPress={handleAddStatusPress}
                activeOpacity={0.85}
              >
                <Ionicons name="create-outline" size={18} color={themeColors.primaryDark} />
                <Text style={styles.newStatusLabel}>Share a new status</Text>
              </TouchableOpacity>
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

const createStyles = (palette) =>
  StyleSheet.create({
    loader: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    listHeader: {
      marginBottom: 18,
    },
    newStatusButton: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      backgroundColor: palette.card,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: palette.divider,
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    },
    newStatusLabel: {
      marginLeft: 8,
      fontSize: 14,
      fontWeight: '600',
      color: palette.primaryDark,
    },
    errorText: {
      marginTop: 12,
      fontSize: 12,
      color: '#ef4444',
    },
    listContent: {
      paddingBottom: 120,
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
