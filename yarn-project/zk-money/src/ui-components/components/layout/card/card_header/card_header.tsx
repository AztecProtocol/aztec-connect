import style from './card_header.module.scss';

export enum CardHeaderSize {
  SMALL = '45px',
  MEDIUM = '65px',
  LARGE = '85px',
}

interface CardHeaderProps {
  size?: CardHeaderSize;
  gradient?: string[];
  children: React.ReactNode;
}

export function CardHeader({ children, size, gradient }: CardHeaderProps) {
  return (
    <div
      className={style.cardHeader}
      style={{
        height: size || CardHeaderSize.MEDIUM,
        background:
          gradient && `linear-gradient(101.14deg, ${gradient[0]} 11.12%, ${gradient[1]} 58.22%, ${gradient[1]} 58.22%)`,
      }}
    >
      {children}
    </div>
  );
}
