import { GrumpkinAddress } from '@aztec/sdk';
import { ApolloClient, gql } from 'apollo-boost';

interface AccountTx {
  accountPubKey: string;
  aliasHash: string;
  nonce: number;
}

interface AccountTxsResponse {
  accountTxs: AccountTx[];
}

interface JoinSplitTx {
  proofId: number;
  assetId: number;
  publicInput: string;
  publicOutput: string;
  inputOwner: string;
}

interface JoinSplitTxsResponse {
  joinSplitTxs: JoinSplitTx[];
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
        query Query($alias: String) {
          accountTxs(take: 1, where: { alias: $alias }, order: { nonce: "DESC" }) {
            accountPubKey
          }
        }
      `,
      variables: { alias },
      fetchPolicy: 'no-cache',
    });
    const tx = data?.accountTxs[0];
    return tx ? GrumpkinAddress.fromString(tx.accountPubKey) : undefined;
  }

  async getUnsettledAccountTxs() {
    const { data } = await this.apollo.query<AccountTxsResponse>({
      query: gql`
        query Query {
          accountTxs: unsettledAccountTxs {
            nonce
            accountPubKey
            aliasHash
          }
        }
      `,
      fetchPolicy: 'no-cache',
    });
    return data?.accountTxs || [];
  }

  async getUnsettledJoinSplitTxs() {
    const { data } = await this.apollo.query<JoinSplitTxsResponse>({
      query: gql`
        query Query {
          joinSplitTxs: unsettledJoinSplitTxs {
            assetId
            publicInput
            inputOwner
          }
        }
      `,
      fetchPolicy: 'no-cache',
    });
    return data?.joinSplitTxs || [];
  }
}
