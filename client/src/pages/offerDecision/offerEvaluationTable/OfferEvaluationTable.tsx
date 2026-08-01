import ControlDropdown from '../../../components/activityControls/ControlDropdown';
import PrimaryButton from '../../../components/button/PrimaryButton';
import type { PrimaryButtonVariant } from '../../../components/button/models';
import { useEffect, useRef, type ReactNode } from 'react';
import ApplicationStatusBadge from '../../application/ApplicationStatusBadge';
import formatDate from '../../../helper/dateFormatter';
import { calculateOfferDecisionScore } from '../offerEvaluation';
import type { OfferDecisionApplication, OfferDecisionTableOrientation } from '../models';
import styles from './OfferEvaluationTable.module.css';
import evaluationStyles from '../OfferEvaluation.module.css';

export type OfferEvaluationTableLayout = 'offersToEvaluate' | 'saved' | 'previous';

type OfferEvaluationTableProps = {
    applications: OfferDecisionApplication[];
    headingId: string;
    highlightedJobId?: number;
    layout: OfferEvaluationTableLayout;
    orientation: OfferDecisionTableOrientation;
    getActions: (application: OfferDecisionApplication) => OfferEvaluationTableActions;
};

export type OfferEvaluationTableAction = {
    ariaLabel: string;
    disabled?: boolean;
    label: string;
    onClick: () => void;
    variant?: PrimaryButtonVariant;
};

export type OfferEvaluationTableActions = {
    actions: OfferEvaluationTableAction[];
    isPending?: boolean;
    presentation: 'direct' | 'menu';
};

const SAVED_EVALUATION_HEADERS = [
    'No.',
    'Company Name',
    'Position',
    'Decision Deadline',
    'Fit Rating',
    'Monthly Base Salary',
    'Bonus',
    'Annual Leave',
    'Work Arrangement',
    'Pros',
    'Cons',
    'Career Growth',
    'Company / Culture Fit',
    'Work-Life Balance',
    'Compensation Rating',
    'Actions',
] as const;

const SAVED_EVALUATION_COLUMNS = [
    styles.rowNumberColumn,
    styles.companyColumn,
    styles.positionColumn,
    styles.deadlineColumn,
    styles.fitRatingColumn,
    styles.salaryColumn,
    styles.bonusColumn,
    styles.annualLeaveColumn,
    styles.workArrangementColumn,
    styles.notesColumn,
    styles.notesColumn,
    styles.ratingColumn,
    styles.cultureRatingColumn,
    styles.workLifeRatingColumn,
    styles.compensationRatingColumn,
    styles.actionsColumn,
] as const;

const formatOptionalValue = (value: string): string => value || '-';

type VerticalWheelBehavior = 'containWhenScrollable' | 'forwardToPage';

const forwardWheelToPage = (event: globalThis.WheelEvent, scrollRegion: HTMLDivElement) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.deltaX !== 0) {
        scrollRegion.scrollLeft += event.deltaX;
    }
    window.scrollBy(0, event.deltaY);
};

const handleTableWheel = (
    event: globalThis.WheelEvent,
    scrollRegion: HTMLDivElement,
    behavior: VerticalWheelBehavior
) => {
    if (event.deltaY === 0) {
        return;
    }

    if (event.shiftKey) {
        return;
    }

    if (behavior === 'forwardToPage') {
        forwardWheelToPage(event, scrollRegion);
        return;
    }

    const maximumScrollTop = scrollRegion.scrollHeight - scrollRegion.clientHeight;
    if (maximumScrollTop <= 0) {
        forwardWheelToPage(event, scrollRegion);
        return;
    }

    event.stopPropagation();
    const isAtTopBoundary = scrollRegion.scrollTop <= 0 && event.deltaY < 0;
    const isAtBottomBoundary = scrollRegion.scrollTop >= maximumScrollTop && event.deltaY > 0;
    if (isAtTopBoundary || isAtBottomBoundary) {
        event.preventDefault();
    }
};

const TableScrollRegion = ({
    children,
    className,
    headingId,
    verticalWheelBehavior,
}: {
    children: ReactNode;
    className: string;
    headingId: string;
    verticalWheelBehavior: VerticalWheelBehavior;
}) => {
    const regionRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const scrollRegion = regionRef.current;
        if (!scrollRegion) {
            return;
        }
        const handleWheel = (event: globalThis.WheelEvent) =>
            handleTableWheel(event, scrollRegion, verticalWheelBehavior);
        scrollRegion.addEventListener('wheel', handleWheel, { passive: false });
        return () => scrollRegion.removeEventListener('wheel', handleWheel);
    }, [verticalWheelBehavior]);

    return (
        <div aria-labelledby={headingId} className={className} ref={regionRef} role='region' tabIndex={0}>
            {children}
        </div>
    );
};

type VerticalTableField = {
    label: string;
    render: (application: OfferDecisionApplication, index: number) => ReactNode;
};

const TableActions = ({
    application,
    config,
}: {
    application: OfferDecisionApplication;
    config: OfferEvaluationTableActions;
}) => {
    const menuLabel = `More actions for ${application.company_name}`;
    const [directAction] = config.actions;

    if (config.actions.length === 0) {
        return null;
    }

    if (config.presentation === 'direct' && directAction) {
        return (
            <PrimaryButton
                aria-label={directAction.ariaLabel}
                className={styles.directAction}
                disabled={directAction.disabled}
                isLoading={config.isPending}
                onClick={directAction.onClick}
                type='button'
                variant={directAction.variant ?? 'secondary'}
            >
                {directAction.label}
            </PrimaryButton>
        );
    }

    if (config.isPending) {
        return (
            <PrimaryButton
                aria-label={menuLabel}
                className={`${evaluationStyles.cardActionTrigger} ${styles.actionTrigger}`}
                isLoading
                type='button'
                variant='secondary'
            >
                More...
            </PrimaryButton>
        );
    }

    return (
        <ControlDropdown
            closeOnSelect
            dropdownAriaLabel={menuLabel}
            dropdownClassName={styles.actionDropdown}
            dropdownRole='menu'
            id={`offer-evaluation-${application.job_id}-table-more`}
            label='More...'
            renderDropdownInPortal
            triggerAriaLabel={menuLabel}
            triggerClassName={`${evaluationStyles.cardActionTrigger} ${styles.actionTrigger}`}
            triggerStyle='activity'
        >
            <div className={evaluationStyles.cardActionOptions}>
                {config.actions.map((action) => (
                    <PrimaryButton
                        aria-label={action.ariaLabel}
                        className={`${evaluationStyles.cardActionOption} ${styles.actionOption}`}
                        disabled={action.disabled}
                        key={action.label}
                        onClick={action.onClick}
                        role='menuitem'
                        type='button'
                        variant={action.variant ?? 'secondary'}
                    >
                        {action.label}
                    </PrimaryButton>
                ))}
            </div>
        </ControlDropdown>
    );
};

const getVerticalTableFields = (
    getActions: OfferEvaluationTableProps['getActions'],
    layout: OfferEvaluationTableLayout
): VerticalTableField[] => {
    const fields: VerticalTableField[] = [];

    fields.push({ label: 'No.', render: (_, index) => index + 1 });
    fields.push(
        { label: 'Company Name', render: (application) => application.company_name },
        { label: 'Position', render: (application) => application.job_title }
    );
    if (layout === 'previous') {
        fields.push({
            label: 'Status',
            render: (application) => <ApplicationStatusBadge compact jobStatus={application.job_status} />,
        });
    }
    if (layout !== 'offersToEvaluate') {
        fields.push(
            {
                label: 'Decision Deadline',
                render: (application) => formatDate(application.evaluation!.details.decision_deadline).formattedDate,
            },
            {
                label: 'Fit Rating',
                render: (application) => `${calculateOfferDecisionScore(application.evaluation!.ratings)}%`,
            },
            {
                label: 'Monthly Base Salary',
                render: (application) => {
                    const { details } = application.evaluation!;
                    return details.monthly_base_salary === null
                        ? '-'
                        : `${details.currency} ${details.monthly_base_salary.toLocaleString()}`;
                },
            },
            { label: 'Bonus', render: (application) => formatOptionalValue(application.evaluation!.details.bonus) },
            {
                label: 'Annual Leave',
                render: (application) =>
                    application.evaluation!.details.annual_leave_days === null
                        ? '-'
                        : `${application.evaluation!.details.annual_leave_days} days`,
            },
            {
                label: 'Work Arrangement',
                render: (application) => formatOptionalValue(application.evaluation!.details.work_arrangement),
            },
            { label: 'Pros', render: (application) => formatOptionalValue(application.evaluation!.details.pros) },
            {
                label: 'Cons',
                render: (application) => formatOptionalValue(application.evaluation!.details.concerns),
            },
            { label: 'Career Growth', render: (application) => `${application.evaluation!.ratings.career_growth}/5` },
            {
                label: 'Company / Culture Fit',
                render: (application) => `${application.evaluation!.ratings.company_culture_fit}/5`,
            },
            {
                label: 'Work-Life Balance',
                render: (application) => `${application.evaluation!.ratings.work_life_balance}/5`,
            },
            {
                label: 'Compensation Rating',
                render: (application) => `${application.evaluation!.ratings.compensation}/5`,
            }
        );
    }
    fields.push({
        label: 'Actions',
        render: (application) => <TableActions application={application} config={getActions(application)} />,
    });
    return fields;
};

const VerticalOfferEvaluationTable = ({
    applications,
    getActions,
    headingId,
    highlightedJobId,
    layout,
}: Omit<OfferEvaluationTableProps, 'orientation'>) => {
    const fields = getVerticalTableFields(getActions, layout);

    return (
        <TableScrollRegion
            className={`${styles.tableScroll} ${styles.verticalScroll}`}
            headingId={headingId}
            verticalWheelBehavior='forwardToPage'
        >
            <table aria-labelledby={headingId} className={`${styles.table} ${styles.vertical}`}>
                <colgroup>
                    <col className={styles.verticalFieldColumn} />
                    {applications.map((application) => (
                        <col className={styles.verticalRecordColumn} key={application.job_id} />
                    ))}
                </colgroup>
                <tbody>
                    {fields.map((field, fieldIndex) => (
                        <tr key={field.label}>
                            <th scope='row'>{field.label}</th>
                            {applications.map((application, index) => (
                                <td
                                    className={`${
                                        field.label === 'Actions' ? styles.nowrapCell : styles.wrappingCell
                                    } ${highlightedJobId === application.job_id ? evaluationStyles.highlighted : ''}`}
                                    data-offer-evaluation-job-id={application.job_id}
                                    id={fieldIndex === 0 ? `offer-evaluation-${application.job_id}` : undefined}
                                    key={application.job_id}
                                >
                                    {field.render(application, index)}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </TableScrollRegion>
    );
};

const OfferEvaluationTable = ({
    applications,
    getActions,
    headingId,
    highlightedJobId,
    layout,
    orientation,
}: OfferEvaluationTableProps) => {
    if (orientation === 'vertical') {
        return (
            <VerticalOfferEvaluationTable
                applications={applications}
                getActions={getActions}
                headingId={headingId}
                highlightedJobId={highlightedJobId}
                layout={layout}
            />
        );
    }

    const headers =
        layout === 'offersToEvaluate'
            ? ['No.', 'Company Name', 'Position', 'Actions']
            : layout === 'previous'
            ? [...SAVED_EVALUATION_HEADERS.slice(0, 3), 'Status', ...SAVED_EVALUATION_HEADERS.slice(3)]
            : SAVED_EVALUATION_HEADERS;
    const columns =
        layout === 'offersToEvaluate'
            ? [
                  styles.rowNumberColumn,
                  styles.unevaluatedCompanyColumn,
                  styles.unevaluatedPositionColumn,
                  styles.actionsColumn,
              ]
            : layout === 'previous'
            ? [...SAVED_EVALUATION_COLUMNS.slice(0, 3), styles.statusColumn, ...SAVED_EVALUATION_COLUMNS.slice(3)]
            : SAVED_EVALUATION_COLUMNS;

    return (
        <TableScrollRegion
            className={styles.tableScroll}
            headingId={headingId}
            verticalWheelBehavior='containWhenScrollable'
        >
            <table aria-labelledby={headingId} className={`${styles.table} ${styles[layout]}`}>
                <colgroup>
                    {columns.map((className, index) => (
                        <col className={className} key={`${headers[index]}-${index}`} />
                    ))}
                </colgroup>
                <thead>
                    <tr>
                        {headers.map((header) => (
                            <th key={header} scope='col'>
                                {header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {applications.map((application, index) => {
                        const evaluation = application.evaluation;
                        if (layout === 'offersToEvaluate') {
                            return (
                                <tr
                                    className={
                                        highlightedJobId === application.job_id
                                            ? evaluationStyles.highlighted
                                            : undefined
                                    }
                                    id={`offer-evaluation-${application.job_id}`}
                                    key={application.job_id}
                                >
                                    <td className={styles.nowrapCell}>{index + 1}</td>
                                    <td className={styles.wrappingCell}>{application.company_name}</td>
                                    <td className={styles.wrappingCell}>{application.job_title}</td>
                                    <td className={styles.nowrapCell}>
                                        <TableActions application={application} config={getActions(application)} />
                                    </td>
                                </tr>
                            );
                        }
                        if (!evaluation) {
                            return null;
                        }

                        const { details, ratings } = evaluation;
                        return (
                            <tr
                                className={
                                    highlightedJobId === application.job_id ? evaluationStyles.highlighted : undefined
                                }
                                id={`offer-evaluation-${application.job_id}`}
                                key={application.job_id}
                            >
                                <td className={styles.nowrapCell}>{index + 1}</td>
                                <td className={styles.wrappingCell}>{application.company_name}</td>
                                <td className={styles.wrappingCell}>{application.job_title}</td>
                                {layout === 'previous' && (
                                    <td className={styles.nowrapCell}>
                                        <ApplicationStatusBadge compact jobStatus={application.job_status} />
                                    </td>
                                )}
                                <td className={styles.wrappingCell}>
                                    {formatDate(details.decision_deadline).formattedDate}
                                </td>
                                <td className={styles.nowrapCell}>{calculateOfferDecisionScore(ratings)}%</td>
                                <td className={styles.nowrapCell}>
                                    {details.monthly_base_salary === null
                                        ? '-'
                                        : `${details.currency} ${details.monthly_base_salary.toLocaleString()}`}
                                </td>
                                <td className={styles.wrappingCell}>{formatOptionalValue(details.bonus)}</td>
                                <td className={styles.nowrapCell}>
                                    {details.annual_leave_days === null ? '-' : `${details.annual_leave_days} days`}
                                </td>
                                <td className={styles.wrappingCell}>{formatOptionalValue(details.work_arrangement)}</td>
                                <td className={styles.wrappingCell}>{formatOptionalValue(details.pros)}</td>
                                <td className={styles.wrappingCell}>{formatOptionalValue(details.concerns)}</td>
                                <td className={styles.nowrapCell}>{ratings.career_growth}/5</td>
                                <td className={styles.nowrapCell}>{ratings.company_culture_fit}/5</td>
                                <td className={styles.nowrapCell}>{ratings.work_life_balance}/5</td>
                                <td className={styles.nowrapCell}>{ratings.compensation}/5</td>
                                <td className={styles.nowrapCell}>
                                    <TableActions application={application} config={getActions(application)} />
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </TableScrollRegion>
    );
};

export default OfferEvaluationTable;
