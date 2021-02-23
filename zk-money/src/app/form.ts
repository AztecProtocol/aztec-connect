export enum MessageType {
  TEXT,
  WARNING,
  ERROR,
}

type OnChange<T, P> = (v: T, curForm: P, prevForm: P) => T;
type Validate<T, P> = (v: T, form: P) => T;

export interface Input {
  value: any;
  message?: string;
  messageType?: MessageType;
  readonly onChange?: OnChange<any, { [key: string]: Input }>;
  readonly validate?: Validate<any, { [key: string]: Input }>;
  readonly required?: boolean;
}

export type Form = { [key: string]: Input };

export interface StringInput extends Input {
  value: string;
  readonly onChange?: OnChange<StringInput, Form>;
  readonly validate?: Validate<StringInput, Form>;
}

export interface StringValue extends Input {
  value: string;
}

export interface BigIntInput extends Input {
  value: string;
  readonly onChange?: OnChange<BigIntInput, Form>;
  readonly validate?: Validate<BigIntInput, Form>;
}

export interface BigIntValue extends Input {
  value: bigint;
}

export interface BoolInput extends Input {
  value: boolean;
  readonly onChange?: OnChange<BoolInput, Form>;
  readonly validate?: Validate<BoolInput, Form>;
}

const resetInputMessage = (input: Input) => ({
  ...input,
  message: '',
  messageType: MessageType.TEXT,
});

export const onChange = resetInputMessage;

export const onChangeBigInt = (input: BigIntInput) => ({
  ...resetInputMessage(input),
  value: input.value.replace(/[^0-9.]/g, ''),
});

export const applyChange = <T extends Form>(form: Form, newInputs: Form) => {
  const inputs: Form = { ...form };
  Object.keys(form).forEach(key => {
    const input = {
      ...form[key],
      ...newInputs[key],
    };
    const { onChange } = input;
    inputs[key] = {
      ...input,
      ...(onChange ? onChange(input, { ...inputs, ...newInputs }, form) : null),
    };
  });
  return inputs as T;
};

export const mergeForm = <T extends Form>(prevInputs: Form, newInputs: Form) => {
  const inputs: Form = { ...prevInputs };
  Object.keys(newInputs).forEach(key => {
    if (!(key in prevInputs)) {
      throw new Error(`Field '${key}' does not exist in the form.`);
    }

    inputs[key] = {
      ...prevInputs[key],
      ...newInputs[key],
    };
  });
  return inputs as T;
};

export const validateForm = <T extends Form>(form: T) => {
  const inputs: Form = { ...form };
  Object.keys(form).forEach(key => {
    const input = form[key];
    const { validate } = input;
    inputs[key] = {
      ...input,
      ...(validate ? validate(input, inputs) : null),
    };
  });
  return inputs as T;
};

export const isValidForm = (form: Form) =>
  !Object.values(form).find(
    input => (!!input.message && input.messageType === MessageType.ERROR) || (input.required && !input.value),
  );

export const withMessage = (input: Input, message: string) => ({
  ...input,
  message,
  messageType: MessageType.TEXT,
});

export const withWarning = (input: Input, warning: string) => ({
  ...input,
  message: warning,
  messageType: MessageType.WARNING,
});

export const withError = (input: Input, error: string) => ({
  ...input,
  message: error,
  messageType: MessageType.ERROR,
});

export const applyInputError = <T extends Form>(form: T, inputName: string, message: string) => {
  return mergeForm(form, {
    [inputName]: withError(form[inputName], message),
  }) as T;
};

export interface SystemMessage {
  message: string;
  type: MessageType;
}
