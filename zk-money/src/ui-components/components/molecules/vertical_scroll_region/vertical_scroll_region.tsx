import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  VerticalScrollBar,
  VerticalScrollBarHandle,
} from 'ui-components/components/atoms/vertical_scroll_bar/vertical_scroll_bar';
import style from './vertical_scroll_region.module.css';

const FADE_WIDTH = 30;

function applyFade(elem: HTMLDivElement, viewHeight: number, contentHeight: number, scrollTop: number) {
  const topFadeSize = Math.min(scrollTop, FADE_WIDTH);
  const bottomFadeSize = Math.min(Math.max(contentHeight - (scrollTop + viewHeight), 0), FADE_WIDTH);
  elem.style.mask =
    elem.style.webkitMask = `linear-gradient(transparent 0%, white ${topFadeSize}px, white calc(100% - ${bottomFadeSize}px), transparent 100%)`;
}

export function VerticalScrollRegion(props: { children?: React.ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<VerticalScrollBarHandle>(null);
  const [contentHeight, setContentHeight] = useState(0);
  const [viewHeight, setViewHeight] = useState(0);
  useEffect(() => {
    const applyProportions = () => {
      const contentHeight = contentRef.current?.offsetHeight ?? 0;
      setContentHeight(contentHeight);
      const viewHeight = rootRef.current?.offsetHeight ?? 0;
      setViewHeight(viewHeight);
      if (viewportRef.current) applyFade(viewportRef.current, viewHeight, contentHeight, 0);
    };

    applyProportions();
    requestAnimationFrame(() => {
      // We repeat because font loading could cause the content to resize
      requestAnimationFrame(applyProportions);
    });
  }, []);
  const handleScrollTo = useCallback((scrollTop: number) => {
    const elem = viewportRef.current;
    if (elem) elem.scrollTop = scrollTop;
    if (viewportRef.current) applyFade(viewportRef.current, viewHeight, contentHeight, scrollTop);
  }, []);
  const handleScroll = () => {
    const scrollTop = viewportRef.current?.scrollTop ?? 0;
    barRef.current?.setScroll(scrollTop);
    if (viewportRef.current) applyFade(viewportRef.current, viewHeight, contentHeight, scrollTop);
  };
  return (
    <div className={style.root} ref={rootRef}>
      <div className={style.viewport} ref={viewportRef} onScroll={handleScroll}>
        <div ref={contentRef}>{props.children}</div>
      </div>
      <VerticalScrollBar ref={barRef} viewHeight={viewHeight} contentHeight={contentHeight} onDragTo={handleScrollTo} />
    </div>
  );
}
