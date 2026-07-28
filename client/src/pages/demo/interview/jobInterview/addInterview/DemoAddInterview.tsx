import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import type { JobApplication } from '../../../../application/models';
import type { CreateInterviewRequest } from '../../../../interview/models';
import type { Location } from 'react-router-dom';
import type { FormEvent } from 'react';
import FormFieldError from '../../../../../components/formPage/FormFieldError';
import PrimaryButton from '../../../../../components/button/PrimaryButton';
import { focusFirstInvalidField } from '../../../../../components/formPage/focusFirstInvalidField';
import { useFormErrors } from '../../../../../components/formPage/useFormErrors';
import {
    isInvalidDatetimeLocalInput,
    MAX_DATETIME_LOCAL,
    MIN_DATETIME_LOCAL,
} from '../../../../../helper/dateFormatter';
import { DEMO_INTERVIEW_CREATED_MESSAGE } from '../../../state/demoMessages';
import {
    FIELD_MAX_LENGTHS,
    type InterviewFormField,
    validateInterviewForm,
} from '../../../../../helper/formValidation';
import { routes } from '../../../../../routes';
import styles from './DemoAddInterview.module.css';
import { useDemo } from '../../../context/DemoContext';
import { useRef, useState } from 'react';
import { useToast } from '../../../../../components/toast/ToastProvider';
import {
    DEFAULT_INTERVIEW_DURATION_MINUTES,
    findInterviewSchedulingConflicts,
    INTERVIEW_DURATION_MINUTES_MAX,
    INTERVIEW_DURATION_MINUTES_MIN,
} from '../../../../../helper/interviewTiming';
import { useConfirm } from 'material-ui-confirm';
import { createInterviewConflictConfirmation } from '../../../../interview/interviewConflictConfirmation';
import { getErrorToastMessage } from '../../../../../helper/getErrorToastMessage';
import {
    createInterviewOfferDeadlineConfirmation,
    findInterviewOfferDeadlineWarnings,
} from '../../../../interview/interviewOfferDeadlineWarning';
import { useUnsavedChangesBlocker } from '../../../../../hooks/useUnsavedChangesBlocker';
import { hasUnsavedInterviewFormChanges } from '../../../../interview/interviewFormChanges';

const DemoAddInterview = () => {
    const [interviewDate, setInterviewDate] = useState<string>('');
    const [hasInvalidInterviewDateInput, setHasInvalidInterviewDateInput] = useState(false);
    const [interviewDurationMinutes, setInterviewDurationMinutes] = useState<string>(
        String(DEFAULT_INTERVIEW_DURATION_MINUTES)
    );
    const [interviewLocation, setInterviewLocation] = useState<string>('');
    const [interviewType, setInterviewType] = useState<string>('');
    const [meetingURL, setMeetingURL] = useState<string>('');
    const [notes, setNotes] = useState<string>('');
    const { clearFieldError, errors, setErrors } = useFormErrors<InterviewFormField>();
    const interviewDateInputRef = useRef<HTMLInputElement>(null);
    const interviewLocationInputRef = useRef<HTMLInputElement>(null);
    const interviewDurationInputRef = useRef<HTMLInputElement>(null);
    const interviewTypeInputRef = useRef<HTMLInputElement>(null);
    const meetingURLInputRef = useRef<HTMLInputElement>(null);
    const notesInputRef = useRef<HTMLTextAreaElement>(null);
    const pendingSubmissionRef = useRef(false);
    const navigate = useNavigate();
    const location = useLocation() as Location<{ app?: JobApplication }>;
    const app = location.state?.app;
    const { dispatch, state } = useDemo();
    const confirm = useConfirm();
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const { showErrorToast, showSuccessToast } = useToast();
    useUnsavedChangesBlocker(
        hasInvalidInterviewDateInput ||
            hasUnsavedInterviewFormChanges({
                interviewDate,
                interviewDurationMinutes,
                interviewLocation,
                interviewType,
                meetingURL,
                notes,
            }),
        isLoading
    );

    if (!app) {
        return <Navigate to={routes.demoViewApplications} replace />;
    }

    const handleInterviewDateInput = (event: FormEvent<HTMLInputElement>) => {
        setHasInvalidInterviewDateInput(
            isInvalidDatetimeLocalInput(event.currentTarget.value, event.currentTarget.validity)
        );
    };

    const resetForm = () => {
        setInterviewDate('');
        setHasInvalidInterviewDateInput(false);
        setInterviewDurationMinutes(String(DEFAULT_INTERVIEW_DURATION_MINUTES));
        setInterviewLocation('');
        setInterviewType('');
        setMeetingURL('');
        setNotes('');
        setErrors({});
    };

    const createInterview = (request: CreateInterviewRequest) => {
        dispatch({
            type: 'CREATE_INTERVIEW',
            payload: {
                jobId: request.jobId,
                interviewDate: request.interviewDate,
                interviewDurationMinutes: request.interviewDurationMinutes,
                interviewLocation: request.interviewLocation,
                interviewType: request.interviewType,
                meetingURL: request.meetingURL,
                notes: request.notes,
            },
        });
        showSuccessToast(DEMO_INTERVIEW_CREATED_MESSAGE);
        resetForm();
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
            meetingURL,
            notes,
        });

        if (!validation.isValid) {
            setErrors(validation.errors);
            focusFirstInvalidField<InterviewFormField>(validation.errors, [
                ['interviewDate', interviewDateInputRef],
                ['interviewLocation', interviewLocationInputRef],
                ['interviewDurationMinutes', interviewDurationInputRef],
                ['interviewType', interviewTypeInputRef],
                ['meetingURL', meetingURLInputRef],
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
            meetingURL: values.meetingURL,
            notes: values.notes,
        };
        const currentTime = new Date();
        const conflicts = findInterviewSchedulingConflicts(
            state.interviews,
            {
                interview_date: request.interviewDate.toISOString(),
                interview_duration_minutes: request.interviewDurationMinutes,
            },
            currentTime
        );
        const offerDeadlineWarnings = findInterviewOfferDeadlineWarnings(
            state.applications,
            state.offerEvaluations,
            request,
            currentTime
        );

        setErrors({});
        if (conflicts.length === 0 && offerDeadlineWarnings.length === 0) {
            createInterview(request);
            return;
        }

        pendingSubmissionRef.current = true;
        setIsLoading(true);
        try {
            if (conflicts.length > 0) {
                const { confirmed } = await confirm(createInterviewConflictConfirmation(conflicts));
                if (!confirmed) {
                    return;
                }
            }

            if (offerDeadlineWarnings.length > 0) {
                const { confirmed } = await confirm(
                    createInterviewOfferDeadlineConfirmation(
                        offerDeadlineWarnings,
                        request.interviewDate,
                        request.interviewDurationMinutes
                    )
                );
                if (!confirmed) {
                    return;
                }
            }

            createInterview(request);
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
                onBlur={handleInterviewDateInput}
                onInput={handleInterviewDateInput}
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

            <label htmlFor='meeting-url'>Meeting URL (optional)</label>
            <input
                ref={meetingURLInputRef}
                aria-describedby={errors.meetingURL ? 'meeting-url-error' : undefined}
                aria-invalid={errors.meetingURL ? true : undefined}
                id='meeting-url'
                maxLength={FIELD_MAX_LENGTHS.meetingURL}
                value={meetingURL}
                onChange={(event) => {
                    setMeetingURL(event.target.value);
                    clearFieldError('meetingURL');
                }}
            />
            <FormFieldError id='meeting-url-error' message={errors.meetingURL} />

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
                <PrimaryButton type='button' variant='secondary' onClick={() => navigate(routes.demoViewInterviews)}>
                    View Interviews
                </PrimaryButton>
                <PrimaryButton
                    type='button'
                    variant='secondary'
                    onClick={() => navigate(`${routes.demoViewApplications}#${app.job_id}`)}
                >
                    Back
                </PrimaryButton>
            </div>
        </form>
    );
};

export default DemoAddInterview;
