import { useState } from 'react';
import { confirmAndSendErrorReport, formatError } from '../../alt-model/errors/error_utils.js';
import { useSdk } from '../../alt-model/top_level_context/top_level_context_hooks.js';
import { Button, ButtonSize, ButtonTheme } from '../../ui-components/index.js';

interface ReportErrorButtonProps {
  error: unknown;
}

export function ReportErrorButton(props: ReportErrorButtonProps) {
  const sdk = useSdk();
  const [sent, setSent] = useState(false);
  const handleSend = () => {
    if (sent || !sdk) return;
    const confirmedAndSent = confirmAndSendErrorReport(sdk, formatError(props.error) ?? '');
    setSent(confirmedAndSent);
  };
  return (
    <Button
      theme={ButtonTheme.Secondary}
      size={ButtonSize.Small}
      text={sent ? 'Error report sent' : 'Send error report'}
      onClick={handleSend}
      disabled={sent}
    />
  );
}
