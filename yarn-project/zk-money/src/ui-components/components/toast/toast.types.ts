import React from 'react';

export enum ToastType {
  NORMAL = 'NORMAL',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
}
export interface ToastContent {
  text?: string;
  key?: string;
  type?: ToastType;
  primaryButton?: ToastButton;
  secondaryButton?: ToastButton;
  autocloseInMs?: number;
  closable?: boolean;
  components?: React.ReactNode;
  heavy?: boolean;
  onClose?: () => void;
}

export interface ToastButton {
  text: string;
  onClick: () => void;
}

export interface ToastProps {
  index?: number;
  toast: ToastContent;
  onCloseToast?: (key: string) => void;
}
