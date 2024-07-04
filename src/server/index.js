```javascript
/**
 * @file src/server/index.js
 * @description Main entry point for the Node.js server.
 * This file initializes the Express application, connects to the MongoDB database,
 * sets up middleware, defines API routes, and configures the Socket.io server
 * for real-time communication.
 */

// Core Node.js modules
const http = require('http');
const path = require('path');

// Third-party modules
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const { Server } = require('socket.io');
const morgan = require('morgan');

// Application-specific modules
const socketHandler = require('./socketHandler');
const apiRoutes = require('./routes/api'); // Assumes an index.js in ./routes/api that aggregates all routes

// --- Initial Configuration ---

// Load environment variables from .env file
dotenv.config();

// --- Constants ---

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;
const NODE_ENV = process.env.NODE_ENV || 'development';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

// --- Database Connection ---

/**
 * Connects to the MongoDB database using Mongoose.
 * Exits the process with an error if the connection fails.
 */
const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB Connected Successfully');
  } catch (err) {
    console.error(`MongoDB Connection Error: ${err.message}`);
    // Exit process with failure code
    process.exit(1);
  }
};

connectDB();

// --- Express App Initialization ---

const app = express();

// --- Middleware Setup ---

// Enable CORS with specific origin for security
app.use(cors({
  origin: CLIENT_URL,
  credentials: true,
}));

// HTTP request logger middleware (only in development)
if (NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Body parser middleware to handle JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// --- API Routes ---

// Mount the aggregated API routes under the /api path
app.use('/api', apiRoutes);

// --- Serve Static Assets in Production ---

if (NODE_ENV === 'production') {
  // Define the path to the React build directory
  const buildPath = path.join(__dirname, '..', '..', 'client', 'build');

  // Serve static files from the React app
  app.use(express.static(buildPath));

  // The "catchall" handler: for any request that doesn't match one above,
  // send back React's index.html file.
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(buildPath, 'index.html'));
  });
}

// --- HTTP Server and Socket.io Setup ---

// Create an HTTP server from the Express app
const server = http.createServer(app);

// Initialize Socket.io server and attach it to the HTTP server
const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ['GET', 'POST'],
  },
  // Use a modern transport protocol with fallback
  transports: ['websocket', 'polling'],
});

// Pass the io instance to the socket handler to manage real-time events
socketHandler(io);

// --- Global Error Handler ---

// A simple catch-all error handler middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'An unexpected error occurred on the server.' });
});

// --- Server Activation ---

const startServer = () => {
  server.listen(PORT, () => {
    console.log(`Server running in ${NODE_ENV} mode on port ${PORT}`);
  });
};

startServer();

// --- Graceful Shutdown ---

/**
 * Handles graceful shutdown of the server on SIGINT or SIGTERM signals.
 * @param {string} signal - The signal received.
 */
const gracefulShutdown = (signal) => {
  console.log(`\nReceived ${signal}. Closing server gracefully.`);
  server.close(() => {
    console.log('HTTP server closed.');
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed.');
      process.exit(0);
    });
  });
};

// Listen for termination signals
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
```