```javascript
import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
// Assuming an API service file exists for making HTTP requests.
// This service abstracts away the actual fetch/axios calls.
import * as postService from '../../services/postService';

/**
 * @typedef {object} PostState
 * @property {Array<object>} posts - The array of post objects.
 * @property {'idle' | 'loading' | 'succeeded' | 'failed'} status - The current loading status of the posts.
 * @property {string|null} error - The error message, if any.
 * @property {object} pagination - Pagination metadata.
 * @property {number} pagination.currentPage - The current page number.
 * @property {number} pagination.totalPages - The total number of pages available.
 * @property {boolean} pagination.hasNextPage - Flag indicating if there is a next page.
 */

/**
 * @type {PostState}
 */
const initialState = {
  posts: [],
  status: 'idle',
  error: null,
  pagination: {
    currentPage: 1,
    totalPages: 1,
    hasNextPage: false,
  },
};

// --- Async Thunks for API interactions ---

/**
 * @description Fetches a paginated list of posts from the server.
 * @param {object} { page, limit } - Pagination options.
 */
export const fetchPosts = createAsyncThunk(
  'posts/fetchPosts',
  async ({ page = 1, limit = 10 }, { rejectWithValue }) => {
    try {
      const response = await postService.fetchPosts({ page, limit });
      // Assuming API returns { data: { posts, currentPage, totalPages, hasNextPage } }
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch posts');
    }
  }
);

/**
 * @description Creates a new post.
 * @param {FormData} postData - The new post data, likely FormData for image uploads.
 */
export const createPost = createAsyncThunk(
  'posts/createPost',
  async (postData, { rejectWithValue }) => {
    try {
      const response = await postService.createPost(postData);
      // Assuming API returns the newly created post object
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create post');
    }
  }
);

/**
 * @description Deletes a post by its ID.
 * @param {string} postId - The ID of the post to delete.
 */
export const deletePost = createAsyncThunk(
  'posts/deletePost',
  async (postId, { rejectWithValue }) => {
    try {
      await postService.deletePost(postId);
      // Return the ID for removal from state
      return postId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete post');
    }
  }
);

/**
 * @description Toggles a like on a post.
 * @param {string} postId - The ID of the post to like/unlike.
 */
export const likePost = createAsyncThunk(
  'posts/likePost',
  async (postId, { rejectWithValue }) => {
    try {
      const response = await postService.likePost(postId);
      // Assuming API returns the updated post object with new likes
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to like post');
    }
  }
);

/**
 * @description Adds a comment to a post.
 * @param {object} { postId, text } - The post ID and the comment text.
 */
export const addComment = createAsyncThunk(
  'posts/addComment',
  async ({ postId, text }, { rejectWithValue }) => {
    try {
      const response = await postService.addComment({ postId, text });
      // Assuming API returns the updated post with the new comment
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to add comment');
    }
  }
);

/**
 * @description Deletes a comment from a post.
 * @param {object} { postId, commentId } - The post ID and the comment ID.
 */
export const deleteComment = createAsyncThunk(
  'posts/deleteComment',
  async ({ postId, commentId }, { rejectWithValue }) => {
    try {
      await postService.deleteComment({ postId, commentId });
      // Return IDs for removal from state
      return { postId, commentId };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete comment');
    }
  }
);

// --- Post Slice Definition ---

const postSlice = createSlice({
  name: 'posts',
  initialState,
  reducers: {
    // Reducer to reset state, e.g., on logout
    resetPostsState: () => initialState,

    // --- Reducers for real-time updates via WebSockets ---
    // These allow the UI to react to events pushed from the server.

    /**
     * @description Handles a new post received via WebSocket.
     * @param {PostState} state - The current Redux state.
     * @param {object} action - The action containing the new post payload.
     */
    receiveNewPost: (state, action) => {
      // Avoid duplicates if the user who created the post also gets the socket event
      if (!state.posts.find(p => p._id === action.payload._id)) {
        state.posts.unshift(action.payload);
      }
    },
    /**
     * @description Handles a post update (e.g., likes, comments) received via WebSocket.
     * @param {PostState} state - The current Redux state.
     * @param {object} action - The action containing the updated post payload.
     */
    receiveUpdatedPost: (state, action) => {
      const index = state.posts.findIndex(p => p._id === action.payload._id);
      if (index !== -1) {
        // Merge updates to preserve other parts of the state
        state.posts[index] = { ...state.posts[index], ...action.payload };
      }
    },
    /**
     * @description Handles a deleted post received via WebSocket.
     * @param {PostState} state - The current Redux state.
     * @param {object} action - The action containing the deleted post ID.
     */
    receiveDeletedPost: (state, action) => {
      state.posts = state.posts.filter(p => p._id !== action.payload.postId);
    },
  },
  extraReducers: (builder) => {
    builder
      // --- Fetch Posts ---
      .addCase(fetchPosts.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchPosts.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const { posts, currentPage, totalPages, hasNextPage } = action.payload;
        // Append new posts for infinite scrolling, otherwise replace
        if (currentPage > 1) {
          // Filter out duplicates that might have been added via WebSocket
          const newPosts = posts.filter(p => !state.posts.some(sp => sp._id === p._id));
          state.posts.push(...newPosts);
        } else {
          state.posts = posts;
        }
        state.pagination = { currentPage, totalPages, hasNextPage };
        state.error = null;
      })
      .addCase(fetchPosts.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })

      // --- Create Post ---
      .addCase(createPost.fulfilled, (state, action) => {
        // Add the new post to the beginning of the array for immediate visibility
        state.posts.unshift(action.payload);
      })

      // --- Delete Post ---
      .addCase(deletePost.fulfilled, (state, action) => {
        state.posts = state.posts.filter((post) => post._id !== action.payload);
      })

      // --- Like Post & Add Comment ---
      // These actions update a specific post. We can use a shared logic.
      .addMatcher(
        (action) => [likePost.fulfilled.type, addComment.fulfilled.type].includes(action.type),
        (state, action) => {
          const updatedPost = action.payload;
          const index = state.posts.findIndex((post) => post._id === updatedPost._id);
          if (index !== -1) {
            state.posts[index] = updatedPost;
          }
        }
      )
      .addCase(deleteComment.fulfilled, (state, action) => {
        const { postId, commentId } = action.payload;
        const post = state.posts.find((p) => p._id === postId);
        if (post) {
          post.comments = post.comments.filter((c) => c._id !== commentId);
        }
      })
      // Generic rejection handler for single-post mutations
      .addMatcher(
        (action) => [
          createPost.rejected.type,
          deletePost.rejected.type,
          likePost.rejected.type,
          addComment.rejected.type,
          deleteComment.rejected.type,
        ].includes(action.type),
        (state, action) => {
          // This error can be displayed in a toast notification in the UI
          console.error("Post operation failed:", action.payload);
          state.error = action.payload;
        }
      );
  },
});

// --- Export Actions and Reducer ---

export const {
  resetPostsState,
  receiveNewPost,
  receiveUpdatedPost,
  receiveDeletedPost,
} = postSlice.actions;

export default postSlice.reducer;

// --- Selectors for accessing state in components ---
// Using createSelector for memoization to improve performance.

const selectPostsState = (state) => state.posts;

export const selectAllPosts = createSelector(
  [selectPostsState],
  (postsState) => postsState.posts
);

export const selectPostById = createSelector(
  [selectAllPosts, (state, postId) => postId],
  (posts, postId) => posts.find((post) => post._id === postId)
);

export const selectPostsStatus = createSelector(
  [selectPostsState],
  (postsState) => postsState.status
);

export const selectPostsError = createSelector(
  [selectPostsState],
  (postsState) => postsState.error
);

export const selectPostsPagination = createSelector(
  [selectPostsState],
  (postsState) => postsState.pagination
);
```