import { Text } from 'components';
import { bindStyle } from 'ui-components/util/classnames';
import style from './description_section.module.scss';

const cx = bindStyle(style);
interface DescriptionSectionProps {
  text: string;
  className?: string;
}

export function DescriptionSection({ text, className }: DescriptionSectionProps) {
  return (
    <div className={cx(style.descriptionSection, className)}>
      <Text size="xs" text={text} />
    </div>
  );
}
