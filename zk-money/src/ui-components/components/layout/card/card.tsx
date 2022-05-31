import { CardWrapper } from './card_wrapper';
import { CardContent } from './card_content';
import { CardHeader, CardHeaderSize } from './card_header';

interface CardProps {
  cardHeader: React.ReactNode;
  cardContent: React.ReactNode;
  headerSize?: CardHeaderSize;
  className?: string;
  gradient?: string[];
}

export function Card({ cardHeader, cardContent, headerSize, className, gradient }: CardProps) {
  return (
    <CardWrapper className={className}>
      <CardHeader size={headerSize} gradient={gradient}>
        {cardHeader}
      </CardHeader>
      <CardContent>{cardContent}</CardContent>
    </CardWrapper>
  );
}
