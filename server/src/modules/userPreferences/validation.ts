import type {
    ApplicationBoardSortOrder,
    ApplicationListSortOrder,
    CollectionViewMode,
    NeedsAttentionCategory,
    OfferDecisionTableOrientation,
    OfferDecisionViewMode,
} from './models.js';
import { APPLICATION_BOARD_SORT_ORDERS, APPLICATION_LIST_SORT_ORDERS, NEEDS_ATTENTION_CATEGORIES } from './models.js';

const isNeedsAttentionCategory = (value: unknown): value is NeedsAttentionCategory =>
    typeof value === 'string' && NEEDS_ATTENTION_CATEGORIES.includes(value as NeedsAttentionCategory);

export const isNeedsAttentionCategoryArray = (value: unknown): value is NeedsAttentionCategory[] =>
    Array.isArray(value) && value.every(isNeedsAttentionCategory) && new Set(value).size === value.length;

export const isCollectionViewMode = (value: unknown): value is CollectionViewMode =>
    value === 'list' || value === 'board';

export const isOptionalCollectionViewMode = (value: unknown): value is CollectionViewMode | undefined =>
    value === undefined || isCollectionViewMode(value);

export const isOfferDecisionViewMode = (value: unknown): value is OfferDecisionViewMode =>
    value === 'cards' || value === 'table';

export const isOptionalOfferDecisionViewMode = (value: unknown): value is OfferDecisionViewMode | undefined =>
    value === undefined || isOfferDecisionViewMode(value);

export const isOfferDecisionTableOrientation = (value: unknown): value is OfferDecisionTableOrientation =>
    value === 'horizontal' || value === 'vertical';

export const isOptionalOfferDecisionTableOrientation = (
    value: unknown
): value is OfferDecisionTableOrientation | undefined => value === undefined || isOfferDecisionTableOrientation(value);

export const isApplicationListSortOrder = (value: unknown): value is ApplicationListSortOrder =>
    typeof value === 'string' && APPLICATION_LIST_SORT_ORDERS.some((sortOrder) => sortOrder === value);

export const isApplicationBoardSortOrder = (value: unknown): value is ApplicationBoardSortOrder =>
    typeof value === 'string' && APPLICATION_BOARD_SORT_ORDERS.some((sortOrder) => sortOrder === value);

export const isOptionalApplicationListSortOrder = (value: unknown): value is ApplicationListSortOrder | undefined =>
    value === undefined || isApplicationListSortOrder(value);

export const isOptionalApplicationBoardSortOrder = (value: unknown): value is ApplicationBoardSortOrder | undefined =>
    value === undefined || isApplicationBoardSortOrder(value);
