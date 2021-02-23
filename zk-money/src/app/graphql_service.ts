import { GrumpkinAddress } from '@aztec/sdk';
import { ApolloClient, gql } from 'apollo-boost';

interface AccountTx {
  accountPubKey: string;
  nonce: number;
}

interface AccountTxsResponse {
  accountTxs: AccountTx[];
}

interface Tx {
  proofId: number;
  assetId: string;
  publicInput: string;
  publicOutput: string;
  inputOwner: string;
}

interface TxsResponse {
  txs: Tx[];
}

export class GraphQLService {
  constructor(private apollo: ApolloClient<any>) {}

  async getAccountNonce(accountPublicKey: GrumpkinAddress) {
    const { data } = await this.apollo.query<AccountTxsResponse>({
      query: gql`
        query Query {
          accountTxs(take: 1, where: { accountPubKey: "${accountPublicKey.toString()}" }, order: { nonce: "DESC" }) {
            nonce
          }
        }
      `,
      fetchPolicy: 'no-cache',
    });
    return data?.accountTxs[0]?.nonce || 0;
  }

  async getAliasPublicKey(alias: string) {
    const { data } = await this.apollo.query<AccountTxsResponse>({
      query: gql`
        query Query {
          accountTxs(take: 1, where: { alias: "${alias}" }, order: { nonce: "DESC" }) {
            accountPubKey
          }
        }
      `,
      fetchPolicy: 'no-cache',
    });
    const tx = data?.accountTxs[0];
    return tx ? GrumpkinAddress.fromString(tx.accountPubKey) : undefined;
  }

  async getPendingTxs(take: number, skip: number) {
    const { data } = await this.apollo.query<TxsResponse>({
      query: gql`
        query Query {
          txs(where: { rollup_null: true }, take: ${take}, skip: ${skip}) {
            proofId
            assetId
            publicInput
            publicOutput
            inputOwner
          }
        }
      `,
      fetchPolicy: 'no-cache',
    });
    return data?.txs || [];
  }
}
