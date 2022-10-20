import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import style from './vertical_scroll_bar.module.scss';

interface VerticalScrollBarProps {
  contentHeight: number;
  viewHeight: number;
  onDragTo: (page: number) => void;
}

export interface VerticalScrollBarHandle {
  setScroll(scrollTop: number): void;
}

export const VerticalScrollBar = forwardRef<VerticalScrollBarHandle, VerticalScrollBarProps>((props, forwardedRef) => {
  const { contentHeight, viewHeight, onDragTo } = props;
  const barRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef(0);
  const barProportion = contentHeight / viewHeight;
  const showBar = barProportion < 1;
  const height = showBar ? undefined : `${100 / barProportion}%`;
  const visibility = showBar ? 'hidden' : 'visible';
  useImperativeHandle(
    forwardedRef,
    () => ({
      setScroll: (scrollTop: number) => {
        const elem = barRef.current;
        if (elem) {
          const page = scrollTop / viewHeight;
          pageRef.current = page;
          elem.style.transform = `translateY(${page * 100}%)`;
        }
      },
    }),
    [viewHeight],
  );
  useEffect(() => {
    const elem = barRef.current;
    if (elem) {
      const handleMouseDown = (e: MouseEvent) => {
        const height = elem.offsetHeight;
        const startY = e.pageY;
        const startPage = pageRef.current;
        const pageCount = contentHeight / viewHeight;
        document.body.style.cursor = 'pointer';
        const handleMouseMove = (e: MouseEvent) => {
          e.preventDefault();
          const y = e.pageY;
          const deltaPage = (y - startY) / height;
          const page = Math.max(0, Math.min(startPage + deltaPage, pageCount - 1));
          elem.style.transform = `translateY(${page * 100}%)`;
          const scrollTop = page * viewHeight;
          onDragTo(scrollTop);
        };
        window.addEventListener('mousemove', handleMouseMove);
        const handleMouseUp = () => {
          document.body.style.cursor = '';
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
        };
        window.addEventListener('mouseup', handleMouseUp);
      };
      elem.addEventListener('mousedown', handleMouseDown);
      return () => {
        elem.removeEventListener('mousedown', handleMouseDown);
      };
    }
  }, [onDragTo, viewHeight, contentHeight]);
  return (
    <div className={style.root} style={{ visibility }}>
      <div ref={barRef} className={style.bar} style={{ height, visibility }} />
    </div>
  );
});
