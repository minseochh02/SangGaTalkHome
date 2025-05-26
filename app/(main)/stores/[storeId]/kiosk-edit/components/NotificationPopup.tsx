import React from 'react';

interface NotificationPopupProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

const NotificationPopup: React.FC<NotificationPopupProps> = ({ message, type, onClose }) => {
  return (
    <div className={`fixed top-5 right-5 z-[100] p-4 mb-4 rounded-md text-white shadow-lg ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`} role="alert">
      {message}
      <button onClick={onClose} className="ml-4 float-right font-bold text-xl leading-none">&times;</button>
    </div>
  );
};

export default NotificationPopup; 