import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import ScreenLayout from '../components/ScreenLayout';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { ENGAGEMENT_POINT_RULES } from '../constants/authConfig';

export default function ProfileScreen({ navigation }) {
  const {
    user,
    profile,
    hasActivePremium,
    pointsToNextPremium,
    premiumDayCost,
    premiumAccessDurationMs,
  } = useAuth();
  const { themeColors, userProfile } = useSettings();

  const styles = useMemo(() => createStyles(themeColors), [themeColors]);

  if (!user) {
    return (
      <ScreenLayout
        navigation={navigation}
        title="Profile"
        subtitle="Sign in to view your rewards"
        showFooter={false}
        onBack={() => navigation.goBack?.()}
      >
        <View style={styles.emptyStateWrapper}>
          <View style={styles.emptyStateCard}>
            <Text style={styles.emptyStateHeadline}>Heads up!</Text>
            <Text style={styles.emptyStateBody}>
              Create an account from Settings to start earning reward points and unlock premium perks.
            </Text>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => navigation.navigate('Settings')}
              style={styles.emptyStateButton}
            >
              <Text style={styles.emptyStateButtonText}>Go to Settings</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScreenLayout>
    );
  }

  const displayName = (profile?.displayName ?? user.displayName ?? '').trim() || 'Mystery guest';
  const emailAddress = (profile?.email ?? user.email ?? '').trim() || 'No email on file';
  const nickname = userProfile.nickname?.trim() || 'Not set';
  const hometownParts = [userProfile.city, userProfile.province, userProfile.country].filter(Boolean);
  const hometown = hometownParts.length ? hometownParts.join(', ') : 'Not shared';
  const pointsBalance = Number.isFinite(profile?.points) ? profile.points : 0;
  const hoursOfPremium = Math.max(Math.round(premiumAccessDurationMs / (60 * 60 * 1000)), 1);

  const engagementPerks = [
    {
      key: 'comment',
      label: 'Leave a thoughtful comment',
      points: ENGAGEMENT_POINT_RULES.comment,
      icon: 'chatbubble-ellipses-outline',
    },
    {
      key: 'upvote',
      label: 'Cheer on a post you love',
      points: ENGAGEMENT_POINT_RULES.upvote,
      icon: 'arrow-up-circle-outline',
    },
  ].filter((item) => Number(item.points) > 0);

  return (
    <ScreenLayout
      navigation={navigation}
      title="Profile"
      subtitle="Track your rewards"
      showFooter
      onBack={() => navigation.goBack?.()}
      contentStyle={styles.screenContent}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pointsCard}>
          <Text style={styles.pointsLabel}>Reward points</Text>
          <Text style={styles.pointsValue}>{pointsBalance}</Text>
          <Text style={styles.pointsHint}>
            {hasActivePremium
              ? 'Premium access is active—enjoy the perks!'
              : pointsToNextPremium > 0
              ? `${pointsToNextPremium} pts away from unlocking ${hoursOfPremium} hours of premium.`
              : `Redeem ${premiumDayCost} pts at any time for ${hoursOfPremium} hours of premium.`}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account overview</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Display name</Text>
            <Text style={styles.detailValue}>{displayName}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Email</Text>
            <Text style={styles.detailValue}>{emailAddress}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Nickname</Text>
            <Text style={styles.detailValue}>{nickname}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Home base</Text>
            <Text style={styles.detailValue}>{hometown}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Earn more points</Text>
          <Text style={styles.sectionHint}>
            Keep the conversation lively—your engagement boosts your balance automatically.
          </Text>
          {engagementPerks.map((perk) => (
            <View key={perk.key} style={styles.perkRow}>
              <View style={styles.perkIconWrap}>
                <Ionicons name={perk.icon} size={16} color={themeColors.primaryDark} />
              </View>
              <View style={styles.perkCopy}>
                <Text style={styles.perkLabel}>{perk.label}</Text>
                <Text style={styles.perkMeta}>+{perk.points} pts</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Premium status</Text>
          <View style={styles.statusCard}>
            <Ionicons
              name={hasActivePremium ? 'sparkles' : 'lock-closed-outline'}
              size={20}
              color={themeColors.primaryDark}
              style={styles.statusIcon}
            />
            <View style={styles.statusCopy}>
              <Text style={styles.statusLabel}>
                {hasActivePremium ? 'Premium unlocked' : 'Premium locked'}
              </Text>
              <Text style={styles.statusMeta}>
                {hasActivePremium
                  ? 'Enjoy richer themes, typography, and faster replies.'
                  : `Redeem ${premiumDayCost} pts in Settings to unlock the premium toolkit.`}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenLayout>
  );
}

function createStyles(palette) {
  const cardBackground = palette.card ?? '#ffffff';
  const textPrimary = palette.textPrimary ?? '#111827';
  const textSecondary = palette.textSecondary ?? '#6b7280';

  return StyleSheet.create({
    screenContent: {
      paddingBottom: 32,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingBottom: 80,
    },
    pointsCard: {
      backgroundColor: palette.primary,
      borderRadius: 20,
      padding: 24,
      marginBottom: 24,
    },
    pointsLabel: {
      color: '#ffffffcc',
      fontSize: 13,
      fontWeight: '600',
    },
    pointsValue: {
      color: '#ffffff',
      fontSize: 40,
      fontWeight: '700',
      marginTop: 4,
    },
    pointsHint: {
      color: '#ffffffcc',
      fontSize: 13,
      marginTop: 12,
      lineHeight: 20,
    },
    section: {
      backgroundColor: cardBackground,
      borderRadius: 20,
      padding: 20,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: palette.divider ?? 'rgba(15,23,42,0.08)',
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: textPrimary,
      marginBottom: 12,
    },
    sectionHint: {
      fontSize: 13,
      color: textSecondary,
      lineHeight: 20,
      marginBottom: 12,
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    detailLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: textSecondary,
    },
    detailValue: {
      fontSize: 14,
      fontWeight: '600',
      color: textPrimary,
      flexShrink: 1,
      textAlign: 'right',
    },
    perkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
    },
    perkIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: palette.primaryLight ?? '#e0e7ff',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    perkCopy: {
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    perkLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: textPrimary,
      flexShrink: 1,
      marginRight: 12,
    },
    perkMeta: {
      fontSize: 13,
      fontWeight: '600',
      color: palette.primaryDark ?? palette.primary,
    },
    statusCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: palette.background,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: palette.divider ?? 'rgba(15,23,42,0.08)',
    },
    statusIcon: {
      marginRight: 12,
      marginTop: 2,
    },
    statusCopy: {
      flex: 1,
    },
    statusLabel: {
      fontSize: 15,
      fontWeight: '700',
      color: textPrimary,
      marginBottom: 4,
    },
    statusMeta: {
      fontSize: 13,
      color: textSecondary,
      lineHeight: 20,
    },
    emptyStateWrapper: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    emptyStateCard: {
      backgroundColor: cardBackground,
      borderRadius: 20,
      padding: 24,
      borderWidth: 1,
      borderColor: palette.divider ?? 'rgba(15,23,42,0.08)',
      alignItems: 'center',
    },
    emptyStateHeadline: {
      fontSize: 18,
      fontWeight: '700',
      color: textPrimary,
      marginBottom: 8,
    },
    emptyStateBody: {
      fontSize: 14,
      color: textSecondary,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 20,
    },
    emptyStateButton: {
      backgroundColor: palette.primary,
      borderRadius: 12,
      paddingHorizontal: 20,
      paddingVertical: 12,
    },
    emptyStateButtonText: {
      color: '#ffffff',
      fontSize: 14,
      fontWeight: '600',
    },
  });
}
