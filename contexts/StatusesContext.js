// contexts/StatusesContext.js
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  addStatusReply,
  cleanupExpiredStatuses,
  createStatus,
  fetchReportedStatuses,
  reportStatus as reportStatusRemote,
  STATUS_REPORT_THRESHOLD,
  subscribeToStatusReplies,
  subscribeToStatuses,
  toggleStatusReaction as toggleStatusReactionRemote,
} from '../api/statusService';
import { useAuth } from './AuthContext';
import { useSettings } from './SettingsContext';

const StatusesContext = createContext(null);

export function StatusesProvider({ children }) {
  const { user, profile: authProfile, awardEngagementPoints, isAdmin } = useAuth();
  const { userProfile } = useSettings();

  const [statuses, setStatuses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reportedStatuses, setReportedStatuses] = useState([]);
  const [statusReplies, setStatusReplies] = useState({});
  const [statusesError, setStatusesError] = useState('');
  const repliesSubscriptionsRef = useRef(new Map());

  const location = useMemo(
    () => ({
      city: userProfile?.city ?? '',
      province: userProfile?.province ?? '',
      country: userProfile?.country ?? '',
    }),
    [userProfile?.city, userProfile?.province, userProfile?.country]
  );

  useEffect(() => {
    let unsub = null;
    setIsLoading(true);
    setStatusesError('');

    try {
      unsub = subscribeToStatuses({
        city: location.city,
        province: location.province,
        country: location.country,
        onChange: (items) => {
          setStatuses(items);
          setIsLoading(false);
          setStatusesError('');
        },
        onError: (error) => {
          setStatuses([]);
          setIsLoading(false);
          const message =
            error?.code === 'failed-precondition'
              ? 'Statuses will appear once the feed is ready. Try again shortly.'
              : 'Unable to load statuses right now. Pull to refresh in a moment.';
          setStatusesError(message);
        },
      });
    } catch (error) {
      console.warn('[StatusesProvider] subscribe failed', error);
      setStatuses([]);
      setIsLoading(false);
      const message =
        error?.code === 'failed-precondition'
          ? 'Statuses will appear once the feed is ready. Try again shortly.'
          : 'Unable to load statuses right now. Pull to refresh in a moment.';
      setStatusesError(message);
    }

    cleanupExpiredStatuses().catch((error) =>
      console.warn('[StatusesProvider] cleanup expired statuses failed', error)
    );

    return () => {
      setIsLoading(false);
      unsub?.();
    };
  }, [location.city, location.province, location.country]);

  const ensureRepliesSubscription = useCallback((statusId) => {
    if (!statusId || repliesSubscriptionsRef.current.has(statusId)) return;
    const unsubscribe = subscribeToStatusReplies(statusId, (items) => {
      setStatusReplies((prev) => ({ ...prev, [statusId]: items }));
    });
    repliesSubscriptionsRef.current.set(statusId, unsubscribe);
  }, []);

  const preloadStatuses = useCallback((statusIds = []) => {
    statusIds.filter(Boolean).forEach((id) => {
      ensureRepliesSubscription(id);
    });
  }, [ensureRepliesSubscription]);

  useEffect(
    () => () => {
      repliesSubscriptionsRef.current.forEach((unsub) => unsub?.());
      repliesSubscriptionsRef.current.clear();
    },
    []
  );

  const createStatusEntry = useCallback(
    async ({ message, image, onUploadProgress }) => {
      if (!user?.uid) throw new Error('Please sign in to share a status.');
      const author = {
        uid: user.uid,
        displayName: user?.displayName ?? authProfile?.displayName ?? '',
        photoURL: user?.photoURL ?? authProfile?.photoURL ?? '',
        nickname: userProfile?.nickname ?? authProfile?.displayName ?? '',
        email: user?.email ?? authProfile?.email ?? '',
      };
      const payload = await createStatus({
        message,
        image,
        author,
        location,
        onUploadProgress,
      });
      await awardEngagementPoints?.('comment');
      return payload;
    },
    [
      user?.uid,
      user?.displayName,
      user?.photoURL,
      user?.email,
      authProfile?.displayName,
      authProfile?.email,
      authProfile?.photoURL,
      userProfile?.nickname,
      awardEngagementPoints,
      location,
    ]
  );

  const toggleStatusReaction = useCallback(
    async (statusId, emoji) => {
      if (!statusId || !emoji) return { ok: false, error: 'invalid_arguments' };
      const userId = user?.uid ?? `client-${user?.email ?? 'guest'}`;
      const result = await toggleStatusReactionRemote(statusId, emoji, userId);
      if (result.ok) {
        const reactors = result.reactions?.[emoji]?.reactors ?? {};
        const addedReaction = Boolean(reactors[userId]);
        setStatuses((prev) =>
          prev.map((status) =>
            status.id === statusId
              ? { ...status, reactions: result.reactions ?? status.reactions, lastInteractionAt: result.lastInteractionAt ?? status.lastInteractionAt }
              : status
          )
        );
        if (addedReaction) await awardEngagementPoints?.('upvote');
      }
      return result;
    },
    [awardEngagementPoints, user?.email, user?.uid]
  );

  const addReply = useCallback(
    async (statusId, message) => {
      const author = {
        uid: user?.uid ?? null,
        displayName: user?.displayName ?? authProfile?.displayName ?? '',
        nickname: userProfile?.nickname ?? '',
        photoURL: user?.photoURL ?? authProfile?.photoURL ?? '',
      };
      await addStatusReply(statusId, { message, author });
      await awardEngagementPoints?.('comment');
      ensureRepliesSubscription(statusId);
    },
    [authProfile?.displayName, authProfile?.photoURL, awardEngagementPoints, ensureRepliesSubscription, user?.displayName, user?.photoURL, user?.uid, userProfile?.nickname]
  );

  const reportStatus = useCallback(
    async (statusId, reason = 'inappropriate') => {
      const reporterId = user?.uid ?? user?.email ?? 'guest';
      const result = await reportStatusRemote(statusId, reporterId, reason);
      if (result.ok && !result.alreadyReported) {
        setStatuses((prev) =>
          prev.filter((status) => {
            if (status.id !== statusId) return true;
            const reportCount = result.reportCount ?? status.reportCount + 1;
            const isHidden = result.isHidden ?? status.isHidden;
            return !(isHidden || reportCount >= STATUS_REPORT_THRESHOLD);
          })
        );
      }
      return result;
    },
    [user?.email, user?.uid]
  );

  const refreshReportedStatuses = useCallback(async () => {
    if (!isAdmin) { setReportedStatuses([]); return []; }
    try {
      const items = await fetchReportedStatuses({ limit: 100 });
      setReportedStatuses(items);
      return items;
    } catch (error) {
      console.warn('[StatusesProvider] fetchReportedStatuses failed', error);
      return [];
    }
  }, [isAdmin]);

  const getRepliesForStatus = useCallback(
    (statusId) => statusReplies[statusId] ?? [],
    [statusReplies]
  );

  const value = useMemo(
    () => ({
      statuses,
      isLoading,
      createStatus: createStatusEntry,
      toggleStatusReaction,
      addReply,
      reportStatus,
      ensureRepliesSubscription,
      preloadStatuses,
      getRepliesForStatus,
      reportedStatuses,
      refreshReportedStatuses,
      isAdmin,
      statusesError,
    }),
    [
      addReply,
      createStatusEntry,
      ensureRepliesSubscription,
      preloadStatuses,
      getRepliesForStatus,
      isAdmin,
      isLoading,
      refreshReportedStatuses,
      reportStatus,
      reportedStatuses,
      statuses,
      toggleStatusReaction,
      statusesError,
    ]
  );

  return <StatusesContext.Provider value={value}>{children}</StatusesContext.Provider>;
}

export function useStatuses() {
  const context = useContext(StatusesContext);
  if (!context) throw new Error('useStatuses must be used within a StatusesProvider');
  return context;
}
