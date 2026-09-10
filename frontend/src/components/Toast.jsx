import React, { useEffect } from 'react';

const Toast = ({ message, type = 'info', onClose, duration = 3000 }) => {
    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => {
                onClose();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [message, onClose, duration]);

    if (!message) return null;

    const bgColors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        info: 'bg-blue-500',
        warning: 'bg-yellow-500'
    };

    return (
        <div className={`fixed top-4 right-4 z-50 ${bgColors[type] || 'bg-gray-800'} text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 transition-opacity animate-fade-in-down`}>
            <span>{message}</span>
            <button onClick={onClose} className="ml-2 hover:opacity-80 font-bold">✕</button>
        </div>
    );
};

export default Toast;
