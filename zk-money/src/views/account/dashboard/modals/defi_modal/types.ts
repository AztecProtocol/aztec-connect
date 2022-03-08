import { DefiSettlementTime } from '@aztec/sdk';
import { InputAnnotation } from 'views/account/dashboard/modals/sections/amount_section/types';

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
