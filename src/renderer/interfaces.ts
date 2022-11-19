import { ItemType } from './constants';

export interface ItemMeta {
  readonly type: ItemType;

  readonly name: string;
  readonly data: string;
  readonly id?: string;
  readonly tags: string[];
}
