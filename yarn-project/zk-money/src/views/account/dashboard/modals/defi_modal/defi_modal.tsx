import { DefiEnterPage1 } from './defi_enter_page1/index.js';
import { DefiExitPage1 } from './defi_exit_page1/index.js';
import { useDefiForm, DefiComposerPhase } from '../../../../../alt-model/defi/defi_form/index.js';
import { DefiRecipe, FlowDirection } from '../../../../../alt-model/defi/types.js';
import { Overlay } from '../../../../../components/overlay.js';
import { DefiModalHeader } from './defi_modal_header.js';
import { Card, CardHeaderSize } from '../../../../../ui-components/index.js';
import { Modal } from '../../../../../components/index.js';
import { DefiConfirmationPage } from './defi_confirmation_page/index.js';

export interface DefiModalProps {
  recipe: DefiRecipe;
  flowDirection: FlowDirection;
  onClose: () => void;
}

export function DefiModal({ recipe, flowDirection, onClose }: DefiModalProps) {
  const defiForm = useDefiForm(recipe, flowDirection);
  const {
    fields,
    setters,
    validationResult,
    feedback,
    composerState,
    lockedComposerPayload,
    submit,
    attemptLock,
    locked,
    unlock,
  } = defiForm;

  const phase = composerState?.phase;
  const isIdle = phase === DefiComposerPhase.IDLE;
  const canClose = phase === undefined || isIdle || phase === DefiComposerPhase.DONE;
  const canGoBack = locked && isIdle;
  const handleBack = canGoBack ? unlock : undefined;

  const Page1 = flowDirection === 'enter' ? DefiEnterPage1 : DefiExitPage1;

  const page =
    locked && composerState && lockedComposerPayload ? (
      <DefiConfirmationPage
        flowDirection={flowDirection}
        recipe={recipe}
        composerState={composerState}
        lockedComposerPayload={lockedComposerPayload}
        onSubmit={submit}
        onClose={onClose}
        onBack={handleBack}
        validationResult={validationResult}
      />
    ) : (
      <Page1
        flowDirection={flowDirection}
        recipe={recipe}
        fields={fields}
        onChangeAuxDataCustomisationState={setters.auxDataCustomisationState}
        onChangeAmountStrOrMax={setters.amountStrOrMax}
        onChangeSpeed={setters.speed}
        feedback={feedback}
        onNext={attemptLock}
        validationResult={validationResult}
      />
    );

  return (
    <Overlay>
      <Modal onClose={onClose}>
        <Card
          gradient={recipe.gradient}
          headerSize={CardHeaderSize.LARGE}
          cardHeader={
            <DefiModalHeader recipe={recipe} closeDisabled={!canClose} onClose={onClose} onBack={handleBack} />
          }
          cardContent={page}
        />
      </Modal>
    </Overlay>
  );
}
