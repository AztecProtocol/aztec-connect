import { Tx, TxHash, WebSdk } from 'aztec2-sdk';
import { toBigIntBE } from 'bigint-buffer';
import moment from 'moment';
import React, { useEffect, useState } from 'react';
import { Form, FormSection } from '../components';
import { ContentLink, DetailRow } from './detail_row';

interface TxDetailsProps {
  txHash: TxHash;
  app: WebSdk;
}

export const TxDetails = ({ txHash, app }: TxDetailsProps) => {
  const sdk = app.getSdk()!;
  const [tx, setTx] = useState<Tx | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unmounted = false;
    let fetchReq: NodeJS.Timer;

    const fetchTxAsync = async () => {
      try {
        const txData = await sdk.getTx(txHash);
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
      } catch (e) {
        /* swallow */
      }
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
          <DetailRow title="Id" content={`${txHash}`} />
        </FormSection>
      </Form>
    );
  }

  return (
    <Form>
      <FormSection title="Tx Details">
        <DetailRow title="Tx Hash" content={`${tx.txHash}`} />
        <DetailRow title="Status" content={tx.rollup ? tx.rollup.status : 'QUEUED'} />
        <DetailRow
          title="Rollup"
          content={tx.rollup ? <ContentLink text={`#${tx.rollup.id}`} href={`/rollup/${tx.rollup.id}`} /> : '-'}
        />
        <DetailRow title="Merkle Root" content={`0x${tx.merkleRoot.toString('hex')}`} />
        <DetailRow title="New Note 1" content={`0x${tx.newNote1.toString('hex')}`} />
        <DetailRow title="New Note 2" content={`0x${tx.newNote2.toString('hex')}`} />
        <DetailRow title="Nullifier 1" content={`0x${tx.nullifier1.toString('hex')}`} />
        <DetailRow title="Nullifier 2" content={`0x${tx.nullifier2.toString('hex')}`} />
        <DetailRow title="Public Input" content={toBigIntBE(tx.publicInput).toString()} />
        <DetailRow title="Public Output" content={toBigIntBE(tx.publicOutput).toString()} />
        <DetailRow title="Created At" content={moment(new Date(tx.created).toUTCString()).format('ll LTS +UTC')} />
      </FormSection>
    </Form>
  );
};
