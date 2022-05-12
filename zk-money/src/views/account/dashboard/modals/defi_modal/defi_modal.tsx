import { DefiEnterPage1 } from './defi_enter_page1';
import { DefiExitPage1 } from './defi_exit_page1';
import { useDefiForm, DefiComposerPhase, DefiFormMode } from 'alt-model/defi/defi_form';
import { DefiRecipe } from 'alt-model/defi/types';
import { Overlay } from 'components/overlay';
import { DefiModalHeader } from './defi_modal_header';
import { Card, CardHeaderSize } from 'ui-components';
import { Modal } from 'components';
import { DefiConfirmationPage } from './defi_confirmation_page';

interface DefiModalProps {
  recipe: DefiRecipe;
  mode: DefiFormMode;
  onClose: () => void;
}

export function DefiModal({ recipe, mode, onClose }: DefiModalProps) {
  const defiForm = useDefiForm(recipe, mode);
  const { fields, setters, validationResult, feedback, composerState, submit, attemptLock, locked, unlock } = defiForm;

  const phase = composerState?.phase;
  const isIdle = phase === DefiComposerPhase.IDLE;
  const canClose = phase === undefined || isIdle || phase === DefiComposerPhase.DONE;
  const canGoBack = locked && isIdle;
  const handleBack = canGoBack ? unlock : undefined;

  const Page1 = mode === 'enter' ? DefiEnterPage1 : DefiExitPage1;

  const page =
    locked && composerState ? (
      <DefiConfirmationPage
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
