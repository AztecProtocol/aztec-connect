import { ReactComponent as SearchIcon } from '../../../images/search_icon.svg';
import style from './search_input.module.scss';

interface SearchInputProps {
  onChange: (value: string) => void;
}

export function SearchInput(props: SearchInputProps) {
  return (
    <div className={style.searchInputWrapper}>
      <div className={style.innerFrame}>
        <SearchIcon />
        <input
          className={style.searchInput}
          type="text"
          onChange={e => props.onChange(e.target.value)}
          placeholder="Search..."
        />
      </div>
    </div>
  );
}
