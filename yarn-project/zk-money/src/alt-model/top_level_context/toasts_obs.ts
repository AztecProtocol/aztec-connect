import { Obs } from '../../app/util/index.js';
import type { IObs } from '../../app/util/obs/types.js';
import { ToastContent, ToastType } from '../../ui-components/index.js';

type ToastsObsValue = ToastContent[];

export class ToastsObs implements IObs<ToastsObsValue> {
  obs = Obs.input<ToastsObsValue>([]);

  get value() {
    return this.obs.value;
  }

  listen = this.obs.listen.bind(this.obs);

  addToast(toast: ToastContent) {
    if (!toast.key) {
      const hash = (Math.random() + 1).toString(36).substring(7);
      toast.key = hash;
    }
    this.obs.next([...this.obs.value, toast]);
  }

  hasSystemMessage() {
    const systemMessageToast = this.obs.value.find(t => t.key === 'system-message');
    return !!systemMessageToast;
  }

  hasSystemError() {
    const erroredToast = this.obs.value.find(t => t.type === ToastType.ERROR && t.key === 'system-message');
    return !!erroredToast;
  }

  hasToastByKey(key: string) {
    const toast = this.obs.value.find(t => t.key === key);
    return !!toast;
  }

  replaceToast(toast: ToastContent) {
    const newToasts = [...this.obs.value];
    const toastIndex = newToasts.findIndex(t => t.key === toast.key);
    newToasts[toastIndex] = toast;
    this.obs.next(newToasts);
  }

  addOrReplaceToast(toast: ToastContent) {
    if (this.obs.value.findIndex(t => t.key === toast.key) === -1) {
      this.addToast(toast);
    } else {
      this.replaceToast(toast);
    }
  }

  removeToastByKey(key: string) {
    this.obs.next(this.obs.value.filter(toast => toast.key !== key));
  }

  removeToastByIndex(index: number) {
    this.obs.next(this.obs.value.slice(0, index).concat(this.obs.value.slice(index + 1)));
  }

  removeAllToasts() {
    this.obs.next([]);
  }
}
