import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

const PostsContext = createContext(null);

export function PostsProvider({ children }) {
  const [postsByCity, setPostsByCity] = useState({});

  const addPost = useCallback((city, message, colorKey = 'royal') => {
    const trimmed = message.trim();
    if (!trimmed) {
      return;
    }

    setPostsByCity((prev) => {
      const cityPosts = prev[city] ?? [];
      const newPost = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        message: trimmed,
        createdAt: Date.now(),
        createdByMe: true,
        colorKey,
        sourceCity: city,
        sourcePostId: null, // fill after id set
        comments: [],
        upvotes: 0,
        downvotes: 0,
        userVote: null,
        sharedFrom: null
      };

      newPost.sourcePostId = newPost.id;

      return { ...prev, [city]: [newPost, ...cityPosts] };
    });
  }, []);

  const addComment = useCallback((city, postId, message) => {
    const trimmed = message.trim();
    if (!trimmed) {
      return;
    }

    setPostsByCity((prev) => {
      const cityPosts = prev[city] ?? [];

      const updatedPosts = cityPosts.map((post) =>
        post.id === postId
          ? {
              ...post,
              comments: [
                ...post.comments,
                {
                  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
                  message: trimmed,
                  createdAt: Date.now(),
                  createdByMe: true
                }
              ]
            }
          : post
      );

      return { ...prev, [city]: updatedPosts };
    });
  }, []);

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

  const sharePost = useCallback((fromCity, postId, toCity) => {
    if (fromCity === toCity) {
      return;
    }

    setPostsByCity((prev) => {
      const fromPosts = prev[fromCity] ?? [];
      const original = fromPosts.find((post) => post.id === postId);
      if (!original) {
        return prev;
      }

      const targetPosts = prev[toCity] ?? [];
      const newPost = {
        ...original,
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        createdAt: Date.now(),
        comments: [],
        sharedFrom: { city: fromCity },
        sourceCity: original.sourceCity ?? fromCity,
        sourcePostId: original.sourcePostId ?? original.id,
        createdByMe: true,
        upvotes: 0,
        downvotes: 0,
        userVote: null
      };

      return {
        ...prev,
        [toCity]: [newPost, ...targetPosts]
      };
    });
  }, []);

  const toggleVote = useCallback((city, postId, direction) => {
    setPostsByCity((prev) => {
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
  }, []);

  const value = useMemo(
    () => ({
      addComment,
      addPost,
      getPostById,
      getPostsForCity,
      getAllPosts,
      sharePost,
      toggleVote
    }),
    [addComment, addPost, getPostById, getPostsForCity, getAllPosts, sharePost, toggleVote]
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
