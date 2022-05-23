import style from './skeleton_rect.module.css';

interface SkeletonRectProps {
  sizingContent: React.ReactNode;
}

export function SkeletonRect(props: SkeletonRectProps) {
  return (
    <div className={style.root}>
      <div className={style.invisible}>{props.sizingContent}</div>
    </div>
  );
}
