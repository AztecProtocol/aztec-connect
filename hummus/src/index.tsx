import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { ProofCreator } from './create_proof';
require('barretenberg-es/wasm/barretenberg.wasm');

interface LandingPageProps {
  proofCreator: ProofCreator;
}

enum State {
  UNINITIALIZED = 'Uninitialized',
  INITIALIZING = 'Initializing',
  INITIALIZED = 'Initialized',
}

enum ProofState {
  NADA = 'Nada',
  RUNNING = 'Running',
  FAILED = 'Failed',
  VERIFIED = 'Verified',
}

function LandingPage({ proofCreator }: LandingPageProps) {
  const [init, setInit] = useState(State.UNINITIALIZED);
  const [result, setResult] = useState(ProofState.NADA);
  const [time, setTime] = useState(0);
  return (
    <form>
      <p>Init State: {init.toString()}</p>
      <p>Proof State: {result.toString()}</p>
      <p>Proof Time: {time.toString()}ms</p>
      <label>Press the button: </label>
      <input
        type="button"
        value="The Button"
        onClick={async () => {
          switch (init) {
            case State.UNINITIALIZED: {
              setInit(State.INITIALIZING);
              await proofCreator.init();
              setInit(State.INITIALIZED);
              break;
            }
            case State.INITIALIZED: {
              setResult(ProofState.RUNNING);
              const start = new Date().getTime();
              const p = await proofCreator.createProof();
              setTime(new Date().getTime() - start);
              const r = await proofCreator.verifyProof(p);
              setResult(r ? ProofState.VERIFIED : ProofState.FAILED);
              break;
            }
          }
        }}
        disabled={init == State.INITIALIZING || result == ProofState.RUNNING}
      ></input>
    </form>
  );
}

async function main() {
  const proofCreator = new ProofCreator();
  ReactDOM.render(<LandingPage proofCreator={proofCreator} />, document.getElementById('root'));
}

// tslint:disable-next-line:no-console
main().catch(console.error);
