import style from './gradient_border.module.scss';

interface GradientBorderProps {
  children: React.ReactNode;
  radius?: number;
  width?: number;
}

export function GradientBorder({ children, radius = 10, width = 2 }: GradientBorderProps) {
  return (
    <div className={style.root} style={{ borderRadius: radius, padding: `${width}px` }}>
      <div className={style.content} style={{ borderRadius: radius - 1 }}>
        {children}
      </div>
    </div>
  );
}
