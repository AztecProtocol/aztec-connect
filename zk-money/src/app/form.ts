export enum MessageType {
  TEXT,
  WARNING,
  ERROR,
}

export interface SystemMessage {
  message: string;
  type: MessageType;
}

export enum FormStatus {
  ACTIVE,
  LOCKED,
  PROCESSING,
}

export interface FormValue {
  value: any;
  message?: string;
  messageType?: MessageType;
  required?: boolean;
}

export type Form = { [prop: string]: FormValue };

export interface StrInput extends FormValue {
  value: string;
}

export interface StrValue extends FormValue {
  value: string;
}

export interface IntValue extends FormValue {
  value: number;
}

export interface BigIntValue extends FormValue {
  value: bigint;
}

export interface BoolInput extends FormValue {
  value: boolean;
}

export enum ValueAvailability {
  VALID,
  INVALID,
  PENDING,
}

export const formatBigIntInput = (input: StrInput): StrInput => ({
  ...input,
  value: input.value.replace(/[^0-9.]/g, ''),
});

export const withMessage = <T extends FormValue>(value: T, message: string): T => ({
  ...value,
  message,
  messageType: MessageType.TEXT,
});

export const withWarning = <T extends FormValue>(value: T, warning: string): T => ({
  ...value,
  message: warning,
  messageType: MessageType.WARNING,
});

export const withError = <T extends FormValue>(value: T, error: string): T => ({
  ...value,
  message: error,
  messageType: MessageType.ERROR,
});

export const clearMessage = <T extends FormValue>(value: T): T => ({
  ...value,
  message: '',
  messageType: MessageType.TEXT,
});

export const clearMessages = <T extends Partial<Form>>(values: T) => {
  const newValues = {} as T;
  (Object.keys(values) as (keyof T)[]).forEach(prop => (newValues[prop] = clearMessage(values[prop]!)));
  return newValues;
};

export const mergeValues = <T>(values: T, newValues: Partial<T>) => {
  const merged = { ...values };
  (Object.keys(merged) as (keyof T)[])
    .filter(prop => prop in newValues)
    .forEach(prop => (merged[prop] = { ...merged[prop], ...newValues[prop] }));
  return merged;
};

export const isValidForm = (form: Form) =>
  !Object.values(form).some(v => (v.message && v.messageType === MessageType.ERROR) || (v.required && !v.value));

export const isStrictValidDecimal = (value: string) => !!value.trim().match(/^\d{1,}(\.\d{1,})?$/);

export const isValidDecimal = (value: string) => !!value.trim().match(/^\d{0,}\.?\d{0,}$/);
