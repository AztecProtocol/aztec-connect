import { Block, FlexBox } from '@aztec/guacamole-ui';
import { Action, AssetId, SdkEvent } from 'aztec2-sdk';
import { WebSdk } from 'aztec2-sdk';
import { EthAddress, GrumpkinAddress } from 'barretenberg/address';
import React, { useEffect, useState } from 'react';
import { Form, FormField, FormSection } from '../components';
import { ActionSelect } from './action_select';
import { ClearDataButton } from './clear_data_button';
import { Copy } from './copy';
import { EscapeHatchIndicator } from './escape_hatch_indicator';
import { RecipientValueForm } from './recipient_value_form';

interface ActionFormProps {
  app: WebSdk;
  account: EthAddress;
}

export const ActionForm = ({ app, account }: ActionFormProps) => {
  const sdk = app.getSdk()!;
  const asset = AssetId.DAI;

  const user = sdk.getUser(account)!;
  const userAsset = user.getAsset(asset);

  const [syncedToRollup, setSyncedToRollup] = useState(-1);
  const [worldSyncedToRollup, setWorldSyncedToRollup] = useState(-1);
  const [latestRollup, setLatestRollup] = useState(-1);
  const [tokenBalance, setTokenBalance] = useState(BigInt(0));
  const [allowance, setAllowance] = useState(BigInt(-1));
  const [balance, setBalance] = useState(userAsset.balance());
  const [actionState, setActionState] = useState(sdk.getActionState());
  const [action, setAction] = useState(userAsset.balance() ? Action.TRANSFER : Action.DEPOSIT);

  useEffect(() => {
    const handleUserStateChange = async (ethAddress: EthAddress) => {
      if (!ethAddress.equals(account)) {
        return;
      }
      setSyncedToRollup(user.getUserData().syncedToRollup);
      setLatestRollup(sdk.getLocalStatus().latestRollupId);
      setBalance(userAsset.balance());
      setTokenBalance(await userAsset.publicBalance());
      setAllowance(await userAsset.publicAllowance());
    };

    const handleWorldStateChange = (syncedToRollup: number, latestRollupId: number) => {
      setWorldSyncedToRollup(syncedToRollup);
      setLatestRollup(latestRollupId);
    };

    handleUserStateChange(account);
    handleWorldStateChange(sdk.getLocalStatus().syncedToRollup, sdk.getLocalStatus().latestRollupId);

    app.on(SdkEvent.UPDATED_ACTION_STATE, setActionState);
    app.on(SdkEvent.UPDATED_USER_STATE, handleUserStateChange);
    app.on(SdkEvent.UPDATED_WORLD_STATE, handleWorldStateChange);

    return () => {
      app.off(SdkEvent.UPDATED_ACTION_STATE, setActionState);
      app.off(SdkEvent.UPDATED_USER_STATE, handleUserStateChange);
      app.off(SdkEvent.UPDATED_WORLD_STATE, handleWorldStateChange);
    };
  }, [app, account]);

  const isRunning = actionState !== undefined && !actionState.txHash && !actionState.error;
  const isLoading = (action: Action) => isRunning && actionState!.action === action;
  const errorMsg = (action: Action) => (actionState?.action === action && actionState?.error?.message) || '';

  return (
    <Form>
      <FormSection>
        <>
          <Block padding="xs 0">
            <FlexBox valign="center">
              <FormField label="Account">{account.toString()}</FormField>
              <Copy toCopy={account.toString()} />
            </FlexBox>
            <FlexBox valign="center">
              <FormField label="Private Address">{user.getUserData().publicKey.toString().slice(0, 42)}...</FormField>
              <Copy toCopy={user.getUserData().publicKey.toString()} />
            </FlexBox>
            <FormField label="User Synced">{`${syncedToRollup + 1} / ${latestRollup + 1}`}</FormField>
            <FormField label="Tree Synced">{`${worldSyncedToRollup + 1} / ${latestRollup + 1}`}</FormField>
            <FormField label="Public Balance">{`${userAsset.fromErc20Units(tokenBalance)}`}</FormField>
            <FormField label="Private Balance">{`${userAsset.fromErc20Units(balance)}`}</FormField>
            <EscapeHatchIndicator sdk={sdk} />
            <ActionSelect action={action} onSelect={setAction} />
            {action === Action.DEPOSIT && (
              <RecipientValueForm
                valueLabel="Deposit Value"
                buttonText="Deposit"
                initialValue="100"
                allowance={allowance}
                onApprove={async (value: bigint) => userAsset.approve(value)}
                onSubmit={async (value: bigint) => userAsset.deposit(value)}
                toNoteValue={(value: string) => userAsset.toErc20Units(value)}
                isLoading={isLoading(Action.DEPOSIT) || isLoading(Action.APPROVE)}
                error={errorMsg(Action.DEPOSIT)}
              />
            )}
            {action === Action.WITHDRAW && (
              <RecipientValueForm
                valueLabel="Withdraw Value"
                buttonText="Withdraw"
                onSubmit={async (value: bigint) => userAsset.withdraw(value)}
                toNoteValue={(value: string) => userAsset.toErc20Units(value)}
                isLoading={isLoading(Action.WITHDRAW)}
                error={errorMsg(Action.WITHDRAW)}
              />
            )}
            {action === Action.TRANSFER && (
              <RecipientValueForm
                valueLabel="Transfer Value"
                recipientLabel="To"
                buttonText="Transfer"
                onSubmit={async (value: bigint, recipient: string) =>
                  userAsset.transfer(value, GrumpkinAddress.fromString(recipient))
                }
                toNoteValue={(value: string) => userAsset.toErc20Units(value)}
                isLoading={isLoading(Action.TRANSFER)}
                error={errorMsg(Action.TRANSFER)}
              />
            )}
            {action === Action.MINT && (
              <RecipientValueForm
                valueLabel="Mint Value"
                buttonText="Mint"
                initialValue="100"
                onSubmit={async (value: bigint) => userAsset.mint(value)}
                toNoteValue={(value: string) => userAsset.toErc20Units(value)}
                isLoading={isLoading(Action.MINT)}
                error={errorMsg(Action.TRANSFER)}
              />
            )}
            {action === Action.PUBLIC_TRANSFER && (
              <RecipientValueForm
                valueLabel="Transfer Value"
                recipientLabel="To"
                buttonText="Public Send"
                allowance={allowance}
                onApprove={async (value: bigint) => userAsset.approve(value)}
                onSubmit={async (value: bigint, recipient: string) =>
                  userAsset.publicTransfer(value, EthAddress.fromString(recipient))
                }
                toNoteValue={(value: string) => userAsset.toErc20Units(value)}
                isLoading={isLoading(Action.PUBLIC_TRANSFER) || isLoading(Action.APPROVE)}
                error={errorMsg(Action.PUBLIC_TRANSFER)}
              />
            )}
          </Block>
          <Block top="xl">
            <ClearDataButton onClearData={async () => sdk.clearData()} disabled={false} />
          </Block>
        </>
      </FormSection>
    </Form>
  );
};
