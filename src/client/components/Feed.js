```javascript
import React, { useEffect, useRef, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  fetchPosts,
  addPost,
  updatePostInState,
  removePost,
  selectPosts,
  selectPostsStatus,
  selectPostsError,
  selectHasMorePosts,
} from '../redux/slices/postsSlice';
import useSocket from '../hooks/useSocket';

import Post from './Post';
import CreatePost from './CreatePost';
import LoadingSpinner from './common/LoadingSpinner';
import ErrorMessage from './common/ErrorMessage';

/**
 * @component Feed
 * @description Renders the main content feed, including a post creation form and a list of posts.
 * It handles fetching posts, infinite scrolling, and real-time updates via WebSockets.
 */
const Feed = () => {
  const dispatch = useDispatch();
  const socket = useSocket();

  // Selectors to get data from the Redux store
  const posts = useSelector(selectPosts);
  const postStatus = useSelector(selectPostsStatus);
  const error = useSelector(selectPostsError);
  const hasMore = useSelector(selectHasMorePosts);

  // Ref for the observer target element at the bottom of the feed
  const observer = useRef();

  /**
   * Callback for the IntersectionObserver.
   * When the last post is in view and we're not already loading, fetch more posts.
   */
  const lastPostElementRef = useCallback(
    (node) => {
      if (postStatus === 'loading') return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          // The page number is managed within the postsSlice
          dispatch(fetchPosts());
        }
      });

      if (node) observer.current.observe(node);
    },
    [postStatus, hasMore, dispatch]
  );

  // Effect for initial data fetching
  useEffect(() => {
    // Fetch posts only if the status is 'idle' (i.e., on initial load)
    if (postStatus === 'idle') {
      dispatch(fetchPosts());
    }
  }, [postStatus, dispatch]);

  // Effect for handling real-time socket events
  useEffect(() => {
    if (!socket) return;

    // Handler for new posts created by other users
    const handleNewPost = (newPost) => {
      console.log('Socket: Received new post', newPost);
      dispatch(addPost(newPost));
    };

    // Handler for post updates (likes, comments)
    const handlePostUpdate = (updatedPost) => {
      console.log('Socket: Received post update', updatedPost);
      dispatch(updatePostInState(updatedPost));
    };

    // Handler for deleted posts
    const handlePostDelete = (postId) => {
      console.log('Socket: Received post delete for ID:', postId);
      dispatch(removePost(postId));
    };

    // Register event listeners
    socket.on('new_post', handleNewPost);
    socket.on('post_updated', handlePostUpdate);
    socket.on('post_deleted', handlePostDelete);

    // Cleanup function to remove listeners when the component unmounts
    return () => {
      socket.off('new_post', handleNewPost);
      socket.off('post_updated', handlePostUpdate);
      socket.off('post_deleted', handlePostDelete);
    };
  }, [socket, dispatch]);

  /**
   * Renders the content of the feed based on the current status.
   * @returns {JSX.Element} The rendered content.
   */
  const renderContent = () => {
    // Initial loading state
    if (postStatus === 'loading' && posts.length === 0) {
      return (
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner />
        </div>
      );
    }

    // Error state
    if (postStatus === 'failed' && posts.length === 0) {
      return <ErrorMessage message={error || 'Failed to load posts. Please try again later.'} />;
    }

    // No posts found
    if (postStatus === 'succeeded' && posts.length === 0) {
        return (
            <div className="text-center py-10 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300">No posts yet!</h3>
                <p className="text-gray-500 dark:text-gray-400 mt-2">Be the first to share something with the community.</p>
            </div>
        );
    }

    // Render the list of posts
    return (
      <div className="space-y-4">
        {posts.map((post, index) => {
          // Attach the ref to the last post element for infinite scrolling
          if (posts.length === index + 1) {
            return <div ref={lastPostElementRef} key={post._id}><Post post={post} /></div>;
          }
          return <Post key={post._id} post={post} />;
        })}
      </div>
    );
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Post creation component */}
      <CreatePost />

      {/* Separator */}
      <hr className="my-6 border-gray-200 dark:border-gray-700" />

      {/* Feed content */}
      <main>
        {renderContent()}
        
        {/* Loading indicator for infinite scroll */}
        {postStatus === 'loading' && posts.length > 0 && (
          <div className="flex justify-center py-4">
            <LoadingSpinner />
          </div>
        )}

        {/* Message when all posts have been loaded */}
        {postStatus === 'succeeded' && !hasMore && posts.length > 0 && (
            <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                <p>You've reached the end of the feed!</p>
            </div>
        )}
      </main>
    </div>
  );
};

export default Feed;
```