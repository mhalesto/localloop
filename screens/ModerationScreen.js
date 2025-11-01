import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';

import ScreenLayout from '../components/ScreenLayout';
import { useAuth } from '../contexts/AuthContext';
import { usePosts } from '../contexts/PostsContext';
import { useStatuses } from '../contexts/StatusesContext';
import { useSettings } from '../contexts/SettingsContext';

export default function ModerationScreen({ navigation }) {
  const { isAdmin } = useAuth();
  const { reportedPosts, refreshReportedPosts } = usePosts();
  const { reportedStatuses, refreshReportedStatuses } = useStatuses();
  const { themeColors } = useSettings();
  const [loading, setLoading] = useState(true);
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);

  useEffect(() => {
    let mounted = true;
    if (!isAdmin) {
      setLoading(false);
      return () => {
        mounted = false;
      };
    }

    const load = async () => {
      setLoading(true);
      await Promise.all([refreshReportedPosts(), refreshReportedStatuses()]);
      if (mounted) setLoading(false);
    };

    load();
    return () => {
      mounted = false;
    };
  }, [isAdmin, refreshReportedPosts, refreshReportedStatuses]);

  const combined = useMemo(() => {
    const postEntries = (reportedPosts ?? []).map((post) => ({
      type: 'post',
      id: post.id,
      title: post.title ?? post.message ?? 'Untitled',
      reportCount: post.reportCount ?? 0,
      createdAt: post.createdAt,
    }));

    const statusEntries = (reportedStatuses ?? []).map((status) => ({
      type: 'status',
      id: status.id,
      title: status.message ?? 'Status',
      reportCount: status.reportCount ?? 0,
      createdAt: status.createdAt,
    }));

    return [...postEntries, ...statusEntries].sort((a, b) => (b.reportCount ?? 0) - (a.reportCount ?? 0));
  }, [reportedPosts, reportedStatuses]);

  if (!isAdmin) {
    return (
      <ScreenLayout
        title="Moderation"
        subtitle="Restricted"
        navigation={navigation}
        onBack={() => navigation.goBack?.()}
        showFooter={false}
      >
        <View style={styles.center}>
          <Text style={styles.restrictedTitle}>Access denied</Text>
          <Text style={styles.restrictedBody}>Only admins can review reported content.</Text>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout
      title="Moderation"
      subtitle="Review reported content"
      navigation={navigation}
      onBack={() => navigation.goBack?.()}
      showFooter={false}
    >
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      ) : combined.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.restrictedTitle}>All clear</Text>
          <Text style={styles.restrictedBody}>No reported posts or statuses at the moment.</Text>
        </View>
      ) : (
        <FlatList
          data={combined}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.itemCard}>
              <Text style={styles.itemType}>{item.type === 'post' ? 'Post' : 'Status'}</Text>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.itemMeta}>Reports: {item.reportCount}</Text>
              {item.createdAt ? (
                <Text style={styles.itemMeta}>Created: {new Date(item.createdAt).toLocaleString()}</Text>
              ) : null}
            </View>
          )}
        />
      )}
    </ScreenLayout>
  );
}

const createStyles = (palette) =>
  StyleSheet.create({
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    restrictedTitle: {
      fontSize: 18,
      fontWeight: '700',
      marginBottom: 8,
      color: palette.textPrimary,
    },
    restrictedBody: {
      fontSize: 14,
      textAlign: 'center',
      color: palette.textSecondary,
    },
    listContent: {
      padding: 20,
      paddingBottom: 40,
    },
    itemCard: {
      backgroundColor: palette.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: palette.divider,
    },
    itemType: {
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
      color: palette.primary,
    },
    itemTitle: {
      fontSize: 15,
      fontWeight: '600',
      marginTop: 4,
      marginBottom: 6,
      color: palette.textPrimary,
    },
    itemMeta: {
      fontSize: 12,
      color: palette.textSecondary,
    },
  });
