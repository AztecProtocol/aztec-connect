import type { CutdownAsset } from 'app/types';
import { EthAccount } from '../eth_account';
import { Form, FormStatus } from '../form';
import { Provider } from '../provider';

export enum AccountFormEvent {
  UPDATED_FORM_STATUS = 'UPDATED_FORM_STATUS',
  UPDATED_FORM_VALUES = 'UPDATED_FORM_VALUES',
}

export interface AccountForm {
  locked: boolean;
  processing: boolean;

  init(): Promise<void>;
  destroy(): void;

  getValues(): Form;

  changeAssetState(assetState: { asset: CutdownAsset; spendableBalance: bigint }): void;
  changeProvider(provider?: Provider): void;
  changeEthAccount(ethAccount: EthAccount): void;
  changeValues(newValues: Form): void;

  unlock(): void;
  lock(): Promise<void>;
  submit(): Promise<void>;

  on(event: AccountFormEvent.UPDATED_FORM_STATUS, listener: (status: FormStatus) => void): this;
  on(event: AccountFormEvent.UPDATED_FORM_VALUES, listener: (form: Form) => void): this;
  off(event: AccountFormEvent.UPDATED_FORM_STATUS, listener: (status: FormStatus) => void): this;
  off(event: AccountFormEvent.UPDATED_FORM_VALUES, listener: (form: Form) => void): this;
}
