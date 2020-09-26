export interface Type {
  name: string;
  type: string | Type;
  params?: Type[];
  returns?: string | Type;
  isStatic?: boolean;
  isPrivate?: boolean;
  isReadonly?: boolean;
}
