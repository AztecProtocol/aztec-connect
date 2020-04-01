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

function LandingPage({ proofCreator }: LandingPageProps) {
  const [init, setInit] = useState(State.UNINITIALIZED);
  return (
    <form>
      <p>State: {init.toString()}</p>
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
              const p = await proofCreator.createProof();
              await proofCreator.verifyProof(p);
              break;
            }
          }
        }}
        disabled={init == State.INITIALIZING}
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
