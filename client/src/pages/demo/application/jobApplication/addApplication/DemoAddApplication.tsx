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
import {
    FIELD_MAX_LENGTHS,
    type ApplicationFormField,
    validateApplicationForm,
} from '../../../../../helper/formValidation';
import { JOB_STATUSES, type CreateApplicationRequest, type JobStatus } from '../../../../application/models';
import { DEMO_APPLICATION_CREATED_MESSAGE } from '../../../state/demoMessages';
import { routes } from '../../../../../routes';
import styles from './DemoAddApplication.module.css';
import { useDemo } from '../../../context/DemoContext';
import { useNavigate } from 'react-router-dom';
import { useRef, useState } from 'react';
import { useToast } from '../../../../../components/toast/ToastProvider';
import { findPotentialDuplicateApplication } from '../../../../application/possibleDuplicateApplication';
import { createDuplicateApplicationConfirmation } from '../../../../application/duplicateApplicationConfirmation';
import { useConfirm } from 'material-ui-confirm';
import { getErrorToastMessage } from '../../../../../helper/getErrorToastMessage';
import { useUnsavedChangesBlocker } from '../../../../../hooks/useUnsavedChangesBlocker';
import { hasUnsavedApplicationFormChanges } from '../../../../application/applicationFormChanges';
import Icon from '../../../../../components/icon/Icon';

const DemoAddApplication = () => {
    const [companyName, setCompanyName] = useState<string>('');
    const [jobTitle, setJobTitle] = useState<string>('');
    const [jobStatus, setJobStatus] = useState<JobStatus>('Applied');
    const [applicationDate, setApplicationDate] = useState<string>('');
    const [hasInvalidApplicationDateInput, setHasInvalidApplicationDateInput] = useState(false);
    const [jobLocation, setJobLocation] = useState<string>('');
    const [jobURL, setJobURL] = useState<string>('');
    const [isSubmissionPending, setIsSubmissionPending] = useState(false);
    const { clearFieldError, errors, setErrors } = useFormErrors<ApplicationFormField>();
    const companyNameInputRef = useRef<HTMLInputElement>(null);
    const jobTitleInputRef = useRef<HTMLInputElement>(null);
    const applicationDateInputRef = useRef<HTMLInputElement>(null);
    const jobLocationInputRef = useRef<HTMLInputElement>(null);
    const jobURLInputRef = useRef<HTMLInputElement>(null);
    const pendingSubmissionRef = useRef(false);
    const navigate = useNavigate();
    const { dispatch, state } = useDemo();
    const confirm = useConfirm();
    const { showErrorToast, showSuccessToast } = useToast();
    useUnsavedChangesBlocker(
        hasInvalidApplicationDateInput ||
            hasUnsavedApplicationFormChanges({
                applicationDate,
                companyName,
                jobLocation,
                jobStatus,
                jobTitle,
                jobURL,
            }),
        isSubmissionPending
    );

    const handleApplicationDateInput = (event: FormEvent<HTMLInputElement>) => {
        setHasInvalidApplicationDateInput(
            isInvalidDatetimeLocalInput(event.currentTarget.value, event.currentTarget.validity)
        );
    };

    const resetForm = () => {
        setCompanyName('');
        setJobTitle('');
        setJobStatus('Applied');
        setApplicationDate('');
        setHasInvalidApplicationDateInput(false);
        setJobLocation('');
        setJobURL('');
        setErrors({});
    };

    const createApplication = (request: CreateApplicationRequest) => {
        dispatch({
            type: 'CREATE_APPLICATION',
            payload: {
                companyName: request.companyName,
                jobTitle: request.jobTitle,
                applicationDate: request.appDate,
                jobStatus: request.jobStatus,
                jobLocation: request.jobLocation,
                jobURL: request.jobURL,
            },
        });
        showSuccessToast(DEMO_APPLICATION_CREATED_MESSAGE);
        resetForm();
    };

    const handleAdd = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (pendingSubmissionRef.current) {
            return;
        }

        const validation = validateApplicationForm({
            applicationDate,
            applicationDateValidity: applicationDateInputRef.current?.validity,
            companyName,
            jobLocation,
            jobTitle,
            jobURL,
        });

        if (!validation.isValid) {
            setErrors(validation.errors);
            focusFirstInvalidField<ApplicationFormField>(validation.errors, [
                ['companyName', companyNameInputRef],
                ['jobTitle', jobTitleInputRef],
                ['applicationDate', applicationDateInputRef],
                ['jobLocation', jobLocationInputRef],
                ['jobURL', jobURLInputRef],
            ]);
            return;
        }

        const values = validation.values;
        const request: CreateApplicationRequest = {
            companyName: values.companyName,
            jobTitle: values.jobTitle,
            appDate: values.applicationDate,
            jobStatus,
            jobLocation: values.jobLocation,
            jobURL: values.jobURL,
        };
        const duplicate = findPotentialDuplicateApplication(request, state.applications, state.archivedApplications);

        if (!duplicate) {
            createApplication(request);
            return;
        }

        pendingSubmissionRef.current = true;
        setIsSubmissionPending(true);
        try {
            const { confirmed } = await confirm(createDuplicateApplicationConfirmation(duplicate));
            if (confirmed) {
                createApplication(request);
            }
        } catch (error) {
            showErrorToast(getErrorToastMessage(error, 'Unable to add the job application. Please try again.'));
        } finally {
            pendingSubmissionRef.current = false;
            setIsSubmissionPending(false);
        }
    };

    return (
        <form className={styles.addApplication} noValidate onSubmit={handleAdd}>
            <div className={styles.field}>
                <label htmlFor='company-name'>Company Name</label>
                <input
                    ref={companyNameInputRef}
                    aria-describedby={errors.companyName ? 'company-name-error' : undefined}
                    aria-invalid={errors.companyName ? true : undefined}
                    id='company-name'
                    maxLength={FIELD_MAX_LENGTHS.companyName}
                    value={companyName}
                    onChange={(e) => {
                        setCompanyName(e.target.value);
                        clearFieldError('companyName');
                    }}
                    required
                />
                <FormFieldError id='company-name-error' message={errors.companyName} />
            </div>

            <div className={styles.field}>
                <label htmlFor='job-title'>Job Title</label>
                <input
                    ref={jobTitleInputRef}
                    aria-describedby={errors.jobTitle ? 'job-title-error' : undefined}
                    aria-invalid={errors.jobTitle ? true : undefined}
                    id='job-title'
                    maxLength={FIELD_MAX_LENGTHS.jobTitle}
                    value={jobTitle}
                    onChange={(e) => {
                        setJobTitle(e.target.value);
                        clearFieldError('jobTitle');
                    }}
                    required
                />
                <FormFieldError id='job-title-error' message={errors.jobTitle} />
            </div>

            <div className={styles.field}>
                <label htmlFor='job-status'>Job Status</label>
                <div className={styles.selectControl}>
                    <select
                        id='job-status'
                        value={jobStatus}
                        onChange={(e) => setJobStatus(e.target.value as JobStatus)}
                    >
                        {JOB_STATUSES.map((status) => (
                            <option key={status} value={status}>
                                {status}
                            </option>
                        ))}
                    </select>
                    <Icon
                        className={styles.selectChevron}
                        data-testid='job-status-chevron'
                        name='chevronDown'
                        size={20}
                    />
                </div>
            </div>

            <div className={styles.field}>
                <label htmlFor='app-date'>Application date</label>
                <input
                    ref={applicationDateInputRef}
                    aria-describedby={errors.applicationDate ? 'app-date-error' : undefined}
                    aria-invalid={errors.applicationDate ? true : undefined}
                    id='app-date'
                    max={MAX_DATETIME_LOCAL}
                    min={MIN_DATETIME_LOCAL}
                    value={applicationDate}
                    onChange={(e) => {
                        setApplicationDate(e.target.value);
                        clearFieldError('applicationDate');
                    }}
                    onBlur={handleApplicationDateInput}
                    onInput={handleApplicationDateInput}
                    type='datetime-local'
                />
                <FormFieldError id='app-date-error' message={errors.applicationDate} />
            </div>

            <div className={styles.field}>
                <label htmlFor='job-location'>
                    Job Location<span className={styles.optionalLabel}> (optional)</span>
                </label>
                <input
                    ref={jobLocationInputRef}
                    aria-describedby={errors.jobLocation ? 'job-location-error' : undefined}
                    aria-invalid={errors.jobLocation ? true : undefined}
                    id='job-location'
                    maxLength={FIELD_MAX_LENGTHS.location}
                    value={jobLocation}
                    onChange={(e) => {
                        setJobLocation(e.target.value);
                        clearFieldError('jobLocation');
                    }}
                />
                <FormFieldError id='job-location-error' message={errors.jobLocation} />
            </div>

            <div className={styles.field}>
                <label htmlFor='job-url'>
                    Job Posting URL<span className={styles.optionalLabel}> (optional)</span>
                </label>
                <input
                    ref={jobURLInputRef}
                    aria-describedby={errors.jobURL ? 'job-url-error' : undefined}
                    aria-invalid={errors.jobURL ? true : undefined}
                    id='job-url'
                    maxLength={FIELD_MAX_LENGTHS.jobURL}
                    value={jobURL}
                    onChange={(e) => {
                        setJobURL(e.target.value);
                        clearFieldError('jobURL');
                    }}
                />
                <FormFieldError id='job-url-error' message={errors.jobURL} />
            </div>

            <div className={styles.submitButton}>
                <PrimaryButton isLoading={isSubmissionPending} type='submit' variant='compact'>
                    Add Application
                </PrimaryButton>
                <PrimaryButton type='button' variant='secondary' onClick={() => navigate(routes.demoViewApplications)}>
                    View Applications
                </PrimaryButton>
            </div>
        </form>
    );
};

export default DemoAddApplication;
