import { Page1 } from './page1';
import { Page2 } from './page2';
import { useDefiForm, DefiComposerPhase, DefiFormMode } from 'alt-model/defi/defi_form';
import { DefiRecipe } from 'alt-model/defi/types';
import { Overlay } from 'components/overlay';
import { DefiModalHeader } from './defi_modal_header';
import { Card, CardHeaderSize } from 'ui-components';
import { Modal } from 'components';

interface DefiModalProps {
  recipe: DefiRecipe;
  mode: DefiFormMode;
  prefilledAmountStr?: string;
  onClose: () => void;
}

export function DefiModal({ recipe, mode, prefilledAmountStr, onClose }: DefiModalProps) {
  const defiForm = useDefiForm(recipe, mode, prefilledAmountStr);
  const { fields, setters, validationResult, feedback, composerState, submit, attemptLock, locked, unlock } = defiForm;

  const phase = composerState?.phase;
  const isIdle = phase === DefiComposerPhase.IDLE;
  const canClose = phase === undefined || isIdle || phase === DefiComposerPhase.DONE;
  const canGoBack = locked && isIdle;
  const handleBack = canGoBack ? unlock : undefined;

  const page =
    locked && composerState ? (
      <Page2
        recipe={recipe}
        composerState={composerState}
        onSubmit={submit}
        onClose={onClose}
        validationResult={validationResult}
      />
    ) : (
      <Page1
        recipe={recipe}
        fields={fields}
        onChangeAmountStr={setters.amountStr}
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
