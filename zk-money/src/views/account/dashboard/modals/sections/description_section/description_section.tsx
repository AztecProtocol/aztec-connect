import { Text } from 'components';
import style from './description_section.module.scss';

interface DescriptionSectionProps {
  text: string;
}

export function DescriptionSection({ text }: DescriptionSectionProps) {
  return (
    <div className={style.descriptionSection}>
      <Text size="xs" text={text} />
    </div>
  );
}
