/**
 * @file src/client/hooks/useSocket.js
 * @description Custom React hook for managing the Socket.io client connection.
 * This hook provides a Socket.io instance through a React Context, ensuring a single,
 * persistent connection for the authenticated user throughout the application.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { io } from 'socket.io-client';

/**
 * @type {React.Context<import('socket.io-client').Socket|null>}
 * @description React Context to hold the socket instance.
 */
const SocketContext = createContext(null);

/**
 * Custom hook to access the socket instance from the SocketContext.
 * This provides a clean and simple way for components to interact with the socket.
 * @returns {import('socket.io-client').Socket|null} The socket instance, or null if not connected.
 * @example
 * const socket = useSocket();
 * useEffect(() => {
 *   if (socket) {
 *     socket.on('newMessage', (data) => console.log(data));
 *   }
 * }, [socket]);
 */
export const useSocket = () => {
  return useContext(SocketContext);
};

/**
 * A React component that provides the Socket.io connection to its children.
 * It handles the entire lifecycle of the socket connection:
 * - Connects when a user is authenticated.
 * - Disconnects when the user logs out.
 * - Cleans up the connection on component unmount.
 *
 * This provider should be placed high in the component tree, wrapping any components
 * that need access to the socket connection.
 *
 * @param {object} props - The component props.
 * @param {React.ReactNode} props.children - The child components to render.
 * @returns {JSX.Element} The SocketContext.Provider wrapping the children.
 */
export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);

  // Access user authentication info from the Redux store.
  // The effect below depends on this to establish or tear down the connection.
  const { userInfo } = useSelector((state) => state.auth);

  useEffect(() => {
    // Only attempt to connect if the user is authenticated (i.e., we have a token).
    if (userInfo && userInfo.token) {
      // The server URL should be stored in an environment variable for flexibility
      // between development and production environments.
      const socketUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';

      // Establish the connection, passing the user's auth token.
      // The server will use this token to authenticate and authorize the socket connection.
      const newSocket = io(socketUrl, {
        auth: {
          token: `Bearer ${userInfo.token}`,
        },
        // Production-ready options for better reliability.
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      // Set the socket instance in state to be provided to the context.
      setSocket(newSocket);

      // --- Event Listeners for Debugging and Connection Management ---
      newSocket.on('connect', () => {
        console.log(`[Socket.IO] Connected with ID: ${newSocket.id}`);
      });

      newSocket.on('disconnect', (reason) => {
        console.log(`[Socket.IO] Disconnected: ${reason}`);
      });

      newSocket.on('connect_error', (error) => {
        console.error(`[Socket.IO] Connection Error: ${error.message}`);
      });

      // --- Cleanup Logic ---
      // This function is returned from the effect and will be called when:
      // 1. The component unmounts.
      // 2. The `userInfo` dependency changes (e.g., user logs out), triggering the effect to re-run.
      // This is crucial for preventing memory leaks and orphaned connections.
      return () => {
        newSocket.disconnect();
        console.log('[Socket.IO] Disconnected on cleanup.');
      };
    } else {
      // If there is no authenticated user, but a socket instance still exists
      // (e.g., from a previous session or logout), ensure it is disconnected.
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userInfo]); // The effect re-runs whenever the user's authentication status changes.

  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
};