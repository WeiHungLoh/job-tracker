import type { SkeletonOfferComparisonTableProps } from './models';
import styles from './SkeletonOfferComparisonTable.module.css';

const HORIZONTAL_COLUMN_COUNT = 16;
const HORIZONTAL_RECORD_COUNT = 4;
const VERTICAL_FIELD_COUNT = 9;
const VERTICAL_RECORD_COUNT = 3;
const LINE_WIDTH_CLASSES = [styles.short, styles.medium, styles.long] as const;

const getLineWidthClass = (index: number) => LINE_WIDTH_CLASSES[index % LINE_WIDTH_CLASSES.length];

const SkeletonLine = ({ index }: { index: number }) => (
    <span className={`${styles.skeletonLine} ${getLineWidthClass(index)}`} />
);

const HorizontalSkeletonTable = () => (
    <table className={`${styles.table} ${styles.horizontalTable}`}>
        <thead>
            <tr>
                {Array.from({ length: HORIZONTAL_COLUMN_COUNT }, (_, columnIndex) => (
                    <th data-testid='skeleton-table-column-header' key={columnIndex} scope='col'>
                        <SkeletonLine index={columnIndex} />
                    </th>
                ))}
            </tr>
        </thead>
        <tbody>
            {Array.from({ length: HORIZONTAL_RECORD_COUNT }, (_, rowIndex) => (
                <tr data-testid='skeleton-table-record-row' key={rowIndex}>
                    {Array.from({ length: HORIZONTAL_COLUMN_COUNT }, (_, columnIndex) => (
                        <td key={columnIndex}>
                            <SkeletonLine index={rowIndex + columnIndex + 1} />
                        </td>
                    ))}
                </tr>
            ))}
        </tbody>
    </table>
);

const VerticalSkeletonTable = () => (
    <table className={`${styles.table} ${styles.verticalTable}`}>
        <colgroup>
            <col className={styles.fieldColumn} />
            {Array.from({ length: VERTICAL_RECORD_COUNT }, (_, columnIndex) => (
                <col className={styles.recordColumn} key={columnIndex} />
            ))}
        </colgroup>
        <tbody>
            {Array.from({ length: VERTICAL_FIELD_COUNT }, (_, rowIndex) => (
                <tr data-testid='skeleton-table-field-row' key={rowIndex}>
                    <th scope='row'>
                        <SkeletonLine index={rowIndex} />
                    </th>
                    {Array.from({ length: VERTICAL_RECORD_COUNT }, (_, columnIndex) => (
                        <td data-testid='skeleton-table-record-cell' key={columnIndex}>
                            <SkeletonLine index={rowIndex + columnIndex + 1} />
                        </td>
                    ))}
                </tr>
            ))}
        </tbody>
    </table>
);

const SkeletonOfferComparisonTable = ({ orientation }: SkeletonOfferComparisonTableProps) => (
    <div
        aria-busy='true'
        aria-label='Loading offer comparison table'
        className={styles.skeleton}
        data-orientation={orientation}
        role='status'
    >
        <div
            aria-hidden='true'
            className={`${styles.tableScroll} ${orientation === 'vertical' ? styles.verticalScroll : ''}`}
            data-testid='skeleton-offer-comparison-table-grid'
        >
            {orientation === 'horizontal' ? <HorizontalSkeletonTable /> : <VerticalSkeletonTable />}
        </div>
    </div>
);

export default SkeletonOfferComparisonTable;
