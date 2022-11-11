import { ContentWrapper } from '../../components/template/content_wrapper.js';
import { Text } from '../../components/index.js';
import { Button } from '../../ui-components/index.js';
import { SupportStatus } from '../../device_support.js';
import style from './unsupported_popup.module.css';

function getUnsupportedHeading(status: SupportStatus) {
  switch (status) {
    case 'firefox-private-unsupported':
      return 'Firefox private windows unsupported.';
    default:
      return 'Browser not supported.';
  }
}

function getUnsupportedText(status: SupportStatus) {
  switch (status) {
    case 'firefox-private-unsupported':
      return (
        "We recommend either exiting Firefox's private mode, or using a different browser.\n\n" +
        'Unfortunately in private mode Firefox disables IndexedDB interactions, which are necessary for zk.money to function.'
      );
    default:
      return 'We recommend using the latest version of a desktop browser.';
  }
}

interface UnsupportedPopupProps {
  supportStatus: SupportStatus;
  onClose: () => void;
}

export function UnsupportedPopup(props: UnsupportedPopupProps) {
  return (
    <div className={style.root}>
      <div className={style.wrapper}>
        <ContentWrapper className={style.content}>
          <Text text={getUnsupportedHeading(props.supportStatus)} size="m" weight="semibold" />
          <Text className={style.message} text={getUnsupportedText(props.supportStatus)} size="s" />
          <Button text="Close" onClick={props.onClose} />
        </ContentWrapper>
      </div>
    </div>
  );
}
