```javascript
import { createSlice, createAsyncThunk, current } from '@reduxjs/toolkit';
import api from '../utils/api'; // Assuming a centralized API client

/**
 * @typedef {object} PostState
 * @property {Array<object>} posts - The list of posts.
 * @property {string} status - The current status of API requests ('idle', 'loading', 'succeeded', 'failed').
 * @property {string|null} error - The error message, if any.
 * @property {object} pagination - Pagination details.
 * @property {number} pagination.currentPage - The current page number.
 * @property {number} pagination.totalPages - The total number of pages.
 * @property {boolean} pagination.hasNextPage - Whether there is a next page.
 */

/**
 * @type {PostState}
 */
const initialState = {
  posts: [],
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
  pagination: {
    currentPage: 0,
    totalPages: 1,
    hasNextPage: true,
  },
};

// --- Async Thunks ---

/**
 * Fetches a page of posts from the server.
 * @param {number} page - The page number to fetch.
 */
export const fetchPosts = createAsyncThunk(
  'posts/fetchPosts',
  async (page = 1, { rejectWithValue }) => {
    try {
      const response = await api.get(`/posts?page=${page}&limit=10`);
      return { ...response.data, page };
    } catch (err) {
      return rejectWithValue(err.response.data);
    }
  }
);

/**
 * Submits a new post to the server.
 * @param {FormData} newPost - The new post data, likely FormData for image uploads.
 */
export const addNewPost = createAsyncThunk(
  'posts/addNewPost',
  async (newPost, { rejectWithValue }) => {
    try {
      const response = await api.post('/posts', newPost, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response.data);
    }
  }
);

/**
 * Toggles the like status of a post.
 * @param {string} postId - The ID of the post to like/unlike.
 */
export const likePost = createAsyncThunk(
  'posts/likePost',
  async (postId, { rejectWithValue }) => {
    try {
      const response = await api.post(`/posts/${postId}/like`);
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response.data);
    }
  }
);

/**
 * Deletes a post.
 * @param {string} postId - The ID of the post to delete.
 */
export const deletePost = createAsyncThunk(
  'posts/deletePost',
  async (postId, { rejectWithValue }) => {
    try {
      await api.delete(`/posts/${postId}`);
      return postId;
    } catch (err) {
      return rejectWithValue(err.response.data);
    }
  }
);

/**
 * Adds a comment to a post.
 * @param {object} payload - The comment payload.
 * @param {string} payload.postId - The ID of the post to comment on.
 * @param {string} payload.text - The content of the comment.
 */
export const addComment = createAsyncThunk(
  'posts/addComment',
  async ({ postId, text }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/posts/${postId}/comments`, { text });
      return { postId, comment: response.data };
    } catch (err) {
      return rejectWithValue(err.response.data);
    }
  }
);

/**
 * Deletes a comment from a post.
 * @param {object} payload - The delete comment payload.
 * @param {string} payload.postId - The ID of the post.
 * @param {string} payload.commentId - The ID of the comment to delete.
 */
export const deleteComment = createAsyncThunk(
  'posts/deleteComment',
  async ({ postId, commentId }, { rejectWithValue }) => {
    try {
      await api.delete(`/posts/${postId}/comments/${commentId}`);
      return { postId, commentId };
    } catch (err) {
      return rejectWithValue(err.response.data);
    }
  }
);


const postsSlice = createSlice({
  name: 'posts',
  initialState,
  // Reducers for synchronous actions, often used for real-time updates via WebSockets
  reducers: {
    // Action to add a post received from a real-time event
    postAdded: (state, action) => {
      const newPost = action.payload;
      // Avoid duplicates if the post was added via an API call and a socket event
      if (!state.posts.find(post => post._id === newPost._id)) {
        state.posts.unshift(newPost);
      }
    },
    // Action to update a post (e.g., like count) from a real-time event
    postUpdated: (state, action) => {
      const updatedPost = action.payload;
      const existingPostIndex = state.posts.findIndex(post => post._id === updatedPost._id);
      if (existingPostIndex !== -1) {
        state.posts[existingPostIndex] = {
          ...state.posts[existingPostIndex],
          ...updatedPost
        };
      }
    },
    // Action to remove a post from a real-time event
    postDeleted: (state, action) => {
      const postId = action.payload;
      state.posts = state.posts.filter(post => post._id !== postId);
    },
    // Action to add a comment from a real-time event
    commentAddedToPost: (state, action) => {
        const { postId, comment } = action.payload;
        const post = state.posts.find(p => p._id === postId);
        if (post) {
            // Avoid duplicates
            if (!post.comments.find(c => c._id === comment._id)) {
                post.comments.push(comment);
                post.commentCount = (post.commentCount || 0) + 1;
            }
        }
    },
    // Action to remove a comment from a real-time event
    commentDeletedFromPost: (state, action) => {
        const { postId, commentId } = action.payload;
        const post = state.posts.find(p => p._id === postId);
        if (post) {
            const initialCommentCount = post.comments.length;
            post.comments = post.comments.filter(c => c._id !== commentId);
            if (post.comments.length < initialCommentCount) {
                post.commentCount = Math.max(0, (post.commentCount || 1) - 1);
            }
        }
    },
    resetPosts: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // --- fetchPosts ---
      .addCase(fetchPosts.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchPosts.fulfilled, (state, action) => {
        const { posts, currentPage, totalPages, hasNextPage, page } = action.payload;
        if (page === 1) {
          // Replace posts on first page load
          state.posts = posts;
        } else {
          // Append for infinite scroll
          const newPosts = posts.filter(p => !state.posts.some(sp => sp._id === p._id));
          state.posts.push(...newPosts);
        }
        state.pagination = { currentPage, totalPages, hasNextPage };
        state.status = 'succeeded';
      })
      .addCase(fetchPosts.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload?.message || 'Failed to fetch posts';
      })

      // --- addNewPost ---
      .addCase(addNewPost.fulfilled, (state, action) => {
        // Add the new post to the beginning of the array
        state.posts.unshift(action.payload);
      })

      // --- likePost ---
      .addCase(likePost.fulfilled, (state, action) => {
        const updatedPost = action.payload;
        const postIndex = state.posts.findIndex(p => p._id === updatedPost._id);
        if (postIndex !== -1) {
          state.posts[postIndex] = updatedPost;
        }
      })

      // --- deletePost ---
      .addCase(deletePost.fulfilled, (state, action) => {
        const postId = action.payload;
        state.posts = state.posts.filter(p => p._id !== postId);
      })

      // --- addComment ---
      .addCase(addComment.fulfilled, (state, action) => {
        const { postId, comment } = action.payload;
        const post = state.posts.find(p => p._id === postId);
        if (post) {
          post.comments.push(comment);
          post.commentCount = (post.commentCount || 0) + 1;
        }
      })

      // --- deleteComment ---
      .addCase(deleteComment.fulfilled, (state, action) => {
        const { postId, commentId } = action.payload;
        const post = state.posts.find(p => p._id === postId);
        if (post) {
          const initialCommentCount = post.comments.length;
          post.comments = post.comments.filter(c => c._id !== commentId);
          if (post.comments.length < initialCommentCount) {
             post.commentCount = Math.max(0, (post.commentCount || 1) - 1);
          }
        }
      });
  },
});

// --- Selectors ---
export const selectAllPosts = (state) => state.posts.posts;
export const selectPostById = (state, postId) => state.posts.posts.find((post) => post._id === postId);
export const selectPostsStatus = (state) => state.posts.status;
export const selectPostsError = (state) => state.posts.error;
export const selectPostsPagination = (state) => state.posts.pagination;

// --- Exports ---
export const {
  postAdded,
  postUpdated,
  postDeleted,
  commentAddedToPost,
  commentDeletedFromPost,
  resetPosts,
} = postsSlice.actions;

export default postsSlice.reducer;
```