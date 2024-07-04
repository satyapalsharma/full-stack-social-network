/**
 * @file client/src/redux/store.js
 * @description Redux store configuration for the application.
 * This file sets up the Redux store using Redux Toolkit's `configureStore`.
 * It combines all the feature-specific reducers (slices) into a single root reducer.
 * Redux Thunk middleware and Redux DevTools Extension are enabled by default.
 */

import { configureStore } from '@reduxjs/toolkit';
import authReducer from './features/auth/authSlice';
import postReducer from './features/posts/postSlice';
import profileReducer from './features/profile/profileSlice';
import chatReducer from './features/chat/chatSlice';
import notificationReducer from './features/notifications/notificationSlice';

/**
 * The main Redux store for the application.
 *
 * `configureStore` from Redux Toolkit simplifies the store setup process.
 * - It automatically combines slice reducers.
 * - It adds the Redux Thunk middleware by default for handling async logic.
 * - It automatically enables the Redux DevTools Extension for easier debugging in development.
 */
export const store = configureStore({
  // The `reducer` field is an object where each key corresponds to a slice of the state,
  // and the value is the reducer function that manages that slice.
  reducer: {
    /**
     * Manages authentication state, including the current user, token,
     * and authentication status (e.g., loading, success, error).
     * @see {@link ./features/auth/authSlice.js}
     */
    auth: authReducer,

    /**
     * Manages all post-related state, such as the main feed, individual post details,
     * likes, and comments.
     * @see {@link ./features/posts/postSlice.js}
     */
    posts: postReducer,

    /**
     * Manages the state for user profiles being viewed, including user details,
     * their posts, and follower/following information.
     * @see {@link ./features/profile/profileSlice.js}
     */
    profile: profileReducer,

    /**
     * Manages real-time chat state, including conversations, messages,
     * and online status of users.
     * @see {@link ./features/chat/chatSlice.js}
     */
    chat: chatReducer,

    /**
     * Manages user notifications for events like new likes, comments,
     * and friend requests.
     * @see {@link ./features/notifications/notificationSlice.js}
     */
    notifications: notificationReducer,
  },

  // `middleware` can be customized here if needed.
  // `getDefaultMiddleware` returns an array with the default middleware,
  // including redux-thunk. You can concatenate custom middleware to this array.
  // Example:
  // middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(customMiddleware),
});

/**
 * Type definition for the root state of the Redux store.
 * This is inferred from the store itself, ensuring type safety.
 * It's useful for typing hooks like `useSelector`.
 * @typedef {ReturnType<typeof store.getState>} RootState
 */

/**
 * Type definition for the dispatch function of the Redux store.
 * This is useful for typing hooks like `useDispatch`.
 * @typedef {typeof store.dispatch} AppDispatch
 */