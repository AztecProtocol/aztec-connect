export enum ToastType {
  NORMAL = 'NORMAL',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
}
export interface ToastContent {
  text: string;
  key?: string;
  type?: ToastType;
  primaryButton?: ToastButton;
  secondaryButton?: ToastButton;
  autocloseInMs?: number;
  isClosable?: boolean;
  isHeavy?: boolean;
}

export interface ToastButton {
  text: string;
  onClick: () => void;
}

export interface ToastProps {
  text: string;
  index?: number;
  primaryButton?: ToastButton;
  secondaryButton?: ToastButton;
  isHeavy?: boolean;
  type?: ToastType;
  isClosable?: boolean;
  autocloseInMs?: number;
  onCloseToast?: (index: number) => void;
}
