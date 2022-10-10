import { useEffect, useState } from 'react';
import { AliasCheckResult, VerifyAliasFlowState } from '../../toolbox/flows/verify_alias_flow.js';
import style from './alias_checker.module.css';

function getResultMessage(result: AliasCheckResult) {
  switch (result) {
    case 'invalid':
      return 'Invalid format';
    case 'matches':
      return "Alias matches - please press 'Next'";
    case 'different-account':
      return "This alias belongs to a different public key. If you are sure that this is the alias that you need to recover, you are using the wrong ethereum wallet -- please press 'cancel', then press 'Retry from beginning' to try the process again with a different ethereum wallet.";
    case 'not-found':
      return 'This alias does not exist in this system. If you want to use it you can go ahead and register it.';
  }
}

export function AliasChecker(props: { flowState: VerifyAliasFlowState }) {
  const [alias, setAlias] = useState('');
  const [result, setResult] = useState<AliasCheckResult>();
  const { checkAlias, next } = props.flowState;
  useEffect(() => {
    if (!alias) {
      setResult(undefined);
      return;
    }
    checkAlias(alias).then(setResult);
  }, [alias, checkAlias]);
  return (
    <div className={style.root}>
      <input placeholder="alias" value={alias} onChange={e => setAlias(e.target.value)} />
      {result ? getResultMessage(result) : <br />}
      <button onClick={next} disabled={result !== 'matches'}>
        Next
      </button>
    </div>
  );
}
