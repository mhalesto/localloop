/**
 * Event RSVP Service
 * Manages event attendance requests and acceptances
 *
 * DATA MODEL:
 *
 * 1. Event RSVPs (Subcollection):
 *    events/{eventId}/rsvps/{userId}
 *    - userId: string
 *    - userName: string
 *    - userPhoto: string | null
 *    - status: 'pending' | 'accepted' | 'rejected'
 *    - requestedAt: timestamp
 *    - respondedAt: timestamp | null
 *    - respondedBy: string (organizerId) | null
 *
 * 2. User Event Memberships (in user document):
 *    users/{userId}
 *    - eventRSVPs: [{ eventId, status, requestedAt }]
 */

import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../api/firebaseClient';

const EVENTS_COLLECTION = 'events';
const USERS_COLLECTION = 'users';
const RSVPS_SUBCOLLECTION = 'rsvps';

/**
 * Request to attend an event (RSVP)
 */
export async function requestEventRSVP(eventId, userId, userName, userPhoto = null) {
  try {
    const rsvpRef = doc(db, EVENTS_COLLECTION, eventId, RSVPS_SUBCOLLECTION, userId);

    const rsvpData = {
      userId,
      userName,
      userPhoto,
      status: 'pending',
      requestedAt: serverTimestamp(),
      respondedAt: null,
      respondedBy: null,
    };

    await setDoc(rsvpRef, rsvpData);

    // Update user's event RSVPs list
    const userRef = doc(db, USERS_COLLECTION, userId);
    await updateDoc(userRef, {
      eventRSVPs: arrayUnion({
        eventId,
        status: 'pending',
        requestedAt: Date.now(),
      }),
    });

    return {
      success: true,
      rsvp: {
        ...rsvpData,
        requestedAt: Date.now(),
      },
    };
  } catch (error) {
    console.error('[EventRsvpService] Error requesting RSVP:', error);
    throw new Error('Failed to request attendance');
  }
}

/**
 * Accept an RSVP request
 */
export async function acceptRSVP(eventId, userId, organizerId) {
  try {
    const rsvpRef = doc(db, EVENTS_COLLECTION, eventId, RSVPS_SUBCOLLECTION, userId);

    await updateDoc(rsvpRef, {
      status: 'accepted',
      respondedAt: serverTimestamp(),
      respondedBy: organizerId,
    });

    // Update user's event RSVPs list
    const userRef = doc(db, USERS_COLLECTION, userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const userData = userSnap.data();
      const updatedRSVPs = (userData.eventRSVPs || []).map(rsvp =>
        rsvp.eventId === eventId ? { ...rsvp, status: 'accepted' } : rsvp
      );

      await updateDoc(userRef, {
        eventRSVPs: updatedRSVPs,
      });
    }

    // Increment event attendees count
    const eventRef = doc(db, EVENTS_COLLECTION, eventId);
    const eventSnap = await getDoc(eventRef);
    if (eventSnap.exists()) {
      const currentCount = eventSnap.data().attendeesCount || 0;
      await updateDoc(eventRef, {
        attendeesCount: currentCount + 1,
      });
    }

    return { success: true };
  } catch (error) {
    console.error('[EventRsvpService] Error accepting RSVP:', error);
    throw new Error('Failed to accept attendance request');
  }
}

/**
 * Reject an RSVP request
 */
export async function rejectRSVP(eventId, userId, organizerId) {
  try {
    const rsvpRef = doc(db, EVENTS_COLLECTION, eventId, RSVPS_SUBCOLLECTION, userId);

    await updateDoc(rsvpRef, {
      status: 'rejected',
      respondedAt: serverTimestamp(),
      respondedBy: organizerId,
    });

    // Update user's event RSVPs list
    const userRef = doc(db, USERS_COLLECTION, userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const userData = userSnap.data();
      const updatedRSVPs = (userData.eventRSVPs || []).map(rsvp =>
        rsvp.eventId === eventId ? { ...rsvp, status: 'rejected' } : rsvp
      );

      await updateDoc(userRef, {
        eventRSVPs: updatedRSVPs,
      });
    }

    return { success: true };
  } catch (error) {
    console.error('[EventRsvpService] Error rejecting RSVP:', error);
    throw new Error('Failed to reject attendance request');
  }
}

/**
 * Cancel an RSVP request (user cancels their own request)
 */
export async function cancelRSVP(eventId, userId) {
  try {
    const rsvpRef = doc(db, EVENTS_COLLECTION, eventId, RSVPS_SUBCOLLECTION, userId);
    const rsvpSnap = await getDoc(rsvpRef);

    if (!rsvpSnap.exists()) {
      return { success: false, error: 'RSVP not found' };
    }

    const rsvpData = rsvpSnap.data();
    const wasAccepted = rsvpData.status === 'accepted';

    // Delete the RSVP
    await deleteDoc(rsvpRef);

    // Remove from user's event RSVPs list
    const userRef = doc(db, USERS_COLLECTION, userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const userData = userSnap.data();
      const updatedRSVPs = (userData.eventRSVPs || []).filter(rsvp => rsvp.eventId !== eventId);

      await updateDoc(userRef, {
        eventRSVPs: updatedRSVPs,
      });
    }

    // Decrement event attendees count if was accepted
    if (wasAccepted) {
      const eventRef = doc(db, EVENTS_COLLECTION, eventId);
      const eventSnap = await getDoc(eventRef);
      if (eventSnap.exists()) {
        const currentCount = eventSnap.data().attendeesCount || 0;
        await updateDoc(eventRef, {
          attendeesCount: Math.max(0, currentCount - 1),
        });
      }
    }

    return { success: true, wasAccepted };
  } catch (error) {
    console.error('[EventRsvpService] Error canceling RSVP:', error);
    throw new Error('Failed to cancel attendance request');
  }
}

/**
 * Get all RSVPs for an event
 */
export async function getEventRSVPs(eventId) {
  try {
    const rsvpsRef = collection(db, EVENTS_COLLECTION, eventId, RSVPS_SUBCOLLECTION);
    const snapshot = await getDocs(rsvpsRef);

    const rsvps = [];
    snapshot.forEach((doc) => {
      rsvps.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return rsvps;
  } catch (error) {
    console.error('[EventRsvpService] Error getting event RSVPs:', error);
    return [];
  }
}

/**
 * Get RSVPs by status for an event
 */
export async function getEventRSVPsByStatus(eventId, status) {
  try {
    const rsvpsRef = collection(db, EVENTS_COLLECTION, eventId, RSVPS_SUBCOLLECTION);
    const snapshot = await getDocs(rsvpsRef);

    const rsvps = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.status === status) {
        rsvps.push({
          id: doc.id,
          ...data,
        });
      }
    });

    return rsvps;
  } catch (error) {
    console.error('[EventRsvpService] Error getting RSVPs by status:', error);
    return [];
  }
}

/**
 * Get user's RSVP status for an event
 */
export async function getUserRSVPStatus(eventId, userId) {
  try {
    const rsvpRef = doc(db, EVENTS_COLLECTION, eventId, RSVPS_SUBCOLLECTION, userId);
    const rsvpSnap = await getDoc(rsvpRef);

    if (!rsvpSnap.exists()) {
      return null;
    }

    return {
      id: rsvpSnap.id,
      ...rsvpSnap.data(),
    };
  } catch (error) {
    console.error('[EventRsvpService] Error getting user RSVP status:', error);
    return null;
  }
}

/**
 * Get count of pending RSVPs for an event (for organizer badge)
 */
export async function getPendingRSVPCount(eventId) {
  try {
    const rsvps = await getEventRSVPsByStatus(eventId, 'pending');
    return rsvps.length;
  } catch (error) {
    console.error('[EventRsvpService] Error getting pending RSVP count:', error);
    return 0;
  }
}

/**
 * Get all accepted attendees for an event
 */
export async function getAcceptedAttendees(eventId) {
  try {
    return await getEventRSVPsByStatus(eventId, 'accepted');
  } catch (error) {
    console.error('[EventRsvpService] Error getting accepted attendees:', error);
    return [];
  }
}

/**
 * Kick a user from event (organizer removes accepted attendee)
 */
export async function kickAttendee(eventId, userId, organizerId) {
  try {
    // Same as cancel but initiated by organizer
    const result = await cancelRSVP(eventId, userId);

    // Optionally: Add a kicked status or log this action
    // For now, just removing them is sufficient

    return result;
  } catch (error) {
    console.error('[EventRsvpService] Error kicking attendee:', error);
    throw new Error('Failed to remove attendee');
  }
}
