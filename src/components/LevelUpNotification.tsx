'use client';

import { useEffect, useState } from 'react';

interface LevelUpNotificationProps {
  level: number;
  onClose: () => void;
}

const LevelUpNotification = ({ level, onClose }: LevelUpNotificationProps) => {
  const [isVisible, setIsVisible] = useState(true);
  
  useEffect(() => {
    // Auto-hide after 5 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 500); // Allow animation to complete before unmounting
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [onClose]);
  
  return (
    <div 
      className={`fixed top-0 left-0 w-full h-full flex items-center justify-center z-50 bg-black bg-opacity-50 transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      onClick={onClose}
    >
      <div 
        className={`bg-white rounded-lg shadow-xl p-8 max-w-md transform transition-transform duration-500 ${isVisible ? 'scale-100' : 'scale-90'}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="text-center">
          <div className="w-24 h-24 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">🏆</span>
          </div>
          <h2 className="text-2xl font-bold text-yellow-600 mb-2">Level Up!</h2>
          <p className="text-xl font-semibold mb-4">You've reached Level {level}!</p>
          <p className="text-gray-600 mb-6">Keep learning and earning XP to unlock more achievements and badges!</p>
          <button 
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium transition"
            onClick={onClose}
          >
            Continue Learning
          </button>
        </div>
      </div>
    </div>
  );
};

export default LevelUpNotification; 