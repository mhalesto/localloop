import React, { useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSensors } from '../contexts/SensorsContext';
import { useSettings } from '../contexts/SettingsContext';

// Steps Detail Modal
export function StepsDetailModal({ visible, onClose }) {
  const { dailySteps, stepCounterEnabled, explorationProgress } = useSensors();
  const { themeColors, isDarkMode } = useSettings();

  const styles = useMemo(
    () => createModalStyles(themeColors, { isDarkMode }),
    [themeColors, isDarkMode]
  );

  const distanceKm = ((dailySteps * 0.762) / 1000).toFixed(2);
  const caloriesBurned = Math.round(dailySteps * 0.04);
  const stepGoal = 10000;
  const progressPercent = Math.min((dailySteps / stepGoal) * 100, 100);

  if (!stepCounterEnabled) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="footsteps" size={32} color="#10b981" />
              <View>
                <Text style={styles.headerTitle}>Daily Steps</Text>
                <Text style={styles.headerSubtitle}>Track your activity</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={themeColors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.stepsHero}>
              <Text style={styles.stepsValue}>{dailySteps.toLocaleString()}</Text>
              <Text style={styles.stepsLabel}>steps today</Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
              </View>
              <Text style={styles.progressText}>
                {stepGoal - dailySteps > 0
                  ? `${(stepGoal - dailySteps).toLocaleString()} steps to goal`
                  : 'Goal reached! 🎉'}
              </Text>
            </View>

            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Ionicons name="navigate" size={24} color="#3b82f6" />
                <Text style={styles.statValue}>{distanceKm} km</Text>
                <Text style={styles.statLabel}>Distance</Text>
              </View>
              <View style={styles.statBox}>
                <Ionicons name="flame" size={24} color="#ef4444" />
                <Text style={styles.statValue}>{caloriesBurned}</Text>
                <Text style={styles.statLabel}>Calories</Text>
              </View>
              <View style={styles.statBox}>
                <Ionicons name="trophy" size={24} color="#f59e0b" />
                <Text style={styles.statValue}>{explorationProgress.neighborhoodCoverage.toFixed(0)}%</Text>
                <Text style={styles.statLabel}>Explored</Text>
              </View>
            </View>

            <View style={styles.infoCard}>
              <Ionicons name="information-circle-outline" size={20} color={themeColors.textSecondary} />
              <Text style={styles.infoText}>
                Step count resets at midnight. Average step length is 0.762m.
                Keep walking to explore more of your neighborhood!
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// Activity Detail Modal
export function ActivityDetailModal({ visible, onClose }) {
  const { currentActivity, proximityRadius, motionDetectionEnabled } = useSensors();
  const { themeColors, isDarkMode } = useSettings();

  const styles = useMemo(
    () => createModalStyles(themeColors, { isDarkMode }),
    [themeColors, isDarkMode]
  );

  const activities = [
    { name: 'STATIONARY', icon: 'body', color: '#6b7280', radius: 100 },
    { name: 'WALKING', icon: 'walk', color: '#10b981', radius: 500 },
    { name: 'RUNNING', icon: 'fitness', color: '#f59e0b', radius: 1000 },
    { name: 'DRIVING', icon: 'car', color: '#3b82f6', radius: 5000 }
  ];

  const currentActivityData = activities.find(a => a.name === currentActivity);

  if (!motionDetectionEnabled) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name={currentActivityData?.icon || 'body'} size={32} color={currentActivityData?.color} />
              <View>
                <Text style={styles.headerTitle}>Activity Detection</Text>
                <Text style={styles.headerSubtitle}>Smart discovery radius</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={themeColors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.currentActivityCard}>
              <Text style={styles.sectionTitle}>Current Activity</Text>
              <Text style={[styles.activityValue, { color: currentActivityData?.color }]}>
                {currentActivity}
              </Text>
              <Text style={styles.activityRadius}>{proximityRadius}m discovery radius</Text>
            </View>

            <View style={styles.activitiesCard}>
              <Text style={styles.sectionTitle}>Activity Modes</Text>
              {activities.map(activity => (
                <View
                  key={activity.name}
                  style={[
                    styles.activityItem,
                    activity.name === currentActivity && styles.activityItemActive
                  ]}
                >
                  <Ionicons name={activity.icon} size={24} color={activity.color} />
                  <View style={styles.activityInfo}>
                    <Text style={styles.activityName}>{activity.name}</Text>
                    <Text style={styles.activityMeta}>{activity.radius}m radius</Text>
                  </View>
                  {activity.name === currentActivity && (
                    <Ionicons name="checkmark-circle" size={20} color={activity.color} />
                  )}
                </View>
              ))}
            </View>

            <View style={styles.infoCard}>
              <Ionicons name="information-circle-outline" size={20} color={themeColors.textSecondary} />
              <Text style={styles.infoText}>
                Your discovery radius automatically adjusts based on how you're moving.
                Faster movement = wider radius to discover more content!
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// Exploration Detail Modal
export function ExplorationDetailModal({ visible, onClose }) {
  const { explorationProgress, dailySteps } = useSensors();
  const { themeColors, isDarkMode } = useSettings();

  const styles = useMemo(
    () => createModalStyles(themeColors, { isDarkMode }),
    [themeColors, isDarkMode]
  );

  const totalKm = (explorationProgress.totalDistance / 1000).toFixed(2);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="trophy" size={32} color="#a855f7" />
              <View>
                <Text style={styles.headerTitle}>Exploration Progress</Text>
                <Text style={styles.headerSubtitle}>Your neighborhood journey</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={themeColors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.explorationHero}>
              <Text style={styles.explorationPercent}>
                {explorationProgress.neighborhoodCoverage.toFixed(0)}%
              </Text>
              <Text style={styles.explorationLabel}>Neighborhood Explored</Text>
              <View style={styles.explorationBar}>
                <View style={[styles.explorationFill, { width: `${explorationProgress.neighborhoodCoverage}%` }]} />
              </View>
            </View>

            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Ionicons name="location" size={24} color="#8b5cf6" />
                <Text style={styles.statValue}>{explorationProgress.locationsVisited.length}</Text>
                <Text style={styles.statLabel}>Locations</Text>
              </View>
              <View style={styles.statBox}>
                <Ionicons name="navigate" size={24} color="#3b82f6" />
                <Text style={styles.statValue}>{totalKm} km</Text>
                <Text style={styles.statLabel}>Distance</Text>
              </View>
              <View style={styles.statBox}>
                <Ionicons name="footsteps" size={24} color="#10b981" />
                <Text style={styles.statValue}>{dailySteps.toLocaleString()}</Text>
                <Text style={styles.statLabel}>Steps</Text>
              </View>
            </View>

            <View style={styles.achievementsCard}>
              <Text style={styles.sectionTitle}>Achievements</Text>
              <View style={styles.achievement}>
                <Ionicons
                  name={explorationProgress.neighborhoodCoverage >= 10 ? "checkmark-circle" : "ellipse-outline"}
                  size={24}
                  color={explorationProgress.neighborhoodCoverage >= 10 ? "#10b981" : themeColors.textSecondary}
                />
                <Text style={styles.achievementText}>Explorer - Visit 10% of neighborhood</Text>
              </View>
              <View style={styles.achievement}>
                <Ionicons
                  name={explorationProgress.neighborhoodCoverage >= 50 ? "checkmark-circle" : "ellipse-outline"}
                  size={24}
                  color={explorationProgress.neighborhoodCoverage >= 50 ? "#10b981" : themeColors.textSecondary}
                />
                <Text style={styles.achievementText}>Navigator - Visit 50% of neighborhood</Text>
              </View>
              <View style={styles.achievement}>
                <Ionicons
                  name={explorationProgress.neighborhoodCoverage >= 100 ? "checkmark-circle" : "ellipse-outline"}
                  size={24}
                  color={explorationProgress.neighborhoodCoverage >= 100 ? "#10b981" : themeColors.textSecondary}
                />
                <Text style={styles.achievementText}>Master - Complete neighborhood exploration</Text>
              </View>
            </View>

            <View style={styles.infoCard}>
              <Ionicons name="information-circle-outline" size={20} color={themeColors.textSecondary} />
              <Text style={styles.infoText}>
                Keep exploring your neighborhood to unlock achievements and discover new local content!
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const createModalStyles = (palette, { isDarkMode }) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end'
    },
    modal: {
      backgroundColor: palette.background,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: '90%',
      paddingBottom: 20
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: palette.divider
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: palette.textPrimary
    },
    headerSubtitle: {
      fontSize: 13,
      color: palette.textSecondary,
      marginTop: 2
    },
    closeButton: {
      padding: 8
    },
    content: {
      padding: 20
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: palette.textPrimary,
      marginBottom: 12
    },
    stepsHero: {
      backgroundColor: isDarkMode ? palette.card : '#f0fdf4',
      borderRadius: 20,
      padding: 24,
      alignItems: 'center',
      marginBottom: 20,
      borderWidth: 2,
      borderColor: '#10b981'
    },
    stepsValue: {
      fontSize: 56,
      fontWeight: '800',
      color: '#10b981',
      letterSpacing: -2
    },
    stepsLabel: {
      fontSize: 16,
      color: palette.textSecondary,
      marginBottom: 16
    },
    progressBar: {
      width: '100%',
      height: 8,
      backgroundColor: isDarkMode ? palette.background : '#dcfce7',
      borderRadius: 4,
      overflow: 'hidden',
      marginBottom: 8
    },
    progressFill: {
      height: '100%',
      backgroundColor: '#10b981'
    },
    progressText: {
      fontSize: 14,
      color: palette.textSecondary,
      fontWeight: '600'
    },
    statsGrid: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 16
    },
    statBox: {
      flex: 1,
      backgroundColor: isDarkMode ? palette.card : '#f9fafb',
      borderRadius: 16,
      padding: 16,
      alignItems: 'center'
    },
    statValue: {
      fontSize: 20,
      fontWeight: '700',
      color: palette.textPrimary,
      marginTop: 8
    },
    statLabel: {
      fontSize: 12,
      color: palette.textSecondary,
      marginTop: 4
    },
    currentActivityCard: {
      backgroundColor: isDarkMode ? palette.card : '#f9fafb',
      borderRadius: 16,
      padding: 20,
      alignItems: 'center',
      marginBottom: 16
    },
    activityValue: {
      fontSize: 32,
      fontWeight: '800',
      marginTop: 8
    },
    activityRadius: {
      fontSize: 16,
      color: palette.textSecondary,
      marginTop: 4
    },
    activitiesCard: {
      backgroundColor: isDarkMode ? palette.card : '#f9fafb',
      borderRadius: 16,
      padding: 20,
      marginBottom: 16
    },
    activityItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: 12,
      backgroundColor: palette.background,
      marginBottom: 10,
      gap: 12
    },
    activityItemActive: {
      borderWidth: 2,
      borderColor: palette.primary
    },
    activityInfo: {
      flex: 1
    },
    activityName: {
      fontSize: 15,
      fontWeight: '600',
      color: palette.textPrimary
    },
    activityMeta: {
      fontSize: 13,
      color: palette.textSecondary,
      marginTop: 2
    },
    explorationHero: {
      backgroundColor: isDarkMode ? palette.card : '#faf5ff',
      borderRadius: 20,
      padding: 24,
      alignItems: 'center',
      marginBottom: 20,
      borderWidth: 2,
      borderColor: '#a855f7'
    },
    explorationPercent: {
      fontSize: 56,
      fontWeight: '800',
      color: '#a855f7',
      letterSpacing: -2
    },
    explorationLabel: {
      fontSize: 16,
      color: palette.textSecondary,
      marginBottom: 16
    },
    explorationBar: {
      width: '100%',
      height: 8,
      backgroundColor: isDarkMode ? palette.background : '#f3e8ff',
      borderRadius: 4,
      overflow: 'hidden'
    },
    explorationFill: {
      height: '100%',
      backgroundColor: '#a855f7'
    },
    achievementsCard: {
      backgroundColor: isDarkMode ? palette.card : '#f9fafb',
      borderRadius: 16,
      padding: 20,
      marginBottom: 16
    },
    achievement: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 12
    },
    achievementText: {
      fontSize: 15,
      color: palette.textPrimary
    },
    infoCard: {
      flexDirection: 'row',
      gap: 10,
      backgroundColor: isDarkMode ? palette.card : '#fef3c7',
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: isDarkMode ? palette.divider : '#fde68a'
    },
    infoText: {
      flex: 1,
      fontSize: 13,
      color: palette.textSecondary,
      lineHeight: 18
    }
  });
