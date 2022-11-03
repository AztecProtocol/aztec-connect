import React from 'react';
import style from './section_info.module.css';

export function SectionInfo(props: { children?: React.ReactNode }) {
  return <div className={style.root}>{props.children}</div>;
}
