import { useState } from 'react';
import { useTrackedFieldChangeHandlers } from '../../form_fields_hooks.js';
import { assessRegisterForm } from './assess_register_form.js';
import { getRegisterFormFeedback } from './register_form_feedback.js';
import { RegisterFormFields, INTIAL_REGISTRATION_FORM_FIELDS } from './register_form_fields.js';
import { useRegisterFormFlowRunner } from './register_form_flow_runner_hooks.js';
import { useRegisterFormResources } from './register_form_resources_hooks.js';

export function useRegisterForm() {
  const [fields, setFields] = useState<RegisterFormFields>(INTIAL_REGISTRATION_FORM_FIELDS);
  const [touchedFields, setters] = useTrackedFieldChangeHandlers(fields, setFields);
  const resources = useRegisterFormResources(fields);
  const assessment = assessRegisterForm(resources);
  const { runner, runnerState, submit, cancel, attemptedSubmit, locked, canSubmit } = useRegisterFormFlowRunner(
    resources,
    assessment,
  );
  const feedback = getRegisterFormFeedback(resources, assessment, touchedFields, attemptedSubmit);
  return { fields, setters, resources, assessment, runner, runnerState, locked, submit, cancel, canSubmit, feedback };
}

export type RegisterForm = ReturnType<typeof useRegisterForm>;
