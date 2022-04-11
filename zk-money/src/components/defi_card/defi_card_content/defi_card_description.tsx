import style from './defi_card_description.module.scss';

interface DefiCardDescriptionProps {
  text: string;
}

export const DefiCardDescription = ({ text }: DefiCardDescriptionProps) => {
  return (
    <div className={style.cardDescriptionWrapper}>
      <div className={style.cardDescriptionLabel}>{text}</div>
    </div>
  );
};
