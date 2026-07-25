import { useRef, type FormEvent, type RefObject } from 'react';
import PrimaryButton from '../../components/button/PrimaryButton';
import { MAX_DATETIME_LOCAL, MIN_DATETIME_LOCAL, toDatetimeLocalInputValue } from '../../helper/dateFormatter';
import {
    OFFER_ANNUAL_LEAVE_DAYS_MAX,
    OFFER_DECISION_CATEGORIES,
    OFFER_DECISION_VALUE_MAX,
    OFFER_DECISION_VALUE_MIN,
    OFFER_DETAILS_MAX_LENGTHS,
    OFFER_MONTHLY_BASE_SALARY_MAX,
    OFFER_WORK_ARRANGEMENTS,
} from './offerDecisionConfig';
import type {
    OfferDecisionApplication,
    OfferDecisionCategory,
    OfferDecisionRating,
    OfferDetails,
    OfferEvaluation,
    OfferEvaluationFormErrors,
} from './models';
import styles from './OfferEvaluation.module.css';

export type OfferFieldRefs = {
    decision_deadline: RefObject<HTMLInputElement | null>;
    currency: RefObject<HTMLInputElement | null>;
    monthly_base_salary: RefObject<HTMLInputElement | null>;
    bonus: RefObject<HTMLInputElement | null>;
    annual_leave_days: RefObject<HTMLInputElement | null>;
    work_arrangement: RefObject<HTMLSelectElement | null>;
    pros: RefObject<HTMLTextAreaElement | null>;
    concerns: RefObject<HTMLTextAreaElement | null>;
};

type OfferEvaluationFormProps = {
    application: OfferDecisionApplication;
    errors: OfferEvaluationFormErrors;
    evaluation: OfferEvaluation;
    isSaving: boolean;
    onCancel: () => void;
    onDetailsChange: (details: OfferDetails, field: keyof OfferEvaluationFormErrors) => void;
    onRatingChange: (category: OfferDecisionCategory, value: OfferDecisionRating) => void;
    onSave: (decisionDeadlineHasBadInput: boolean, refs: OfferFieldRefs) => void;
};

const FieldError = ({ id, message }: { id: string; message?: string }) =>
    message ? (
        <span className={styles.fieldError} id={id}>
            {message}
        </span>
    ) : null;

const getErrorProps = (id: string, message?: string) => ({
    'aria-describedby': message ? id : undefined,
    'aria-invalid': Boolean(message),
});

const RatingFields = ({
    application,
    evaluation,
    error,
    onChange,
}: {
    application: OfferDecisionApplication;
    evaluation: OfferEvaluation;
    error?: string;
    onChange: (category: OfferDecisionCategory, value: OfferDecisionRating) => void;
}) => (
    <fieldset className={styles.ratingFields}>
        <legend>Fit ratings</legend>
        {OFFER_DECISION_CATEGORIES.map((category) => {
            const id = `rating-${application.job_id}-${category.key}`;
            const value = evaluation.ratings[category.key];
            return (
                <label className={styles.ratingField} htmlFor={id} key={category.key}>
                    <span className={styles.ratingHeader}>
                        <strong>{category.label}</strong>
                        <output htmlFor={id}>{value}/5</output>
                    </span>
                    <input
                        aria-label={`${application.company_name} ${category.label} rating`}
                        id={id}
                        max={OFFER_DECISION_VALUE_MAX}
                        min={OFFER_DECISION_VALUE_MIN}
                        onChange={(event) => onChange(category.key, Number(event.target.value) as OfferDecisionRating)}
                        step={1}
                        type='range'
                        value={value}
                    />
                </label>
            );
        })}
        <FieldError id={`ratings-error-${application.job_id}`} message={error} />
    </fieldset>
);

const CompensationFields = ({
    application,
    details,
    errors,
    fieldRefs,
    onChange,
}: {
    application: OfferDecisionApplication;
    details: OfferDetails;
    errors: OfferEvaluationFormErrors;
    fieldRefs: OfferFieldRefs;
    onChange: (details: OfferDetails, field: keyof OfferEvaluationFormErrors) => void;
}) => {
    const updateDetails = (changes: Partial<OfferDetails>, field: keyof OfferEvaluationFormErrors) =>
        onChange({ ...details, ...changes }, field);
    const companyName = application.company_name;
    const jobId = application.job_id;

    return (
        <fieldset className={styles.detailsFields}>
            <legend>Compensation and terms</legend>
            <label className={styles.textField} htmlFor={`currency-${jobId}`}>
                <span>Currency</span>
                <input
                    ref={fieldRefs.currency}
                    {...getErrorProps(`currency-error-${jobId}`, errors.currency)}
                    aria-label={`${companyName} currency`}
                    id={`currency-${jobId}`}
                    maxLength={3}
                    onChange={(event) => updateDetails({ currency: event.target.value }, 'currency')}
                    required
                    value={details.currency}
                />
                <FieldError id={`currency-error-${jobId}`} message={errors.currency} />
            </label>
            <label className={styles.textField} htmlFor={`monthly-base-salary-${jobId}`}>
                <span>Monthly Base Salary</span>
                <input
                    ref={fieldRefs.monthly_base_salary}
                    {...getErrorProps(`monthly-base-salary-error-${jobId}`, errors.monthly_base_salary)}
                    aria-label={`${companyName} monthly base salary`}
                    id={`monthly-base-salary-${jobId}`}
                    max={OFFER_MONTHLY_BASE_SALARY_MAX}
                    min={0}
                    onChange={(event) =>
                        updateDetails(
                            { monthly_base_salary: event.target.value === '' ? null : Number(event.target.value) },
                            'monthly_base_salary'
                        )
                    }
                    required
                    step={1}
                    type='number'
                    value={details.monthly_base_salary ?? ''}
                />
                <FieldError id={`monthly-base-salary-error-${jobId}`} message={errors.monthly_base_salary} />
            </label>
            <label className={styles.textField} htmlFor={`bonus-${jobId}`}>
                <span>Bonus (Optional)</span>
                <input
                    ref={fieldRefs.bonus}
                    {...getErrorProps(`bonus-error-${jobId}`, errors.bonus)}
                    aria-label={`${companyName} bonus`}
                    id={`bonus-${jobId}`}
                    maxLength={OFFER_DETAILS_MAX_LENGTHS.bonus}
                    onChange={(event) => updateDetails({ bonus: event.target.value }, 'bonus')}
                    value={details.bonus}
                />
                <FieldError id={`bonus-error-${jobId}`} message={errors.bonus} />
            </label>
            <label className={styles.textField} htmlFor={`annual-leave-${jobId}`}>
                <span>Annual Leave Days (Optional)</span>
                <input
                    ref={fieldRefs.annual_leave_days}
                    {...getErrorProps(`annual-leave-error-${jobId}`, errors.annual_leave_days)}
                    aria-label={`${companyName} annual leave days`}
                    id={`annual-leave-${jobId}`}
                    max={OFFER_ANNUAL_LEAVE_DAYS_MAX}
                    min={0}
                    onChange={(event) =>
                        updateDetails(
                            { annual_leave_days: event.target.value === '' ? null : Number(event.target.value) },
                            'annual_leave_days'
                        )
                    }
                    step={1}
                    type='number'
                    value={details.annual_leave_days ?? ''}
                />
                <FieldError id={`annual-leave-error-${jobId}`} message={errors.annual_leave_days} />
            </label>
            <label className={styles.textField} htmlFor={`work-arrangement-${jobId}`}>
                <span>Work arrangement (Optional)</span>
                <select
                    ref={fieldRefs.work_arrangement}
                    {...getErrorProps(`work-arrangement-error-${jobId}`, errors.work_arrangement)}
                    aria-label={`${companyName} work arrangement`}
                    id={`work-arrangement-${jobId}`}
                    onChange={(event) =>
                        updateDetails(
                            { work_arrangement: event.target.value as OfferDetails['work_arrangement'] },
                            'work_arrangement'
                        )
                    }
                    value={details.work_arrangement}
                >
                    <option value=''></option>
                    {OFFER_WORK_ARRANGEMENTS.map((arrangement) => (
                        <option key={arrangement} value={arrangement}>
                            {arrangement}
                        </option>
                    ))}
                </select>
                <FieldError id={`work-arrangement-error-${jobId}`} message={errors.work_arrangement} />
            </label>
            <label className={styles.textField} htmlFor={`pros-${jobId}`}>
                <span>Pros (Optional)</span>
                <textarea
                    ref={fieldRefs.pros}
                    {...getErrorProps(`pros-error-${jobId}`, errors.pros)}
                    aria-label={`${companyName} pros`}
                    id={`pros-${jobId}`}
                    maxLength={OFFER_DETAILS_MAX_LENGTHS.notes}
                    onChange={(event) => updateDetails({ pros: event.target.value }, 'pros')}
                    rows={3}
                    value={details.pros}
                />
                <FieldError id={`pros-error-${jobId}`} message={errors.pros} />
            </label>
            <label className={styles.textField} htmlFor={`concerns-${jobId}`}>
                <span>Cons (Optional)</span>
                <textarea
                    ref={fieldRefs.concerns}
                    {...getErrorProps(`concerns-error-${jobId}`, errors.concerns)}
                    aria-label={`${companyName} cons`}
                    id={`concerns-${jobId}`}
                    maxLength={OFFER_DETAILS_MAX_LENGTHS.notes}
                    onChange={(event) => updateDetails({ concerns: event.target.value }, 'concerns')}
                    rows={3}
                    value={details.concerns}
                />
                <FieldError id={`concerns-error-${jobId}`} message={errors.concerns} />
            </label>
        </fieldset>
    );
};

const OfferEvaluationForm = ({
    application,
    errors,
    evaluation,
    isSaving,
    onCancel,
    onDetailsChange,
    onRatingChange,
    onSave,
}: OfferEvaluationFormProps) => {
    const decisionDeadlineInputRef = useRef<HTMLInputElement>(null);
    const currencyInputRef = useRef<HTMLInputElement>(null);
    const monthlyBaseSalaryInputRef = useRef<HTMLInputElement>(null);
    const bonusInputRef = useRef<HTMLInputElement>(null);
    const annualLeaveInputRef = useRef<HTMLInputElement>(null);
    const workArrangementSelectRef = useRef<HTMLSelectElement>(null);
    const prosTextareaRef = useRef<HTMLTextAreaElement>(null);
    const concernsTextareaRef = useRef<HTMLTextAreaElement>(null);
    const fieldRefs: OfferFieldRefs = {
        decision_deadline: decisionDeadlineInputRef,
        currency: currencyInputRef,
        monthly_base_salary: monthlyBaseSalaryInputRef,
        bonus: bonusInputRef,
        annual_leave_days: annualLeaveInputRef,
        work_arrangement: workArrangementSelectRef,
        pros: prosTextareaRef,
        concerns: concernsTextareaRef,
    };
    const submitEvaluation = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        onSave(Boolean(decisionDeadlineInputRef.current?.validity.badInput), fieldRefs);
    };

    return (
        <form noValidate onSubmit={submitEvaluation}>
            <fieldset className={styles.detailsFields}>
                <legend>Decision timing</legend>
                <label className={styles.textField} htmlFor={`decision-deadline-${application.job_id}`}>
                    <span>Decision deadline</span>
                    <input
                        ref={decisionDeadlineInputRef}
                        {...getErrorProps(`decision-deadline-error-${application.job_id}`, errors.decision_deadline)}
                        aria-label={`${application.company_name} decision deadline`}
                        className={styles.dateTimeInput}
                        id={`decision-deadline-${application.job_id}`}
                        max={MAX_DATETIME_LOCAL}
                        min={toDatetimeLocalInputValue(application.application_date) || MIN_DATETIME_LOCAL}
                        onChange={(event) =>
                            onDetailsChange(
                                { ...evaluation.details, decision_deadline: event.target.value },
                                'decision_deadline'
                            )
                        }
                        required
                        type='datetime-local'
                        value={evaluation.details.decision_deadline}
                    />
                    <FieldError
                        id={`decision-deadline-error-${application.job_id}`}
                        message={errors.decision_deadline}
                    />
                </label>
            </fieldset>
            <CompensationFields
                application={application}
                details={evaluation.details}
                errors={errors}
                fieldRefs={fieldRefs}
                onChange={onDetailsChange}
            />
            <RatingFields
                application={application}
                error={errors.ratings}
                evaluation={evaluation}
                onChange={onRatingChange}
            />
            <div className={styles.cardActions}>
                <PrimaryButton
                    aria-label={`Cancel evaluation for ${application.company_name}`}
                    disabled={isSaving}
                    onClick={onCancel}
                    type='button'
                    variant='secondary'
                >
                    Cancel
                </PrimaryButton>
                <PrimaryButton
                    aria-label={`Save evaluation for ${application.company_name}`}
                    isLoading={isSaving}
                    type='submit'
                >
                    Save evaluation
                </PrimaryButton>
            </div>
        </form>
    );
};

export default OfferEvaluationForm;
