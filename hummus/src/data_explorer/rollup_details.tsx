import { Rollup } from 'barretenberg-es/rollup_provider';
import moment from 'moment';
import React, { useState, useEffect } from 'react';
import { Form, FormSection } from '../components';
import { Block, Offset } from '@aztec/guacamole-ui';
import { App } from '../app';
import { DetailRow, ContentLink } from './detail_row';

const TxList = ({ txIds }: { txIds: string[] }) => (
  <Offset top="xs" bottom="xs">
    {txIds.map(txId => (
      <Block key={txId} padding="xs 0">
        <ContentLink text={`0x${txId.slice(0, 10)}`} href={`/tx/${txId}`} />
      </Block>
    ))}
  </Offset>
);

interface RollupDetailsProps {
  id: number;
  app: App;
}

export const RollupDetails = ({ id, app }: RollupDetailsProps) => {
  const [rollup, setRollup] = useState<Rollup | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unmounted = false;
    let fetchReq: number;

    const fetchAsync = async () => {
      try {
        const rollupData = await app.getRollup(id);
        if (unmounted) return;

        if (rollupData) {
          if (!rollup || rollupData.status !== rollup.status) {
            setRollup(rollupData);
          }
          if (rollupData.status !== 'SETTLED') {
            fetchReq = setTimeout(() => {
              fetchAsync();
            }, 1000);
          }
        }
      } catch (e) {}
      if (loading) {
        setLoading(false);
      }
    };

    if (!rollup || rollup.status !== 'SETTLED') {
      fetchAsync();
    }

    return () => {
      unmounted = true;
      clearTimeout(fetchReq);
    };
  }, [app, rollup, loading]);

  if (!rollup) {
    return (
      <Form>
        <FormSection title={loading ? 'Rollup Details' : 'Rollup Not Found'}>
          <DetailRow title="Id" content={`#${id}`} />
        </FormSection>
      </Form>
    );
  }

  return (
    <Form>
      <FormSection title="Rollup Details">
        <DetailRow title="Id" content={`#${rollup.id}`} />
        <DetailRow title="Status" content={rollup.status} />
        <DetailRow title="Txs" content={<TxList txIds={rollup.txIds} />} />
        <DetailRow title="Data Root" content={`0x${rollup.dataRoot}`} />
        <DetailRow title="Nullifier Root" content={`0x${rollup.nullRoot}`} />
        <DetailRow title="Eth Block" content={typeof rollup.ethBlock === 'number' ? `${rollup.ethBlock}` : '-'} />
        <DetailRow title="Eth Tx Hash" content={rollup.ethTxHash ? `0x${rollup.ethTxHash}` : '-'} />
        <DetailRow title="Created At" content={moment(new Date(rollup.created).toUTCString()).format('ll LTS +UTC')} />
      </FormSection>
    </Form>
  );
};
