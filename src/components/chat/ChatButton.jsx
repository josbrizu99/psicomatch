import React from 'react';

const ChatButton = ({ unreadCount = 0, onClick }) => {
    return (
        <button
            onClick={onClick}
            className="fixed bottom-6 right-6 z-30 bg-gradient-to-br from-primary-600 to-primary-700 text-white rounded-full p-4 shadow-2xl hover:shadow-3xl hover:scale-110 transition-all duration-300 group"
            aria-label="Abrir chat"
        >
            {/* Icon */}
            <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
            </svg>

            {/* Unread Badge */}
            {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-red-500 rounded-full border-2 border-white animate-pulse">
                    {unreadCount > 99 ? '99+' : unreadCount}
                </span>
            )}

            {/* Pulse Animation */}
            <span className="absolute inset-0 rounded-full bg-primary-600 opacity-0 group-hover:opacity-25 group-hover:scale-150 transition-all duration-500"></span>
        </button>
    );
};

export default ChatButton;
