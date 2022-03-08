import { GradientDisclosureIcon } from '../../icons/gradient_disclosure_icon';
import { GradientBorder } from '../../layout';
import style from './gradient_select_box.module.scss';

interface GradientSelectBoxProps {
  children: React.ReactNode;
}

export function GradientSelectBox(props: GradientSelectBoxProps) {
  return (
    <GradientBorder radius={8}>
      <div className={style.innerFrame}>
        <GradientDisclosureIcon />
        {props.children}
      </div>
    </GradientBorder>
  );
}
