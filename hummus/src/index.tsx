import React from 'react';
import ReactDOM from 'react-dom';
import { doTheThings } from './tmp_sign';
import { createProof } from './create_proof';
require('barretenberg/wasm/barretenberg.wasm');

function LandingPage(props: any) {
  return (
    <form>
      <label>Press the button: </label><input type="button" value="The Button" onClick={createProof}></input>
    </form>
  );
}

async function main() {
  ReactDOM.render(<LandingPage />, document.getElementById('root'));
}

// tslint:disable-next-line:no-console
main().catch(console.error);
