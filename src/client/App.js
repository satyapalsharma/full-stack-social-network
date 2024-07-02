```javascript
import React, { useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';

// --- Redux ---
// Assuming an authSlice exists to handle user authentication state
import { fetchCurrentUser, selectCurrentUser, selectAuthStatus } from './redux/slices/authSlice';

// --- Components & Pages ---
import Navbar from './components/layout/Navbar';
import LoginPage from './components/pages/LoginPage';
import RegisterPage from './components/pages/RegisterPage';
import FeedPage from './components/pages/FeedPage';
import ProfilePage from './components/pages/ProfilePage';
import ChatPage from './components/pages/ChatPage';
import NotificationsPage from './components/pages/NotificationsPage';
import NotFoundPage from './components/pages/NotFoundPage';
import Spinner from './components/common/Spinner';

// --- Hooks ---
import useSocket from './hooks/useSocket';

/**
 * A higher-order component that protects routes requiring authentication.
 * It checks the authentication status from the Redux store.
 * While checking, it displays a loading spinner. If the user is not
 * authenticated, it redirects them to the login page.
 *
 * @param {{ children: JSX.Element }} props The component props.
 * @param {JSX.Element} props.children The child components to render if authenticated.
 * @returns {JSX.Element} The rendered child component, a redirect, or a loader.
 */
const ProtectedRoute = ({ children }) => {
  const currentUser = useSelector(selectCurrentUser);
  const authStatus = useSelector(selectAuthStatus);

  // Show a full-page loader while checking for an active session
  if (authStatus === 'loading' || authStatus === 'idle') {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <Spinner size="lg" />
      </div>
    );
  }

  // If authentication has been checked and there's no user, redirect to login
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // If authenticated, render the requested component
  return children;
};

/**
 * A component that conditionally renders the main Navbar.
 * The Navbar is hidden on public routes like login and register.
 * It uses the `useLocation` hook to determine the current path.
 *
 * @returns {JSX.Element | null} The Navbar component or null.
 */
const ConditionalNavbar = () => {
    const location = useLocation();
    const currentUser = useSelector(selectCurrentUser);
    const noNavRoutes = ['/login', '/register'];

    // Hide navbar if there's no logged-in user or if the route is in the noNavRoutes list
    if (!currentUser || noNavRoutes.includes(location.pathname)) {
        return null;
    }

    return <Navbar />;
};

/**
 * The root component of the application.
 * It sets up the main router, handles the initial authentication check,
 * and initializes the WebSocket connection for real-time features.
 *
 * @returns {JSX.Element} The main application structure.
 */
function App() {
  const dispatch = useDispatch();
  const authStatus = useSelector(selectAuthStatus);
  const currentUser = useSelector(selectCurrentUser);

  // On initial application load, attempt to fetch the current user
  // to re-establish a session if a valid token exists.
  useEffect(() => {
    if (authStatus === 'idle') {
      dispatch(fetchCurrentUser());
    }
  }, [authStatus, dispatch]);

  // Initialize the WebSocket connection via the custom useSocket hook.
  // The hook will only establish a connection if a valid user ID is provided.
  useSocket(currentUser?._id);

  return (
    <Router>
      <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
        <ConditionalNavbar />
        {/* Main content area with padding to account for the fixed navbar */}
        <main className="container mx-auto max-w-7xl px-2 sm:px-6 lg:px-8 py-8 pt-24">
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Protected Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <FeedPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile/:userId"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/chat"
              element={
                <ProtectedRoute>
                  <ChatPage />
                </ProtectedRoute>
              }
            />
             <Route
              path="/chat/:conversationId"
              element={
                <ProtectedRoute>
                  <ChatPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/notifications"
              element={
                <ProtectedRoute>
                  <NotificationsPage />
                </ProtectedRoute>
              }
            />

            {/* Fallback 404 Route */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
```