import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import type { JobApplication } from '../../../application/models';
import type { CreateInterviewRequest } from '../../models';
import type { Location } from 'react-router-dom';
import type { FormEvent } from 'react';
import FormFieldError from '../../../../components/formPage/FormFieldError';
import PrimaryButton from '../../../../components/button/PrimaryButton';
import { focusFirstInvalidField } from '../../../../components/formPage/focusFirstInvalidField';
import { useFormErrors } from '../../../../components/formPage/useFormErrors';
import { MAX_DATETIME_LOCAL, MIN_DATETIME_LOCAL } from '../../../../helper/dateFormatter';
import { routes } from '../../../../routes';
import styles from './AddInterview.module.css';
import { useJobTrackerAPI } from '../../../../api/useJobTrackerAPI';
import { useRef, useState } from 'react';
import { useToast } from '../../../../components/toast/ToastProvider';
import { getErrorToastMessage } from '../../../../helper/getErrorToastMessage';
import { FIELD_MAX_LENGTHS, type InterviewFormField, validateInterviewForm } from '../../../../helper/formValidation';
import {
    DEFAULT_INTERVIEW_DURATION_MINUTES,
    INTERVIEW_DURATION_MINUTES_MAX,
    INTERVIEW_DURATION_MINUTES_MIN,
} from '../../../../helper/interviewTiming';
import { useConfirm } from 'material-ui-confirm';
import {
    createInterviewConflictConfirmation,
    isInterviewSchedulingConflictError,
} from '../../interviewConflictConfirmation';
import {
    createInterviewOfferDeadlineConfirmation,
    isInterviewOfferDeadlineWarningError,
} from '../../interviewOfferDeadlineWarning';

const AddInterview = () => {
    const [interviewDate, setInterviewDate] = useState<string>('');
    const [interviewDurationMinutes, setInterviewDurationMinutes] = useState<string>(
        String(DEFAULT_INTERVIEW_DURATION_MINUTES)
    );
    const [interviewLocation, setInterviewLocation] = useState<string>('');
    const [interviewType, setInterviewType] = useState<string>('');
    const [notes, setNotes] = useState<string>('');
    const { clearFieldError, errors, setErrors } = useFormErrors<InterviewFormField>();
    const interviewDateInputRef = useRef<HTMLInputElement>(null);
    const interviewLocationInputRef = useRef<HTMLInputElement>(null);
    const interviewDurationInputRef = useRef<HTMLInputElement>(null);
    const interviewTypeInputRef = useRef<HTMLInputElement>(null);
    const notesInputRef = useRef<HTMLTextAreaElement>(null);
    const pendingSubmissionRef = useRef(false);
    const navigate = useNavigate();
    const location = useLocation() as Location<{ app?: JobApplication }>;
    const app = location.state?.app;
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const api = useJobTrackerAPI();
    const confirm = useConfirm();
    const { showErrorToast, showSuccessToast } = useToast();

    if (!app) {
        return <Navigate to={routes.viewApplications} replace />;
    }

    const resetForm = () => {
        setInterviewDate('');
        setInterviewDurationMinutes(String(DEFAULT_INTERVIEW_DURATION_MINUTES));
        setInterviewLocation('');
        setInterviewType('');
        setNotes('');
        setErrors({});
    };

    const submitInterview = async (request: CreateInterviewRequest): Promise<string | undefined> => {
        let approvedRequest = request;

        while (true) {
            try {
                return await api.interview.createInterview(approvedRequest);
            } catch (error) {
                if (isInterviewSchedulingConflictError(error) && approvedRequest.allowSchedulingConflict !== true) {
                    const { confirmed } = await confirm(createInterviewConflictConfirmation(error.data.conflicts));
                    if (!confirmed) {
                        return undefined;
                    }

                    approvedRequest = { ...approvedRequest, allowSchedulingConflict: true };
                    continue;
                }

                if (isInterviewOfferDeadlineWarningError(error) && approvedRequest.allowOfferDeadlineWarning !== true) {
                    const { confirmed } = await confirm(
                        createInterviewOfferDeadlineConfirmation(
                            error.data.warnings,
                            approvedRequest.interviewDate,
                            approvedRequest.interviewDurationMinutes
                        )
                    );
                    if (!confirmed) {
                        return undefined;
                    }

                    approvedRequest = { ...approvedRequest, allowOfferDeadlineWarning: true };
                    continue;
                }

                throw error;
            }
        }
    };

    const handleAdd = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (pendingSubmissionRef.current) {
            return;
        }

        const validation = validateInterviewForm({
            applicationDate: app.application_date,
            interviewDate,
            interviewDateValidity: interviewDateInputRef.current?.validity,
            interviewDurationMinutes,
            interviewDurationValidity: interviewDurationInputRef.current?.validity,
            interviewLocation,
            interviewType,
            notes,
        });

        if (!validation.isValid) {
            setErrors(validation.errors);
            focusFirstInvalidField<InterviewFormField>(validation.errors, [
                ['interviewDate', interviewDateInputRef],
                ['interviewLocation', interviewLocationInputRef],
                ['interviewDurationMinutes', interviewDurationInputRef],
                ['interviewType', interviewTypeInputRef],
                ['notes', notesInputRef],
            ]);
            return;
        }

        const values = validation.values;
        const request: CreateInterviewRequest = {
            jobId: app.job_id,
            interviewDate: values.interviewDate,
            interviewDurationMinutes: values.interviewDurationMinutes,
            interviewLocation: values.interviewLocation,
            interviewType: values.interviewType,
            notes: values.notes,
        };

        setErrors({});
        pendingSubmissionRef.current = true;
        setIsLoading(true);
        try {
            const message = await submitInterview(request);
            if (message === undefined) {
                return;
            }

            showSuccessToast(message);
            resetForm();
        } catch (error) {
            showErrorToast(getErrorToastMessage(error, 'Unable to add the interview. Please try again.'));
        } finally {
            pendingSubmissionRef.current = false;
            setIsLoading(false);
        }
    };

    return (
        <form className={styles.addInterview} noValidate onSubmit={handleAdd}>
            <div className={styles.context}>
                <h2>You are adding an interview for:</h2>
                <p>
                    Company: <em>{app.company_name}</em>
                </p>
                <p>
                    Position: <em>{app.job_title}</em>
                </p>
            </div>

            <label htmlFor='date'>Interview Date</label>
            <input
                ref={interviewDateInputRef}
                aria-describedby={errors.interviewDate ? 'interview-date-error' : undefined}
                aria-invalid={errors.interviewDate ? true : undefined}
                id='date'
                max={MAX_DATETIME_LOCAL}
                min={MIN_DATETIME_LOCAL}
                value={interviewDate}
                onChange={(e) => {
                    setInterviewDate(e.target.value);
                    clearFieldError('interviewDate');
                }}
                type='datetime-local'
                required
            />
            <FormFieldError id='interview-date-error' message={errors.interviewDate} />

            <label htmlFor='location'>Interview Location</label>
            <input
                ref={interviewLocationInputRef}
                aria-describedby={errors.interviewLocation ? 'interview-location-error' : undefined}
                aria-invalid={errors.interviewLocation ? true : undefined}
                id='location'
                maxLength={FIELD_MAX_LENGTHS.location}
                value={interviewLocation}
                onChange={(e) => {
                    setInterviewLocation(e.target.value);
                    clearFieldError('interviewLocation');
                }}
                required
                placeholder='E.g. Zoom'
            />
            <FormFieldError id='interview-location-error' message={errors.interviewLocation} />

            <label htmlFor='duration'>Duration (minutes)</label>
            <input
                ref={interviewDurationInputRef}
                aria-describedby={errors.interviewDurationMinutes ? 'interview-duration-error' : undefined}
                aria-invalid={errors.interviewDurationMinutes ? true : undefined}
                id='duration'
                max={INTERVIEW_DURATION_MINUTES_MAX}
                min={INTERVIEW_DURATION_MINUTES_MIN}
                step='1'
                type='number'
                value={interviewDurationMinutes}
                onChange={(event) => {
                    setInterviewDurationMinutes(event.target.value);
                    clearFieldError('interviewDurationMinutes');
                }}
                required
            />
            <FormFieldError id='interview-duration-error' message={errors.interviewDurationMinutes} />

            <label htmlFor='type'>Interview Type (optional)</label>
            <input
                ref={interviewTypeInputRef}
                aria-describedby={errors.interviewType ? 'interview-type-error' : undefined}
                aria-invalid={errors.interviewType ? true : undefined}
                id='type'
                maxLength={FIELD_MAX_LENGTHS.interviewType}
                value={interviewType}
                onChange={(e) => {
                    setInterviewType(e.target.value);
                    clearFieldError('interviewType');
                }}
            />
            <FormFieldError id='interview-type-error' message={errors.interviewType} />

            <label htmlFor='notes'>Additional Notes (optional)</label>
            <textarea
                ref={notesInputRef}
                aria-describedby={errors.notes ? 'interview-notes-error' : undefined}
                aria-invalid={errors.notes ? true : undefined}
                id='notes'
                maxLength={FIELD_MAX_LENGTHS.notes}
                value={notes}
                onChange={(e) => {
                    setNotes(e.target.value);
                    clearFieldError('notes');
                }}
            />
            <FormFieldError id='interview-notes-error' message={errors.notes} />

            <div className={styles.submitButton}>
                <PrimaryButton isLoading={isLoading} type='submit' variant='compact' data-testid='add-interview'>
                    Add Interview
                </PrimaryButton>
                <PrimaryButton type='button' variant='secondary' onClick={() => navigate(routes.viewInterviews)}>
                    View Interviews
                </PrimaryButton>
                <PrimaryButton
                    type='button'
                    variant='secondary'
                    onClick={() => navigate(`${routes.viewApplications}#${app.job_id}`)}
                >
                    Back
                </PrimaryButton>
            </div>
        </form>
    );
};

export default AddInterview;
