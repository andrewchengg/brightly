import React from 'react';
import { Button } from '@/components/ui/button';
import { FaChalkboard } from 'react-icons/fa';

interface WhiteboardButtonProps {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'default' | 'lg';
}

const WhiteboardButton: React.FC<WhiteboardButtonProps> = ({ 
  onClick, 
  disabled = false, 
  className = '',
  size = 'sm'
}) => {
  return (
    <Button
      variant="outline"
      size={size}
      onClick={onClick}
      disabled={disabled}
      className={`whiteboard-btn ${className}`}
      title="Open Whiteboard"
    >
      <FaChalkboard size={size === 'sm' ? 14 : 16} className="mr-1" />
      Whiteboard
    </Button>
  );
};

export default WhiteboardButton; 