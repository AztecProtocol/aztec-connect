import { bindStyle } from 'ui-components/util/classnames';
import style from './submission_item_prompt.module.css';

const cx = bindStyle(style);

interface SubmissionItemPromptProps {
  children: React.ReactNode;
  errored?: boolean;
}

export function SubmissionItemPrompt({ children, errored }: SubmissionItemPromptProps) {
  return <div className={cx(style.root, { errored })}>{children}</div>;
}
