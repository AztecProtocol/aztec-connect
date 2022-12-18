import { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GrumpkinAddress } from '@aztec/sdk';
import { useCachedAlias } from '../../alt-model/alias_hooks.js';
import { TopLevelContext } from '../../alt-model/top_level_context/top_level_context.js';
import { useWalletInteractionIsOngoing } from '../../alt-model/wallet_interaction_hooks.js';
import {
  useSdk,
  useAliasManager,
  useAccountStateManager,
} from '../../alt-model/top_level_context/top_level_context_hooks.js';
import { useObs } from '../../app/util/index.js';
import { Loader, Card, CardHeaderSize, Field, FieldStatus, Button, ButtonTheme } from '../../ui-components/index.js';
import { Dot } from '../dot.js';
import { CloseButtonWhite } from '../index.js';
import { Modal } from '../modal.js';
import style from './user_account_menu.module.scss';

function deleteAllCookies() {
  const cookies = document.cookie.split(';');

  for (let i = 0; i < cookies.length; i++) {
    const cookie = cookies[i];
    const eqPos = cookie.indexOf('=');
    const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
    document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT';
  }
}

async function deleteAllIndexesDB() {
  const databases = await indexedDB.databases();
  databases.forEach(database => {
    if (database.name) {
      indexedDB.deleteDatabase(database.name);
    }
  });
}

function getFormattedId(userId?: GrumpkinAddress) {
  if (!userId) return '';
  return userId.toString().replace('0x', 'aztec:0x');
}

function getCompactedId(userId?: GrumpkinAddress) {
  if (!userId) return '';
  const str = userId.toString().replace('0x', '');
  return `aztec:0x${str.slice(0, 4)}...${str.slice(-4)}`;
}

function getCompactedAlias(alias: string) {
  return alias.length > 12 ? `${alias.substring(0, 12)}...` : alias;
}

export function UserAccountMenu() {
  const [alias, setAlias] = useState('');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const sdk = useSdk();
  const aliasManager = useAliasManager();
  const navigate = useNavigate();

  const { toastsObs } = useContext(TopLevelContext);
  const walletInteractionIsOngoing = useWalletInteractionIsOngoing();
  const accountStateManager = useAccountStateManager();
  const accountState = useObs(accountStateManager.stateObs);
  const cachedAlias = useCachedAlias();

  const isSynced = accountState && !accountState.isSyncing;
  const hasAlias = !!cachedAlias;
  const storedAlias = `@${getCompactedAlias(cachedAlias || '')}`;

  const formattedAddress = getFormattedId(accountState?.userId);
  const compactAddress = getCompactedId(accountState?.userId);

  const handleSwitchUser = () => {
    accountStateManager.clearActiveUser();
    navigate('/balance');
  };

  const handleLogOut = async () => {
    if (
      window.confirm(`⚠️ Are you sure you want to clear storage? ⚠️\n
    Next time you login you will have to synchronise from the beginning of the chain.\n
    All your transaction history will be lost, and any pending transactions won't be visible until after they have settled.`)
    ) {
      localStorage.clear();
      sessionStorage.clear();
      deleteAllIndexesDB();
      deleteAllCookies();
      accountStateManager.clearActiveUser();
      navigate(0);
    }
  };

  const openProfileModal = () => {
    setShowProfileModal(true);
  };

  const closeProfileModal = () => {
    setShowProfileModal(false);
  };

  useEffect(() => {
    (async function () {
      if (!accountState || !accountState.userId) return;

      const isAliasRegisteredToAccount = await sdk?.isAliasRegisteredToAccount(accountState.userId, alias);
      if (isAliasRegisteredToAccount) {
        aliasManager.setAlias(accountState.userId, alias);
      }
    })();
  }, [alias, accountState, aliasManager, sdk]);

  return (
    <>
      <div className={style.userName} onClick={openProfileModal}>
        <div className={style.dot}>{isSynced ? <Dot size="xs" color="green" /> : <Loader />}</div>
        <div>{hasAlias ? storedAlias : compactAddress}</div>
      </div>
      {showProfileModal && (
        <div className={style.background}>
          <Modal onClose={closeProfileModal}>
            <Card
              headerSize={CardHeaderSize.LARGE}
              className={style.profile}
              cardHeader={
                <div className={style.profileHeader}>
                  My Wallet
                  <CloseButtonWhite onClick={closeProfileModal} />
                </div>
              }
              cardContent={
                <div className={style.card}>
                  <div className={style.syncStatus}>
                    {isSynced ? (
                      <>
                        <Dot size="xs" color="green" />
                        Synced
                      </>
                    ) : (
                      <>
                        <Loader />
                        Syncing...
                      </>
                    )}
                  </div>
                  <Field
                    label="Aztec Account Alias"
                    sublabel="This is the alias for your Aztec account"
                    value={hasAlias ? cachedAlias : alias}
                    onChangeValue={value => setAlias(value.toLowerCase())}
                    disabled={hasAlias || walletInteractionIsOngoing}
                    message={
                      hasAlias || alias.length === 0
                        ? ''
                        : `Alias '@${alias}' not recognised. Please check if your registration transaction has settled.`
                    }
                    status={hasAlias || alias.length === 0 ? undefined : FieldStatus.Warning}
                    prefix={'@'}
                    placeholder={'Write the alias of your Aztec account'}
                    onClick={() => {
                      if (hasAlias) {
                        navigator.clipboard.writeText(cachedAlias);
                        toastsObs.addToast({
                          text: 'Alias copied to clipboard.',
                          autocloseInMs: 5e3,
                          closable: true,
                        });
                      }
                    }}
                  />
                  <Field
                    label="Aztec Account Address"
                    sublabel="This is your address in the Aztec Network"
                    value={formattedAddress}
                    disabled={true}
                    onClick={() => {
                      navigator.clipboard.writeText(formattedAddress);
                      toastsObs.addToast({
                        text: 'Address copied to clipboard',
                        autocloseInMs: 5e3,
                        closable: true,
                      });
                    }}
                  />
                  <div className={style.footer}>
                    <Button
                      text="Log Out"
                      className={style.button}
                      theme={ButtonTheme.Primary}
                      onClick={handleSwitchUser}
                      disabled={walletInteractionIsOngoing}
                    />
                    <Button
                      text="Clear Storage & Log Out"
                      className={style.button}
                      theme={ButtonTheme.Secondary}
                      onClick={handleLogOut}
                      disabled={walletInteractionIsOngoing}
                    />
                  </div>
                </div>
              }
            />
          </Modal>
        </div>
      )}
    </>
  );
}
