import { CardWrapper } from './card_wrapper/index.js';
import { CardContent } from './card_content/index.js';
import { CardHeader, CardHeaderSize } from './card_header/index.js';

interface CardProps {
  cardHeader: React.ReactNode;
  cardContent: React.ReactNode;
  inModal?: boolean;
  headerSize?: CardHeaderSize;
  className?: string;
  gradient?: string[];
}

export function Card({ cardHeader, cardContent, headerSize, className, gradient, inModal }: CardProps) {
  return (
    <CardWrapper className={className} inModal={inModal}>
      <CardHeader size={headerSize} gradient={gradient}>
        {cardHeader}
      </CardHeader>
      <CardContent>{cardContent}</CardContent>
    </CardWrapper>
  );
}
