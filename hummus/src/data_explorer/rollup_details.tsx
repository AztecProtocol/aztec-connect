import { Block, Offset } from '@aztec/guacamole-ui';
import { Rollup } from 'aztec2-sdk';
import { WebSdk } from 'aztec2-sdk';
import moment from 'moment';
import React, { useEffect,useState } from 'react';
import { Form, FormSection } from '../components';
import { ContentLink,DetailRow } from './detail_row';

const TxList = ({ txHashes }: { txHashes: Buffer[] }) => (
  <Offset top="xs" bottom="xs">
    {txHashes.map(txHash => (
      <Block key={txHash} padding="xs 0">
        <ContentLink text={`0x${txHash.toString('hex').slice(0, 10)}`} href={`/tx/${txHash.toString('hex')}`} />
      </Block>
    ))}
  </Offset>
);

interface RollupDetailsProps {
  id: number;
  app: WebSdk;
}

export const RollupDetails = ({ id, app }: RollupDetailsProps) => {
  const sdk = app.getSdk()!;
  const [rollup, setRollup] = useState<Rollup | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unmounted = false;
    let fetchReq: NodeJS.Timer;

    const fetchAsync = async () => {
      try {
        const rollupData = await sdk.getRollup(id);
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
      } catch (e) {
        /* swallow */
      }
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
        <DetailRow title="Txs" content={<TxList txHashes={rollup.txHashes} />} />
        <DetailRow title="Data Root" content={`0x${rollup.dataRoot.toString('hex')}`} />
        <DetailRow title="Eth Block" content={typeof rollup.ethBlock === 'number' ? `${rollup.ethBlock}` : '-'} />
        <DetailRow title="Eth Tx Hash" content={rollup.ethTxHash ? `0x${rollup.ethTxHash.toString('hex')}` : '-'} />
        <DetailRow title="Created At" content={moment(new Date(rollup.created).toUTCString()).format('ll LTS +UTC')} />
      </FormSection>
    </Form>
  );
};
