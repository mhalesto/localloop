import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import {
  fetchAllPostsRemote,
  saveCommentRemote,
  savePostRemote
} from '../api/postService';

const PostsContext = createContext(null);

const POSTS_CACHE_KEY = '@toilet.postsCache';
const QUEUE_CACHE_KEY = '@toilet.postsQueue';

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

function createComment(message) {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    message,
    createdAt: Date.now(),
    createdByMe: true
  };
}

export function PostsProvider({ children }) {
  const [postsByCity, setPostsByCity] = useState({});
  const [pendingQueue, setPendingQueue] = useState([]);
  const [isOnline, setIsOnline] = useState(true);

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

  const setPostsWithPersist = useCallback(
    (updater) => {
      setPostsByCity((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        persistPosts(next);
        return next;
      });
    },
    [persistPosts]
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
          setPostsByCity(JSON.parse(cachedPosts));
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
    };

    loadCache();
  }, []);

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

  const refreshFromRemote = useCallback(async () => {
    if (!isOnline) return;
    try {
      const remotePosts = await fetchAllPostsRemote();
      if (!remotePosts.length) return;

      setPostsWithPersist((prev) => {
        const grouped = remotePosts.reduce((acc, post) => {
          const city = post.city ?? post.sourceCity ?? 'Unknown';
          const mapped = {
            ...post,
            comments: post.comments ?? [],
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
  }, [isOnline, setPostsWithPersist]);

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

  const addPost = useCallback(
    (city, message, colorKey = 'royal', authorProfile = null) => {
      const trimmed = message.trim();
      if (!trimmed) {
        return;
      }
      const author = normalizeProfile(authorProfile);
      const newPostId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const newPost = {
        id: newPostId,
        city,
        message: trimmed,
        createdAt: Date.now(),
        createdByMe: true,
        colorKey,
        sourceCity: city,
        sourcePostId: newPostId,
        comments: [],
        upvotes: 0,
        downvotes: 0,
        userVote: null,
        sharedFrom: null,
        author
      };

      setPostsWithPersist((prev) => {
        const cityPosts = prev[city] ?? [];
        return { ...prev, [city]: [newPost, ...cityPosts] };
      });

      enqueueOperation({ type: 'addPost', payload: { post: newPost } });
    },
    [enqueueOperation, setPostsWithPersist]
  );

  const addComment = useCallback(
    (city, postId, message) => {
      const trimmed = message.trim();
      if (!trimmed) {
        return;
      }

      const newComment = createComment(trimmed);

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
    [enqueueOperation, setPostsWithPersist]
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

  const getReplyNotificationCount = useCallback(() => {
    let count = 0;
    Object.values(postsByCity).forEach((posts) => {
      posts.forEach((post) => {
        const comments = post.comments ?? [];
        const hasMyComment = comments.some((comment) => comment.createdByMe);
        if (!hasMyComment) {
          return;
        }
        const others = comments.filter((comment) => !comment.createdByMe).length;
        count += others;
      });
    });
    return count;
  }, [postsByCity]);

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

      const author = normalizeProfile(authorProfile ?? basePost.author);

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
        upvotes: 0,
        downvotes: 0,
        userVote: null,
        author
      };

      setPostsWithPersist((prev) => {
        const targetPosts = prev[toCity] ?? [];
        return {
          ...prev,
          [toCity]: [sharedPost, ...targetPosts]
        };
      });

      enqueueOperation({ type: 'addPost', payload: { post: sharedPost } });
    },
    [enqueueOperation, postsByCity, setPostsWithPersist]
  );

  const toggleVote = useCallback((city, postId, direction) => {
    setPostsWithPersist((prev) => {
      const cityPosts = prev[city] ?? [];
      const updated = cityPosts.map((post) => {
        if (post.id !== postId) {
          return post;
        }

        let upvotes = post.upvotes ?? 0;
        let downvotes = post.downvotes ?? 0;
        let userVote = post.userVote ?? null;

        if (direction === 'up') {
          if (userVote === 'up') {
            upvotes = Math.max(0, upvotes - 1);
            userVote = null;
          } else {
            if (userVote === 'down') {
              downvotes = Math.max(0, downvotes - 1);
            }
            upvotes += 1;
            userVote = 'up';
          }
        } else if (direction === 'down') {
          if (userVote === 'down') {
            downvotes = Math.max(0, downvotes - 1);
            userVote = null;
          } else {
            if (userVote === 'up') {
              upvotes = Math.max(0, upvotes - 1);
            }
            downvotes += 1;
            userVote = 'down';
          }
        }

        return {
          ...post,
          upvotes,
          downvotes,
          userVote
        };
      });

      return { ...prev, [city]: updated };
    });
  }, [setPostsWithPersist]);

  const value = useMemo(
    () => ({
      addComment,
      addPost,
      getPostById,
      getPostsForCity,
      getAllPosts,
      sharePost,
      getRecentCityActivity,
      getReplyNotificationCount,
      toggleVote
    }),
    [
      addComment,
      addPost,
      getPostById,
      getPostsForCity,
      getAllPosts,
      sharePost,
      getRecentCityActivity,
      getReplyNotificationCount,
      toggleVote
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
