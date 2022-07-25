import { useContext } from 'react';
import { ToastContent, ToastGroup } from 'ui-components';
import { TopLevelContext } from 'alt-model/top_level_context/top_level_context';
import { useToasts } from 'alt-model/top_level_context';

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
