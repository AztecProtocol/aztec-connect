import { AccountAliasId, AccountId, AliasHash, AssetId, EthAddress, GrumpkinAddress } from '@aztec/sdk';
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

interface ServerStatus {
  chainId: number;
  nextPublishTime?: string;
}

interface ServerStatusResponse {
  serverStatus: ServerStatus;
}

export class GraphQLService {
  constructor(private apollo: ApolloClient<any>) {}

  async getServerStatus() {
    const { data } = await this.apollo.query<ServerStatusResponse>({
      query: gql`
        query Query {
          serverStatus {
            chainId
          }
        }
      `,
      fetchPolicy: 'cache-first',
    });
    return data?.serverStatus || { chainId: 0 };
  }

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

  async getPendingAccounts(take: number, skip: number) {
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

  async getPendingAccountId(aliasHash: AliasHash) {
    const take = 100;
    for (let retry = 0; retry < 10; ++retry) {
      const pendingAccounts = await this.getPendingAccounts(take, retry * take);
      const accountTxs = pendingAccounts.filter(tx => tx.proofId === 1);
      const account = accountTxs.find(({ assetId }) => {
        const id = AccountAliasId.fromBuffer(Buffer.from(assetId, 'hex'));
        return id.aliasHash.equals(aliasHash);
      });

      if (account) {
        const { assetId, publicInput, publicOutput } = account;
        const id = AccountAliasId.fromBuffer(Buffer.from(assetId, 'hex'));
        const publicKey = new GrumpkinAddress(
          Buffer.concat([Buffer.from(publicInput, 'hex'), Buffer.from(publicOutput, 'hex')]),
        );
        return new AccountId(publicKey, id.nonce);
      }

      if (pendingAccounts.length < take) {
        break;
      }
    }
  }

  async getPendingDeposit(assetId: AssetId, inputOwner: EthAddress) {
    const take = 100;
    let pendingDeposit = 0n;
    for (let retry = 0; retry < 10; ++retry) {
      const pendingAccounts = await this.getPendingAccounts(take, retry * take);
      pendingDeposit +=
        pendingAccounts
          .filter(
            tx =>
              tx.proofId === 0 &&
              +tx.assetId === assetId &&
              new EthAddress(Buffer.from(tx.inputOwner, 'hex')).equals(inputOwner),
          )
          .reduce((sum, tx) => sum + BigInt(`0x${tx.publicInput}`), 0n) || 0n;

      if (pendingAccounts.length < take) {
        break;
      }
    }
    return pendingDeposit;
  }
}
