import React, { useEffect, useState } from 'react';
import Confetti from 'react-confetti';

interface ConfettiComponentProps {
  trigger: boolean;
  duration?: number;
  onComplete?: () => void;
}

const ConfettiComponent: React.FC<ConfettiComponentProps> = ({
  trigger,
  duration = 3000,
  onComplete
}) => {
  const [isActive, setIsActive] = useState(false);
  const [windowDimensions, setWindowDimensions] = useState({
    width: 0,
    height: 0
  });

  useEffect(() => {
    // Set initial window dimensions
    if (typeof window !== 'undefined') {
      setWindowDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });

      const updateWindowDimensions = () => {
        setWindowDimensions({
          width: window.innerWidth,
          height: window.innerHeight
        });
      };

      window.addEventListener('resize', updateWindowDimensions);
      return () => window.removeEventListener('resize', updateWindowDimensions);
    }
  }, []);

  useEffect(() => {
    if (trigger) {
      setIsActive(true);
      
      const timer = setTimeout(() => {
        setIsActive(false);
        if (onComplete) {
          onComplete();
        }
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [trigger, duration, onComplete]);

  if (!isActive || windowDimensions.width === 0) {
    return null;
  }

  return (
    <Confetti
      width={windowDimensions.width}
      height={windowDimensions.height}
      recycle={false}
      numberOfPieces={200}
      gravity={0.3}
      initialVelocityY={20}
      colors={['#f43f5e', '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444']}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 9999,
        pointerEvents: 'none'
      }}
    />
  );
};

export default ConfettiComponent; 