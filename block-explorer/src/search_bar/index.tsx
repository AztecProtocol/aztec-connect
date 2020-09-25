import { gql } from 'apollo-boost';
import React, { useState, useEffect } from 'react';
import { useLazyQuery } from 'react-apollo';
import { useHistory } from 'react-router-dom';
import { Input } from '../components';
import searchSvg from '../images/search.svg';

const SEARCH_BY_ID = gql`
  query Search($id: Int) {
    rollup(id: $id) {
      id
    }
  }
`;

const SEARCH_BY_HASH = gql`
  query Search($hash: HexString!) {
    tx(txId: $hash) {
      txId
    }
    rollup(ethTxHash: $hash) {
      id
    }
  }
`;

export const SearchBar: React.FunctionComponent = () => {
  const history = useHistory();
  const [searchById, { data: idData }] = useLazyQuery(SEARCH_BY_ID);
  const [searchByHash, { data: hashData }] = useLazyQuery(SEARCH_BY_HASH);
  const [value, setValue] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!history || !searchTerm || (!idData && !hashData)) return;

    if (idData?.rollup) {
      history.push(`/block/${idData.rollup.id}`);
    } else if (hashData?.tx) {
      history.push(`/tx/${hashData.tx.txId}`);
    } else if (hashData?.rollup) {
      history.push(`/block/${hashData.rollup.id}`);
    } else {
      history.push(`/search?q=${encodeURIComponent(searchTerm)}`);
    }
  }, [history, searchTerm, idData, hashData]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.keyCode !== 13 || searchTerm) return;

    e.preventDefault();

    const term = value.trim();
    if (!term) return;

    setSearchTerm(term);

    if (term.match(/^[0-9]+$/)) {
      searchById({ variables: { id: +value } });
    } else if (term.match(/^(0x)?[0-9a-f]{64}$/i)) {
      searchByHash({ variables: { hash: value } });
    } else {
      history.push(`/search?q=${encodeURIComponent(term)}`);
    }
  };

  return (
    <Input
      theme="green"
      icon={searchSvg}
      value={value}
      placeholder="Search by tx hash, block number or block hash"
      autoCapitalize="none"
      autoComplete="off"
      autoCorrect="off"
      spellCheck="false"
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
    />
  );
};
