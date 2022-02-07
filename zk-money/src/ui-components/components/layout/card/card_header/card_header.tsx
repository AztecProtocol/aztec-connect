import style from './card_header.module.scss';

export enum CardHeaderSize {
  SMALL = '45px',
  MEDIUM = '65px',
  LARGE = '85px',
}

interface CardHeaderProps {
  size?: CardHeaderSize;
  children: React.ReactNode;
}

export function CardHeader({ children, size }: CardHeaderProps) {
  return (
    <div className={style.cardHeader} style={{ height: size || CardHeaderSize.MEDIUM }}>
      {children}
    </div>
  );
}
