import { useWalletInteractionToasts } from './top_level_context/index.js';

export function useWalletInteractionIsOngoing() {
  const walletInteractionToasts = useWalletInteractionToasts();
  return walletInteractionToasts.length > 0;
}
