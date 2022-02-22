import { useState } from 'react';
import { DefiSettlementTime } from '@aztec/sdk';
import { assets } from '../../../../app';
import { Page1 } from './page1';
import { Page2 } from './page2';
import { useDefiComposer, useDefiForm } from '../../../../alt-model/defi/defi_composer_hooks';
import { DefiRecipe } from '../../../../alt-model/defi/types';
import { DefiComposerPhase } from '../../../../alt-model/defi/defi_composer';
import { DefiFormFields } from './types';
import { Overlay } from '../../../../components/overlay';
import { DefiModalHeader } from './defi_modal_header';
import styled from 'styled-components/macro';
import { Card, CardHeaderSize } from 'ui-components';

const ModalWrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 80vw;
  max-width: 1000px;
`;

const ModalBody = styled.div`
  padding: 20px 40px;
`;

interface DefiModalProps {
  recipe: DefiRecipe;
  onClose: () => void;
}

export function DefiModal({ recipe, onClose }: DefiModalProps) {
  const enterBridgeId = recipe.bridgeFlow.enter;
  const inputAssetId = enterBridgeId.inputAssetIdA;
  const inputAsset = assets[inputAssetId];
  const [fields, setFields] = useState<DefiFormFields>({
    speed: DefiSettlementTime.NEXT_ROLLUP,
    amountStr: '',
  });
  const { invalid, amount, fee, fieldAnnotations, transactionLimit, maxAmount } = useDefiForm(
    enterBridgeId,
    inputAsset,
    fields,
  );
  const [locked, setLocked] = useState(false);
  const { compose, ...composerState } = useDefiComposer(enterBridgeId);
  const { phase } = composerState;
  const isIdle = phase === DefiComposerPhase.IDLE;
  const canClose = isIdle || phase === DefiComposerPhase.DONE;
  const handleSubmit = () => compose({ amount, speed: fields.speed });
  const canGoBack = locked && isIdle;
  const handleBack = canGoBack ? () => setLocked(false) : undefined;

  const page = locked ? (
    <Page2
      recipe={recipe}
      fields={fields}
      asset={inputAsset}
      fee={fee}
      composerState={composerState}
      onSubmit={handleSubmit}
      transactionLimit={transactionLimit}
    />
  ) : (
    <Page1
      recipe={recipe}
      inputAsset={inputAsset}
      fields={fields}
      onChangeFields={setFields}
      fieldAnnotations={fieldAnnotations}
      onNext={() => setLocked(true)}
      nextDisabled={invalid}
      fee={fee}
      maxAmount={maxAmount}
    />
  );
  return (
    <Overlay>
      <ModalWrapper>
        <Card
          headerSize={CardHeaderSize.LARGE}
          cardHeader={
            <DefiModalHeader recipe={recipe} closeDisabled={!canClose} onClose={onClose} onBack={handleBack} />
          }
          cardContent={<ModalBody>{page}</ModalBody>}
        />
      </ModalWrapper>
    </Overlay>
  );
}
