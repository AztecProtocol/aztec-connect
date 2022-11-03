export type ObsListener<T> = (value: T) => void;
export type ObsUnlisten = () => void;

export interface IObs<T> {
  value: T;
  listen(listener: ObsListener<T>): ObsUnlisten;
}
