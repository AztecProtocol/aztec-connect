import { CardWrapper } from './card_wrapper';
import { CardContent } from './card_content';
import { CardHeader, CardHeaderSize } from './card_header';

interface CardProps {
  cardHeader: React.ReactNode;
  cardContent: React.ReactNode;
  headerSize?: CardHeaderSize;
  className?: string;
}

export function Card({ cardHeader, cardContent, headerSize, className }: CardProps) {
  return (
    <CardWrapper className={className}>
      <CardHeader size={headerSize}>{cardHeader}</CardHeader>
      <CardContent>{cardContent}</CardContent>
    </CardWrapper>
  );
}
