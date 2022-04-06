import { TxId } from '@aztec/sdk';
import { useConfig } from './top_level_context';

export function useExplorerTxLink(txId: TxId) {
  const { explorerUrl } = useConfig();
  return `${explorerUrl}/tx/${txId.toString().replace(/^0x/i, '')}`;
}
