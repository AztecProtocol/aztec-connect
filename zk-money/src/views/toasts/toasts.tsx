import { useContext } from 'react';
import { ToastGroup } from 'ui-components';
import { TopLevelContext } from 'alt-model/top_level_context/top_level_context';
import { useToasts } from 'alt-model/top_level_context';

export function Toasts() {
  const { toastsObs } = useContext(TopLevelContext);
  const toasts = useToasts();

  const handleCloseToast = (index: number) => {
    toastsObs.removeToastByIndex(index);
  };

  return <ToastGroup toasts={toasts} onCloseToast={handleCloseToast} />;
}
