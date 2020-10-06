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
    rollup(hash: $hash) {
      id
    }
    publishedRollup: rollup(ethTxHash: $hash) {
      id
    }
  }
`;

const SEARCH_BY_PARTIAL_HASH = gql`
  query Search($hash: HexString!) {
    txs(take: 1, where: { txId_starts_with: $hash }) {
      txId
    }
    rollups(take: 1, where: { hash_starts_with: $hash }) {
      id
    }
    publishedRollups: rollups(take: 1, where: { ethTxHash_starts_with: $hash }) {
      id
    }
    txs_end: txs(take: 1, where: { txId_ends_with: $hash }) {
      txId
    }
    rollups_end: rollups(take: 1, where: { hash_ends_with: $hash }) {
      id
    }
    publishedRollups_end: rollups(take: 1, where: { ethTxHash_ends_with: $hash }) {
      id
    }
  }
`;

export const SearchBar: React.FunctionComponent = () => {
  const history = useHistory();
  const [searchById, { data: idData }] = useLazyQuery(SEARCH_BY_ID);
  const [searchByHash, { data: hashData }] = useLazyQuery(SEARCH_BY_HASH);
  const [searchByPartialHash, { data: partialHashData }] = useLazyQuery(SEARCH_BY_PARTIAL_HASH);
  const [value, setValue] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!history || !searchTerm || (!idData && !hashData && !partialHashData)) return;

    if (idData?.rollup) {
      history.push(`/block/${idData.rollup.id}`);
    } else if (hashData?.tx) {
      history.push(`/tx/${hashData.tx.txId}`);
    } else if (hashData?.rollup || hashData?.publishedRollup) {
      history.push(`/block/${(hashData.rollup || hashData.publishedRollup).id}`);
    } else if (partialHashData?.txs.length || partialHashData?.txs_end.length) {
      history.push(`/tx/${(partialHashData.txs[0] || partialHashData.txs_end[0]).txId}`);
    } else if (
      partialHashData?.rollups.length ||
      partialHashData?.publishedRollups.length ||
      partialHashData?.rollups_end.length ||
      partialHashData?.publishedRollups_end.length
    ) {
      history.push(
        `/block/${
          (
            partialHashData.rollups[0] ||
            partialHashData.publishedRollups[0] ||
            partialHashData.rollups_end[0] ||
            partialHashData.publishedRollups_end[0]
          ).id
        }`,
      );
    } else {
      history.push(`/search?q=${encodeURIComponent(searchTerm)}`);
    }
  }, [history, searchTerm, idData, hashData, partialHashData]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter' || searchTerm) return;

    e.preventDefault();

    const term = value.trim();
    if (!term) return;

    setSearchTerm(term);

    if (term.match(/^[0-9]+$/)) {
      searchById({ variables: { id: +value } });
    } else if (term.match(/^(0x)?[0-9a-f]{64}$/i)) {
      searchByHash({ variables: { hash: value } });
    } else if (term.match(/^(0x)?[0-9a-f]+$/i)) {
      searchByPartialHash({ variables: { hash: value } });
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
