/**
 * Events Service
 * Manages local events - create, read, update, delete
 */

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';

const EVENTS_COLLECTION = 'events';

/**
 * Create a new event
 */
export async function createEvent(eventData) {
  try {
    const event = {
      title: eventData.title,
      description: eventData.description || '',
      emoji: eventData.emoji || '📅',
      date: eventData.date, // Date string like "Sun, Apr 28"
      timestamp: eventData.timestamp || Date.now(), // Unix timestamp for sorting
      location: {
        country: eventData.country,
        province: eventData.province,
        city: eventData.city,
      },
      category: eventData.category || 'general', // music, business, community, etc.
      organizerId: eventData.organizerId,
      organizerName: eventData.organizerName,
      organizerPhoto: eventData.organizerPhoto || null,
      attendeesCount: 0,
      isPublic: eventData.isPublic !== false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, EVENTS_COLLECTION), event);

    return {
      id: docRef.id,
      ...event,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  } catch (error) {
    console.error('[EventsService] Error creating event:', error);
    throw new Error('Failed to create event');
  }
}

/**
 * Get events by location
 */
export async function getEventsByLocation(country, province, city, maxResults = 50) {
  try {
    const eventsRef = collection(db, EVENTS_COLLECTION);

    let q = query(
      eventsRef,
      where('location.country', '==', country),
      where('isPublic', '==', true),
      orderBy('timestamp', 'desc'),
      limit(maxResults)
    );

    // If province provided, filter by it
    if (province) {
      q = query(
        eventsRef,
        where('location.country', '==', country),
        where('location.province', '==', province),
        where('isPublic', '==', true),
        orderBy('timestamp', 'desc'),
        limit(maxResults)
      );
    }

    // If city provided, filter by it
    if (city) {
      q = query(
        eventsRef,
        where('location.country', '==', country),
        where('location.province', '==', province),
        where('location.city', '==', city),
        where('isPublic', '==', true),
        orderBy('timestamp', 'desc'),
        limit(maxResults)
      );
    }

    const snapshot = await getDocs(q);
    const events = [];

    snapshot.forEach((doc) => {
      events.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return events;
  } catch (error) {
    console.error('[EventsService] Error getting events by location:', error);
    return [];
  }
}

/**
 * Get upcoming events
 */
export async function getUpcomingEvents(maxResults = 20) {
  try {
    const eventsRef = collection(db, EVENTS_COLLECTION);
    const now = Date.now();

    const q = query(
      eventsRef,
      where('timestamp', '>=', now),
      where('isPublic', '==', true),
      orderBy('timestamp', 'asc'),
      limit(maxResults)
    );

    const snapshot = await getDocs(q);
    const events = [];

    snapshot.forEach((doc) => {
      events.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return events;
  } catch (error) {
    console.error('[EventsService] Error getting upcoming events:', error);
    return [];
  }
}

/**
 * Get events by category
 */
export async function getEventsByCategory(category, maxResults = 20) {
  try {
    const eventsRef = collection(db, EVENTS_COLLECTION);

    const q = query(
      eventsRef,
      where('category', '==', category),
      where('isPublic', '==', true),
      orderBy('timestamp', 'desc'),
      limit(maxResults)
    );

    const snapshot = await getDocs(q);
    const events = [];

    snapshot.forEach((doc) => {
      events.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return events;
  } catch (error) {
    console.error('[EventsService] Error getting events by category:', error);
    return [];
  }
}

/**
 * Get event by ID
 */
export async function getEventById(eventId) {
  try {
    const eventRef = doc(db, EVENTS_COLLECTION, eventId);
    const eventSnap = await getDoc(eventRef);

    if (!eventSnap.exists()) {
      return null;
    }

    return {
      id: eventSnap.id,
      ...eventSnap.data(),
    };
  } catch (error) {
    console.error('[EventsService] Error getting event:', error);
    return null;
  }
}

/**
 * Update event
 */
export async function updateEvent(eventId, updates) {
  try {
    const eventRef = doc(db, EVENTS_COLLECTION, eventId);

    await updateDoc(eventRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });

    return true;
  } catch (error) {
    console.error('[EventsService] Error updating event:', error);
    throw new Error('Failed to update event');
  }
}

/**
 * Delete event
 */
export async function deleteEvent(eventId) {
  try {
    const eventRef = doc(db, EVENTS_COLLECTION, eventId);
    await deleteDoc(eventRef);
    return true;
  } catch (error) {
    console.error('[EventsService] Error deleting event:', error);
    throw new Error('Failed to delete event');
  }
}

/**
 * Get my events (created by me)
 */
export async function getMyEvents(userId, maxResults = 50) {
  try {
    const eventsRef = collection(db, EVENTS_COLLECTION);

    const q = query(
      eventsRef,
      where('organizerId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(maxResults)
    );

    const snapshot = await getDocs(q);
    const events = [];

    snapshot.forEach((doc) => {
      events.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return events;
  } catch (error) {
    console.error('[EventsService] Error getting my events:', error);
    return [];
  }
}

// Event categories
export const EVENT_CATEGORIES = {
  MUSIC: 'music',
  BUSINESS: 'business',
  COMMUNITY: 'community',
  SPORTS: 'sports',
  FOOD: 'food',
  ARTS: 'arts',
  TECH: 'tech',
  EDUCATION: 'education',
  HEALTH: 'health',
  OTHER: 'other',
};

// Category emojis
export const CATEGORY_EMOJIS = {
  music: '🎵',
  business: '💼',
  community: '🏘️',
  sports: '⚽',
  food: '🍔',
  arts: '🎨',
  tech: '💻',
  education: '📚',
  health: '🏥',
  other: '📅',
};
