import { PrivacyIssue } from 'app';
import { useState, useEffect } from 'react';
import { ProgressBar } from 'ui-components';
import { RemoteAsset } from 'alt-model/types';
import { InformationSection } from '../information_section';
import { useDepositorBuckets } from './helpers';
import fullPrivacy from 'images/full_privacy.svg';
import style from './privacy_information_section.module.scss';

const approxCrowdFormatter = new Intl.NumberFormat('en-GB', { maximumSignificantDigits: 1, notation: 'compact' });
interface PrivacyInformationSectionProps {
  asset: RemoteAsset;
  amount: bigint;
  txToAlias?: boolean;
  privacyIssue?: PrivacyIssue;
}

interface PrivacyContentProps {
  txToAlias?: boolean;
  text: string;
  progress: number;
}

export function PrivacyInformationSection(props: PrivacyInformationSectionProps) {
  const [debouncedProps, setDebouncedProps] = useState(props);
  const { amount, privacyIssue, txToAlias } = debouncedProps;

  useEffect(() => {
    const task = setTimeout(() => setDebouncedProps(props), 500);
    return () => clearTimeout(task);
  }, [props]);

  const { asset } = debouncedProps;
  const buckets = useDepositorBuckets(asset.address);

  const countFromPrivacySet = buckets?.find(b => b.lowerBound >= amount)?.count ?? 1;
  const crowd = !privacyIssue || privacyIssue === 'none' ? countFromPrivacySet : 1;
  const approxCrowd = approxCrowdFormatter.format(crowd);
  const { text, progress, subtitle } = getPrivacyValues(crowd, approxCrowd, amount);

  return (
    <InformationSection
      title={'Privacy'}
      buttonLabel={'Why is this important?'}
      // TODO: Update privacy FAQ with more useful info
      helpLink="https://aztec-protocol.gitbook.io/zk-money/faq/faq-privacy"
      subtitle={!txToAlias ? subtitle : 'Max'}
      content={<PrivacyContent txToAlias={txToAlias} progress={progress} text={text} />}
    />
  );
}

function PrivacyContent(props: PrivacyContentProps) {
  const { txToAlias, progress, text } = props;

  if (txToAlias) {
    return (
      <div className={style.fullPrivacyWrapper}>
        <img alt="Full privacy" src={fullPrivacy} />
        <div className={style.text}>Payments to Alias are end to end encrypted!</div>
      </div>
    );
  }

  return (
    <div className={style.privacyWrapper}>
      <ProgressBar className={style.bar} progress={progress} />
      <div className={style.text}>{text}</div>
    </div>
  );
}

const getPrivacyValues = (crowd: number, approxCrowd: string, amount: bigint) => {
  if (amount === 0n) {
    return { progress: 0, subtitle: '', text: 'Please enter an amount to see the privacy level' };
  }
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
