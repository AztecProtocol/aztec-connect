const path = require('path');
const colours = require('./src/styles/colours.js').colours;

module.exports = {
  title: 'AZTEC Docs',
  require: [path.join(__dirname, './src/styles/reset.css')],
  assetsDir: ['./src'],
  styleguideDir: 'dest',
  template: {
    favicon: '/favicon.ico',
    head: {
      links: [
        {
          rel: 'canonical',
          href: 'https://developers.aztec.network',
        },
        {
          rel: 'icon',
          type: 'image/png',
          sizes: '32x32',
          href: '/favicon-32x32.png',
        },
        {
          rel: 'icon',
          type: 'image/png',
          sizes: '16x16',
          href: '/favicon-16x16.png',
        },
        {
          rel: 'apple-touch-icon',
          sizes: '180x180',
          href: '/apple-touch-icon.png',
        },
        {
          rel: 'mask-icon',
          href: '/safari-pinned-tab.svg',
          color: '#448fff',
        },
        {
          rel: 'manifest',
          href: '/manifest.json',
        },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/icon?family=Material+Icons',
        },
      ],
      meta: [
        {
          name: 'msapplication-TileColor',
          content: '#000000',
        },
        {
          name: 'theme-color',
          content: '#000000',
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
      small: 14,
      h1: 48,
      h2: 32,
      h3: 28, // l
      h4: 22, // m
      h5: 18, // s
      h6: 16, // xs
    },
    fontFamily: {
      base: ['soehne'],
      monospace: ['soehne mono', 'Liberation Mono', 'Menlo', 'monospace'],
    },
    color: {
      base: '#000',
      light: colours.grey,
      lightest: colours['grey-lightest'],
      link: colours.purple,
      linkHover: '#6C47FF',
      border: colours['grey-light'],
      sidebarBackground: colours.primary,
      codeBackground: colours['grey-lightest'],
      codeBase: '#333',
      name: colours.blue,
      type: colours.purple,
      codeComment: colours.grey,
      codePunctuation: '#999',
      codeProperty: colours.pink,
      codeDeleted: colours.red,
      codeString: colours.orange,
      codeInserted: colours.green,
      codeOperator: '#999',
      codeKeyword: colours.purpleDark,
      codeFunction: colours.blue,
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
          name: 'Initialize the SDK',
          content: 'src/docs/gettingStarted.md',
          exampleMode: 'collapse',
          usageMode: 'collapse',
          sections: [],
        },

        {
          name: 'User',
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
              content: 'src/docs/generate_account_recovery_data.md',
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
          ],
        },
        {
          name: 'ERC20 Tokens',
          pagePerSection: true,
          content: 'src/docs/tokens.md',
          sections: [
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
              content: 'src/docs/emergency_withdraw.md',
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
          sections: [
            {
              name: 'Action',
              content: 'src/docs/types/action.md',
              exampleMode: 'hide',
            },
            {
              name: 'ActionState',
              content: 'src/docs/types/action_state.md',
              exampleMode: 'hide',
            },
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
              name: 'EthereumProvider',
              content: 'src/docs/types/ethereum_provider.md',
              exampleMode: 'hide',
            },
            {
              name: 'EthereumSdk',
              content: 'src/docs/types/ethereum_sdk.md',
              exampleMode: 'hide',
            },
            {
              name: 'EthereumSdkUser',
              content: 'src/docs/types/ethereum_sdk_user.md',
              exampleMode: 'hide',
            },
            {
              name: 'EthereumSdkUserAsset',
              content: 'src/docs/types/ethereum_sdk_user_asset.md',
              exampleMode: 'hide',
            },
            {
              name: 'EthereumSigner',
              content: 'src/docs/types/ethereum_signer.md',
              exampleMode: 'hide',
            },
            {
              name: 'GrumpkinAddress',
              content: 'src/docs/types/grumpkin_address.md',
              exampleMode: 'hide',
            },
            {
              name: 'RecoveryPayload',
              content: 'src/docs/types/recovery_payload.md',
              exampleMode: 'hide',
            },
            {
              name: 'Rollup',
              content: 'src/docs/types/rollup.md',
              exampleMode: 'hide',
            },
            {
              name: 'RollupProviderStatus',
              content: 'src/docs/types/rollup_provider_status.md',
              exampleMode: 'hide',
            },
            {
              name: 'RollupStatus',
              content: 'src/docs/types/rollup_status.md',
              exampleMode: 'hide',
            },
            {
              name: 'SchnorrSigner',
              content: 'src/docs/types/schnorr_signer.md',
              exampleMode: 'hide',
            },
            {
              name: 'SdkInitState',
              content: 'src/docs/types/sdk_init_state.md',
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
              name: 'TokenContract',
              content: 'src/docs/types/token_contract.md',
              exampleMode: 'hide',
            },
            {
              name: 'Tx',
              content: 'src/docs/types/tx.md',
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
              name: 'WalletSdk',
              content: 'src/docs/types/wallet_sdk.md',
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
            {
              name: 'Web3Signer',
              content: 'src/docs/types/web3_signer.md',
              exampleMode: 'hide',
            },
          ],
        },
      ],
      sectionDepth: 3,
    },
  ],
  pagePerSection: true,
  tocMode: 'collapse',
};
