import style from './card_header.module.scss';

export enum CardHeaderSize {
  SMALL = '40px',
  MEDIUM = '50px',
  LARGE = '60px',
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
        minHeight: size || CardHeaderSize.MEDIUM,
        height: size || CardHeaderSize.MEDIUM,
        background:
          gradient && `linear-gradient(101.14deg, ${gradient[0]} 11.12%, ${gradient[1]} 58.22%, ${gradient[1]} 58.22%)`,
      }}
    >
      {children}
    </div>
  );
}
