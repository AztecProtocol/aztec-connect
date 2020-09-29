const path = require('path');
const colours = require('./src/styles/colours.js').colours;

module.exports = {
  require: [path.join(__dirname, './src/styles/reset.css')],
  assetsDir: ['./src'],
  styleguideDir: 'dest',
  template: {
    head: {
      links: [
        {
          rel: 'canonical',
          href: 'https://docs.aztecprotocol.com',
        },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css?family=Roboto+Mono',
        },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/icon?family=Material+Icons',
        },
      ],
    },
  },
  theme: {
    sidebarWidth: 240,
    space: [
      2, //  0 xxs
      4, //  1 xs   (0)
      8, //  2 s    (1)
      16, // 3 l    (2)
      20, // 4 xl   (3)
      24, // 5 xxl  (4)
      32, // 6      (5)
      40, // 7      (6)
    ],
    fontSize: {
      base: 16,
      text: 16,
      small: 12,
      h1: 48,
      h2: 32,
      h3: 28, // l
      h4: 22, // m
      h5: 16, // s
      h6: 14, // xs
    },
    fontFamily: {
      base: ['soehne'],
      monospace: ['soehne mono', 'Liberation Mono', 'Menlo', 'monospace'],
    },
    color: {
      base: '#221635',
      light: colours.grey,
      lightest: colours['grey-lightest'],
      link: colours['primary'],
      linkHover: 'rgba(255,255,255,0.8)',
      border: colours['grey-lighter'],
      sidebarBackground: colours.primary,
      codeBackground: colours['grey-lightest'],
      codeBase: '#333',
      name: colours.blue,
      type: colours.purple,
      codeComment: colours.grey,
      codePunctuation: '#999',
      codeProperty: colours.orange,
      codeDeleted: colours.red,
      codeString: colours.blue,
      codeInserted: colours.purple,
      codeOperator: '#9a6e3a',
      codeKeyword: colours.red,
      codeFunction: colours.purple,
      codeVariable: colours.orange,
    },
  },
  styles: {
    StyleGuide: {
      '@global body': {
        base: 'soehne',
      },
    },
  },
  styleguideComponents: {
    ComponentsListRenderer: path.join(__dirname, 'src/styleguide/ComponentsListRenderer'),
    Examples: path.join(__dirname, 'src/styleguide/Examples'),
    HeadingRenderer: path.join(__dirname, 'src/styleguide/HeadingRenderer'),
    LinkRenderer: path.join(__dirname, 'src/styleguide/LinkRenderer'),
    LogoRenderer: path.join(__dirname, 'src/styleguide/LogoRenderer'),
    ParaRenderer: path.join(__dirname, 'src/styleguide/ParaRenderer'),
    SectionHeadingRenderer: path.join(__dirname, 'src/styleguide/SectionHeadingRenderer'),
    StyleGuideRenderer: path.join(__dirname, 'src/styleguide/StyleGuideRenderer'),
    TableOfContentsRenderer: path.join(__dirname, 'src/styleguide/TableOfContentsRenderer'),
    TableRenderer: path.join(__dirname, 'src/styleguide/TableRenderer'),
    TypeRenderer: path.join(__dirname, 'src/styleguide/TypeRenderer'),
  },
  sections: [
    {
      name: 'A Private Layer 2',
      content: 'src/docs/aztec.md',
      sections: [
        {
          name: 'SDK',
          content: 'src/docs/gettingStarted.md',
          exampleMode: 'collapse',
          usageMode: 'collapse',
          sections: [
            {
              name: 'Initialize the SDK',
              content: 'src/docs/initialize_sdk.md',
              exampleMode: 'hide',
            },
            {
              name: 'API',
              pagePerSection: true,
              content: 'src/docs/user.md',
              sections: [
                {
                  name: 'createAccount',
                  content: 'src/docs/create_account.md',
                  exampleMode: 'hide',
                },
                {
                  name: 'generateAccountRecoveryData',
                  content: 'src/docs/recovery_data.md',
                  exampleMode: 'hide',
                },
                {
                  name: 'recoverAccount',
                  content: 'src/docs/recover_account.md',
                  exampleMode: 'hide',
                },
                {
                  name: 'addSigningKey',
                  content: 'src/docs/add_signing_key.md',
                  exampleMode: 'hide',
                },
                {
                  name: 'removeSigningKey',
                  content: 'src/docs/revoke_signing_key.md',
                  exampleMode: 'hide',
                },
                {
                  name: 'deposit',
                  content: 'src/docs/deposit.md',
                  exampleMode: 'hide',
                },
                {
                  name: 'withdraw',
                  content: 'src/docs/withdraw.md',
                  exampleMode: 'hide',
                },
                {
                  name: 'transfer',
                  content: 'src/docs/transfer.md',
                  exampleMode: 'hide',
                },
                {
                  name: 'publicTransfer',
                  content: 'src/docs/public_transfer.md',
                  exampleMode: 'hide',
                },
                {
                  name: 'emergencyWithdraw',
                  content: 'src/docs/use_hatch.md',
                  exampleMode: 'hide',
                },
              ],
            },
            {
              name: 'Defi Aggregation',
              pagePerSection: true,
              content: 'src/docs/defi_aggregator.md',
            },
            {
              name: 'Custom Circuits',
              pagePerSection: true,
              content: 'src/docs/custom_circuits.md',
            },
            {
              name: 'Types',
              pagePerSection: true,
              content: 'src/docs/types.md',
              sections: [
                {
                  name: 'Address',
                  content: 'src/docs/types/address.md',
                  exampleMode: 'hide',
                },
                {
                  name: 'AssetId',
                  content: 'src/docs/types/asset_id.md',
                  exampleMode: 'hide',
                },
                {
                  name: 'EthAddress',
                  content: 'src/docs/types/eth_address.md',
                  exampleMode: 'hide',
                },
                {
                  name: 'EthereumSigner',
                  content: 'src/docs/types/eth_signer.md',
                  exampleMode: 'hide',
                },
                {
                  name: 'GrumpkinAddress',
                  content: 'src/docs/types/grumpkin_address.md',
                  exampleMode: 'hide',
                },
                {
                  name: 'HashPath',
                  content: 'src/docs/types/hash_path.md',
                  exampleMode: 'hide',
                },
                {
                  name: 'JoinSplitTx',
                  content: 'src/docs/types/join_split_tx.md',
                  exampleMode: 'hide',
                },
                {
                  name: 'MerkleTree',
                  content: 'src/docs/types/merkle_tree.md',
                  exampleMode: 'hide',
                },
                {
                  name: 'Note',
                  content: 'src/docs/types/note.md',
                  exampleMode: 'hide',
                },
                {
                  name: 'RecoveryPayload',
                  content: 'src/docs/types/recovery_payload.md',
                  exampleMode: 'hide',
                },
                {
                  name: 'Signature',
                  content: 'src/docs/types/signature.md',
                  exampleMode: 'hide',
                },
                {
                  name: 'Signer',
                  content: 'src/docs/types/signer.md',
                  exampleMode: 'hide',
                },
                {
                  name: 'TxHash',
                  content: 'src/docs/types/tx_hash.md',
                  exampleMode: 'hide',
                },
                {
                  name: 'UserData',
                  content: 'src/docs/types/user_data.md',
                  exampleMode: 'hide',
                },
                {
                  name: 'UserTx',
                  content: 'src/docs/types/user_tx.md',
                  exampleMode: 'hide',
                },
                {
                  name: 'UserTxAction',
                  content: 'src/docs/types/user_tx_action.md',
                  exampleMode: 'hide',
                },
                {
                  name: 'WalletSdkUser',
                  content: 'src/docs/types/wallet_sdk_user.md',
                  exampleMode: 'hide',
                },
                {
                  name: 'WalletSdkUserAsset',
                  content: 'src/docs/types/wallet_sdk_user_asset.md',
                  exampleMode: 'hide',
                },
              ],
            },
          ],
        },
      ],
      sectionDepth: 4,
    },
  ],
  pagePerSection: true,
  tocMode: 'collapse',
};
