```javascript
import React, { useEffect, useRef, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { io } from 'socket.io-client';

// Redux actions for post management
import {
  fetchPosts,
  addNewPost,
  updatePostRealtime,
  deletePostRealtime,
  resetFeed,
} from '../redux/slices/postSlice';

// Component imports
import CreatePost from './post/CreatePost';
import Post from './post/Post';
import Loader from './common/Loader';
import PostSkeleton from './skeletons/PostSkeleton';

// Socket instance. In a larger app, this might be managed by a context or a dedicated service.
let socket;

/**
 * Feed component
 * Renders the main content feed, including post creation and a list of posts.
 * Implements infinite scrolling for post loading and real-time updates via Socket.io.
 */
const Feed = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { posts, status, hasMore, page, error } = useSelector((state) => state.posts);

  // Ref for the IntersectionObserver to implement infinite scrolling
  const observer = useRef();

  /**
   * Callback ref attached to the last post element.
   * When this element becomes visible in the viewport, it triggers fetching the next page of posts.
   */
  const lastPostElementRef = useCallback(
    (node) => {
      if (status === 'loading') return; // Don't trigger while already loading
      if (observer.current) observer.current.disconnect(); // Disconnect previous observer

      observer.current = new IntersectionObserver((entries) => {
        // If the last element is intersecting and there are more posts to load
        if (entries[0].isIntersecting && hasMore) {
          dispatch(fetchPosts(page));
        }
      });

      if (node) observer.current.observe(node); // Observe the new last element
    },
    [status, hasMore, page, dispatch]
  );

  // Effect for initial data fetch and setting up Socket.io listeners
  useEffect(() => {
    // Fetch initial posts only if the store is empty to avoid re-fetching on re-renders.
    if (posts.length === 0) {
      dispatch(fetchPosts(1));
    }

    // Initialize and connect socket. The URL should be in an environment variable.
    const socketUrl = process.env.REACT_APP_API_URL || 'http://localhost:5001';
    socket = io(socketUrl, {
      // Optional: Add authentication if your socket server requires it
      // query: { token: localStorage.getItem('token') }
    });

    // --- Socket Event Listeners ---

    // Listen for new posts created by other users
    socket.on('new_post', (newPost) => {
      // Add the new post to the top of the feed in the Redux store
      dispatch(addNewPost(newPost));
    });

    // Listen for updates to any post (likes, comments)
    socket.on('post_updated', (updatedPost) => {
      dispatch(updatePostRealtime(updatedPost));
    });

    // Listen for deleted posts
    socket.on('post_deleted', ({ postId }) => {
      dispatch(deletePostRealtime(postId));
    });

    // Cleanup function: runs when the component unmounts
    return () => {
      socket.disconnect();
      // It's good practice to remove specific listeners as well
      socket.off('new_post');
      socket.off('post_updated');
      socket.off('post_deleted');
    };
    // The dependency array is empty to ensure this effect runs only once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  // Effect to reset the feed state on component unmount (e.g., user logs out)
  useEffect(() => {
    return () => {
      dispatch(resetFeed());
    };
  }, [dispatch]);

  /**
   * Renders the main content of the feed based on the current loading status and data.
   */
  const renderContent = () => {
    // Initial loading state: show skeletons for better UX
    if (status === 'loading' && page === 1) {
      return (
        <>
          <PostSkeleton />
          <PostSkeleton />
          <PostSkeleton />
        </>
      );
    }

    // Error state on initial load
    if (status === 'failed' && posts.length === 0) {
      return (
        <div className="text-center text-red-600 bg-red-50 p-6 rounded-lg border border-red-200">
          <h3 className="font-semibold">Failed to load feed</h3>
          <p className="text-sm">{error || 'Please check your connection and try again.'}</p>
        </div>
      );
    }

    // Empty state: no posts to show
    if (posts.length === 0 && status === 'succeeded') {
      return (
        <div className="text-center text-gray-500 bg-gray-50 p-10 rounded-lg border">
          <h3 className="text-xl font-semibold">Welcome!</h3>
          <p>The feed is empty. Why not be the first to share something?</p>
        </div>
      );
    }

    // Render the list of posts
    return posts.map((post, index) => {
      // Attach the infinite scroll trigger to the last post
      if (posts.length === index + 1) {
        return <Post ref={lastPostElementRef} key={post._id} post={post} />;
      }
      return <Post key={post._id} post={post} />;
    });
  };

  return (
    <div className="w-full max-w-2xl mx-auto py-6 sm:py-8 px-4 sm:px-0">
      {/* Post creation form, only shown to logged-in users */}
      {user && <CreatePost />}

      {/* Feed content container */}
      <div className="space-y-6 mt-8">
        {renderContent()}
      </div>

      {/* Loading indicator for subsequent pages (infinite scroll) */}
      {status === 'loading' && page > 1 && (
        <div className="flex justify-center py-6">
          <Loader />
        </div>
      )}

      {/* End of feed message */}
      {!hasMore && posts.length > 0 && status !== 'loading' && (
        <div className="text-center text-gray-500 py-8">
          <p>You've seen it all!</p>
        </div>
      )}
    </div>
  );
};

export default Feed;
```