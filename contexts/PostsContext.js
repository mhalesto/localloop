import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import {
  deletePostRemote,
  fetchAllPostsRemote,
  saveCommentRemote,
  savePostRemote
} from '../api/postService';

const PostsContext = createContext(null);

const POSTS_CACHE_KEY = '@toilet.postsCache';
const QUEUE_CACHE_KEY = '@toilet.postsQueue';
const CLIENT_ID_KEY = '@toilet.clientId';
const THREAD_READS_CACHE_KEY = '@toilet.threadReads';
const SUBSCRIPTIONS_CACHE_KEY = '@toilet.postSubscriptions';
const NOTIFICATIONS_CACHE_KEY = '@toilet.postNotifications';

const MAX_NOTIFICATIONS = 60;

const makeThreadKey = (city, postId) => `${city}::${postId}`;

function normalizeProfile(profile) {
  if (!profile) {
    return {
      nickname: '',
      country: '',
      province: '',
      city: '',
      avatarKey: 'default'
    };
  }
  return {
    nickname: profile.nickname?.trim() ?? '',
    country: profile.country ?? '',
    province: profile.province ?? '',
    city: profile.city ?? '',
    avatarKey: profile.avatarKey ?? 'default'
  };
}

function createComment(message, clientId, authorProfile = null) {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    message,
    createdAt: Date.now(),
    createdByMe: true,
    clientId,
    author: normalizeProfile(authorProfile)
  };
}

export function PostsProvider({ children }) {
  const [postsByCity, setPostsByCity] = useState({});
  const [pendingQueue, setPendingQueue] = useState([]);
  const [isOnline, setIsOnline] = useState(true);
  const [clientId, setClientId] = useState(null);
  const clientIdRef = useRef(null);
  const [threadReads, setThreadReads] = useState({});
  const [postSubscriptions, setPostSubscriptions] = useState({});
  const [notifications, setNotifications] = useState([]);
  const prevPostsRef = useRef({});
  const hasHydratedPostsRef = useRef(false);

  const normalizePostsForClient = useCallback((data) => {
    if (!data || typeof data !== 'object') {
      return data;
    }
    const localClientId = clientIdRef.current;
    const result = {};
    Object.entries(data).forEach(([cityName, posts]) => {
      result[cityName] = (posts ?? []).map((post) => {
        const postClientId = post.clientId ?? null;
        const rawVotes =
          post.votes && typeof post.votes === 'object' && !Array.isArray(post.votes) ? post.votes : {};
        const voteValues = Object.values(rawVotes);
        const hasVoteData = voteValues.length > 0;
        const computedUpvotes = voteValues.filter((vote) => vote === 'up').length;
        const computedDownvotes = voteValues.filter((vote) => vote === 'down').length;
        const fallbackUpvotes = Number(post.upvotes ?? 0);
        const fallbackDownvotes = Number(post.downvotes ?? 0);
        const upvotes = hasVoteData ? computedUpvotes : Number.isFinite(fallbackUpvotes) ? fallbackUpvotes : 0;
        const downvotes = hasVoteData
          ? computedDownvotes
          : Number.isFinite(fallbackDownvotes)
          ? fallbackDownvotes
          : 0;
        const userVote = localClientId
          ? hasVoteData
            ? rawVotes[localClientId] ?? null
            : postClientId && postClientId === localClientId
            ? post.userVote ?? null
            : null
          : null;
        const shareCountRaw = post.shareCount ?? post.shares ?? 0;
        const shareCountNumber = Number(shareCountRaw);
        const shareCount = Number.isFinite(shareCountNumber) ? shareCountNumber : 0;

        const normalizedComments = (post.comments ?? []).map((comment) => {
          const ownerId = comment.clientId ?? null;
          const mine = ownerId ? ownerId === localClientId : false;
          return {
            ...comment,
            createdByMe: mine,
            clientId: ownerId
          };
        });

        const normalizedTitle =
          typeof post.title === 'string' && post.title.trim().length > 0
            ? post.title
            : typeof post.message === 'string'
            ? post.message
            : '';

        return {
          ...post,
          votes: rawVotes,
          upvotes,
          downvotes,
          userVote,
          shareCount,
          title: normalizedTitle,
          createdByMe: postClientId ? postClientId === localClientId : Boolean(post.createdByMe),
          comments: normalizedComments,
          highlightDescription: Boolean(post.highlightDescription)
        };
      });
    });
    return result;
  }, []);

  const persistPosts = useCallback((data) => {
    AsyncStorage.setItem(POSTS_CACHE_KEY, JSON.stringify(data)).catch((error) =>
      console.warn('[PostsProvider] persistPosts failed', error)
    );
  }, []);

  const persistQueue = useCallback((queue) => {
    AsyncStorage.setItem(QUEUE_CACHE_KEY, JSON.stringify(queue)).catch((error) =>
      console.warn('[PostsProvider] persistQueue failed', error)
    );
  }, []);

  const persistSubscriptions = useCallback((subscriptions) => {
    AsyncStorage.setItem(SUBSCRIPTIONS_CACHE_KEY, JSON.stringify(subscriptions)).catch((error) =>
      console.warn('[PostsProvider] persistSubscriptions failed', error)
    );
  }, []);

  const persistNotifications = useCallback((items) => {
    AsyncStorage.setItem(NOTIFICATIONS_CACHE_KEY, JSON.stringify(items)).catch((error) =>
      console.warn('[PostsProvider] persistNotifications failed', error)
    );
  }, []);

  const persistThreadReads = useCallback((reads) => {
    AsyncStorage.setItem(THREAD_READS_CACHE_KEY, JSON.stringify(reads)).catch((error) =>
      console.warn('[PostsProvider] persistThreadReads failed', error)
    );
  }, []);

  const setPostsWithPersist = useCallback(
    (updater) => {
      setPostsByCity((prev) => {
        const nextRaw = typeof updater === 'function' ? updater(prev) : updater;
        const next = normalizePostsForClient(nextRaw);
        persistPosts(next);
        return next;
      });
    },
    [normalizePostsForClient, persistPosts]
  );

  const enqueueOperation = useCallback(
    (operation) => {
      setPendingQueue((prev) => {
        const next = [...prev, operation];
        persistQueue(next);
        return next;
      });
    },
    [persistQueue]
  );

  useEffect(() => {
    const loadCache = async () => {
      try {
        const cachedPosts = await AsyncStorage.getItem(POSTS_CACHE_KEY);
        if (cachedPosts) {
          setPostsByCity(normalizePostsForClient(JSON.parse(cachedPosts)));
        }
      } catch (error) {
        console.warn('[PostsProvider] load posts cache failed', error);
      }

      try {
        const cachedQueue = await AsyncStorage.getItem(QUEUE_CACHE_KEY);
        if (cachedQueue) {
          setPendingQueue(JSON.parse(cachedQueue));
        }
      } catch (error) {
        console.warn('[PostsProvider] load queue cache failed', error);
      }

      try {
        const cachedReads = await AsyncStorage.getItem(THREAD_READS_CACHE_KEY);
        if (cachedReads) {
          setThreadReads(JSON.parse(cachedReads));
        }
      } catch (error) {
        console.warn('[PostsProvider] load thread reads failed', error);
      }

      try {
        const cachedSubscriptions = await AsyncStorage.getItem(SUBSCRIPTIONS_CACHE_KEY);
        if (cachedSubscriptions) {
          setPostSubscriptions(JSON.parse(cachedSubscriptions));
        }
      } catch (error) {
        console.warn('[PostsProvider] load post subscriptions failed', error);
      }

      try {
        const cachedNotifications = await AsyncStorage.getItem(NOTIFICATIONS_CACHE_KEY);
        if (cachedNotifications) {
          setNotifications(JSON.parse(cachedNotifications));
        }
      } catch (error) {
        console.warn('[PostsProvider] load notifications failed', error);
      }
    };

    loadCache();
  }, [normalizePostsForClient]);

  useEffect(() => {
    let cancelled = false;

    const initialiseClientId = async () => {
      try {
        const stored = await AsyncStorage.getItem(CLIENT_ID_KEY);
        if (cancelled) {
          return;
        }
        let resolved = stored;
        if (!resolved) {
          resolved = `client-${Date.now()}-${Math.random().toString(16).slice(2)}`;
          AsyncStorage.setItem(CLIENT_ID_KEY, resolved).catch((error) =>
            console.warn('[PostsProvider] persist client id failed', error)
          );
        }
        clientIdRef.current = resolved;
        setClientId(resolved);
      } catch (error) {
        console.warn('[PostsProvider] init client id failed', error);
        if (!cancelled) {
          const fallback = `client-${Date.now()}-${Math.random().toString(16).slice(2)}`;
          clientIdRef.current = fallback;
          setClientId(fallback);
        }
      }
    };

    initialiseClientId();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!clientId) {
      return;
    }
    setPostsByCity((prev) => {
      const normalized = normalizePostsForClient(prev);
      persistPosts(normalized);
      return normalized;
    });
  }, [clientId, normalizePostsForClient, persistPosts]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = Boolean(state.isConnected && state.isInternetReachable !== false);
      setIsOnline(online);
    });

    NetInfo.fetch().then((state) => {
      const online = Boolean(state.isConnected && state.isInternetReachable !== false);
      setIsOnline(online);
    });

    return () => unsubscribe();
  }, []);

  const ensureClientId = useCallback(() => {
    if (clientIdRef.current) {
      return clientIdRef.current;
    }
    const generated = `client-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    clientIdRef.current = generated;
    setClientId(generated);
    AsyncStorage.setItem(CLIENT_ID_KEY, generated).catch((error) =>
      console.warn('[PostsProvider] persist client id failed', error)
    );
    return generated;
  }, [setClientId]);

  const refreshFromRemote = useCallback(async () => {
    if (!isOnline) return;
    try {
      const remotePosts = await fetchAllPostsRemote();
      if (!remotePosts.length) return;

      setPostsWithPersist((prev) => {
        const localClientId = clientIdRef.current;
        const grouped = remotePosts.reduce((acc, post) => {
          const city = post.city ?? post.sourceCity ?? 'Unknown';
          const rawVotes =
            post.votes && typeof post.votes === 'object' && !Array.isArray(post.votes) ? post.votes : {};
          const mapped = {
            ...post,
            votes: rawVotes,
            userVote: null,
            comments: (post.comments ?? []).map((comment) => {
              const ownerId = comment.clientId ?? null;
              const mine = ownerId ? ownerId === localClientId : false;
              return {
                ...comment,
                createdByMe: mine,
                clientId: ownerId
              };
            }),
            createdByMe: prev[city]?.some((p) => p.id === post.id && p.createdByMe) ?? false
          };
          if (!acc[city]) acc[city] = [];
          acc[city].push(mapped);
          return acc;
        }, {});

        Object.keys(grouped).forEach((city) => {
          grouped[city].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
        });

        Object.entries(prev).forEach(([city, posts]) => {
          const target = grouped[city] ?? [];
          const remoteIds = new Set(target.map((post) => post.id));
          posts.forEach((post) => {
            if (!remoteIds.has(post.id)) {
              target.push(post);
            }
          });
          target.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
          grouped[city] = target;
        });

        return grouped;
      });
    } catch (error) {
      console.warn('[PostsProvider] refresh remote failed', error?.message ?? error);
    }
  }, [isOnline, setPostsWithPersist, clientId]);

  useEffect(() => {
    if (isOnline) {
      refreshFromRemote();
    }
  }, [isOnline, refreshFromRemote]);

  useEffect(() => {
    if (!isOnline || pendingQueue.length === 0) return;

    let cancelled = false;

    const run = async () => {
      const remaining = [];
      for (const operation of pendingQueue) {
        if (cancelled) return;
        try {
          if (operation.type === 'addPost') {
            await savePostRemote(operation.payload.post);
          } else if (operation.type === 'addComment') {
            await saveCommentRemote(operation.payload.postId, operation.payload.comment);
          } else if (operation.type === 'updatePost') {
            await savePostRemote(operation.payload.post);
          } else if (operation.type === 'deletePost') {
            await deletePostRemote(operation.payload.id);
          }
        } catch (error) {
          console.warn('[PostsProvider] queue operation failed', error);
          remaining.push(operation);
        }
      }

      if (!cancelled) {
        if (remaining.length !== pendingQueue.length) {
          setPendingQueue(remaining);
          persistQueue(remaining);
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [isOnline, pendingQueue, persistQueue]);

  useEffect(() => {
    if (!hasHydratedPostsRef.current) {
      prevPostsRef.current = postsByCity;
      hasHydratedPostsRef.current = true;
      return;
    }

    const activeSubscriptions = Object.entries(postSubscriptions)
      .filter(([, enabled]) => Boolean(enabled))
      .map(([key]) => key);

    if (!activeSubscriptions.length) {
      prevPostsRef.current = postsByCity;
      return;
    }

    const previous = prevPostsRef.current || {};
    const localClientId = clientIdRef.current;
    const newItems = [];

    const resolveActorName = (post, clientId) => {
      if (!clientId) {
        return 'Someone';
      }

      const profiles = post?.voteProfiles;
      if (profiles) {
        if (Array.isArray(profiles)) {
          const found = profiles.find(
            (profile) => profile?.clientId === clientId || profile?.id === clientId
          );
          if (found) {
            const name = found.nickname ?? found.name ?? '';
            if (name && name.trim()) {
              return name.trim();
            }
          }
        } else if (typeof profiles === 'object') {
          const profile = profiles[clientId];
          if (profile) {
            const name = profile.nickname ?? profile.name ?? '';
            if (name && name.trim()) {
              return name.trim();
            }
          }
        }
      }

      const commentMatch = (post?.comments ?? []).find((comment) => comment.clientId === clientId);
      const fallbackName = commentMatch?.author?.nickname ?? commentMatch?.author?.name ?? '';
      return fallbackName && fallbackName.trim() ? fallbackName.trim() : 'Someone';
    };

    activeSubscriptions.forEach((threadKey) => {
      const [cityName, postId] = threadKey.split('::');
      if (!cityName || !postId) {
        return;
      }

      const nextPosts = postsByCity[cityName] ?? [];
      const nextPost = nextPosts.find((post) => post.id === postId);
      if (!nextPost) {
        return;
      }

      const prevPosts = previous[cityName] ?? [];
      const prevPost = prevPosts.find((post) => post.id === postId);

      const prevCommentIds = new Set((prevPost?.comments ?? []).map((comment) => comment?.id));
      (nextPost.comments ?? []).forEach((comment) => {
        if (!comment?.id || prevCommentIds.has(comment.id)) {
          return;
        }
        if (comment.clientId && comment.clientId === localClientId) {
          return;
        }
        if (comment.createdByMe) {
          return;
        }

        const actorName = comment.author?.nickname?.trim?.() || comment.author?.name?.trim?.() || 'Someone';
        newItems.push({
          id: `comment-${cityName}-${postId}-${comment.id}`,
          city: cityName,
          postId,
          type: 'comment',
          commentId: comment.id,
          actorName,
          snippet: comment.message ?? '',
          postTitle: nextPost.title ?? nextPost.message ?? '',
          createdAt: comment.createdAt ?? Date.now(),
          read: false,
        });
      });

      const prevVotes = prevPost?.votes ?? {};
      const nextVotes = nextPost.votes ?? {};
      Object.entries(nextVotes).forEach(([voterId, value]) => {
        if (voterId === localClientId) {
          return;
        }
        const previousValue = prevVotes?.[voterId];
        if (value === 'up' && previousValue !== 'up') {
          const actorName = resolveActorName(nextPost, voterId);
          newItems.push({
            id: `like-${cityName}-${postId}-${voterId}`,
            city: cityName,
            postId,
            type: 'like',
            actorName,
            snippet: nextPost.message ?? '',
            postTitle: nextPost.title ?? nextPost.message ?? '',
            createdAt: Date.now(),
            read: false,
          });
        }
      });
    });

    if (newItems.length) {
      setNotifications((prevList) => {
        const existingIds = new Set(prevList.map((item) => item.id));
        let changed = false;
        const combined = [...prevList];
        newItems.forEach((item) => {
          if (existingIds.has(item.id)) {
            return;
          }
          combined.push(item);
          existingIds.add(item.id);
          changed = true;
        });

        if (!changed) {
          return prevList;
        }

        const sorted = combined
          .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
          .slice(0, MAX_NOTIFICATIONS);
        persistNotifications(sorted);
        return sorted;
      });
    }

    prevPostsRef.current = postsByCity;
  }, [clientId, postSubscriptions, postsByCity, persistNotifications]);

  const addPost = useCallback(
    (
      city,
      title,
      description = '',
      colorKey = 'royal',
      authorProfile = null,
      highlightDescription = false
    ) => {
      const trimmedTitle = title?.trim?.();
      if (!trimmedTitle) {
        return;
      }

      const trimmedDescription = description?.trim?.() ?? '';
      const ownerId = ensureClientId();
      const author = normalizeProfile(authorProfile);
      const newPostId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const newPost = {
        id: newPostId,
        city,
        title: trimmedTitle,
        message: trimmedDescription,
        createdAt: Date.now(),
        createdByMe: true,
        clientId: ownerId,
        colorKey,
        sourceCity: city,
        sourcePostId: newPostId,
        comments: [],
        upvotes: 0,
        downvotes: 0,
        userVote: null,
        votes: {},
        shareCount: 0,
        sharedFrom: null,
        author,
        highlightDescription: !!highlightDescription
      };

      setPostsWithPersist((prev) => {
        const cityPosts = prev[city] ?? [];
        return { ...prev, [city]: [newPost, ...cityPosts] };
      });

      enqueueOperation({ type: 'addPost', payload: { post: newPost } });
    },
    [enqueueOperation, ensureClientId, setPostsWithPersist]
  );

  const addComment = useCallback(
    (city, postId, message, authorProfile = null) => {
      const trimmed = message.trim();
      if (!trimmed) {
        return;
      }

      const ownerId = ensureClientId();
      const newComment = createComment(trimmed, ownerId, authorProfile);

      setPostsWithPersist((prev) => {
        const cityPosts = prev[city] ?? [];
        const updatedPosts = cityPosts.map((post) =>
          post.id === postId
            ? { ...post, comments: [...(post.comments ?? []), newComment] }
            : post
        );

        return { ...prev, [city]: updatedPosts };
      });

      enqueueOperation({ type: 'addComment', payload: { city, postId, comment: newComment } });
    },
    [enqueueOperation, ensureClientId, setPostsWithPersist]
  );

  const getPostsForCity = useCallback(
    (city) => postsByCity[city] ?? [],
    [postsByCity]
  );

  const getPostById = useCallback(
    (city, postId) => {
      const cityPosts = postsByCity[city] ?? [];
      return cityPosts.find((post) => post.id === postId) ?? null;
    },
    [postsByCity]
  );

  const getAllPosts = useCallback(() => {
    return Object.entries(postsByCity).flatMap(([city, posts]) =>
      posts.map((post) => ({ ...post, city }))
    );
  }, [postsByCity]);

  const getRecentCityActivity = useCallback(
    ({ limit = 6, province, country } = {}) => {
      const entries = [];
      Object.entries(postsByCity).forEach(([cityName, posts]) => {
        if (!posts.length) return;
        let lastActivity = 0;
        let provinceMeta = '';
        let countryMeta = '';
        posts.forEach((post) => {
          lastActivity = Math.max(lastActivity, post.createdAt ?? 0);
          if (!provinceMeta && post.author?.province) {
            provinceMeta = post.author.province;
          }
          if (!countryMeta && post.author?.country) {
            countryMeta = post.author.country;
          }
          (post.comments ?? []).forEach((comment) => {
            lastActivity = Math.max(lastActivity, comment.createdAt ?? 0);
          });
        });
        entries.push({ city: cityName, province: provinceMeta, country: countryMeta, lastActivity });
      });

      const sortedAll = [...entries].sort((a, b) => (b.lastActivity ?? 0) - (a.lastActivity ?? 0));
      const normalize = (value) => value?.toLowerCase().trim();
      const selected = [];
      const used = new Set();

      const pushFrom = (list) => {
        list.forEach((item) => {
          if (used.has(item.city)) return;
          selected.push(item);
          used.add(item.city);
        });
      };

      if (province) {
        const provinceMatches = sortedAll.filter((item) => normalize(item.province) === normalize(province));
        pushFrom(provinceMatches);
      }

      if (selected.length < limit && country) {
        const countryMatches = sortedAll.filter((item) => normalize(item.country) === normalize(country));
        pushFrom(countryMatches);
      }

      if (selected.length < limit) {
        pushFrom(sortedAll);
      }

      return selected.slice(0, limit);
    },
    [postsByCity]
  );

  const getUnreadCommentCount = useCallback(
    (city, postId) => {
      const cityPosts = postsByCity[city] ?? [];
      const post = cityPosts.find((item) => item.id === postId);
      if (!post) {
        return 0;
      }

      const comments = post.comments ?? [];
      const key = makeThreadKey(city, postId);
      const lastSeenAt = threadReads[key]?.lastSeenAt ?? 0;
      const seenOtherCount = threadReads[key]?.seenOtherCount ?? 0;

      let timeBased = 0;
      let totalOtherComments = 0;
      comments.forEach((comment) => {
        if (comment.createdByMe) {
          return;
        }
        totalOtherComments += 1;
        const createdAt = comment.createdAt ?? 0;
        if (createdAt > lastSeenAt) {
          timeBased += 1;
        }
      });

      const countBasedOnTotal = Math.max(totalOtherComments - seenOtherCount, 0);
      return Math.max(timeBased, countBasedOnTotal);
    },
    [postsByCity, threadReads]
  );

  const markThreadRead = useCallback(
    (city, postId) => {
      const key = makeThreadKey(city, postId);
      setThreadReads((prev) => {
        const comments = (postsByCity[city] ?? []).find((item) => item.id === postId)?.comments ?? [];
        let latestCommentAt = 0;
        let otherCount = 0;
        comments.forEach((comment) => {
          const createdAt = comment?.createdAt ?? 0;
          latestCommentAt = Math.max(latestCommentAt, createdAt);
          if (!comment?.createdByMe) {
            otherCount += 1;
          }
        });
        const next = {
          ...prev,
          [key]: {
            lastSeenAt: Math.max(Date.now(), latestCommentAt),
            seenOtherCount: otherCount
          }
        };
        persistThreadReads(next);
        return next;
      });
    },
    [persistThreadReads, postsByCity]
  );

  const getReplyNotificationCount = useCallback(() => {
    let count = 0;
    Object.entries(postsByCity).forEach(([cityName, posts]) => {
      posts.forEach((post) => {
        if (!(post.comments ?? []).some((comment) => comment.createdByMe)) {
          return;
        }
        count += getUnreadCommentCount(cityName, post.id);
      });
    });
    return count;
  }, [getUnreadCommentCount, postsByCity]);

  const isPostSubscribed = useCallback(
    (city, postId) => {
      if (!city || !postId) {
        return false;
      }
      return Boolean(postSubscriptions[makeThreadKey(city, postId)]);
    },
    [postSubscriptions]
  );

  const togglePostSubscription = useCallback(
    (city, postId) => {
      if (!city || !postId) {
        return false;
      }

      const key = makeThreadKey(city, postId);
      let enabled = false;

      setPostSubscriptions((prev) => {
        const next = { ...prev };
        if (next[key]) {
          delete next[key];
          enabled = false;
        } else {
          next[key] = true;
          enabled = true;
        }
        persistSubscriptions(next);
        return next;
      });

      if (enabled) {
        prevPostsRef.current = postsByCity;
      }

      return enabled;
    },
    [persistSubscriptions, postsByCity]
  );

  const getNotificationCount = useCallback(() => {
    return notifications.reduce((total, item) => (item.read ? total : total + 1), 0);
  }, [notifications]);

  const getNotifications = useCallback(() => {
    return [...notifications].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  }, [notifications]);

  const markNotificationsRead = useCallback(() => {
    setNotifications((prevList) => {
      let changed = false;
      const next = prevList.map((item) => {
        if (item.read) {
          return item;
        }
        changed = true;
        return { ...item, read: true };
      });
      if (changed) {
        persistNotifications(next);
        return next;
      }
      return prevList;
    });
  }, [persistNotifications]);

  const markNotificationsForThreadRead = useCallback(
    (city, postId) => {
      if (!city || !postId) {
        return;
      }

      setNotifications((prevList) => {
        let changed = false;
        const next = prevList.map((item) => {
          if (item.city === city && item.postId === postId && !item.read) {
            changed = true;
            return { ...item, read: true };
          }
          return item;
        });
        if (changed) {
          persistNotifications(next);
          return next;
        }
        return prevList;
      });
    },
    [persistNotifications]
  );

  const sharePost = useCallback(
    (fromCity, postId, toCity, authorProfile = null) => {
      if (fromCity === toCity) {
        return;
      }

      const basePost = (() => {
        const fromPosts = postsByCity[fromCity] ?? [];
        return fromPosts.find((post) => post.id === postId) ?? null;
      })();

      if (!basePost) {
        return;
      }

      const ownerId = ensureClientId();
      const author = normalizeProfile(authorProfile ?? basePost.author);
      const nextShareCount = (basePost.shareCount ?? 0) + 1;

      const sharedPost = {
        ...basePost,
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        city: toCity,
        createdAt: Date.now(),
        comments: [],
        sharedFrom: { city: fromCity },
        sourceCity: basePost.sourceCity ?? basePost.city ?? fromCity,
        sourcePostId: basePost.sourcePostId ?? basePost.id,
        createdByMe: true,
        clientId: ownerId,
        upvotes: 0,
        downvotes: 0,
        userVote: null,
        votes: {},
        shareCount: 0,
        author
      };

      setPostsWithPersist((prev) => {
        const targetPosts = prev[toCity] ?? [];
        const fromPosts = prev[fromCity] ?? [];
        return {
          ...prev,
          [toCity]: [sharedPost, ...targetPosts],
          [fromCity]: fromPosts.map((post) =>
            post.id === postId ? { ...post, shareCount: nextShareCount } : post
          )
        };
      });

      enqueueOperation({ type: 'addPost', payload: { post: sharedPost } });
      enqueueOperation({
        type: 'updatePost',
        payload: { post: { id: postId, shareCount: nextShareCount } }
      });
    },
    [enqueueOperation, ensureClientId, postsByCity, setPostsWithPersist]
  );

  const toggleVote = useCallback(
    (city, postId, direction) => {
      const voterId = ensureClientId();
      let remotePayload = null;

      setPostsWithPersist((prev) => {
        const cityPosts = prev[city] ?? [];
        const updated = cityPosts.map((post) => {
          if (post.id !== postId) {
            return post;
          }

          const votes = { ...(post.votes ?? {}) };
          const currentVote = votes[voterId] ?? null;
          let nextVote = currentVote;

          if (direction === 'up') {
            nextVote = currentVote === 'up' ? null : 'up';
          } else if (direction === 'down') {
            nextVote = currentVote === 'down' ? null : 'down';
          }

          if (!nextVote) {
            delete votes[voterId];
          } else {
            votes[voterId] = nextVote;
          }

          const voteValues = Object.values(votes);
          const upvotes = voteValues.filter((vote) => vote === 'up').length;
          const downvotes = voteValues.filter((vote) => vote === 'down').length;

          const nextPost = {
            ...post,
            votes,
            upvotes,
            downvotes,
            userVote: nextVote ?? null
          };

          remotePayload = {
            id: postId,
            votes: { ...votes },
            upvotes,
            downvotes
          };

          return nextPost;
        });

        return { ...prev, [city]: updated };
      });

      if (remotePayload) {
        enqueueOperation({ type: 'updatePost', payload: { post: remotePayload } });
      }
    },
    [enqueueOperation, ensureClientId, setPostsWithPersist]
  );

  const updatePost = useCallback(
    (city, postId, updates) => {
      if (!city || !postId || !updates || typeof updates !== 'object') {
        return false;
      }

      const ownerId = ensureClientId();
      let payloadForQueue = null;

      setPostsWithPersist((prev) => {
        const cityPosts = prev[city] ?? [];
        let mutated = false;
        const timestamp = Date.now();
        const nextPosts = cityPosts.map((post) => {
          if (post.id !== postId) {
            return post;
          }

          const canEdit = post.createdByMe || (post.clientId && post.clientId === ownerId);
          if (!canEdit) {
            return post;
          }

          const patch = { ...updates };
          if (!('updatedAt' in patch)) {
            patch.updatedAt = timestamp;
          }

          payloadForQueue = { id: postId, ...patch };
          mutated = true;
          return { ...post, ...patch };
        });

        if (!mutated) {
          return prev;
        }

        return { ...prev, [city]: nextPosts };
      });

      if (payloadForQueue) {
        enqueueOperation({ type: 'updatePost', payload: { post: payloadForQueue } });
        return true;
      }

      return false;
    },
    [enqueueOperation, ensureClientId, setPostsWithPersist]
  );

  const deletePost = useCallback(
    (city, postId) => {
      if (!city || !postId) {
        return false;
      }

      const ownerId = ensureClientId();
      let removed = false;

      setPostsWithPersist((prev) => {
        const cityPosts = prev[city] ?? [];
        const nextPosts = cityPosts.filter((post) => {
          if (post.id !== postId) {
            return true;
          }

          const canDelete = post.createdByMe || (post.clientId && post.clientId === ownerId);
          if (canDelete) {
            removed = true;
            return false;
          }

          return true;
        });

        if (!removed) {
          return prev;
        }

        return { ...prev, [city]: nextPosts };
      });

      if (removed) {
        const key = makeThreadKey(city, postId);
        setThreadReads((prev) => {
          if (!prev[key]) {
            return prev;
          }
          const next = { ...prev };
          delete next[key];
          persistThreadReads(next);
          return next;
        });
        setPostSubscriptions((prev) => {
          if (!prev[key]) {
            return prev;
          }
          const next = { ...prev };
          delete next[key];
          persistSubscriptions(next);
          return next;
        });
        setNotifications((prevList) => {
          const filtered = prevList.filter(
            (item) => !(item.city === city && item.postId === postId)
          );
          if (filtered.length === prevList.length) {
            return prevList;
          }
          persistNotifications(filtered);
          return filtered;
        });
        enqueueOperation({ type: 'deletePost', payload: { id: postId } });
        return true;
      }

      return false;
    },
    [
      enqueueOperation,
      ensureClientId,
      persistNotifications,
      persistSubscriptions,
      persistThreadReads,
      setPostsWithPersist
    ]
  );

  const value = useMemo(
    () => ({
      addComment,
      addPost,
      deletePost,
      getPostById,
      getPostsForCity,
      getAllPosts,
      sharePost,
      getRecentCityActivity,
      getReplyNotificationCount,
      getUnreadCommentCount,
      getNotificationCount,
      getNotifications,
      isPostSubscribed,
      togglePostSubscription,
      markNotificationsRead,
      markNotificationsForThreadRead,
      markThreadRead,
      toggleVote,
      updatePost,
      refreshPosts: refreshFromRemote
    }),
    [
      addComment,
      addPost,
      deletePost,
      getPostById,
      getPostsForCity,
      getAllPosts,
      sharePost,
      getRecentCityActivity,
      getReplyNotificationCount,
      getUnreadCommentCount,
      getNotificationCount,
      getNotifications,
      isPostSubscribed,
      togglePostSubscription,
      markNotificationsRead,
      markNotificationsForThreadRead,
      markThreadRead,
      toggleVote,
      updatePost,
      refreshFromRemote
    ]
  );

  return <PostsContext.Provider value={value}>{children}</PostsContext.Provider>;
}

export function usePosts() {
  const context = useContext(PostsContext);

  if (!context) {
    throw new Error('usePosts must be used within a PostsProvider');
  }

  return context;
}
