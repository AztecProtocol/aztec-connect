import { Tx } from 'barretenberg-es/rollup_provider';
import moment from 'moment';
import React, { useState, useEffect } from 'react';
import { Form, FormSection } from '../components';
import { App } from '../app';
import { DetailRow, ContentLink } from './detail_row';

interface TxDetailsProps {
  txId: string;
  app: App;
}

export const TxDetails = ({ txId, app }: TxDetailsProps) => {
  const [tx, setTx] = useState<Tx | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unmounted = false;
    let fetchReq: number;

    const fetchTxAsync = async () => {
      try {
        const txData = await app.getTx(txId);
        if (unmounted) return;

        if (txData) {
          if (!tx || (txData.rollup && (!tx.rollup || txData.rollup.status !== tx.rollup.status))) {
            setTx(txData);
          }
          if (!txData.rollup || txData.rollup.status !== 'SETTLED') {
            fetchReq = setTimeout(() => {
              fetchTxAsync();
            }, 1000);
          }
        }
      } catch (e) {}
      if (loading) {
        setLoading(false);
      }
    };

    if (!tx || !tx.rollup || tx.rollup.status !== 'SETTLED') {
      fetchTxAsync();
    }

    return () => {
      unmounted = true;
      clearTimeout(fetchReq);
    };
  }, [app, tx, loading]);

  if (!tx) {
    return (
      <Form>
        <FormSection title={loading ? 'Tx Details' : 'Tx Not Found'}>
          <DetailRow title="Id" content={`0x${txId}`} />
        </FormSection>
      </Form>
    );
  }

  return (
    <Form>
      <FormSection title="Tx Details">
        <DetailRow title="Id" content={`0x${tx.txId}`} />
        <DetailRow title="Status" content={tx.rollup ? tx.rollup.status : 'QUEUED'} />
        <DetailRow
          title="Rollup"
          content={tx.rollup ? <ContentLink text={`#${tx.rollup.id}`} href={`/rollup/${tx.rollup.id}`} /> : '-'}
        />
        <DetailRow title="Merkle Root" content={`0x${tx.merkleRoot}`} />
        <DetailRow title="New Note 1" content={`0x${tx.newNote1}`} />
        <DetailRow title="New Note 2" content={`0x${tx.newNote2}`} />
        <DetailRow title="Nullifier 1" content={`0x${tx.nullifier1}`} />
        <DetailRow title="Nullifier 2" content={`0x${tx.nullifier2}`} />
        <DetailRow title="Public Input" content={`${tx.publicInput}`} />
        <DetailRow title="Public Output" content={`${tx.publicOutput}`} />
        <DetailRow title="Created At" content={moment(new Date(tx.created).toUTCString()).format('ll LTS +UTC')} />
      </FormSection>
    </Form>
  );
};
