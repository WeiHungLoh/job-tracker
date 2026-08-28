import type { FormEvent } from 'react';
import FormFieldError from '../../../../components/formPage/FormFieldError';
import PrimaryButton from '../../../../components/button/PrimaryButton';
import { focusFirstInvalidField } from '../../../../components/formPage/focusFirstInvalidField';
import { useFormErrors } from '../../../../components/formPage/useFormErrors';
import { isInvalidDatetimeLocalInput, MAX_DATETIME_LOCAL, MIN_DATETIME_LOCAL } from '../../../../helper/dateFormatter';
import { routes } from '../../../../routes';
import styles from './AddApplication.module.css';
import { useJobTrackerAPI } from '../../../../api/useJobTrackerAPI';
import { useNavigate } from 'react-router-dom';
import { useRef, useState } from 'react';
import { useToast } from '../../../../components/toast/ToastProvider';
import { JOB_STATUSES, type CreateApplicationRequest, type JobStatus } from '../../models';
import { getErrorToastMessage } from '../../../../helper/getErrorToastMessage';
import {
    FIELD_MAX_LENGTHS,
    type ApplicationFormField,
    validateApplicationForm,
} from '../../../../helper/formValidation';
import { useConfirm } from 'material-ui-confirm';
import { isDuplicateApplicationError } from '../../possibleDuplicateApplication';
import { createDuplicateApplicationConfirmation } from '../../duplicateApplicationConfirmation';
import { useQuickCaptureData } from '../QuickCaptureProvider';
import Icon from '../../../../components/icon/Icon';
import QuickCaptureBookmarklet from '../QuickCaptureBookmarklet';
import { useUnsavedChangesBlocker } from '../../../../hooks/useUnsavedChangesBlocker';
import { hasUnsavedApplicationFormChanges } from '../../applicationFormChanges';

const getQuickCaptureHelperText = (companyName: string, jobTitle: string): string => {
    if (companyName && jobTitle) {
        return 'Company and job title were prefilled. Review them before saving.';
    }
    if (companyName) {
        return 'Company name was prefilled. Review it and enter the job title before saving.';
    }
    if (jobTitle) {
        return 'Job title was prefilled. Review it and enter the company name before saving.';
    }
    return 'We could not detect the company or job title from this page. Enter them manually.';
};

const AddApplication = () => {
    const quickCaptureData = useQuickCaptureData();
    const [capturedData] = useState(quickCaptureData);
    const [companyName, setCompanyName] = useState<string>(capturedData.companyName);
    const [jobTitle, setJobTitle] = useState<string>(capturedData.jobTitle);
    const [jobStatus, setJobStatus] = useState<JobStatus>('Applied');
    const [applicationDate, setApplicationDate] = useState<string>('');
    const [hasInvalidApplicationDateInput, setHasInvalidApplicationDateInput] = useState(false);
    const [jobLocation, setJobLocation] = useState<string>(capturedData.jobLocation);
    const [jobURL, setJobURL] = useState<string>(capturedData.jobURL);
    const quickCaptureHelperText = getQuickCaptureHelperText(capturedData.companyName, capturedData.jobTitle);
    const { clearFieldError, errors, setErrors } = useFormErrors<ApplicationFormField>();
    const companyNameInputRef = useRef<HTMLInputElement>(null);
    const jobTitleInputRef = useRef<HTMLInputElement>(null);
    const applicationDateInputRef = useRef<HTMLInputElement>(null);
    const jobLocationInputRef = useRef<HTMLInputElement>(null);
    const jobURLInputRef = useRef<HTMLInputElement>(null);
    const pendingSubmissionRef = useRef(false);
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isQuickCaptureSetupExpanded, setIsQuickCaptureSetupExpanded] = useState(false);
    const api = useJobTrackerAPI();
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
        isLoading
    );

    const handleToggleQuickCaptureSetup = () => {
        setIsQuickCaptureSetupExpanded((isExpanded) => !isExpanded);
    };

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

    const submitApplication = async (request: CreateApplicationRequest): Promise<string | undefined> => {
        try {
            return await api.application.createApplication(request);
        } catch (error) {
            if (!isDuplicateApplicationError(error)) {
                throw error;
            }

            const { confirmed } = await confirm(createDuplicateApplicationConfirmation(error.data.duplicate));
            if (!confirmed) {
                return undefined;
            }

            return await api.application.createApplication({ ...request, allowDuplicate: true });
        }
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
            appDate: applicationDate === '' ? null : values.applicationDate,
            jobStatus,
            jobLocation: values.jobLocation,
            jobURL: values.jobURL,
        };

        pendingSubmissionRef.current = true;
        setIsLoading(true);
        try {
            const message = await submitApplication(request);
            if (message === undefined) {
                return;
            }

            showSuccessToast(message);
            resetForm();
        } catch (error) {
            showErrorToast(getErrorToastMessage(error, 'Unable to add the job application. Please try again.'));
        } finally {
            pendingSubmissionRef.current = false;
            setIsLoading(false);
        }
    };

    return (
        <form className={styles.addApplication} noValidate onSubmit={handleAdd}>
            {capturedData.hasCaptureParameters ? (
                <section className={styles.quickCaptureReference} aria-labelledby='quick-capture-reference-heading'>
                    <p id='quick-capture-reference-heading' className={styles.quickCaptureReferenceHeading}>
                        <Icon data-testid='quick-capture-reference-icon' name='activeApplications' size='1.1em' />
                        <span>Quick Capture reference</span>
                    </p>
                    {capturedData.pageTitle && (
                        <p className={styles.capturedPageTitle} data-testid='captured-page-title'>
                            {capturedData.pageTitle}
                        </p>
                    )}
                    <p className={styles.quickCaptureReferenceHelp}>{quickCaptureHelperText}</p>
                </section>
            ) : (
                <div className={styles.quickCaptureSetup}>
                    <div className={styles.quickCaptureSetupTriggerRow}>
                        <PrimaryButton
                            aria-controls='quick-capture-setup-content'
                            aria-expanded={isQuickCaptureSetupExpanded}
                            className={styles.quickCaptureSetupTrigger}
                            type='button'
                            variant='navigation'
                            onClick={handleToggleQuickCaptureSetup}
                        >
                            <span>Quick Capture</span>
                            <Icon
                                className={`${styles.quickCaptureChevron} ${
                                    isQuickCaptureSetupExpanded ? styles.quickCaptureChevronOpen : ''
                                }`}
                                data-testid='quick-capture-chevron'
                                name='chevronDown'
                            />
                        </PrimaryButton>
                    </div>
                    {isQuickCaptureSetupExpanded && (
                        <section
                            id='quick-capture-setup-content'
                            className={styles.quickCaptureSetupContent}
                            aria-label='Quick Capture setup'
                        >
                            <p className={styles.quickCaptureSetupTitle}>Save jobs faster from a listing</p>
                            <p className={styles.quickCaptureSetupInstructions}>
                                Drag “Save to Job Tracker” to your desktop browser’s bookmarks bar. Then select it while
                                viewing a job posting.
                            </p>
                            <QuickCaptureBookmarklet showInstructions={false} />
                        </section>
                    )}
                </div>
            )}
            <div className={styles.field}>
                <label htmlFor='company-name'>Company name</label>
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
                <label htmlFor='job-title'>Job title</label>
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
                <label htmlFor='job-status'>Job status</label>
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
                <label htmlFor='app-date'>
                    Application date<span className={styles.optionalLabel}> (uses current date if left blank)</span>
                </label>
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
                    Job location<span className={styles.optionalLabel}> (optional)</span>
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
                    Job posting URL<span className={styles.optionalLabel}> (optional)</span>
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
                <PrimaryButton isLoading={isLoading} type='submit' variant='compact'>
                    Add application
                </PrimaryButton>
                <PrimaryButton type='button' variant='secondary' onClick={() => navigate(routes.viewApplications)}>
                    View applications
                </PrimaryButton>
            </div>
        </form>
    );
};

export default AddApplication;
