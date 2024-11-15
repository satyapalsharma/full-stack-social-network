/**
 * server.js
 *
 * This is the main entry point for the social network's backend server.
 * It sets up the Express application, connects to the database, configures middleware,
 * initializes Socket.IO for real-time communication, defines API routes, and starts the server.
 */

// =================================================================
// IMPORTS
// =================================================================

// Core Node.js modules
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

// Third-party packages
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { Server } from 'socket.io';

// Application-specific modules
// Note: These files are part of the project but not generated in this context.
// We assume they exist and export the necessary functionalities.
import connectDB from './config/db.js';
import errorHandler from './middleware/errorHandler.js';
import notFoundHandler from './middleware/notFoundHandler.js';
import authRoutes from './routes/auth.js';
import postRoutes from './routes/posts.js';
import userRoutes from './routes/users.js';
import initializeSocket from './sockets/socketHandler.js';

// =================================================================
// INITIALIZATION & CONFIGURATION
// =================================================================

// Load environment variables from .env file
dotenv.config();

// ES module equivalent of __dirname for path resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Connect to MongoDB database
connectDB();

// Initialize Express app and create HTTP server
const app = express();
const server = http.createServer(app);

// =================================================================
// MIDDLEWARE
// =================================================================

// Set security-related HTTP headers
app.use(helmet());

// Configure Cross-Origin Resource Sharing (CORS)
const corsOptions = {
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  credentials: true,
};
app.use(cors(corsOptions));

// HTTP request logger (only in development mode)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' })); // To parse JSON bodies
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // To parse URL-encoded bodies

// =================================================================
// SOCKET.IO SETUP
// =================================================================

// Initialize Socket.IO server with CORS configuration
const io = new Server(server, {
  cors: corsOptions,
  pingTimeout: 60000, // Close connection if no PONG received after 60s
});

// Pass the `io` instance to the central socket handler
initializeSocket(io);

// =================================================================
// API ROUTES
// =================================================================

const API_PREFIX = '/api/v1';

// Health check / welcome route
app.get(API_PREFIX, (req, res) => {
  res.json({ message: 'Welcome to the Social Network API v1' });
});

// Mount application routes
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/posts`, postRoutes);
app.use(`${API_PREFIX}/users`, userRoutes);

// =================================================================
// PRODUCTION BUILD SERVING
// =================================================================

// In production, serve the static files from the React client's build directory
if (process.env.NODE_ENV === 'production') {
  const clientBuildPath = path.join(__dirname, '../../client/build');

  // Serve static assets
  app.use(express.static(clientBuildPath));

  // For any request that doesn't match an API route, serve the React app's index.html.
  // This allows client-side routing to take over.
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(clientBuildPath, 'index.html'));
  });
}

// =================================================================
// ERROR HANDLING MIDDLEWARE
// =================================================================

// Handle 404 Not Found errors for routes that don't exist
app.use(notFoundHandler);

// Global error handler to catch all other errors
app.use(errorHandler);

// =================================================================
// SERVER STARTUP
// =================================================================

const PORT = process.env.PORT || 5000;

const startServer = () => {
  server.listen(PORT, () => {
    console.log(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  });
};

startServer();

// =================================================================
// GRACEFUL SHUTDOWN
// =================================================================

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error(`Unhandled Rejection: ${err.message}`);
  console.error(err.stack);
  // Close server & exit process
  server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error(`Uncaught Exception: ${err.message}`);
  console.error(err.stack);
  // Close server & exit process
  server.close(() => process.exit(1));
});