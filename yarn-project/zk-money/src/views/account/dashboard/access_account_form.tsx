import { useState } from 'react';
import { bindStyle } from '../../../ui-components/util/classnames.js';
import { Button, ButtonTheme, Card } from '../../../ui-components/index.js';
import { useAccountStateManager } from '../../../alt-model/top_level_context/index.js';
import { RegisterForm, useRegisterForm } from '../../../alt-model/forms/register/register_form_hooks.js';
import { useWalletInteractionIsOngoing } from '../../../alt-model/wallet_interaction_hooks.js';
import { KeyGenerationResult } from '../../../components/index.js';
import { KeysGenerationPage } from './keys_generation_page.js';
import { RegisterAccountForm } from './register_account_form.js';
import style from './access_account_form.module.scss';

const cx = bindStyle(style);

enum Pages {
  RegisterKeys,
  RegisterAlias,
}

function renderPage(
  page: number,
  registerForm: RegisterForm,
  hasDownloadedKeys: boolean,
  handleAccessAccount: (result: KeyGenerationResult | null) => void,
  setHasDownloadedKeys: React.Dispatch<React.SetStateAction<boolean>>,
) {
  const { fields, setters, assessment, locked, runnerState, runner, submit, cancel } = registerForm;

  if (page === Pages.RegisterKeys) {
    return (
      <KeysGenerationPage
        fields={fields}
        setters={setters}
        assessment={assessment}
        userHasDownloadedKeys={hasDownloadedKeys}
        onAccessAccount={handleAccessAccount}
        onDownloadKeys={setHasDownloadedKeys}
      />
    );
  }

  if (page === Pages.RegisterAlias) {
    return (
      <RegisterAccountForm
        registerForm={registerForm}
        runnerState={runnerState}
        locked={locked}
        onResetRunner={() => runner.reset()}
        onRetry={submit}
        onCancel={cancel}
      />
    );
  }
}

function Buttons({
  page,
  registerForm,
  hasDownloadedKeys,
  setPage,
}: {
  page: number;
  registerForm: RegisterForm;
  hasDownloadedKeys: boolean;
  setPage: React.Dispatch<React.SetStateAction<number>>;
}) {
  const walletInteractionIsOngoing = useWalletInteractionIsOngoing();

  if (!registerForm.fields.accountKeys || !registerForm.fields.confirmationAccountKeys || registerForm.locked) {
    return null;
  }

  function cleanKeys() {
    if (registerForm.fields.spendingKeys) {
      registerForm.setters.spendingKeys(null);
    } else if (registerForm.fields.accountKeys) {
      registerForm.setters.accountKeys(null);
      registerForm.setters.confirmationAccountKeys(null);
    }
  }

  return (
    <div className={style.buttons}>
      {page === Pages.RegisterKeys && (
        <>
          <Button
            className={style.prevButton}
            disabled={walletInteractionIsOngoing}
            theme={ButtonTheme.Secondary}
            text={'Back'}
            onClick={cleanKeys}
          />
          {hasDownloadedKeys && !walletInteractionIsOngoing ? (
            <Button className={style.nextButton} text={'Next Step'} onClick={() => setPage(prevPage => prevPage + 1)} />
          ) : null}
        </>
      )}
      {page === Pages.RegisterAlias && (
        <>
          <Button
            className={style.prevButton}
            disabled={walletInteractionIsOngoing}
            text={'Back'}
            theme={ButtonTheme.Secondary}
            onClick={() => setPage(prevPage => prevPage - 1)}
          />
          <Button
            className={style.nextButton}
            text={'Register'}
            disabled={!registerForm.canSubmit || walletInteractionIsOngoing}
            onClick={() => {
              if (registerForm.canSubmit) registerForm.submit();
            }}
          />
        </>
      )}
    </div>
  );
}

export function AccessAccountForm() {
  const [page, setPage] = useState(Pages.RegisterKeys);
  const [hasDownloadedKeys, setHasDownloadedKeys] = useState(false);

  const registerForm = useRegisterForm();
  const accountStateManager = useAccountStateManager();

  const handleAccessAccount = (result: KeyGenerationResult | null) => {
    if (!result) {
      accountStateManager.clearActiveUser();
      return;
    }
    const { publicKey, privateKey, generatorEthAddress } = result;
    if (!publicKey || !privateKey || !generatorEthAddress) return;
    accountStateManager.activateUser(publicKey, privateKey, generatorEthAddress);
  };

  const userHasSpendingKeys = !!registerForm.fields.spendingKeys;
  const userHasAccountKeys = !!registerForm.fields.accountKeys;

  return (
    <Card
      className={cx(page === Pages.RegisterKeys && style.registerKeysForm)}
      cardHeader={'Access the Aztec Network'}
      cardContent={
        <div className={style.accessAccountForm}>
          {renderPage(page, registerForm, hasDownloadedKeys, handleAccessAccount, setHasDownloadedKeys)}
          <Buttons
            page={page}
            registerForm={registerForm}
            hasDownloadedKeys={userHasAccountKeys && userHasSpendingKeys && hasDownloadedKeys}
            setPage={setPage}
          />
        </div>
      }
    />
  );
}
