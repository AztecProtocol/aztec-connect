import { useContext } from 'react';
import { ToastContent, ToastGroup } from '../../ui-components/index.js';
import { TopLevelContext } from '../../alt-model/top_level_context/top_level_context.js';
import { useToasts } from '../../alt-model/top_level_context/index.js';

interface ToastProps {
  toasts?: ToastContent[];
}

export function Toasts(props: ToastProps) {
  const { toastsObs } = useContext(TopLevelContext);
  const toasts = useToasts();

  const handleCloseToast = (index: number) => {
    toastsObs.removeToastByIndex(index);
  };

  return <ToastGroup toasts={props.toasts ? [...toasts, ...props.toasts] : toasts} onCloseToast={handleCloseToast} />;
}
