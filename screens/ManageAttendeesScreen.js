/**
 * Manage Attendees Screen
 * Allows event organizers to manage RSVPs and attendees
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenLayout from '../components/ScreenLayout';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import {
  getEventRSVPsByStatus,
  acceptRSVP,
  rejectRSVP,
  kickAttendee,
} from '../services/eventRsvpService';
import {
  createEventChat,
  addParticipant,
  removeParticipant,
} from '../services/eventChatService';

export default function ManageAttendeesScreen({ route, navigation }) {
  const { eventId, event } = route.params;
  const { themeColors, accentPreset } = useSettings();
  const { user } = useAuth();

  const [pendingRSVPs, setPendingRSVPs] = useState([]);
  const [acceptedAttendees, setAcceptedAttendees] = useState([]);
  const [rejectedRSVPs, setRejectedRSVPs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('pending'); // pending, accepted, rejected

  const primaryColor = accentPreset?.buttonBackground || themeColors.primary;

  // Load RSVPs
  const loadRSVPs = useCallback(async () => {
    try {
      const [pending, accepted, rejected] = await Promise.all([
        getEventRSVPsByStatus(eventId, 'pending'),
        getEventRSVPsByStatus(eventId, 'accepted'),
        getEventRSVPsByStatus(eventId, 'rejected'),
      ]);

      setPendingRSVPs(pending);
      setAcceptedAttendees(accepted);
      setRejectedRSVPs(rejected);
    } catch (error) {
      console.error('[ManageAttendees] Error loading RSVPs:', error);
      Alert.alert('Error', 'Failed to load attendees');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadRSVPs();
  }, [loadRSVPs]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadRSVPs();
  }, [loadRSVPs]);

  const handleAcceptRSVP = async (rsvp) => {
    try {
      await acceptRSVP(eventId, rsvp.userId, user.uid);

      // Create chat if it doesn't exist
      await createEventChat(
        eventId,
        event.title,
        user.uid,
        user.displayName || 'Organizer'
      );

      // Add participant to chat
      await addParticipant(eventId, rsvp.userId, rsvp.userName);

      // Refresh list
      loadRSVPs();

      Alert.alert('Accepted', `${rsvp.userName} has been accepted to the event`);
    } catch (error) {
      console.error('[ManageAttendees] Error accepting RSVP:', error);
      Alert.alert('Error', 'Failed to accept request');
    }
  };

  const handleRejectRSVP = async (rsvp) => {
    Alert.alert(
      'Reject Request',
      `Are you sure you want to reject ${rsvp.userName}'s request?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              await rejectRSVP(eventId, rsvp.userId, user.uid);
              loadRSVPs();
              Alert.alert('Rejected', `${rsvp.userName}'s request has been rejected`);
            } catch (error) {
              console.error('[ManageAttendees] Error rejecting RSVP:', error);
              Alert.alert('Error', 'Failed to reject request');
            }
          },
        },
      ]
    );
  };

  const handleKickAttendee = async (attendee) => {
    Alert.alert(
      'Remove Attendee',
      `Are you sure you want to remove ${attendee.userName} from this event? They will also be removed from the event chat.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await kickAttendee(eventId, attendee.userId, user.uid);
              await removeParticipant(eventId, attendee.userId, attendee.userName, 'kicked');
              loadRSVPs();
              Alert.alert('Removed', `${attendee.userName} has been removed from the event`);
            } catch (error) {
              console.error('[ManageAttendees] Error kicking attendee:', error);
              Alert.alert('Error', 'Failed to remove attendee');
            }
          },
        },
      ]
    );
  };

  const renderAttendee = (attendee, type = 'pending') => {
    const requestDate = attendee.requestedAt
      ? new Date(attendee.requestedAt?.seconds ? attendee.requestedAt.seconds * 1000 : attendee.requestedAt)
      : null;

    return (
      <View
        key={attendee.id}
        style={[styles.attendeeCard, { backgroundColor: themeColors.card, borderColor: themeColors.divider }]}
      >
        <View style={styles.attendeeInfo}>
          {attendee.userPhoto ? (
            <Image source={{ uri: attendee.userPhoto }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: primaryColor }]}>
              <Ionicons name="person" size={24} color="#fff" />
            </View>
          )}

          <View style={styles.attendeeDetails}>
            <Text style={[styles.attendeeName, { color: themeColors.textPrimary }]}>
              {attendee.userName}
            </Text>
            {requestDate && (
              <Text style={[styles.requestDate, { color: themeColors.textSecondary }]}>
                Requested {requestDate.toLocaleDateString()}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.attendeeActions}>
          {type === 'pending' && (
            <>
              <TouchableOpacity
                style={[styles.acceptButton, { backgroundColor: '#10b981' }]}
                onPress={() => handleAcceptRSVP(attendee)}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark" size={20} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.rejectButton, { backgroundColor: '#ef4444' }]}
                onPress={() => handleRejectRSVP(attendee)}
                activeOpacity={0.8}
              >
                <Ionicons name="close" size={20} color="#fff" />
              </TouchableOpacity>
            </>
          )}

          {type === 'accepted' && (
            <TouchableOpacity
              style={[styles.kickButton, { backgroundColor: `${themeColors.error}15`, borderColor: themeColors.error }]}
              onPress={() => handleKickAttendee(attendee)}
              activeOpacity={0.8}
            >
              <Ionicons name="remove-circle-outline" size={18} color={themeColors.error} />
              <Text style={[styles.kickText, { color: themeColors.error }]}>Remove</Text>
            </TouchableOpacity>
          )}

          {type === 'rejected' && (
            <View style={[styles.rejectedBadge, { backgroundColor: '#ef444420' }]}>
              <Text style={styles.rejectedText}>Rejected</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const getTabData = () => {
    switch (activeTab) {
      case 'pending':
        return pendingRSVPs;
      case 'accepted':
        return acceptedAttendees;
      case 'rejected':
        return rejectedRSVPs;
      default:
        return [];
    }
  };

  const tabData = getTabData();

  return (
    <ScreenLayout
      navigation={navigation}
      showHeader
      headerTitle="Manage Attendees"
      headerBackButton
    >
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        {/* Event Info Banner */}
        <View style={[styles.eventBanner, { backgroundColor: themeColors.card, borderBottomColor: themeColors.divider }]}>
          <Text style={[styles.eventTitle, { color: themeColors.textPrimary }]} numberOfLines={1}>
            {event.title}
          </Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="time-outline" size={16} color={primaryColor} />
              <Text style={[styles.statText, { color: themeColors.textSecondary }]}>
                {pendingRSVPs.length} pending
              </Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="checkmark-circle-outline" size={16} color="#10b981" />
              <Text style={[styles.statText, { color: themeColors.textSecondary }]}>
                {acceptedAttendees.length} accepted
              </Text>
            </View>
          </View>
        </View>

        {/* Tabs */}
        <View style={[styles.tabsContainer, { backgroundColor: themeColors.card, borderBottomColor: themeColors.divider }]}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'pending' && { borderBottomColor: primaryColor, borderBottomWidth: 3 },
            ]}
            onPress={() => setActiveTab('pending')}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.tabText,
              { color: activeTab === 'pending' ? primaryColor : themeColors.textSecondary },
            ]}>
              Pending {pendingRSVPs.length > 0 && `(${pendingRSVPs.length})`}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'accepted' && { borderBottomColor: primaryColor, borderBottomWidth: 3 },
            ]}
            onPress={() => setActiveTab('accepted')}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.tabText,
              { color: activeTab === 'accepted' ? primaryColor : themeColors.textSecondary },
            ]}>
              Accepted {acceptedAttendees.length > 0 && `(${acceptedAttendees.length})`}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'rejected' && { borderBottomColor: primaryColor, borderBottomWidth: 3 },
            ]}
            onPress={() => setActiveTab('rejected')}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.tabText,
              { color: activeTab === 'rejected' ? primaryColor : themeColors.textSecondary },
            ]}>
              Rejected {rejectedRSVPs.length > 0 && `(${rejectedRSVPs.length})`}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Attendees List */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={primaryColor}
              colors={[primaryColor]}
            />
          }
        >
          {loading ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>Loading...</Text>
            </View>
          ) : tabData.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons
                name={
                  activeTab === 'pending'
                    ? 'time-outline'
                    : activeTab === 'accepted'
                    ? 'checkmark-circle-outline'
                    : 'close-circle-outline'
                }
                size={64}
                color={themeColors.textTertiary}
              />
              <Text style={[styles.emptyTitle, { color: themeColors.textPrimary }]}>
                {activeTab === 'pending'
                  ? 'No Pending Requests'
                  : activeTab === 'accepted'
                  ? 'No Accepted Attendees'
                  : 'No Rejected Requests'}
              </Text>
              <Text style={[styles.emptySubtitle, { color: themeColors.textSecondary }]}>
                {activeTab === 'pending'
                  ? 'Attendance requests will appear here'
                  : activeTab === 'accepted'
                  ? 'Accepted attendees will appear here'
                  : 'Rejected requests will appear here'}
              </Text>
            </View>
          ) : (
            tabData.map((attendee) => renderAttendee(attendee, activeTab))
          )}
        </ScrollView>
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  eventBanner: {
    padding: 16,
    borderBottomWidth: 1,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 14,
    fontWeight: '500',
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  attendeeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  attendeeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attendeeDetails: {
    marginLeft: 12,
    flex: 1,
  },
  attendeeName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  requestDate: {
    fontSize: 13,
    fontWeight: '500',
  },
  attendeeActions: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  kickText: {
    fontSize: 13,
    fontWeight: '600',
  },
  rejectedBadge: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  rejectedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ef4444',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
  },
});
