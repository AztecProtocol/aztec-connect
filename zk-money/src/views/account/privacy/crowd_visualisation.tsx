import React, { useEffect, useMemo, useRef } from 'react';
import styled from 'styled-components/macro';
import { MAX_X, MAX_Y, calcScene, ELLIPSE_ASPECT, MAX_SIZE } from './crowd_util';
import personSvg from '../../../images/person.svg';

const DOM_WIDTH = 300;
const DOM_HEIGHT = DOM_WIDTH / ELLIPSE_ASPECT;
const UNIT_X = DOM_WIDTH / (MAX_X * 2);
const UNIT_Y = DOM_HEIGHT / (MAX_Y * 2);

const Root = styled.div`
  width: ${DOM_WIDTH}px;
  height: ${DOM_HEIGHT}px;
  position: relative;
  margin: auto;
`;

const Disc = styled.div`
  position: absolute;
  top: 10%;
  left: 10%;
  width: 80%;
  height: 80%;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.2);
`;

const Crowd = styled.div`
  position: absolute;
  width: 100%;
  height: 100%;
  will-change: transform;
  transition: transform 0.5s;
`;

const Person = styled.div`
  position: absolute;
  top: ${-UNIT_X * 2}px;
  left: ${-UNIT_Y * 0.75}px;
  background: url(${personSvg});
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
  width: ${UNIT_X * 2}px;
  height: ${UNIT_Y * 2}px;
  will-change: opacity, transform;
  transition: transform 0.5s, opacity 0.5s;
`;

interface CrowdVisualisationProps {
  size: number;
}

export const CrowdVisualisation: React.FunctionComponent<CrowdVisualisationProps> = ({ size }) => {
  const clampedSize = Math.floor(Math.min(MAX_SIZE, Math.max(1, Math.ceil(size))));
  const prevSizeRef = useRef(clampedSize);
  const prevSize = prevSizeRef.current;
  useEffect(() => {
    prevSizeRef.current = clampedSize;
  }, [clampedSize]);
  const diff = clampedSize - prevSize;
  const isGrowing = diff > 0;
  const delay = isGrowing
    ? (idx: number) => (0.5 * Math.max(0, idx - prevSize)) / diff
    : (idx: number) => 0.5 - (0.5 * Math.max(0, prevSize - idx)) / diff;
  const { zoom, people } = useMemo(() => calcScene(clampedSize), [clampedSize]);
  return (
    <Root>
      <Disc />
      <Crowd
        style={{
          transform: `scale(${zoom}) translate(50%, 50%)`,
          transitionDelay: isGrowing ? '0s' : '0.5s',
          transitionDuration: isGrowing ? '1s' : '1.5s',
        }}
      >
        {people.map(({ pos, opacity }, idx) => (
          <Person
            key={idx}
            style={{
              transform: `translate(${pos.x * UNIT_X}px, ${pos.y * UNIT_Y}px)`,
              opacity,
              transitionDelay: `${delay(idx)}s`,
            }}
          />
        ))}
      </Crowd>
    </Root>
  );
};
