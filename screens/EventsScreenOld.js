/**
 * Events Screen
 * Discover local events in your community
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import ScreenLayout from '../components/ScreenLayout';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import useHaptics from '../hooks/useHaptics';
import {
  getEventsByLocation,
  getUpcomingEvents,
  createEvent,
  deleteEvent,
  EVENT_CATEGORIES,
  CATEGORY_EMOJIS,
} from '../services/eventsService';

export default function EventsScreen({ navigation }) {
  const { themeColors, accentPreset, userProfile } = useSettings();
  const { user } = useAuth();
  const haptics = useHaptics();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // 'all' or 'my'

  const primaryColor = accentPreset?.buttonBackground || themeColors.primary;

  // Load events
  const loadEvents = useCallback(async () => {
    try {
      let fetchedEvents = [];

      if (activeTab === 'my' && user?.uid) {
        // Load my events
        const { getMyEvents } = require('../services/eventsService');
        fetchedEvents = await getMyEvents(user.uid);
      } else if (userProfile?.country) {
        // Load events by location
        fetchedEvents = await getEventsByLocation(
          userProfile.country,
          userProfile.province,
          userProfile.city
        );
      } else {
        // Load all upcoming events
        fetchedEvents = await getUpcomingEvents();
      }

      setEvents(fetchedEvents);
    } catch (error) {
      console.error('[Events] Error loading events:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, userProfile, user?.uid]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadEvents();
  }, [loadEvents]);

  const handleAddEvent = () => {
    haptics.light();
    setShowAddModal(true);
  };

  const handleDeleteEvent = async (eventId) => {
    Alert.alert(
      'Delete Event',
      'Are you sure you want to delete this event?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteEvent(eventId);
              loadEvents();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete event');
            }
          },
        },
      ]
    );
  };

  // Filter events by search
  const filteredEvents = events.filter(event =>
    event.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <ScreenLayout
      title="Events"
      subtitle="Discover local happenings"
      navigation={navigation}
      showFooter={true}
      activeTab="events"
    >
      <View style={styles.container}>
        {/* Header Section with Gradient */}
        <LinearGradient
          colors={['#6C4DF4', '#8B5CF6', '#A78BFA']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Discover local events</Text>
            <Text style={styles.headerSubtitle}>Connect with your community</Text>

            {/* Add Event Button */}
            <TouchableOpacity
              style={styles.addButton}
              onPress={handleAddEvent}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={20} color="#6C4DF4" />
              <Text style={styles.addButtonText}>Create Event</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View
            style={[
              styles.searchBar,
              {
                backgroundColor: themeColors.background,
                borderColor: themeColors.divider,
              },
            ]}
          >
            <Ionicons name="search" size={20} color={themeColors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: themeColors.textPrimary }]}
              placeholder="Search events..."
              placeholderTextColor={themeColors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={themeColors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Tabs */}
        {user?.uid && (
          <View style={[styles.tabsContainer, { borderBottomColor: themeColors.divider }]}>
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === 'all' && {
                  borderBottomColor: primaryColor,
                  borderBottomWidth: 2,
                },
              ]}
              onPress={() => setActiveTab('all')}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === 'all' ? primaryColor : themeColors.textSecondary },
                ]}
              >
                All Events
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === 'my' && {
                  borderBottomColor: primaryColor,
                  borderBottomWidth: 2,
                },
              ]}
              onPress={() => setActiveTab('my')}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === 'my' ? primaryColor : themeColors.textSecondary },
                ]}
              >
                My Events
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Events List */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={primaryColor}
            />
          }
        >
          <Text style={[styles.resultsCount, { color: themeColors.textSecondary }]}>
            {filteredEvents.length} {filteredEvents.length === 1 ? 'Result' : 'Results'}
          </Text>

          {filteredEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              themeColors={themeColors}
              primaryColor={primaryColor}
              isMyEvent={event.organizerId === user?.uid}
              onDelete={() => handleDeleteEvent(event.id)}
              navigation={navigation}
              currentUserId={user?.uid}
            />
          ))}

          {filteredEvents.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={64} color={themeColors.textSecondary} />
              <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>
                {searchQuery ? 'No events found' : 'No events yet'}
              </Text>
              <Text style={[styles.emptySubtext, { color: themeColors.textSecondary }]}>
                {searchQuery ? 'Try a different search' : 'Be the first to create an event!'}
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Add Event Modal */}
        <AddEventModal
          visible={showAddModal}
          onClose={() => setShowAddModal(false)}
          onEventCreated={() => {
            setShowAddModal(false);
            loadEvents();
          }}
          themeColors={themeColors}
          primaryColor={primaryColor}
          userProfile={userProfile}
          user={user}
        />
      </View>
    </ScreenLayout>
  );
}

// Event Card Component
function EventCard({ event, themeColors, primaryColor, isMyEvent, onDelete, navigation, currentUserId }) {
  const [expanded, setExpanded] = useState(false);

  const handleViewProfile = () => {
    if (!event.organizerId || !navigation) return;

    // If it's the current user, navigate to their own profile
    if (event.organizerId === currentUserId) {
      navigation.navigate('Profile');
    } else {
      // Navigate to public profile for other users
      navigation.navigate('PublicProfile', { userId: event.organizerId });
    }
  };

  return (
    <TouchableOpacity
      style={[styles.eventCard, { backgroundColor: themeColors.card }]}
      onPress={() => setExpanded(!expanded)}
      activeOpacity={0.7}
    >
      <View style={styles.eventHeader}>
        <View style={styles.eventIconContainer}>
          <Text style={styles.eventEmoji}>{event.emoji || '📅'}</Text>
        </View>
        <View style={styles.eventInfo}>
          <Text style={[styles.eventTitle, { color: themeColors.textPrimary }]}>
            {event.title}
          </Text>
          {event.date && (
            <Text style={[styles.eventDate, { color: themeColors.textSecondary }]}>
              {event.date}
            </Text>
          )}
          {event.location?.city && (
            <Text style={[styles.eventLocation, { color: themeColors.textSecondary }]}>
              <Ionicons name="location" size={12} /> {event.location.city}
              {event.location.province && `, ${event.location.province}`}
            </Text>
          )}
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={themeColors.textSecondary}
        />
      </View>

      {expanded && (
        <View style={styles.eventDetails}>
          {event.description && (
            <Text style={[styles.eventDescription, { color: themeColors.textSecondary }]}>
              {event.description}
            </Text>
          )}

          {event.organizerName && (
            <TouchableOpacity
              style={styles.organizerInfo}
              onPress={handleViewProfile}
              activeOpacity={0.6}
            >
              <Ionicons name="person" size={14} color={primaryColor} />
              <Text style={[styles.organizerText, { color: primaryColor }]}>
                Organized by {event.organizerName}
              </Text>
              <Ionicons name="chevron-forward" size={14} color={primaryColor} />
            </TouchableOpacity>
          )}

          {isMyEvent && (
            <TouchableOpacity
              style={[styles.deleteButton, { backgroundColor: '#FF3B3020' }]}
              onPress={onDelete}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={16} color="#FF3B30" />
              <Text style={styles.deleteButtonText}>Delete Event</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

// Add Event Modal Component
function AddEventModal({ visible, onClose, onEventCreated, themeColors, primaryColor, userProfile, user }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [category, setCategory] = useState('community');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter an event title');
      return;
    }

    if (!user?.uid) {
      Alert.alert('Error', 'You must be logged in to create events');
      return;
    }

    setSubmitting(true);

    try {
      await createEvent({
        title: title.trim(),
        description: description.trim(),
        date: date.trim() || new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        timestamp: Date.now(),
        category,
        emoji: CATEGORY_EMOJIS[category],
        country: userProfile?.country || 'Unknown',
        province: userProfile?.province || '',
        city: userProfile?.city || '',
        organizerId: user.uid,
        organizerName: userProfile?.displayName || userProfile?.username || 'Anonymous',
        organizerPhoto: userProfile?.profilePhoto || null,
      });

      // Reset form
      setTitle('');
      setDescription('');
      setDate('');
      setCategory('community');

      onEventCreated();
    } catch (error) {
      console.error('[AddEvent] Error:', error);
      Alert.alert('Error', 'Failed to create event. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: themeColors.card }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: themeColors.textPrimary }]}>
              Create Event
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={28} color={themeColors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalForm}>
            <Text style={[styles.label, { color: themeColors.textSecondary }]}>Event Title *</Text>
            <TextInput
              style={[styles.input, {
                backgroundColor: themeColors.background,
                borderColor: themeColors.divider,
                color: themeColors.textPrimary,
              }]}
              placeholder="Summer Music Festival"
              placeholderTextColor={themeColors.textSecondary}
              value={title}
              onChangeText={setTitle}
            />

            <Text style={[styles.label, { color: themeColors.textSecondary }]}>Description</Text>
            <TextInput
              style={[styles.textArea, {
                backgroundColor: themeColors.background,
                borderColor: themeColors.divider,
                color: themeColors.textPrimary,
              }]}
              placeholder="Describe your event..."
              placeholderTextColor={themeColors.textSecondary}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
            />

            <Text style={[styles.label, { color: themeColors.textSecondary }]}>Date</Text>
            <TextInput
              style={[styles.input, {
                backgroundColor: themeColors.background,
                borderColor: themeColors.divider,
                color: themeColors.textPrimary,
              }]}
              placeholder="Sun, Apr 28"
              placeholderTextColor={themeColors.textSecondary}
              value={date}
              onChangeText={setDate}
            />

            <Text style={[styles.label, { color: themeColors.textSecondary }]}>Category</Text>
            <View style={styles.categoryGrid}>
              {Object.entries(EVENT_CATEGORIES).map(([key, value]) => (
                <TouchableOpacity
                  key={value}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor: category === value ? `${primaryColor}20` : themeColors.background,
                      borderColor: category === value ? primaryColor : themeColors.divider,
                    },
                  ]}
                  onPress={() => setCategory(value)}
                >
                  <Text style={styles.categoryEmoji}>{CATEGORY_EMOJIS[value]}</Text>
                  <Text style={[
                    styles.categoryText,
                    { color: category === value ? primaryColor : themeColors.textSecondary },
                  ]}>
                    {key.charAt(0) + key.slice(1).toLowerCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: primaryColor }]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.8}
          >
            <Text style={styles.submitButtonText}>
              {submitting ? 'Creating...' : 'Create Event'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerGradient: {
    padding: 24,
    paddingTop: 16,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 20,
    textAlign: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
  },
  addButtonText: {
    color: '#6C4DF4',
    fontSize: 16,
    fontWeight: '600',
  },
  searchContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 12,
    gap: 8,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginBottom: 8,
  },
  tab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 120,
  },
  resultsCount: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 16,
  },
  eventCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  eventIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#F3F0FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventEmoji: {
    fontSize: 28,
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
  },
  eventDate: {
    fontSize: 14,
    marginBottom: 2,
  },
  eventLocation: {
    fontSize: 13,
  },
  eventDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  eventDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  organizerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F3F0FF',
    alignSelf: 'flex-start',
  },
  organizerText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  deleteButtonText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  modalForm: {
    maxHeight: 400,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryEmoji: {
    fontSize: 16,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '500',
  },
  submitButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
});
