import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { default as useFetch } from 'use-http';

import { Input } from '../components/index.js';
import searchSvg from '../images/search.svg';

export const SearchBar: React.FunctionComponent = () => {
  const history = useHistory();
  const [idData, setIdData] = useState<string>();
  const [hashData, setHashData] = useState<string>();

  const [value, setValue] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const { get: searchById } = useFetch(`/search?blockId=${value}`);
  const { get: searchByHash } = useFetch(`/search?txHash=${value}`);

  useEffect(() => {
    if (!history || !searchTerm || (!idData && !hashData)) return;

    if (idData) {
      history.push(`/block/${idData}`);
    } else if (hashData) {
      history.push(`/tx/${hashData}`);
    } else {
      history.push(`/search?q=${encodeURIComponent(searchTerm)}`);
    }
  }, [history, searchTerm, idData, hashData]);

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter' || searchTerm) return;

    e.preventDefault();

    const term = value.trim();
    if (!term) return;

    setSearchTerm(term);

    if (term.match(/^[0-9]+$/)) {
      const data = await searchById(value);
      setIdData(data);
    } else if (term.match(/^(0x)?[0-9a-f]{64}$/i)) {
      const data = await searchByHash(value);
      setHashData(data);
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
