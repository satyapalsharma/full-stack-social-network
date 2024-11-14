```javascript
import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { useSelector, useDispatch } from 'react-redux';
import { IoSend, IoClose } from 'react-icons/io5';
import { format } from 'date-fns';

// Assuming a shared socket instance is exported from a utility file
import { socket } from '../socket';
// Assuming chat slice actions are available from a Redux feature slice
import { fetchMessages, addMessage } from '../features/chat/chatSlice';
// A placeholder for a loading spinner component
import Spinner from './Spinner';

/**
 * ChatWindow component for real-time private messaging.
 * This component handles message display, sending new messages,
 * and real-time updates including typing indicators via Socket.io.
 *
 * @param {object} props - The component props.
 * @param {object} props.recipient - The user object for the recipient.
 * @param {string} props.conversationId - The unique ID for the chat conversation.
 * @param {function} props.onClose - Function to call when the chat window is closed.
 */
const ChatWindow = ({ recipient, conversationId, onClose }) => {
  const dispatch = useDispatch();
  const [newMessage, setNewMessage] = useState('');
  const [isRecipientTyping, setIsRecipientTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Select current user from the authentication state
  const { user: currentUser } = useSelector((state) => state.auth);

  // Select messages and loading status for the current conversation from the chat state.
  // Provides a default object to prevent errors if the conversation is not yet in the store.
  const { messages, status } = useSelector(
    (state) => state.chat.conversations[conversationId] || { messages: [], status: 'idle' }
  );

  // Effect for fetching initial messages and setting up/tearing down socket listeners
  useEffect(() => {
    // Fetch messages only if they haven't been fetched yet
    if (conversationId && status === 'idle') {
      dispatch(fetchMessages(conversationId));
    }

    // Join a socket room specific to this conversation for efficient broadcasting
    socket.emit('join room', conversationId);

    const handlePrivateMessage = (message) => {
      // Only add the message if it belongs to the current open conversation
      if (message.conversationId === conversationId) {
        dispatch(addMessage(message));
      }
    };

    const handleTyping = ({ room }) => {
      if (room === conversationId) setIsRecipientTyping(true);
    };

    const handleStopTyping = ({ room }) => {
      if (room === conversationId) setIsRecipientTyping(false);
    };

    // Register event listeners
    socket.on('private message', handlePrivateMessage);
    socket.on('typing', handleTyping);
    socket.on('stop typing', handleStopTyping);

    // Cleanup function to run on component unmount
    return () => {
      socket.emit('leave room', conversationId);
      socket.off('private message', handlePrivateMessage);
      socket.off('typing', handleTyping);
      socket.off('stop typing', handleStopTyping);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [conversationId, dispatch, status]);

  // Effect to automatically scroll to the latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /**
   * Handles the form submission to send a new message.
   * @param {React.FormEvent} e - The form submission event.
   */
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (newMessage.trim() && currentUser && recipient) {
      const messageData = {
        conversationId,
        sender: currentUser._id,
        recipient: recipient._id,
        text: newMessage.trim(),
        createdAt: new Date().toISOString(), // Client-side timestamp for optimistic update
      };

      socket.emit('send private message', messageData);
      socket.emit('stop typing', { room: conversationId }); // Ensure typing indicator is cleared on send
      
      // Optimistically update the UI for a snappy user experience
      dispatch(addMessage(messageData));
      
      setNewMessage('');
    }
  };

  /**
   * Handles changes to the message input field and emits typing events.
   * @param {React.ChangeEvent<HTMLInputElement>} e - The input change event.
   */
  const handleInputChange = (e) => {
    setNewMessage(e.target.value);

    // Emit 'typing' event if user starts typing
    if (!typingTimeoutRef.current) {
      socket.emit('typing', { room: conversationId });
    } else {
      clearTimeout(typingTimeoutRef.current);
    }

    // Emit 'stop typing' event after a 2-second delay of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop typing', { room: conversationId });
      typingTimeoutRef.current = null;
    }, 2000);
  };

  const renderMessageContent = () => {
    if (status === 'loading') {
      return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    }

    if (status === 'succeeded' && messages.length === 0) {
      return (
        <div className="flex justify-center items-center h-full text-gray-500">
          Send a message to start the conversation.
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {messages.map((msg, index) => {
          const isCurrentUser = msg.sender === currentUser._id;
          return (
            <div
              key={msg._id || `${msg.sender}-${index}`} // Fallback key for optimistic updates
              className={`flex items-end gap-2 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isCurrentUser && (
                <img
                  src={recipient.profilePicture || '/default-avatar.png'}
                  alt={recipient.username}
                  className="w-8 h-8 rounded-full object-cover self-start"
                />
              )}
              <div
                className={`max-w-xs md:max-w-md p-3 rounded-lg shadow-sm ${
                  isCurrentUser
                    ? 'bg-blue-500 text-white rounded-br-none'
                    : 'bg-white text-gray-800 rounded-bl-none'
                }`}
              >
                <p className="text-sm break-words">{msg.text}</p>
                <span className={`text-xs mt-1 block text-right ${isCurrentUser ? 'text-blue-200' : 'text-gray-500'}`}>
                  {format(new Date(msg.createdAt), 'p')}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="fixed bottom-0 right-4 md:right-20 w-full max-w-sm h-[500px] bg-white border border-gray-300 rounded-t-lg shadow-2xl flex flex-col z-50 transform transition-transform translate-y-0">
      <header className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50 rounded-t-lg flex-shrink-0">
        <div className="flex items-center gap-3">
          <img
            src={recipient?.profilePicture || '/default-avatar.png'}
            alt={recipient?.username}
            className="w-10 h-10 rounded-full object-cover"
          />
          <span className="font-semibold text-gray-800">{recipient?.username || 'Chat'}</span>
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-800 transition-colors"
          aria-label="Close chat"
        >
          <IoClose size={24} />
        </button>
      </header>

      <main className="flex-1 p-4 overflow-y-auto bg-gray-100">
        {renderMessageContent()}
        {isRecipientTyping && (
          <div className="flex items-center gap-2 mt-2">
            <img
              src={recipient.profilePicture || '/default-avatar.png'}
              alt={recipient.username}
              className="w-8 h-8 rounded-full object-cover"
            />
            <div className="bg-white rounded-lg p-3 rounded-bl-none shadow-sm">
              {/* 
                CSS for the typing indicator. Add this to your global CSS file (e.g., index.css).
                .typing-indicator span {
                  height: 8px; width: 8px; background-color: #9E9EA1;
                  border-radius: 50%; display: inline-block;
                  animation: bounce 1.4s infinite ease-in-out both;
                }
                .typing-indicator span:nth-of-type(1) { animation-delay: -0.32s; }
                .typing-indicator span:nth-of-