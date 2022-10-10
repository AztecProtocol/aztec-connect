import { useState, useEffect } from 'react';
import { ProgressBar } from '../../../../../../ui-components/index.js';
import { RemoteAsset } from '../../../../../../alt-model/types.js';
import { InformationSection } from '../information_section/index.js';
import style from './privacy_information_section.module.scss';
import { useRollupProviderStatus } from '../../../../../../alt-model/index.js';
import { PrivacySet } from '@aztec/sdk';
import { FullPrivacy } from './full_privacy.js';

const approxCrowdFormatter = new Intl.NumberFormat('en-GB', { maximumSignificantDigits: 1, notation: 'compact' });
interface PrivacyInformationSectionProps {
  asset: RemoteAsset;
  amount: bigint;
  txToAlias?: boolean;
  hasMajorPrivacyIssue?: boolean;
}

interface PrivacyContentProps {
  txToAlias?: boolean;
  text: string;
  progress: number;
}

export function PrivacyInformationSection(props: PrivacyInformationSectionProps) {
  const rpStatus = useRollupProviderStatus();
  const [debouncedProps, setDebouncedProps] = useState(props);
  const { amount, hasMajorPrivacyIssue } = debouncedProps;

  useEffect(() => {
    const task = setTimeout(() => setDebouncedProps(props), 500);
    return () => clearTimeout(task);
  }, [props]);

  const { asset } = debouncedProps;
  const privacySets: PrivacySet[] | undefined = rpStatus.runtimeConfig.privacySets[asset.id];

  const countFromPrivacySet = privacySets?.find(b => b.value >= amount)?.users ?? 1;
  const crowd = hasMajorPrivacyIssue ? 1 : countFromPrivacySet;
  const { text, progress, subtitle } = getPrivacyValues(!!privacySets, crowd, amount);

  return (
    <InformationSection
      title={'Privacy'}
      buttonLabel={'Why is this important?'}
      helpLink="https://docs.aztec.network/how-aztec-works/privacy-sets"
      subtitle={!props.txToAlias ? subtitle : 'Max'}
      content={<PrivacyContent txToAlias={props.txToAlias} progress={progress} text={text} />}
    />
  );
}

function PrivacyContent(props: PrivacyContentProps) {
  const { txToAlias, progress, text } = props;

  if (txToAlias) {
    return (
      <div className={style.fullPrivacyWrapper}>
        <FullPrivacy />
        <div className={style.text}>Payments to an alias are end-to-end encrypted!</div>
      </div>
    );
  }

  return (
    <div className={style.privacyWrapper}>
      <ProgressBar className={style.bar} progress={progress} />
      <div className={style.text} style={{ minHeight: 60 }}>
        {text}
      </div>
    </div>
  );
}

const getPrivacyValues = (privacySetsAvailable: boolean, crowd: number, amount: bigint) => {
  if (!privacySetsAvailable) {
    return {
      progress: 0,
      subtitle: 'Unknown',
      text: "Privacy information isn't yet available for this asset",
    };
  }
  if (amount === 0n) {
    return { progress: 0, subtitle: '', text: 'Please enter an amount to see the privacy level' };
  }
  const approxCrowd = approxCrowdFormatter.format(crowd);
  if (crowd < 2) {
    return {
      progress: 0,
      subtitle: 'Very Low',
      text: 'The crowd is gone. Everyone can see this payment is you.\n\nAlways use a fresh address for withdrawls',
    };
  } else if (crowd < 30) {
    return {
      progress: 0.3,
      subtitle: 'Low',
      text: `The crowd is tiny. This payment hides in ~${approxCrowd} people.\n\nTry sending a smaller amount or waiting for more deposits.`,
    };
  } else if (crowd < 100) {
    return {
      subtitle: 'Medium',
      progress: 0.6,
      text: `The crowd is small. This payment hides in ~${approxCrowd} people.\n\nTry sending a smaller amount or waiting for more deposits.`,
    };
  } else if (crowd < 500) {
    return {
      progress: 0.9,
      subtitle: 'High',
      text: `The crowd is large. This payment hides in ~${approxCrowd} people`,
    };
  }
  return { progress: 1, subtitle: 'Max', text: `The crowd is huge. This payment hides in ~${approxCrowd} people` };
};
