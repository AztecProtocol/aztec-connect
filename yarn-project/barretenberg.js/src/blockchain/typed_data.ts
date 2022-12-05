export interface TypedData {
  domain: {
    name: string;
    version: string;
    chainId: string;
    verifyingContract: string;
  };
  types: { [key: string]: { name: string; type: string }[] };
  message: any;
  primaryType: string;
}
