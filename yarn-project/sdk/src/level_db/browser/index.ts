import { default as levelup } from 'levelup';
import { default as leveljs } from 'level-js';

export function levelUpWebFactory(id: string) {
  return levelup(leveljs(id));
}
