```jsx
import React, { useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { io } from 'socket.io-client';
import { Toaster, toast } from 'react-hot-toast';

// --- Redux Actions ---
import { setSocket } from './redux/slices/socketSlice';
import { setOnlineUsers } from './redux/slices/userSlice';
import { addNotification } from './redux/slices/notificationSlice';

// --- Page Components ---
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';
import ChatPage from './pages/ChatPage';
import NotFoundPage from './pages/NotFoundPage';

// --- Layout Components ---
import Navbar from './components/layout/Navbar';

/**
 * The root component of the application.
 * It handles routing, global layout, and initializes the Socket.IO connection.
 *
 * @returns {JSX.Element} The rendered App component.
 */
function App() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { socket } = useSelector((state) => state.socket);

  /**
   * Effect to manage the Socket.IO connection.
   * - Connects when a user is logged in.
   * - Disconnects when the user logs out or the component unmounts.
   * - Listens for global events like online user updates and new notifications.
   */
  useEffect(() => {
    // Establish socket connection only if a user is authenticated
    if (user) {
      const newSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:5001', {
        // Send user ID to the server for mapping
        query: {
          userId: user._id,
        },
      });

      dispatch(setSocket(newSocket));

      // Listen for the 'getOnlineUsers' event from the server
      newSocket.on('getOnlineUsers', (users) => {
        dispatch(setOnlineUsers(users));
      });

      // Listen for new notifications (e.g., new like, comment, message)
      newSocket.on('newNotification', (notification) => {
        dispatch(addNotification(notification));
        // Display a toast notification to the user
        toast.success(notification.text, {
          icon: '🔔',
        });
      });

      // Cleanup function to close the socket connection
      return () => {
        newSocket.close();
        dispatch(setSocket(null));
      };
    } else {
      // If the user logs out, ensure any existing socket connection is closed
      if (socket) {
        socket.close();
        dispatch(setSocket(null));
      }
    }
    // Dependency array ensures this effect runs only when the user's auth state changes
  }, [user, dispatch]);

  return (
    <Router>
      {/* Global container with background and text colors for light/dark mode */}
      <div className="min-h-screen bg-gray-50 font-sans text-gray-900 dark:bg-gray-900 dark:text-gray-100">
        {/* Toaster component for displaying notifications globally */}
        <Toaster
          position="top-right"
          toastOptions={{
            className: 'dark:bg-gray-700 dark:text-white',
          }}
        />

        {/* Conditionally render the Navbar if a user is logged in */}
        {user && <Navbar />}

        <main className="container mx-auto max-w-7xl px-2 pt-20 sm:px-6 lg:px-8">
          <Routes>
            {/* --- Protected Routes (require authentication) --- */}
            <Route
              path="/"
              element={user ? <HomePage /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/profile/:userId"
              element={user ? <ProfilePage /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/chat"
              element={user ? <ChatPage /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/chat/:conversationId"
              element={user ? <ChatPage /> : <Navigate to="/login" replace />}
            />

            {/* --- Public Routes (for unauthenticated users) --- */}
            <Route
              path="/login"
              element={!user ? <LoginPage /> : <Navigate to="/" replace />}
            />
            <Route
              path="/register"
              element={!user ? <RegisterPage /> : <Navigate to="/" replace />}
            />

            {/* --- Catch-all Route for 404 Not Found --- */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
```