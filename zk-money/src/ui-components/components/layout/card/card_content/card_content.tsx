import style from './card_content.module.scss';

interface CardContentProps {
  children: React.ReactNode;
}

export function CardContent({ children }: CardContentProps) {
  return <div className={style.cardContent}>{children}</div>;
}
