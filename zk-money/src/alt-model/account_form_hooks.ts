import { useEffect, useState } from 'react';
import { useApp } from './app_context';
import { AccountForm, AccountFormEvent, UserSessionEvent } from '../app';

export function useSyncProviderIntoForm(form?: AccountForm) {
  const { userSession } = useApp();
  useEffect(() => {
    if (form && userSession) {
      const updateProvider = () => form.changeProvider(userSession.getProvider());
      userSession.on(UserSessionEvent.UPDATED_PROVIDER, updateProvider);
      return () => {
        userSession.off(UserSessionEvent.UPDATED_PROVIDER, updateProvider);
      };
    }
  }, [form, userSession]);
}

export function useFormValues<TValues>(form?: AccountForm) {
  const [formValues, setFormValues] = useState(() => form?.getValues());
  useEffect(() => {
    if (form) {
      setFormValues(form.getValues());
      form.on(AccountFormEvent.UPDATED_FORM_VALUES, setFormValues);
      return () => {
        form.off(AccountFormEvent.UPDATED_FORM_VALUES, setFormValues);
      };
    }
  }, [form]);
  return formValues as TValues | undefined;
}

export function useFormIsProcessing(form?: AccountForm) {
  const [processing, setProcessing] = useState(false);
  useEffect(() => {
    if (form) {
      const updateProcessing = () => setProcessing(form.processing);
      updateProcessing();
      form.on(AccountFormEvent.UPDATED_FORM_STATUS, updateProcessing);
      return () => {
        form.off(AccountFormEvent.UPDATED_FORM_STATUS, updateProcessing);
      };
    }
  }, [form]);
  return processing;
}
