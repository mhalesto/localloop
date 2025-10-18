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
        comments: []
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
        createdByMe: true
      };

      return {
        ...prev,
        [toCity]: [newPost, ...targetPosts]
      };
    });
  }, []);

  const value = useMemo(
    () => ({
      addComment,
      addPost,
      getPostById,
      getPostsForCity,
      getAllPosts,
      sharePost
    }),
    [addComment, addPost, getPostById, getPostsForCity, getAllPosts, sharePost]
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
