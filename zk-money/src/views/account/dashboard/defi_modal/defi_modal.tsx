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
import { borderRadiuses, colours } from '../../../../styles';

const ModalWrapper = styled.div`
  display: flex;
  flex-direction: column;
  max-width: 900px;
`;

const ModalBody = styled.div`
  padding: 0 37px 28px 37px;
  border-radius: 0 0 ${borderRadiuses.m} ${borderRadiuses.m};
  background-color: ${colours.white};
`;

const CardShoulders = styled.div`
  height: 20px;
  border-radius: ${borderRadiuses.m} ${borderRadiuses.m} 0 0;
  margin-top: -20px;
  background-color: ${colours.white};
`;

interface DefiModalProps {
  recipe: DefiRecipe;
  onClose: () => void;
}

export function DefiModal({ recipe, onClose }: DefiModalProps) {
  const enterBridgeId = recipe.bridgeFlow.enter;
  const inputAssetId = enterBridgeId.inputAssetId;
  const inputAsset = assets[inputAssetId];
  const [fields, setFields] = useState<DefiFormFields>({
    speed: DefiSettlementTime.NEXT_ROLLUP,
    amountStr: '',
  });
  const { invalid, amount, fee, fieldAnnotations, maxAmount } = useDefiForm(enterBridgeId, inputAsset, fields);
  const [locked, setLocked] = useState(false);
  const { compose, ...composerState } = useDefiComposer(enterBridgeId);
  const { phase } = composerState;
  const canClose = phase === DefiComposerPhase.IDLE || phase === DefiComposerPhase.DONE;
  const handleSubmit = () => compose({ amount, speed: fields.speed });
  const page = locked ? (
    <Page2
      fields={fields}
      asset={inputAsset}
      fee={fee}
      composerState={composerState}
      onSubmit={handleSubmit}
      maxAmount={maxAmount}
    />
  ) : (
    <Page1
      inputAsset={inputAsset}
      fields={fields}
      onChangeFields={setFields}
      fieldAnnotations={fieldAnnotations}
      onNext={() => setLocked(true)}
      nextDisabled={invalid}
      fee={fee}
    />
  );
  return (
    <Overlay>
      <ModalWrapper>
        <DefiModalHeader recipe={recipe} closeDisabled={!canClose} onClose={onClose} />
        <CardShoulders />
        <ModalBody>{page}</ModalBody>
      </ModalWrapper>
    </Overlay>
  );
}
