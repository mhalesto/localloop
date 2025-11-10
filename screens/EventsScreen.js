/**
 * Events Screen - Redesigned with Week Calendar View
 * Stunning artistic layout with better event visibility
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Dimensions,
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import LottieView from 'lottie-react-native';
import ScreenLayout from '../components/ScreenLayout';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import useHaptics from '../hooks/useHaptics';
import {
  getEventsByLocation,
  getUpcomingEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  EVENT_CATEGORIES,
  CATEGORY_EMOJIS,
} from '../services/eventsService';
import { canCreateEvent, recordEventCreated } from '../utils/subscriptionUtils';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.69;
const CARD_SPACING = 0;

// Optional event fields for Premium/Gold users
const OPTIONAL_EVENT_FIELDS = [
  { id: 'dressCode', label: 'Dress Code', icon: 'shirt-outline', placeholder: 'e.g., Casual, Formal, Costume' },
  { id: 'ticketPrice', label: 'Ticket Price', icon: 'cash-outline', placeholder: 'e.g., Free, R50, R100-R200' },
  { id: 'rsvpLink', label: 'RSVP Link', icon: 'link-outline', placeholder: 'https://...' },
  { id: 'contactNumber', label: 'Contact Number', icon: 'call-outline', placeholder: '+27 XX XXX XXXX' },
  { id: 'ageRestriction', label: 'Age Restriction', icon: 'person-outline', placeholder: 'e.g., 18+, All ages, 21+' },
  { id: 'parking', label: 'Parking Info', icon: 'car-outline', placeholder: 'e.g., Free parking, Street parking' },
  { id: 'accessibility', label: 'Accessibility', icon: 'accessibility-outline', placeholder: 'e.g., Wheelchair accessible' },
  { id: 'foodBeverage', label: 'Food & Beverage', icon: 'restaurant-outline', placeholder: 'e.g., Food available, BYOB' },
  { id: 'duration', label: 'Duration', icon: 'time-outline', placeholder: 'Select days, hours, and minutes' },
  { id: 'maxCapacity', label: 'Max Capacity', icon: 'people-outline', placeholder: 'Select number of people' },
];

export default function EventsScreenRedesign({ navigation }) {
  const { themeColors, accentPreset, userProfile } = useSettings();
  const { user } = useAuth();
  const haptics = useHaptics();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedDate, setSelectedDate] = useState(new Date());

  const primaryColor = accentPreset?.buttonBackground || themeColors.primary;
  const scrollX = useRef(new Animated.Value(0)).current;

  // Generate week days
  const getWeekDays = () => {
    const today = new Date();
    const currentDay = today.getDay();
    const diff = today.getDate() - currentDay;
    const sunday = new Date(today.setDate(diff));

    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(sunday);
      date.setDate(sunday.getDate() + i);
      return date;
    });
  };

  const weekDays = getWeekDays();

  // Load events
  const loadEvents = useCallback(async () => {
    try {
      let fetchedEvents = [];

      if (activeTab === 'my' && user?.uid) {
        const { getMyEvents } = require('../services/eventsService');
        fetchedEvents = await getMyEvents(user.uid);
      } else if (userProfile?.country) {
        fetchedEvents = await getEventsByLocation(
          userProfile.country,
          userProfile.province,
          userProfile.city
        );
      } else {
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
    setEditingEvent(null);
    setShowAddModal(true);
  };

  const handleEditEvent = (event) => {
    haptics.light();
    setEditingEvent(event);
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

  const handleViewProfile = (event) => {
    if (!event.organizerId || !navigation) return;

    if (event.organizerId === user?.uid) {
      navigation.navigate('Profile');
    } else {
      navigation.navigate('PublicProfile', { userId: event.organizerId });
    }
  };

  // Count events for a specific date
  const getEventsCountForDate = (date) => {
    const dateString = date.toDateString();
    return events.filter(event => {
      if (!event.timestamp) return false;
      const eventDate = new Date(event.timestamp);
      return eventDate.toDateString() === dateString;
    }).length;
  };

  // Filter events by search and selected date
  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.description?.toLowerCase().includes(searchQuery.toLowerCase());

    // Filter by selected date
    const matchesDate = (() => {
      if (!event.timestamp) return true; // Show events without timestamp
      const eventDate = new Date(event.timestamp);
      return eventDate.toDateString() === selectedDate.toDateString();
    })();

    return matchesSearch && matchesDate;
  });

  return (
    <ScreenLayout
      title="Events"
      subtitle="Discover local happenings"
      navigation={navigation}
      showFooter={true}
      activeTab="events"
    >
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={primaryColor}
          />
        }
      >
        {/* Artistic Hero Section */}
        <View style={styles.heroSection}>
          <LinearGradient
            colors={['#6C4DF4', '#8B5CF6', '#A78BFA']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradient}
          >
            {/* Floating circles background */}
            <View style={styles.floatingCircles}>
              <View style={[styles.circle, styles.circle1]} />
              <View style={[styles.circle, styles.circle2]} />
              <View style={[styles.circle, styles.circle3]} />
            </View>

            <Text style={styles.heroTitle}>Discover Events</Text>
            <Text style={styles.heroSubtitle}>Connect with your community</Text>

            {/* Create Event Button */}
            <TouchableOpacity
              style={styles.createButton}
              onPress={handleAddEvent}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['#FFFFFF', '#F5F1FF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.createButtonGradient}
              >
                <Ionicons name="add-circle" size={24} color="#6C4DF4" />
                <Text style={styles.createButtonText}>Create Event</Text>
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </View>

        {/* Week Calendar View */}
        <View style={[styles.calendarSection, { backgroundColor: themeColors.card }]}>
          <View style={styles.calendarHeader}>
            <Ionicons name="calendar" size={20} color={primaryColor} />
            <Text style={[styles.calendarTitle, { color: themeColors.textPrimary }]}>
              This Week
            </Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.weekDaysContainer}
          >
            {weekDays.map((date, index) => {
              const isToday = date.toDateString() === new Date().toDateString();
              const isSelected = date.toDateString() === selectedDate.toDateString();
              const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
              const dayNumber = date.getDate();

              // Count actual events for this day
              const eventsCount = getEventsCountForDate(date);

              // 3-color rotation pattern for beautiful variety
              const colorPatterns = [
                { bg: '#F0F3FF', text: '#4A5568', number: '#2D3748' }, // Soft Blue
                { bg: '#FFF5F0', text: '#ED8936', number: '#DD6B20' }, // Soft Orange
                { bg: '#F0FFF4', text: '#38A169', number: '#2F855A' }, // Soft Green
              ];
              const colorPattern = colorPatterns[index % 3];

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.dayCard,
                    !isSelected && { backgroundColor: colorPattern.bg },
                    isSelected && { backgroundColor: primaryColor },
                    isToday && !isSelected && {
                      borderColor: primaryColor,
                      borderWidth: 2.5,
                      shadowColor: primaryColor,
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.3,
                      shadowRadius: 8,
                      elevation: 6,
                    },
                  ]}
                  onPress={() => {
                    setSelectedDate(date);
                    haptics.light();
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.dayName,
                      { color: isSelected ? '#FFFFFF' : colorPattern.text },
                    ]}
                  >
                    {dayName}
                  </Text>
                  <Text
                    style={[
                      styles.dayNumber,
                      { color: isSelected ? '#FFFFFF' : colorPattern.number },
                    ]}
                  >
                    {dayNumber}
                  </Text>
                  {eventsCount > 0 && (
                    <View
                      style={[
                        styles.eventDot,
                        { backgroundColor: isSelected ? '#FFFFFF' : primaryColor },
                      ]}
                    >
                      <Text
                        style={[
                          styles.eventDotText,
                          { color: isSelected ? primaryColor : '#FFFFFF' },
                        ]}
                      >
                        {eventsCount}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Search Bar */}
        <View style={styles.searchSection}>
          <View
            style={[
              styles.searchBar,
              {
                backgroundColor: themeColors.card,
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
          <View style={styles.tabsSection}>
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === 'all' && [styles.tabActive, { backgroundColor: `${primaryColor}15` }],
              ]}
              onPress={() => setActiveTab('all')}
              activeOpacity={0.7}
            >
              <Ionicons
                name="globe-outline"
                size={18}
                color={activeTab === 'all' ? primaryColor : themeColors.textSecondary}
              />
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
                activeTab === 'my' && [styles.tabActive, { backgroundColor: `${primaryColor}15` }],
              ]}
              onPress={() => setActiveTab('my')}
              activeOpacity={0.7}
            >
              <Ionicons
                name="person-outline"
                size={18}
                color={activeTab === 'my' ? primaryColor : themeColors.textSecondary}
              />
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

        {/* Events Count */}
        <View style={styles.countSection}>
          <Text style={[styles.countText, { color: themeColors.textSecondary }]}>
            {filteredEvents.length} {filteredEvents.length === 1 ? 'event' : 'events'} on{' '}
            {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </Text>
        </View>

        {/* Horizontal Scrollable Event Cards */}
        {filteredEvents.length > 0 ? (
          <View style={styles.carouselContainer}>
            <Animated.ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={CARD_WIDTH + CARD_SPACING}
              decelerationRate="fast"
              contentContainerStyle={styles.eventsCarousel}
              onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                { useNativeDriver: true }
              )}
              scrollEventThrottle={16}
            >
              {filteredEvents.map((event, index) => (
                <EventCard
                  key={event.id}
                  event={event}
                  index={index}
                  scrollX={scrollX}
                  themeColors={themeColors}
                  primaryColor={primaryColor}
                  isMyEvent={event.organizerId === user?.uid}
                  onEdit={() => handleEditEvent(event)}
                  onDelete={() => handleDeleteEvent(event.id)}
                  onViewProfile={() => handleViewProfile(event)}
                />
              ))}
            </Animated.ScrollView>

            {/* Swipe indicator gradient - only show if there are 2+ events */}
            {filteredEvents.length >= 2 && (
              <View style={styles.swipeIndicatorContainer} pointerEvents="none">
                <LinearGradient
                  colors={['transparent', 'rgba(31, 24, 69, 0.3)', 'rgba(31, 24, 69, 0.6)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.swipeIndicator}
                >
                  <View style={styles.swipeIconContainer}>
                    <Ionicons name="chevron-forward" size={28} color="#FFFFFF" style={styles.swipeIcon} />
                    <Ionicons name="chevron-forward" size={28} color="#FFFFFF" style={[styles.swipeIcon, { marginLeft: -12 }]} />
                  </View>
                </LinearGradient>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <LottieView
              source={require('../assets/Error 404.json')}
              autoPlay
              loop
              style={styles.emptyAnimation}
            />
            <Text style={[styles.emptyTitle, { color: themeColors.textPrimary }]}>
              {searchQuery ? 'No events found' : 'No events on this day'}
            </Text>
            <Text style={[styles.emptySubtitle, { color: themeColors.textSecondary }]}>
              {searchQuery
                ? 'Try a different search'
                : `Select another day or create an event for ${selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
            </Text>
          </View>
        )}

        {/* Spacing for footer */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Add Event Modal */}
      <AddEventModal
        visible={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingEvent(null);
        }}
        onEventCreated={() => {
          setShowAddModal(false);
          setEditingEvent(null);
          loadEvents();
        }}
        editingEvent={editingEvent}
        themeColors={themeColors}
        primaryColor={primaryColor}
        userProfile={userProfile}
        user={user}
      />
    </ScreenLayout>
  );
}

// Stunning Event Card Component
function EventCard({
  event,
  index,
  scrollX,
  themeColors,
  primaryColor,
  isMyEvent,
  onEdit,
  onDelete,
  onViewProfile,
}) {
  const [expanded, setExpanded] = useState(false);

  // 3-color rotation pattern for beautiful variety
  const cardColorPatterns = [
    {
      gradient: ['#F0F3FF', '#E8EEFF'],
      titleColor: '#1A202C',
      metaColor: '#4A5568',
      organizerBg: '#4A556820',
      organizerColor: '#2D3748',
      borderColor: '#C3D4FF',
    }, // Soft Blue
    {
      gradient: ['#FFF5F0', '#FFE8DC'],
      titleColor: '#1A202C',
      metaColor: '#C05621',
      organizerBg: '#ED893620',
      organizerColor: '#C05621',
      borderColor: '#FFD4B8',
    }, // Soft Orange
    {
      gradient: ['#F0FFF4', '#E6FFED'],
      titleColor: '#1A202C',
      metaColor: '#2F855A',
      organizerBg: '#38A16920',
      organizerColor: '#2F855A',
      borderColor: '#B8EFC8',
    }, // Soft Green
  ];
  const cardColors = cardColorPatterns[index % 3];

  const inputRange = [
    (index - 1) * (CARD_WIDTH + CARD_SPACING),
    index * (CARD_WIDTH + CARD_SPACING),
    (index + 1) * (CARD_WIDTH + CARD_SPACING),
  ];

  const scale = scrollX.interpolate({
    inputRange,
    outputRange: [0.9, 1, 0.9],
    extrapolate: 'clamp',
  });

  const opacity = scrollX.interpolate({
    inputRange,
    outputRange: [0.6, 1, 0.6],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View
      style={[
        styles.eventCard,
        {
          transform: [{ scale }],
          opacity,
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.95}
        onPress={() => setExpanded(!expanded)}
      >
        <LinearGradient
          colors={cardColors.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.cardGradient, { borderColor: cardColors.borderColor }]}
        >
          {/* Category Badge */}
          <View style={[styles.categoryBadge, { backgroundColor: `${cardColors.organizerColor}15` }]}>
            <Text style={styles.categoryEmoji}>{event.emoji || '📅'}</Text>
          </View>

          {/* Event Content */}
          <View style={styles.cardContent}>
            <Text style={[styles.eventTitle, { color: cardColors.titleColor }]} numberOfLines={2}>
              {event.title}
            </Text>

            {event.date && (
              <View style={styles.eventMeta}>
                <Ionicons name="time-outline" size={16} color={cardColors.metaColor} />
                <Text style={[styles.metaText, { color: cardColors.metaColor }]}>
                  {event.date}
                </Text>
              </View>
            )}

            {event.location?.city && (
              <View style={styles.eventMeta}>
                <Ionicons name="location-outline" size={16} color={cardColors.metaColor} />
                <Text style={[styles.metaText, { color: cardColors.metaColor }]}>
                  {event.location.city}
                  {event.location.province && `, ${event.location.province}`}
                </Text>
              </View>
            )}

            {/* Description Preview - Always show 3 lines if exists */}
            {event.description && (
              <View style={styles.descriptionPreview}>
                <Text
                  style={[styles.descriptionPreviewText, { color: cardColors.metaColor }]}
                  numberOfLines={expanded ? undefined : 3}
                >
                  {event.description}
                </Text>
              </View>
            )}

            {/* Custom Fields - Show when expanded */}
            {expanded && event.customFields && Object.keys(event.customFields).length > 0 && (
              <View style={styles.customFieldsDisplay}>
                {Object.entries(event.customFields).map(([fieldId, value]) => {
                  const field = OPTIONAL_EVENT_FIELDS.find(f => f.id === fieldId);
                  if (!field || !value) return null;

                  return (
                    <View key={fieldId} style={[styles.customFieldItem, { backgroundColor: `${cardColors.borderColor}40` }]}>
                      <View style={styles.customFieldItemHeader}>
                        <Ionicons name={field.icon} size={14} color={cardColors.metaColor} />
                        <Text style={[styles.customFieldItemLabel, { color: cardColors.metaColor }]}>
                          {field.label}
                        </Text>
                      </View>
                      <Text style={[styles.customFieldItemValue, { color: cardColors.titleColor }]}>
                        {value}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Organizer */}
            {event.organizerName && (
              <TouchableOpacity
                style={[styles.organizerBadge, { backgroundColor: cardColors.organizerBg }]}
                onPress={onViewProfile}
                activeOpacity={0.7}
              >
                <Ionicons name="person-circle-outline" size={18} color={cardColors.organizerColor} />
                <Text style={[styles.organizerName, { color: cardColors.organizerColor }]} numberOfLines={1}>
                  {event.organizerName}
                </Text>
                <Ionicons name="chevron-forward" size={14} color={cardColors.organizerColor} />
              </TouchableOpacity>
            )}

            {/* Timestamp - Show created/edited date */}
            {expanded && event.timestamp && (
              <View style={[styles.timestampContainer, { backgroundColor: `${cardColors.borderColor}30` }]}>
                <Ionicons name="time-outline" size={14} color={cardColors.metaColor} />
                <Text style={[styles.timestampText, { color: cardColors.metaColor }]}>
                  {event.updatedAt ? 'Edited' : 'Created'} {new Date(event.updatedAt || event.timestamp).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Text>
              </View>
            )}

            {/* Edit & Delete Buttons for Own Events */}
            {expanded && isMyEvent && (
              <View style={styles.eventActionsContainer}>
                <TouchableOpacity
                  style={[styles.editButton, { backgroundColor: `${cardColors.titleColor}10` }]}
                  onPress={onEdit}
                  activeOpacity={0.7}
                >
                  <Ionicons name="pencil-outline" size={16} color={cardColors.titleColor} />
                  <Text style={[styles.editText, { color: cardColors.titleColor }]}>Edit Event</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={onDelete}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={16} color="#FF3B30" />
                  <Text style={styles.deleteText}>Delete</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Expand Indicator - Show if there's a description or custom fields */}
          {(event.description || (event.customFields && Object.keys(event.customFields).length > 0)) && (
            <View style={styles.expandIndicator}>
              <Text style={[styles.expandText, { color: cardColors.organizerColor }]}>
                {expanded ? 'Show less' : 'Read more'}
              </Text>
              <Ionicons
                name={expanded ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={cardColors.organizerColor}
              />
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

// Duration Picker Component
function DurationPicker({ value, onChange, primaryColor, themeColors }) {
  const [days, setDays] = useState(0);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);

  useEffect(() => {
    // Parse existing value
    if (value) {
      const match = value.match(/(\d+)\s*days?|(\d+)\s*hours?|(\d+)\s*minutes?/gi);
      if (match) {
        match.forEach(part => {
          if (part.includes('day')) setDays(parseInt(part) || 0);
          if (part.includes('hour')) setHours(parseInt(part) || 0);
          if (part.includes('minute')) setMinutes(parseInt(part) || 0);
        });
      }
    }
  }, [value]);

  const updateDuration = (newDays, newHours, newMinutes) => {
    const parts = [];
    if (newDays > 0) parts.push(`${newDays} day${newDays !== 1 ? 's' : ''}`);
    if (newHours > 0) parts.push(`${newHours} hour${newHours !== 1 ? 's' : ''}`);
    if (newMinutes > 0) parts.push(`${newMinutes} minute${newMinutes !== 1 ? 's' : ''}`);
    onChange(parts.join(', ') || '0 minutes');
  };

  const adjustValue = (type, increment) => {
    const newDays = type === 'days' ? Math.max(0, days + increment) : days;
    const newHours = type === 'hours' ? Math.max(0, Math.min(23, hours + increment)) : hours;
    const newMinutes = type === 'minutes' ? Math.max(0, Math.min(59, minutes + increment)) : minutes;

    setDays(newDays);
    setHours(newHours);
    setMinutes(newMinutes);
    updateDuration(newDays, newHours, newMinutes);
  };

  return (
    <View style={styles.durationPickerContainer}>
      {/* Days */}
      <View style={[styles.durationUnit, { backgroundColor: themeColors.background }]}>
        <TouchableOpacity onPress={() => adjustValue('days', 1)} style={[styles.durationButton, { borderColor: primaryColor }]}>
          <Ionicons name="chevron-up" size={20} color={primaryColor} />
        </TouchableOpacity>
        <View style={styles.durationValueContainer}>
          <Text style={[styles.durationValue, { color: themeColors.textPrimary }]}>{days}</Text>
          <Text style={[styles.durationLabel, { color: themeColors.textSecondary }]}>days</Text>
        </View>
        <TouchableOpacity onPress={() => adjustValue('days', -1)} style={[styles.durationButton, { borderColor: primaryColor }]}>
          <Ionicons name="chevron-down" size={20} color={primaryColor} />
        </TouchableOpacity>
      </View>

      {/* Hours */}
      <View style={[styles.durationUnit, { backgroundColor: themeColors.background }]}>
        <TouchableOpacity onPress={() => adjustValue('hours', 1)} style={[styles.durationButton, { borderColor: primaryColor }]}>
          <Ionicons name="chevron-up" size={20} color={primaryColor} />
        </TouchableOpacity>
        <View style={styles.durationValueContainer}>
          <Text style={[styles.durationValue, { color: themeColors.textPrimary }]}>{hours}</Text>
          <Text style={[styles.durationLabel, { color: themeColors.textSecondary }]}>hours</Text>
        </View>
        <TouchableOpacity onPress={() => adjustValue('hours', -1)} style={[styles.durationButton, { borderColor: primaryColor }]}>
          <Ionicons name="chevron-down" size={20} color={primaryColor} />
        </TouchableOpacity>
      </View>

      {/* Minutes */}
      <View style={[styles.durationUnit, { backgroundColor: themeColors.background }]}>
        <TouchableOpacity onPress={() => adjustValue('minutes', 15)} style={[styles.durationButton, { borderColor: primaryColor }]}>
          <Ionicons name="chevron-up" size={20} color={primaryColor} />
        </TouchableOpacity>
        <View style={styles.durationValueContainer}>
          <Text style={[styles.durationValue, { color: themeColors.textPrimary }]}>{minutes}</Text>
          <Text style={[styles.durationLabel, { color: themeColors.textSecondary }]}>mins</Text>
        </View>
        <TouchableOpacity onPress={() => adjustValue('minutes', -15)} style={[styles.durationButton, { borderColor: primaryColor }]}>
          <Ionicons name="chevron-down" size={20} color={primaryColor} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Capacity Counter Component
function CapacityCounter({ value, onChange, primaryColor, themeColors }) {
  const numValue = parseInt(value) || 0;

  const adjustCapacity = (increment) => {
    const newValue = Math.max(0, numValue + increment);
    onChange(`${newValue} ${newValue === 1 ? 'person' : 'people'}`);
  };

  return (
    <View style={[styles.capacityContainer, { backgroundColor: themeColors.background }]}>
      <TouchableOpacity
        onPress={() => adjustCapacity(-10)}
        style={[styles.capacityButton, styles.capacityButtonLarge, { backgroundColor: `${primaryColor}15` }]}
      >
        <Ionicons name="remove" size={24} color={primaryColor} />
        <Ionicons name="remove" size={24} color={primaryColor} style={{ marginLeft: -16 }} />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => adjustCapacity(-1)}
        style={[styles.capacityButton, { backgroundColor: `${primaryColor}10` }]}
      >
        <Ionicons name="remove" size={20} color={primaryColor} />
      </TouchableOpacity>

      <View style={styles.capacityValueContainer}>
        <Ionicons name="people" size={32} color={primaryColor} />
        <Text style={[styles.capacityValue, { color: themeColors.textPrimary }]}>{numValue}</Text>
        <Text style={[styles.capacityLabel, { color: themeColors.textSecondary }]}>
          {numValue === 1 ? 'person' : 'people'}
        </Text>
      </View>

      <TouchableOpacity
        onPress={() => adjustCapacity(1)}
        style={[styles.capacityButton, { backgroundColor: `${primaryColor}10` }]}
      >
        <Ionicons name="add" size={20} color={primaryColor} />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => adjustCapacity(10)}
        style={[styles.capacityButton, styles.capacityButtonLarge, { backgroundColor: `${primaryColor}15` }]}
      >
        <Ionicons name="add" size={24} color={primaryColor} />
        <Ionicons name="add" size={24} color={primaryColor} style={{ marginLeft: -16 }} />
      </TouchableOpacity>
    </View>
  );
}

// Ticket Price Picker Component
function TicketPricePicker({ value, onChange, primaryColor, themeColors }) {
  const presetPrices = ['Free', 'R50', 'R100', 'R150', 'R200', 'R250', 'R300', 'R500'];
  const [customPrice, setCustomPrice] = useState('');

  return (
    <View>
      <View style={styles.pricePresetsGrid}>
        {presetPrices.map(price => (
          <TouchableOpacity
            key={price}
            style={[
              styles.pricePreset,
              {
                backgroundColor: value === price ? primaryColor : themeColors.background,
                borderColor: value === price ? primaryColor : themeColors.divider,
              }
            ]}
            onPress={() => onChange(price)}
          >
            <Text style={[
              styles.pricePresetText,
              { color: value === price ? '#FFFFFF' : themeColors.textPrimary }
            ]}>
              {price}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <TextInput
        style={[styles.input, {
          backgroundColor: themeColors.background,
          borderColor: themeColors.divider,
          color: themeColors.textPrimary,
          marginTop: 12,
        }]}
        placeholder="Or enter custom price (e.g., R50-R100)"
        placeholderTextColor={themeColors.textSecondary}
        value={customPrice}
        onChangeText={(text) => {
          setCustomPrice(text);
          onChange(text);
        }}
      />
    </View>
  );
}

// Age Restriction Picker Component
function AgeRestrictionPicker({ value, onChange, primaryColor, themeColors }) {
  const ageOptions = ['All ages', '13+', '16+', '18+', '21+'];

  return (
    <View style={styles.ageOptionsContainer}>
      {ageOptions.map(age => (
        <TouchableOpacity
          key={age}
          style={[
            styles.ageOption,
            {
              backgroundColor: value === age ? primaryColor : themeColors.background,
              borderColor: value === age ? primaryColor : themeColors.divider,
            }
          ]}
          onPress={() => onChange(age)}
        >
          <Ionicons
            name={value === age ? "checkmark-circle" : "person-outline"}
            size={20}
            color={value === age ? '#FFFFFF' : themeColors.textSecondary}
          />
          <Text style={[
            styles.ageOptionText,
            { color: value === age ? '#FFFFFF' : themeColors.textPrimary }
          ]}>
            {age}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// Add Event Modal (keeping the original implementation)
function AddEventModal({ visible, onClose, onEventCreated, editingEvent, themeColors, primaryColor, userProfile, user }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [category, setCategory] = useState('community');
  const [submitting, setSubmitting] = useState(false);
  const [eventsRemaining, setEventsRemaining] = useState(null);

  // Premium/Gold: Optional fields
  const [selectedFields, setSelectedFields] = useState([]);
  const [customFieldValues, setCustomFieldValues] = useState({});
  const [showFieldSelector, setShowFieldSelector] = useState(false);

  const userPlan = userProfile?.subscriptionPlan || 'basic';
  const isPremiumOrGold = userPlan === 'premium' || userPlan === 'gold';
  const isEditing = !!editingEvent;

  // Check remaining events when modal opens (skip for editing)
  useEffect(() => {
    if (visible && !isEditing) {
      const checkLimits = async () => {
        const userPlan = userProfile?.subscriptionPlan || 'basic';
        const isAdmin = userProfile?.isAdmin || false;
        const limits = await canCreateEvent(userPlan, isAdmin);
        setEventsRemaining(limits.remaining);
      };
      checkLimits();
    }
  }, [visible, userProfile, isEditing]);

  // Pre-populate form when editing
  useEffect(() => {
    if (editingEvent && visible) {
      setTitle(editingEvent.title || '');
      setDescription(editingEvent.description || '');
      setDate(editingEvent.date || '');
      setCategory(editingEvent.category || 'community');

      // Pre-populate custom fields if they exist
      if (editingEvent.customFields && Object.keys(editingEvent.customFields).length > 0) {
        const fieldIds = Object.keys(editingEvent.customFields);
        setSelectedFields(fieldIds);
        setCustomFieldValues(editingEvent.customFields);
      }
    }
  }, [editingEvent, visible]);

  // Reset form when modal closes
  useEffect(() => {
    if (!visible) {
      setTitle('');
      setDescription('');
      setDate('');
      setCategory('community');
      setSelectedFields([]);
      setCustomFieldValues({});
      setShowFieldSelector(false);
    }
  }, [visible]);

  const toggleField = (fieldId) => {
    if (selectedFields.includes(fieldId)) {
      setSelectedFields(selectedFields.filter(id => id !== fieldId));
      const newValues = { ...customFieldValues };
      delete newValues[fieldId];
      setCustomFieldValues(newValues);
    } else {
      setSelectedFields([...selectedFields, fieldId]);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter an event title');
      return;
    }

    if (!user?.uid) {
      Alert.alert('Error', 'You must be logged in to create events');
      return;
    }

    // Check subscription limits (skip for editing)
    if (!isEditing) {
      const userPlan = userProfile?.subscriptionPlan || 'basic';
      const isAdmin = userProfile?.isAdmin || false;
      const eventLimits = await canCreateEvent(userPlan, isAdmin);

      if (!eventLimits.allowed) {
        const planLimits = {
          basic: { limit: 2, upgrade: 'Premium', price: 'R49.99' },
          premium: { limit: 5, upgrade: 'Gold', price: 'R149.99' },
          gold: { limit: 15, upgrade: null },
        };

        const currentPlan = planLimits[userPlan];
        const upgradeMessage = currentPlan.upgrade
          ? `\n\nUpgrade to ${currentPlan.upgrade} (${currentPlan.price}/month) for ${planLimits[currentPlan.upgrade.toLowerCase()].limit} events per month!`
          : '';

        Alert.alert(
          'Event Limit Reached',
          `You've reached your monthly limit of ${currentPlan.limit} events.${upgradeMessage}`,
          [{ text: 'OK' }]
        );
        return;
      }
    }

    setSubmitting(true);

    try {
      if (isEditing) {
        // Update existing event
        const updates = {
          title: title.trim(),
          description: description.trim(),
          date: date.trim() || editingEvent.date,
          category,
          emoji: CATEGORY_EMOJIS[category],
        };

        // Add custom fields if any were filled out
        if (selectedFields.length > 0) {
          updates.customFields = {};
          selectedFields.forEach(fieldId => {
            const value = customFieldValues[fieldId];
            if (value && value.trim()) {
              updates.customFields[fieldId] = value.trim();
            }
          });
        } else {
          // Clear custom fields if none selected
          updates.customFields = {};
        }

        await updateEvent(editingEvent.id, updates);
      } else {
        // Create new event
        const eventData = {
          title: title.trim(),
          description: description.trim(),
          date: date.trim() || new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
          timestamp: Date.now(),
          category,
          emoji: CATEGORY_EMOJIS[category],
          country: userProfile?.country || 'Unknown',
          province: userProfile?.province || '',
          city: userProfile?.city || '',
          location: {
            city: userProfile?.city || '',
            province: userProfile?.province || '',
            country: userProfile?.country || 'Unknown',
          },
          isPublic: true,
          organizerId: user.uid,
          organizerName: userProfile?.displayName || userProfile?.username || 'Anonymous',
          organizerPhoto: userProfile?.profilePhoto || null,
        };

        // Add custom fields if any were filled out
        if (selectedFields.length > 0) {
          eventData.customFields = {};
          selectedFields.forEach(fieldId => {
            const value = customFieldValues[fieldId];
            if (value && value.trim()) {
              eventData.customFields[fieldId] = value.trim();
            }
          });
        }

        await createEvent(eventData);

        // Record event creation for limit tracking
        await recordEventCreated();
      }

      setTitle('');
      setDescription('');
      setDate('');
      setCategory('community');
      setSelectedFields([]);
      setCustomFieldValues({});
      onEventCreated();
    } catch (error) {
      console.error(`[${isEditing ? 'Edit' : 'Add'}Event] Error:`, error);
      Alert.alert('Error', `Failed to ${isEditing ? 'update' : 'create'} event. Please try again.`);
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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={[styles.modalContent, { backgroundColor: themeColors.card }]}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={[styles.modalTitle, { color: themeColors.textPrimary }]}>
                {isEditing ? 'Edit Event' : 'Create Event'}
              </Text>
              {!isEditing && eventsRemaining !== null && eventsRemaining >= 0 && (
                <Text style={[styles.modalSubtitle, { color: themeColors.textSecondary }]}>
                  {eventsRemaining} {eventsRemaining === 1 ? 'event' : 'events'} remaining this month
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={28} color={themeColors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalForm}
            contentContainerStyle={styles.modalFormContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
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
                  <Text style={styles.categoryEmojiSmall}>{CATEGORY_EMOJIS[value]}</Text>
                  <Text style={[
                    styles.categoryText,
                    { color: category === value ? primaryColor : themeColors.textSecondary },
                  ]}>
                    {key.charAt(0) + key.slice(1).toLowerCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Premium/Gold: Custom Fields Section */}
            {isPremiumOrGold && (
              <>
                <View style={styles.customFieldsSection}>
                  <View style={styles.customFieldsHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons name="sparkles" size={18} color={primaryColor} />
                      <Text style={[styles.label, { color: themeColors.textPrimary, marginTop: 0, marginBottom: 0 }]}>
                        Custom Fields
                      </Text>
                      <View style={[styles.premiumBadge, { backgroundColor: `${primaryColor}20` }]}>
                        <Text style={[styles.premiumBadgeText, { color: primaryColor }]}>
                          {userPlan === 'gold' ? 'GOLD' : 'PREMIUM'}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => setShowFieldSelector(!showFieldSelector)}>
                      <Ionicons
                        name={showFieldSelector ? 'chevron-up' : 'add-circle'}
                        size={24}
                        color={primaryColor}
                      />
                    </TouchableOpacity>
                  </View>
                  <Text style={[styles.customFieldsSubtitle, { color: themeColors.textSecondary }]}>
                    Add extra details to your event
                  </Text>
                </View>

                {/* Field Selector */}
                {showFieldSelector && (
                  <View style={[styles.fieldSelectorContainer, { backgroundColor: themeColors.background }]}>
                    {OPTIONAL_EVENT_FIELDS.map(field => (
                      <TouchableOpacity
                        key={field.id}
                        style={[
                          styles.fieldOption,
                          {
                            backgroundColor: selectedFields.includes(field.id)
                              ? `${primaryColor}15`
                              : 'transparent',
                            borderColor: selectedFields.includes(field.id)
                              ? primaryColor
                              : themeColors.divider,
                          }
                        ]}
                        onPress={() => toggleField(field.id)}
                      >
                        <View style={styles.fieldOptionLeft}>
                          <Ionicons
                            name={field.icon}
                            size={20}
                            color={selectedFields.includes(field.id) ? primaryColor : themeColors.textSecondary}
                          />
                          <Text style={[
                            styles.fieldOptionLabel,
                            {
                              color: selectedFields.includes(field.id)
                                ? primaryColor
                                : themeColors.textPrimary
                            }
                          ]}>
                            {field.label}
                          </Text>
                        </View>
                        {selectedFields.includes(field.id) && (
                          <Ionicons name="checkmark-circle" size={20} color={primaryColor} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Dynamic Input Fields for Selected Fields */}
                {selectedFields.map(fieldId => {
                  const field = OPTIONAL_EVENT_FIELDS.find(f => f.id === fieldId);
                  if (!field) return null;

                  // Special UI for specific fields
                  if (fieldId === 'duration') {
                    return (
                      <View key={fieldId} style={styles.customFieldInput}>
                        <View style={styles.customFieldLabel}>
                          <Ionicons name={field.icon} size={16} color={themeColors.textSecondary} />
                          <Text style={[styles.label, { color: themeColors.textSecondary, marginTop: 0, marginBottom: 0 }]}>
                            {field.label}
                          </Text>
                          <TouchableOpacity onPress={() => toggleField(fieldId)}>
                            <Ionicons name="close-circle" size={18} color={themeColors.textSecondary} />
                          </TouchableOpacity>
                        </View>
                        <DurationPicker
                          value={customFieldValues[fieldId] || ''}
                          onChange={(value) => setCustomFieldValues({ ...customFieldValues, [fieldId]: value })}
                          primaryColor={primaryColor}
                          themeColors={themeColors}
                        />
                      </View>
                    );
                  }

                  if (fieldId === 'maxCapacity') {
                    return (
                      <View key={fieldId} style={styles.customFieldInput}>
                        <View style={styles.customFieldLabel}>
                          <Ionicons name={field.icon} size={16} color={themeColors.textSecondary} />
                          <Text style={[styles.label, { color: themeColors.textSecondary, marginTop: 0, marginBottom: 0 }]}>
                            {field.label}
                          </Text>
                          <TouchableOpacity onPress={() => toggleField(fieldId)}>
                            <Ionicons name="close-circle" size={18} color={themeColors.textSecondary} />
                          </TouchableOpacity>
                        </View>
                        <CapacityCounter
                          value={customFieldValues[fieldId] || '0'}
                          onChange={(value) => setCustomFieldValues({ ...customFieldValues, [fieldId]: value })}
                          primaryColor={primaryColor}
                          themeColors={themeColors}
                        />
                      </View>
                    );
                  }

                  if (fieldId === 'ticketPrice') {
                    return (
                      <View key={fieldId} style={styles.customFieldInput}>
                        <View style={styles.customFieldLabel}>
                          <Ionicons name={field.icon} size={16} color={themeColors.textSecondary} />
                          <Text style={[styles.label, { color: themeColors.textSecondary, marginTop: 0, marginBottom: 0 }]}>
                            {field.label}
                          </Text>
                          <TouchableOpacity onPress={() => toggleField(fieldId)}>
                            <Ionicons name="close-circle" size={18} color={themeColors.textSecondary} />
                          </TouchableOpacity>
                        </View>
                        <TicketPricePicker
                          value={customFieldValues[fieldId] || ''}
                          onChange={(value) => setCustomFieldValues({ ...customFieldValues, [fieldId]: value })}
                          primaryColor={primaryColor}
                          themeColors={themeColors}
                        />
                      </View>
                    );
                  }

                  if (fieldId === 'ageRestriction') {
                    return (
                      <View key={fieldId} style={styles.customFieldInput}>
                        <View style={styles.customFieldLabel}>
                          <Ionicons name={field.icon} size={16} color={themeColors.textSecondary} />
                          <Text style={[styles.label, { color: themeColors.textSecondary, marginTop: 0, marginBottom: 0 }]}>
                            {field.label}
                          </Text>
                          <TouchableOpacity onPress={() => toggleField(fieldId)}>
                            <Ionicons name="close-circle" size={18} color={themeColors.textSecondary} />
                          </TouchableOpacity>
                        </View>
                        <AgeRestrictionPicker
                          value={customFieldValues[fieldId] || ''}
                          onChange={(value) => setCustomFieldValues({ ...customFieldValues, [fieldId]: value })}
                          primaryColor={primaryColor}
                          themeColors={themeColors}
                        />
                      </View>
                    );
                  }

                  // Default text input for other fields
                  return (
                    <View key={fieldId} style={styles.customFieldInput}>
                      <View style={styles.customFieldLabel}>
                        <Ionicons name={field.icon} size={16} color={themeColors.textSecondary} />
                        <Text style={[styles.label, { color: themeColors.textSecondary, marginTop: 0, marginBottom: 0 }]}>
                          {field.label}
                        </Text>
                        <TouchableOpacity onPress={() => toggleField(fieldId)}>
                          <Ionicons name="close-circle" size={18} color={themeColors.textSecondary} />
                        </TouchableOpacity>
                      </View>
                      <TextInput
                        style={[styles.input, {
                          backgroundColor: themeColors.background,
                          borderColor: themeColors.divider,
                          color: themeColors.textPrimary,
                        }]}
                        placeholder={field.placeholder}
                        placeholderTextColor={themeColors.textSecondary}
                        value={customFieldValues[fieldId] || ''}
                        onChangeText={(text) => setCustomFieldValues({ ...customFieldValues, [fieldId]: text })}
                      />
                    </View>
                  );
                })}
              </>
            )}
          </ScrollView>

          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: primaryColor }]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.8}
          >
            <Text style={styles.submitButtonText}>
              {submitting
                ? (isEditing ? 'Updating...' : 'Creating...')
                : (isEditing ? 'Update Event' : 'Create Event')
              }
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Hero Section
  heroSection: {
    height: 240,
    overflow: 'hidden',
  },
  heroGradient: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  floatingCircles: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  circle: {
    position: 'absolute',
    borderRadius: 9999,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  circle1: {
    width: 120,
    height: 120,
    top: -40,
    right: -20,
  },
  circle2: {
    width: 80,
    height: 80,
    bottom: 40,
    left: -10,
  },
  circle3: {
    width: 60,
    height: 60,
    top: 80,
    left: 40,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  heroSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 24,
    textAlign: 'center',
  },
  createButton: {
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  createButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 28,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6C4DF4',
  },
  // Calendar Section
  calendarSection: {
    marginTop: -40,
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  calendarTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  weekDaysContainer: {
    gap: 12,
    paddingVertical: 4,
  },
  dayCard: {
    width: 60,
    height: 80,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  dayName: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  dayNumber: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  eventDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  eventDotText: {
    fontSize: 11,
    fontWeight: '800',
  },
  // Search Section
  searchSection: {
    padding: 16,
    paddingBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 24,
    paddingHorizontal: 16,
    gap: 10,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  // Tabs Section
  tabsSection: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: '#F5F3FF',
  },
  tabActive: {
    borderWidth: 2,
    borderColor: 'transparent',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Count Section
  countSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  countText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Events Carousel
  carouselContainer: {
    position: 'relative',
  },
  eventsCarousel: {
    paddingLeft: 10,
    paddingRight: SCREEN_WIDTH - CARD_WIDTH - 16 + 60, // Show peek of next card
    paddingVertical: 8,
    gap: CARD_SPACING,
  },
  swipeIndicatorContainer: {
    position: 'absolute',
    right: 0,
    top: 8,
    bottom: 8,
    width: 80,
    zIndex: 10,
  },
  swipeIndicator: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 10,
  },
  swipeIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(31, 24, 69, 0.2)',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  swipeIcon: {
    opacity: 0.5,
  },
  eventCard: {
    width: CARD_WIDTH,
    marginRight: CARD_SPACING,
  },
  cardGradient: {
    borderRadius: 24,
    padding: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    minHeight: 280,
    borderWidth: 2,
  },
  categoryBadge: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  categoryEmoji: {
    fontSize: 32,
  },
  cardContent: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 23,
    fontWeight: '800',
    marginBottom: 16,
    lineHeight: 29,
    letterSpacing: -0.3,
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  metaText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  organizerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginTop: 12,
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  organizerName: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
    letterSpacing: 0.2,
  },
  descriptionContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  description: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  timestampContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  timestampText: {
    fontSize: 12,
    fontWeight: '500',
  },
  eventActionsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    flex: 1,
  },
  editText: {
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#FF3B3015',
    flex: 1,
  },
  deleteText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF3B30',
  },
  descriptionPreview: {
    marginTop: 12,
  },
  descriptionPreviewText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  expandIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
  },
  expandText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 32,
  },
  emptyAnimation: {
    width: 270,
    height: 270,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: 'center',
  },
  // Modal Styles
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
    minHeight: '60%',
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
  modalSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 4,
    opacity: 0.8,
  },
  modalForm: {
    flex: 1,
    marginBottom: 16,
  },
  modalFormContent: {
    paddingBottom: 40,
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
  categoryEmojiSmall: {
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
  // Custom Fields Styles
  customFieldsSection: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  customFieldsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  customFieldsSubtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  premiumBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  premiumBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  fieldSelectorContainer: {
    marginTop: 12,
    borderRadius: 12,
    padding: 8,
    gap: 6,
  },
  fieldOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  fieldOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  fieldOptionLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  customFieldInput: {
    marginTop: 16,
  },
  customFieldLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  // Custom Fields Display (in event cards)
  customFieldsDisplay: {
    marginTop: 12,
    gap: 8,
  },
  customFieldItem: {
    padding: 10,
    borderRadius: 10,
  },
  customFieldItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  customFieldItemLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  customFieldItemValue: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  // Duration Picker Styles
  durationPickerContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  durationUnit: {
    flex: 1,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  durationButton: {
    width: '100%',
    height: 36,
    borderRadius: 10,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  durationValueContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  durationValue: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 2,
  },
  durationLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Capacity Counter Styles
  capacityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    marginTop: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  capacityButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  capacityButtonLarge: {
    width: 56,
    height: 56,
    borderRadius: 16,
  },
  capacityValueContainer: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 16,
  },
  capacityValue: {
    fontSize: 36,
    fontWeight: '800',
    marginVertical: 4,
  },
  capacityLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Ticket Price Styles
  pricePresetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  pricePreset: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  pricePresetText: {
    fontSize: 15,
    fontWeight: '700',
  },
  // Age Restriction Styles
  ageOptionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
  },
  ageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  ageOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
