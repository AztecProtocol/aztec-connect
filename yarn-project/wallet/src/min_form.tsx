import {
  AssetValue,
  AztecSdk,
  AztecSdkUser,
  createAztecSdk,
  EthAddress,
  GrumpkinAddress,
  SdkEvent,
  SdkFlavour,
  setPostDebugLogHook,
  sha256,
  TxSettlementTime,
} from '@aztec/sdk';
import { useRef, useState } from 'react';
import { inspect } from 'util';
import { useWeb3React, Web3ReactProvider } from '@web3-react/core';
import { WalletConnectConnector } from '@web3-react/walletconnect-connector';
import { createGlobalStyle, default as styled } from 'styled-components';
import { default as Div100vh } from 'react-div-100vh';
import { isMobile } from 'react-device-detect';
// import { InjectedConnector } from '@web3-react/injected-connector';

// const MetaMask = new InjectedConnector({
//   supportedChainIds: [1, 3, 4, 5, 42, 0xa57ec, 1337],
// });

const GlobalStyle = createGlobalStyle`
  #root {
    height: 100vh;
    overflow: hidden;
  }
  body {
    margin: 0;
    overflow: hidden;
  }
  html {
    margin: 0;
    overflow: hidden;
  }
`;

function log(str: string, name = 'min_demo') {
  const colourHex = sha256(Buffer.from(name)).subarray(0, 3).toString('hex');
  document.getElementById('logs')!.innerHTML += `<span style="color:#${colourHex}">${name}: </span>${str}<br>`;
}

interface MinFormProps {
  chainId: number;
  rpc: { [chainId: number]: string };
  serverUrl: string;
}

export function App({ chainId, rpc, serverUrl }: MinFormProps) {
  return (
    <>
      <GlobalStyle />
      <Div100vh>
        <Web3ReactProvider getLibrary={provider => provider}>
          <MinForm chainId={chainId} rpc={rpc} serverUrl={serverUrl}></MinForm>
        </Web3ReactProvider>
      </Div100vh>
    </>
  );
}

interface KeyPair {
  publicKey: GrumpkinAddress;
  privateKey: Buffer;
}

interface UserState {
  user: AztecSdkUser;
  isRegistered: boolean;
  // Why does the dapp need to know this!?
  // For some reason the register controller takes pk as an input instead of having the core sdk sign...
  accountKeyPair: KeyPair;
  publicBalance: AssetValue;
  balance: AssetValue;
  ethAddress: EthAddress;
}

enum State {
  PRE_WALLET,
  PRE_INIT,
  PRE_LOGIN,
  PRE_REGISTERED,
  CAN_SEND,
}

enum Action {
  SHIELD,
  TRANSFER,
  WITHDRAW,
}

export function MinForm({ chainId, rpc, serverUrl }: MinFormProps) {
  const [sdk, setSdk] = useState<AztecSdk>();
  const [state, setState] = useState<State>(State.PRE_WALLET);
  const [busy, setBusy] = useState(false);
  const [userState, _setUserState] = useState<UserState>();
  const [alias, setAlias] = useState('');
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [request, setRequest] = useState<string>();
  const { library: provider, activate, account } = useWeb3React();

  const userStateRef = useRef(userState);
  const setUserState = (data: UserState) => {
    userStateRef.current = data;
    _setUserState(data);
  };

  const userRequest = async (msg: string, userFn: () => Promise<any>) => {
    // const old = provider.connector._eventManager._eventEmitters.find(
    //   (e: any) => e.event === 'call_request_sent',
    // ).callback;
    if (!isMobile) {
      return await userFn();
    }
    try {
      // provider.connector.off('call_request_sent');
      setRequest(msg);
      return await userFn();
    } finally {
      setRequest(undefined);
      // provider.connector.off('call_request_sent');
      // provider.connector.on('call_request_sent', old);
    }
  };

  const action = alias === to ? Action.SHIELD : EthAddress.isAddress(to) ? Action.WITHDRAW : Action.TRANSFER;

  return (
    <StyledPage>
      <StyledContent>
        Minimal Demo
        <form spellCheck="false">
          {state == State.PRE_WALLET && (
            <input
              type="button"
              value="connect wallet"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                log(`serverUrl: ${serverUrl}`);
                log(`rpc map: ${inspect(rpc)}`);
                try {
                  const walletConnect = new WalletConnectConnector({
                    rpc,
                    chainId,
                    bridge: 'https://bridge.walletconnect.org',
                    qrcode: true,
                  });
                  await activate(walletConnect, undefined, true);
                  setState(State.PRE_INIT);
                } catch (err: any) {
                  log(err.message);
                  setState(State.PRE_WALLET);
                }
                setBusy(false);
              }}
            ></input>
          )}
          {state == State.PRE_INIT && (
            <input
              type="button"
              value="init"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                log('initing');
                setPostDebugLogHook((n, ...l: any[]) => {
                  log(`${l.map(e => (typeof e === 'object' ? inspect(e) : e)).join(' ')}`, n);
                  const e = document.getElementById('logs')!;
                  e.scrollTo(0, e.scrollHeight);
                });

                if (isMobile) {
                  provider.connector.off('call_request_sent');
                }

                try {
                  const sdk = await createAztecSdk(provider!, {
                    serverUrl,
                    debug: 'bb:*',
                    flavour: SdkFlavour.PLAIN,
                    numWorkers: 4,
                  });
                  await sdk.run();
                  await sdk.awaitSynchronised();
                  setSdk(sdk);
                } catch (err: any) {
                  log(err.message);
                }
                setState(State.PRE_LOGIN);
                setBusy(false);
              }}
            ></input>
          )}
          {state == State.PRE_LOGIN && (
            <input
              type="button"
              value="login"
              disabled={busy || !alias}
              onClick={async () => {
                if (!sdk) return;
                setBusy(true);
                const ethAddress = EthAddress.fromString(account!);
                const accountKeyPair = await userRequest('gen account key', () =>
                  sdk.generateAccountKeyPair(ethAddress),
                );
                const { publicKey, privateKey } = accountKeyPair;

                if (!(await sdk.userExists(publicKey))) {
                  await sdk.addUser(privateKey);
                }
                // TODO: Don't throw if doesn't exist!? Return undefined and then add.
                const user = await sdk.getUser(publicKey);
                const registered = await sdk.isAccountRegistered(publicKey);
                if (registered && !(await sdk.isAliasRegisteredToAccount(publicKey, alias))) {
                  log('alias is not registered to this account');
                  setState(State.PRE_LOGIN);
                  return;
                }
                const publicBalance = await sdk.getPublicBalance(ethAddress, 0);
                const balance = await user.getBalance(0);

                const updateBalances = async () => {
                  log('updating balances...');
                  const userState = userStateRef.current!;
                  const publicBalance = await sdk.getPublicBalance(userState.ethAddress, 0);
                  const balance = await userState.user.getBalance(0);
                  // log(inspect(userState, false, 5));
                  // log(inspect({ publicBalance, balance }, false, 5));
                  setUserState({
                    ...userState,
                    publicBalance,
                    balance,
                  });
                };

                sdk.on(SdkEvent.UPDATED_USER_STATE, updateBalances);

                setUserState({
                  user,
                  isRegistered: registered,
                  accountKeyPair,
                  publicBalance,
                  balance,
                  ethAddress,
                });
                setState(registered ? State.CAN_SEND : State.PRE_REGISTERED);
                setBusy(false);

                await updateBalances();
              }}
            ></input>
          )}
          {state == State.PRE_REGISTERED && (
            <input
              type="button"
              value="register and shield"
              disabled={busy}
              onClick={async () => {
                if (!sdk || !userState || !alias) return;
                setBusy(true);
                try {
                  const spendingKeyPair = await userRequest('gen spending key', () =>
                    sdk.generateSpendingKeyPair(userState.ethAddress),
                  );
                  const deposit = sdk.toBaseUnits(0, amount);
                  const fees = await sdk.getRegisterFees(deposit.assetId);
                  const controller = sdk.createRegisterController(
                    userState.user.id,
                    alias,
                    userState.accountKeyPair.privateKey,
                    spendingKeyPair.publicKey,
                    undefined,
                    deposit,
                    fees[TxSettlementTime.INSTANT],
                    userState.ethAddress,
                  );
                  log(`depositing funds to contract...`);
                  await userRequest('deposit funds', () => controller.depositFundsToContract());
                  await controller.awaitDepositFundsToContract();

                  log(`creating account proof...`);
                  await controller.createProof();

                  await userRequest('sign proof', () => controller.sign());
                  await controller.send();
                  log(`awaiting settlement...`);
                  await controller.awaitSettlement();
                  setUserState({ ...userState, isRegistered: true });
                  setState(State.CAN_SEND);
                } catch (err: any) {
                  log(err.message);
                  setState(State.PRE_REGISTERED);
                }
                setBusy(false);
              }}
            ></input>
          )}
          {state == State.CAN_SEND && (
            <input
              type="button"
              value={Action[action].toLowerCase()}
              disabled={busy || !amount || !to}
              onClick={async () => {
                if (!userState || !sdk) return;
                setBusy(true);
                try {
                  const start = new Date().getTime();
                  const assetId = 0;
                  if (action === Action.SHIELD) {
                    const deposit = sdk.toBaseUnits(0, amount);
                    const fees = await sdk.getDepositFees(assetId);
                    const controller = sdk.createDepositController(
                      userState.ethAddress,
                      deposit,
                      fees[TxSettlementTime.INSTANT],
                      userState.user.id,
                      false,
                    );
                    if ((await controller.getPendingFunds()) < deposit.value) {
                      log(`depositing funds to contract...`);
                      await userRequest('deposit funds', () => controller.depositFundsToContract());
                      await controller.awaitDepositFundsToContract();
                    } else {
                      log(`user already has pending funds.`);
                    }

                    log(`creating js deposit proof...`);
                    await controller.createProof();

                    await userRequest('sign proof', () => controller.sign());

                    await controller.send();
                    log(`awaiting settlement...`);
                    await controller.awaitSettlement();
                  } else if (action === Action.WITHDRAW) {
                    const spendingKeyPair = await userRequest('gen spending key', () =>
                      sdk.generateSpendingKeyPair(userState.ethAddress),
                    );
                    const withdraw = sdk.toBaseUnits(0, amount);
                    const toAddr = EthAddress.fromString(to);
                    const fees = await sdk.getWithdrawFees(assetId, { recipient: toAddr });
                    const signer = await sdk.createSchnorrSigner(spendingKeyPair.privateKey);
                    const controller = sdk.createWithdrawController(
                      userState.user.id,
                      signer,
                      withdraw,
                      fees[TxSettlementTime.INSTANT],
                      toAddr,
                    );
                    log(`creating js withdraw proof...`);
                    await controller.createProof();
                    await controller.send();
                    log(`awaiting settlement...`);
                    await controller.awaitSettlement();
                  } else {
                    const spendingKeyPair = await userRequest('gen spending key', () =>
                      sdk.generateSpendingKeyPair(userState.ethAddress),
                    );
                    const transfer = sdk.toBaseUnits(0, amount);
                    const fees = await sdk.getTransferFees(assetId);
                    const signer = await sdk.createSchnorrSigner(spendingKeyPair.privateKey);
                    const toPubKey = await sdk.getAccountPublicKey(to);
                    if (!toPubKey) {
                      log(`Unknown alias: ${to}`);
                      return;
                    }
                    const controller = sdk.createTransferController(
                      userState.user.id,
                      signer,
                      transfer,
                      fees[TxSettlementTime.INSTANT],
                      toPubKey,
                      true,
                    );
                    log(`creating js transfer proof...`);
                    await controller.createProof();
                    await controller.send();
                    log(`awaiting settlement...`);
                    await controller.awaitSettlement();
                  }
                  log(`time taken: ${new Date().getTime() - start}ms`);
                } catch (err: any) {
                  log(err.message);
                } finally {
                  setState(State.CAN_SEND);
                  setBusy(false);
                }
              }}
            ></input>
          )}
          {request && (
            <a href="https://metamask.app.link" rel={'noopener noreferrer'} target={'_blank'}>
              <input type="button" value={request}></input>
            </a>
          )}
          <p>
            alias:{' '}
            <input
              autoCorrect="off"
              autoCapitalize="none"
              type="text"
              value={alias}
              disabled={state != State.PRE_LOGIN || busy}
              onChange={e => setAlias(e.target.value)}
            ></input>
          </p>
          <p>
            amount (ETH):{' '}
            <input
              autoCorrect="off"
              autoCapitalize="none"
              type="text"
              value={amount}
              disabled={(state != State.CAN_SEND && state != State.PRE_REGISTERED) || busy}
              onChange={e => setAmount(e.target.value)}
            ></input>
          </p>
          <p>
            to:{' '}
            <input
              autoCorrect="off"
              autoCapitalize="none"
              type="text"
              value={to}
              disabled={state != State.CAN_SEND || busy}
              onChange={e => setTo(e.target.value)}
            ></input>
          </p>
        </form>
        <p>user_id: {userState ? `${userState.user.id.toString().slice(0, 12)}...` : 'None'}</p>
        <p>public_balance: {userState ? sdk!.fromBaseUnits(userState.publicBalance, true, 3) : 'None'}</p>
        <p>balance: {userState ? sdk!.fromBaseUnits(userState.balance, true, 3) : 'None'}</p>
      </StyledContent>
      <StyledLogs id="logs" />
    </StyledPage>
  );
}

const StyledPage = styled.div`
  display: flex;
  flex-flow: column;
  height: 100%;
`;

const StyledContent = styled.div`
  margin: 10px;
`;

const StyledLogs = styled.div`
  background-color: black;
  color: lightgray;
  padding: 10px;
  overflow-y: scroll;
  white-space: nowrap;
  flex: 1;
  border-top: solid 1px;
`;
