import {
  CATEGORY_KEYS,
  CATEGORY_META,
  type CategoryKey,
} from '../shared/categories';

export const CATEGORIES = CATEGORY_META;

export { CATEGORY_KEYS };
export type { CategoryKey };

export function getCategoryColor(category: CategoryKey): string {
  return CATEGORY_META[category].textClass;
}

export function getCategoryBgColor(category: CategoryKey): string {
  return CATEGORY_META[category].bgClass;
}

export function getCategoryBorderColor(category: CategoryKey): string {
  return CATEGORY_META[category].borderClass;
}
