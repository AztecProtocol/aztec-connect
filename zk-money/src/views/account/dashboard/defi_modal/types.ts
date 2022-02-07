import { DefiSettlementTime } from '@aztec/sdk';

export interface DefiFormFields {
  amountStr: string;
  speed: DefiSettlementTime;
}

export interface DefiFormIssues {
  loading?: boolean;
  allowForGas?: boolean;
  insufficentFunds?: boolean;
  tooSmall?: boolean;
  beyondMax?: boolean;
}

export interface DefiFormFieldAnnotations {
  amountStr?: InputAnnotation;
}

export interface InputAnnotation {
  type: 'info' | 'error';
  text: string;
}
