import { formatAliasInput } from './alias';
import { Asset, assets } from './assets';
import {
  BigIntInput,
  BigIntValue,
  BoolInput,
  Form,
  onChange,
  onChangeBigInt,
  StringInput,
  StringValue,
  withError,
} from './form';
import { fromBaseUnits, toBaseUnits } from './units';

const isStrictValidDecimal = (value: string) => !!value.trim().match(/^\d{1,}(\.\d{1,})?$/);

const isValidDecimal = (value: string) => !!value.trim().match(/^\d{0,}\.?\d{0,}$/);

const feeInput = {
  value: '0.1',
  onChange: (input: BigIntInput, form: Form) => {
    const fee = onChangeBigInt(input);
    const decimals = form.asset.value.decimals;
    if (isStrictValidDecimal(fee.value) && toBaseUnits(fee.value, decimals) < form.minFee.value) {
      return withError(fee, `Fee cannot be less than ${fromBaseUnits(form.minFee.value, decimals)}.`);
    }
    return fee;
  },
  validate: (input: BigIntInput, form: Form) => {
    const value = input.value;
    if (!value) {
      return withError(input, 'This field is required.');
    }
    if (!isValidDecimal(value)) {
      return withError(input, 'Invalid value.');
    }
    const decimals = form.asset.value.decimals;
    if (toBaseUnits(value, decimals) < form.minFee.value) {
      return withError(input, `Fee cannot be less than ${fromBaseUnits(form.minFee.value, decimals)}.`);
    }
    return input;
  },
};

export enum ValueAvailability {
  VALID,
  INVALID,
  PENDING,
}

interface SettledInValue {
  value: {
    seconds: number;
    valid: ValueAvailability;
  };
}

const settledIn = {
  value: {
    seconds: 6 * 3600,
    valid: ValueAvailability.PENDING,
  },
};

interface AliasValidation {
  input: string;
  valid: boolean;
}

export enum ShieldStatus {
  NADA,
  CONFIRM,
  DEPOSIT,
  CREATE_PROOF,
  APPROVE_PROOF,
  SEND_PROOF,
  DONE,
}

export interface ShieldForm extends Form {
  asset: {
    value: Asset;
  };
  amount: BigIntInput;
  maxAmount: BigIntValue;
  depositLimit: BigIntValue;
  publicBalance: BigIntValue;
  spendableBalance: BigIntValue;
  fee: BigIntInput;
  minFee: BigIntValue;
  settledIn: SettledInValue;
  ethAddress: StringInput;
  alias: StringValue;
  recipient: StringInput;
  recipientStatus: {
    value: AliasValidation;
  };
  enableAddToBalance: BoolInput;
  addToBalance: BoolInput;
  confirmed: BoolInput;
  toBeDeposited: BigIntValue;
  status: {
    value: ShieldStatus;
  };
  submit: BoolInput;
}

export const initialShieldForm: ShieldForm = {
  asset: {
    value: assets[0],
  },
  amount: {
    value: '',
    onChange: (input: BigIntInput, form: Form) => {
      const amountInput = onChangeBigInt(input);
      const { maxAmount, depositLimit } = form;
      const asset = form.asset.value;
      const amountValue = toBaseUnits(amountInput.value, asset.decimals);
      if (amountValue > depositLimit.value) {
        return withError(
          amountInput,
          `For security, amount is capped at ${fromBaseUnits(depositLimit.value, asset.decimals)} ${asset.symbol}.`,
        );
      }
      if (amountValue > maxAmount.value) {
        return withError(amountInput, `Insufficient ${asset.symbol} Balance.`);
      }
      return amountInput;
    },
    validate: (input: BigIntInput, form: Form) => {
      const value = input.value;
      if (!isValidDecimal(value)) {
        return withError(input, 'Invalid value.');
      }
      const asset = form.asset.value;
      const amountValue = toBaseUnits(value, asset.decimals);
      if (!amountValue) {
        return withError(input, 'Amount must be greater than 0.');
      }
      return input;
    },
    required: true,
  },
  maxAmount: {
    value: 0n,
  },
  depositLimit: {
    value: 0n,
  },
  publicBalance: {
    value: 0n,
  },
  spendableBalance: {
    value: 0n,
  },
  fee: feeInput,
  minFee: {
    value: 0n,
  },
  settledIn,
  ethAddress: {
    value: '',
  },
  alias: {
    value: '',
  },
  recipient: {
    value: '',
    onChange,
    validate: (input: StringInput) => {
      if (!input.value.trim()) {
        return withError(input, `Please enter recipient's username.`);
      }
      return input;
    },
    required: true,
  },
  recipientStatus: {
    value: {
      input: '',
      valid: false,
    },
  },
  enableAddToBalance: {
    value: false,
    onChange: (_, form: Form) => {
      const alias = form.alias.value;
      const recipient = formatAliasInput(form.recipient.value);
      const spendableBalance = form.spendableBalance.value;
      return {
        value: recipient === alias && spendableBalance > 0n,
      };
    },
  },
  addToBalance: {
    value: false,
    onChange: (input: BoolInput, form: Form, prevForm) => {
      const recipient = form.recipient.value;
      const prevRecipient = prevForm.recipient.value;
      if (recipient !== prevRecipient) {
        return { value: false };
      }
      return input;
    },
  },
  confirmed: {
    value: false,
    onChange,
    validate: (input: BoolInput) => {
      if (!input.value) {
        return withError(input, 'Please confirm that you understand the risk.');
      }
      return input;
    },
    required: true,
  },
  toBeDeposited: {
    value: 0n,
  },
  status: {
    value: ShieldStatus.NADA,
  },
  submit: {
    value: false,
  },
};

export enum SendStatus {
  NADA,
  CONFIRM,
  CREATE_PROOF,
  SEND_PROOF,
  DONE,
}

export interface SendForm extends Form {
  asset: {
    value: Asset;
  };
  amount: BigIntInput;
  maxAmount: BigIntValue;
  fee: BigIntInput;
  minFee: BigIntValue;
  minFeeTransfer: BigIntValue;
  minFeeContract: BigIntValue;
  minFeeWallet: BigIntValue;
  settledIn: SettledInValue;
  recipient: StringInput;
  recipientStatus: {
    value: AliasValidation;
  };
  confirmed: BoolInput;
  status: {
    value: SendStatus;
  };
  submit: BoolInput;
}

export const initialSendForm: SendForm = {
  asset: {
    value: assets[0],
  },
  amount: {
    value: '',
    onChange: (input: BigIntInput, form: Form) => {
      const amountInput = onChangeBigInt(input);
      const { maxAmount } = form;
      const asset = form.asset.value;
      const decimals = asset.decimals;
      const amountValue = toBaseUnits(amountInput.value, decimals);
      if (amountValue > maxAmount.value) {
        return withError(amountInput, `Insufficient zk${asset.symbol} Balance.`);
      }
      return amountInput;
    },
    validate: (input: BigIntInput, form: Form) => {
      const value = input.value;
      if (!isValidDecimal(value)) {
        return withError(input, 'Invalid value.');
      }
      const asset = form.asset.value;
      const amountValue = toBaseUnits(value, asset.decimals);
      if (!amountValue) {
        return withError(input, 'Amount must be greater than 0.');
      }
      return input;
    },
    required: true,
  },
  maxAmount: {
    value: 0n,
  },
  fee: feeInput,
  minFee: {
    value: 0n,
  },
  minFeeTransfer: {
    value: 0n,
  },
  minFeeWallet: {
    value: 0n,
  },
  minFeeContract: {
    value: 0n,
  },
  settledIn,
  recipient: {
    value: '',
    onChange,
    validate: (input: StringInput) => {
      if (!input.value.trim()) {
        return withError(input, `Please enter recipient's username or ethereum address.`);
      }
      return input;
    },
    required: true,
  },
  recipientStatus: {
    value: {
      input: '',
      valid: false,
    },
  },
  confirmed: {
    value: false,
    onChange,
    validate: (input: BoolInput) => {
      if (!input.value) {
        return withError(input, 'Please confirm that you understand the risk.');
      }
      return input;
    },
    required: true,
  },
  status: {
    value: SendStatus.NADA,
  },
  submit: {
    value: false,
  },
};

export enum MergeStatus {
  NADA,
  CONFIRM,
  CREATE_PROOF,
  SEND_PROOF,
  DONE,
}

export interface MergeForm extends Form {
  asset: {
    value: Asset;
  };
  spendableBalance: BigIntValue;
  mergeOptions: {
    value: bigint[][];
  };
  toMerge: {
    value: bigint[];
  };
  fee: BigIntInput;
  minFee: BigIntValue;
  status: {
    value: MergeStatus;
  };
  submit: BoolInput;
}

export const initialMergeForm: MergeForm = {
  asset: {
    value: assets[0],
  },
  spendableBalance: {
    value: 0n,
  },
  mergeOptions: {
    value: [],
  },
  toMerge: {
    value: [],
  },
  fee: feeInput,
  minFee: {
    value: 0n,
  },
  status: {
    value: MergeStatus.NADA,
  },
  submit: {
    value: false,
  },
};
