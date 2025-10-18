import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

const PostsContext = createContext(null);

export function PostsProvider({ children }) {
  const [postsByCity, setPostsByCity] = useState({});

  const addPost = useCallback((city, message) => {
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
        comments: []
      };

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
                  createdAt: Date.now()
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

  const value = useMemo(
    () => ({
      addComment,
      addPost,
      getPostById,
      getPostsForCity
    }),
    [addComment, addPost, getPostById, getPostsForCity]
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
