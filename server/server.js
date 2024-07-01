```javascript
/**
 * server.js
 *
 * Main entry point for the social network's backend server.
 * This file initializes the Express application, sets up middleware,
 * connects to the database, configures API routes, and starts the HTTP
 * and WebSocket servers.
 */

// =================================================================
// Imports
// =================================================================

// Core Node.js modules
const http = require('http');
const path = require('path');

// Third-party modules
require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { Server } = require('socket.io');

// Application-specific modules
const initializeSocket = require('./socket');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const postRoutes = require('./routes/posts');
const chatRoutes = require('./routes/chat');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

// =================================================================
// Initializations
// =================================================================

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Initialize Socket.IO
const io = new Server(server, {
  pingTimeout: 60000, // 60 seconds before a connection is considered lost
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

// Pass the io instance to our socket handler
initializeSocket(io);

// =================================================================
// Database Connection
// =================================================================

mongoose.set('strictQuery', true); // Prepare for Mongoose 7's default
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const dbConnection = mongoose.connection;

// Listen for DB connection errors
dbConnection.on('error', (err) => {
  console.error(`❌ MongoDB connection error: ${err.message}`);
  process.exit(1); // Exit the application on a fatal database connection error
});

// Listen for a successful DB connection
dbConnection.once('open', () => {
  console.log('✅ MongoDB connection established successfully.');
  // Start the server only after the DB is connected
  startServer();
});

// =================================================================
// Middleware Configuration
// =================================================================

// Set security-related HTTP headers
app.use(helmet());

// Enable Cross-Origin Resource Sharing
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000' }));

// Log HTTP requests in development mode for easier debugging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Parse incoming JSON payloads
app.use(express.json({ limit: '10mb' }));

// Parse incoming URL-encoded payloads
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files (e.g., user-uploaded images) from the 'uploads' directory
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// =================================================================
// API Routes
// =================================================================

// Health check endpoint for monitoring services
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'UP', timestamp: new Date().toISOString() });
});

// Mount API routes under the /api/v1 prefix
const API_PREFIX = '/api/v1';
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/users`, userRoutes);
app.use(`${API_PREFIX}/posts`, postRoutes);
app.use(`${API_PREFIX}/chat`, chatRoutes);

// =================================================================
// Production Build Serving (Client)
// =================================================================

if (process.env.NODE_ENV === 'production') {
  // Serve the static files from the React app's build directory
  app.use(express.static(path.join(__dirname, '..', 'client', 'build')));

  // For any request that doesn't match an API route, serve the React app's index.html
  // This allows for client-side routing.
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '..', 'client', 'build', 'index.html'));
  });
} else {
  // A simple welcome message for the API root in development
  app.get('/', (req, res) => {
    res.send('API is running in development mode...');
  });
}

// =================================================================
// Error Handling Middleware
// =================================================================

// Handle 404 errors for routes that are not found
app.use(notFound);

// Global error handler to catch all other errors
app.use(errorHandler);

// =================================================================
// Server Startup
// =================================================================

const startServer = () => {
  server.listen(PORT, () => {
    console.log(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  });
};

// =================================================================
// Graceful Shutdown & Process Event Handling
// =================================================================

const shutdown = (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  server.close(() => {
    console.log('✅ HTTP server closed.');
    mongoose.connection.close(false, () => {
      console.log('✅ MongoDB connection closed.');
      process.exit(0);
    });
  });
};

// Listen for termination signals
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught exceptions to prevent the app from crashing abruptly
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception. Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection. Shutting down...');
  console.error(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});
```