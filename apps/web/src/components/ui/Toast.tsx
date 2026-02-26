'use client';

import { useEffect, useState } from 'react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  duration?: number;
  onClose: () => void;
}

const typeStyles = {
  success: 'bg-emerald-900/80 border-emerald-500/30 text-emerald-300',
  error: 'bg-red-900/80 border-red-500/30 text-red-300',
  info: 'bg-blue-900/80 border-blue-500/30 text-blue-300',
};

export function Toast({ message, type = 'info', duration = 3000, onClose }: ToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 200);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 px-4 py-2 rounded border text-sm transition-opacity duration-200 ${
        visible ? 'opacity-100' : 'opacity-0'
      } ${typeStyles[type]}`}
    >
      {message}
    </div>
  );
}
