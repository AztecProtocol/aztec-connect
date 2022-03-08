import { Text } from 'components';
import style from './description_section.module.scss';

interface DescriptionSectionProps {
  text: string;
}

export function DescriptionSection({ text }: DescriptionSectionProps) {
  return (
    <div className={style.descriptionSection}>
      <Text italic size="xs" text={text} />
    </div>
  );
}
