/**
 * ============================================================================
 * Main Entry Point for the React Application
 * ============================================================================
 *
 * This file is the primary entry point for the client-side application.
 * It is responsible for:
 * 1. Importing necessary libraries and components (React, Redux, etc.).
 * 2. Importing global styles, including TailwindCSS.
 * 3. Identifying the root DOM element in `public/index.html`.
 * 4. Rendering the main `<App />` component into the DOM.
 * 5. Wrapping the entire application with the Redux `<Provider>` to make the
 *    global state store available to all components.
 * 6. Utilizing `<React.StrictMode>` to highlight potential problems in the app
 *    during development.
 *
 * @project   Full-stack Social Network
 * @file      client/src/index.js
 * @version   1.0.0
 * @since     2023-10-27
 * ============================================================================
 */

// --- Core Libraries ---
import React from 'react';
import ReactDOM from 'react-dom/client';

// --- Redux Integration ---
import { Provider } from 'react-redux';
import store from './redux/store';

// --- Main Application Component ---
import App from './App';

// --- Global Styles ---
// This file imports TailwindCSS base, components, and utilities.
import './index.css';

// --- Performance Monitoring ---
// Optional: Used for measuring and reporting on web vitals.
import reportWebVitals from './reportWebVitals';

// --- Application Initialization ---

// 1. Find the root DOM node.
// This is the element where our React application will be mounted.
// It is defined in `public/index.html`.
const rootElement = document.getElementById('root');

// 2. Defensive check to ensure the root element exists.
// This prevents runtime errors if the `index.html` file is misconfigured.
if (!rootElement) {
  throw new Error(
    "Fatal Error: The root element with id 'root' was not found in the DOM. " +
    "Please ensure it exists in your `public/index.html` file."
  );
}

// 3. Create a React root using the modern `createRoot` API (React 18+).
// This enables concurrent features and improved performance.
const root = ReactDOM.createRoot(rootElement);

// 4. Render the application into the root element.
// - <React.StrictMode>: A tool for highlighting potential problems in an application.
//   It activates additional checks and warnings for its descendants. Only runs in development.
// - <Provider store={store}>: Connects the Redux store to our React component tree,
//   making the global state accessible throughout the app via hooks like `useSelector` and `useDispatch`.
root.render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>
);

// 5. Web Vitals Reporting.
// If you want to start measuring performance in your app, pass a function
// to log results (e.g., reportWebVitals(console.log)) or send to an analytics endpoint.
// Learn more: https://bit.ly/CRA-vitals
reportWebVitals();