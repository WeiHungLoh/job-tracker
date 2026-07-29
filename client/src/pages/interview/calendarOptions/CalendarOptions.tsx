import ControlDropdown from '../../../components/activityControls/ControlDropdown';
import Icon from '../../../components/icon/Icon';
import { useToast } from '../../../components/toast/ToastProvider';
import type { JobInterview } from '../models';
import { buildGoogleCalendarUrl, CALENDAR_ERROR_MESSAGE, downloadIcsEvent } from '../../../helper/calendarEvent';
import { buildInterviewCalendarEvent, buildInterviewIcsFilename } from './interviewCalendarEvent';
import styles from './CalendarOptions.module.css';

type CalendarOptionsProps = {
    interview: JobInterview;
};

const CalendarOptions = ({ interview }: CalendarOptionsProps) => {
    const { showErrorToast } = useToast();

    const handleGoogleCalendar = () => {
        try {
            const event = buildInterviewCalendarEvent(interview);
            window.open(buildGoogleCalendarUrl(event), '_blank', 'noopener,noreferrer');
        } catch {
            showErrorToast(CALENDAR_ERROR_MESSAGE);
        }
    };

    const handleIcsDownload = () => {
        try {
            const event = buildInterviewCalendarEvent(interview);
            downloadIcsEvent(event, buildInterviewIcsFilename(event));
        } catch {
            showErrorToast(CALENDAR_ERROR_MESSAGE);
        }
    };

    return (
        <ControlDropdown
            closeOnSelect
            containerClassName={styles.container}
            dropdownAriaLabel='Calendar options'
            dropdownClassName={styles.menu}
            dropdownRole='group'
            id={`calendar-${interview.interview_id}`}
            label={
                <>
                    <Icon name='calendar' size={17} />
                </>
            }
            triggerAriaLabel='Add to calendar'
            triggerClassName={styles.trigger}
            triggerVariant='secondary'
        >
            <button className={styles.menuItem} onClick={handleGoogleCalendar} type='button'>
                Add to Google Calendar
            </button>
            <button className={styles.menuItem} onClick={handleIcsDownload} type='button'>
                Add to Apple Calendar / Outlook (.ics)
            </button>
        </ControlDropdown>
    );
};

export default CalendarOptions;
