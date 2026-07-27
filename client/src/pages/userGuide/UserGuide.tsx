import type { UserGuideSection } from './models';
import Icon from '../../components/icon/Icon';
import { Link } from 'react-router-dom';
import PrimaryButton from '../../components/button/PrimaryButton';
import { routes } from '../../routes';
import styles from './UserGuide.module.css';
import { useState } from 'react';
import { FIELD_MAX_LENGTHS, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '../../helper/formValidation';
import QuickCaptureBookmarklet from '../application/jobApplication/QuickCaptureBookmarklet';

const guideSections: readonly UserGuideSection[] = [
    {
        id: 'account-security',
        title: 'Account security',
        icon: 'lock',
        content: (
            <>
                <h3>Creating an account</h3>
                <p>
                    Email addresses are trimmed and treated as lowercase, so capitalization does not create a separate
                    account.
                </p>
                <p>
                    Passwords must contain {PASSWORD_MIN_LENGTH}–{PASSWORD_MAX_LENGTH} characters. Spaces and Unicode
                    characters are allowed, with no required uppercase letters, numbers or symbols. Some Unicode
                    characters use multiple bytes, so the secure encoding limit may be reached before the character
                    limit.
                </p>
                <p>
                    The password-strength meter estimates how difficult the password is to guess. Its score is guidance;
                    the length and encoding limits determine whether the password can be submitted.
                </p>
                <p>
                    Repeated sign-in or sign-up attempts may be temporarily limited. Wait before trying again if the
                    rate-limit message appears.
                </p>
            </>
        ),
    },
    {
        id: 'dashboard',
        title: 'Dashboard',
        icon: 'dashboard',
        content: (
            <>
                <p>The dashboard gives you a quick visual overview of your job search progress:</p>
                <ul>
                    <li>
                        <strong>Stat cards:</strong> Shows total applications, applications added this week, upcoming
                        interviews, interview rate, and offer rate.
                    </li>
                    <li>
                        <strong>Needs attention:</strong> Shows up to six applications that may require action, ordered
                        by urgency, and suggests one next action for each selected application.
                        <ul>
                            <li>
                                Interview applications appear when every scheduled interview has ended and at least
                                seven full days have passed since the latest interview ended. The number of days is
                                calculated from the latest interview&apos;s end time, including its duration, and
                                applications waiting longer are ranked higher. These items can generate a copyable
                                post-interview template.
                            </li>
                            <li>
                                Applications marked as Interview with no scheduled interview prompt you to add one. The
                                action opens Add Interview without creating an interview automatically.
                            </li>
                            <li>
                                Evaluated offers with a decision deadline in the next 72 hours appear first. The action
                                opens Job Applications in List view, filters to Offer, then scrolls to and highlights
                                the exact application so you can record it as Accepted or Declined. Evaluated offers
                                more than 72 hours away and offers with a passed deadline do not appear.
                            </li>
                            <li>
                                Unevaluated offers appear next regardless of deadline because their deadline has not
                                been recorded yet. The action opens active Offer Comparison so you can add the offer
                                details and decision deadline.
                            </li>
                            <li>
                                Applied applications with no linked interview appear after seven days, with older
                                applications ranked higher. These items can generate a copyable application follow-up
                                template.
                            </li>
                        </ul>
                        <p>
                            Follow-up templates are generated locally and are not sent or saved. Replace bracketed
                            placeholders before using a template. Copying a message does not mark an application as
                            followed up. Future and ongoing interviews remain in the Upcoming Interviews card.
                        </p>
                    </li>
                    <li>
                        <strong>Application trend:</strong> Shows applications added over the past eight weeks, with a
                        summary of this week, the change from last week, and the best week.
                    </li>
                    <li>
                        <strong>Upcoming interviews:</strong> Shows the next three scheduled interviews.
                    </li>
                    <li>
                        <strong>Application pipeline:</strong> Shows current Applied, Interview, Offer, and Accepted
                        totals.
                    </li>
                    <li>
                        <strong>Closed outcomes:</strong> Shows current Rejected, Ghosted, and Declined totals.
                    </li>
                </ul>
                <p>
                    Interview rate counts applications currently at <code>Interview</code>, <code>Offer</code>,{' '}
                    <code>Accepted</code> or <code>Declined</code>. Offer rate counts <code>Offer</code>,{' '}
                    <code>Accepted</code> or <code>Declined</code>. A declined application is included because it means
                    you received an offer and chose not to accept it.
                </p>
                <p>
                    Open it by selecting <code>Dashboard</code> from the navigation bar.
                </p>
            </>
        ),
    },
    {
        id: 'demo-mode',
        title: 'Demo mode',
        icon: 'dashboard',
        content: (
            <>
                <p>
                    Demo mode mirrors the signed-in Job Tracker flows with sample data stored only in React state. Open
                    it from the sign-in page or the <Link to={routes.demoViewApplications}>Explore Demo</Link> link.
                </p>
                <h3>What is different in demo mode</h3>
                <ul>
                    <li>No account, authentication, backend request or database write is used.</li>
                    <li>Changes remain while you move around demo pages, then reset when the browser refreshes.</li>
                    <li>
                        Success toasts match the signed-in app when adding an application or interview and when first
                        saving an offer evaluation.
                    </li>
                </ul>
                <h3>Applications</h3>
                <p>
                    Add applications, switch between list and board view, filter by status, edit notes, update status,
                    archive, restore, delete and export CSV records.
                </p>
                <h3>Offer comparison</h3>
                <p>
                    Compare the sample offers using monthly salary, bonus, practical offer facts and four fit ratings.
                    Saving or deleting an evaluation updates demo state only. Archived comparisons use the same
                    read-only, deletable view as the signed-in app.
                </p>
                <p>
                    Form validation uses the same limits as the signed-in app, including the{' '}
                    {FIELD_MAX_LENGTHS.companyName}-character company limit, {FIELD_MAX_LENGTHS.jobTitle}-character job
                    title limit and valid <code>http://</code> or <code>https://</code> job URLs.
                </p>
                <h3>Interviews</h3>
                <p>
                    Create interviews from an application with status <code>Interview</code>, switch active or archived
                    interviews between list and responsive board view, open their related application and export CSV
                    records. The interview date must be after the linked application date, and notes use the shared{' '}
                    {FIELD_MAX_LENGTHS.notes}-character limit.
                </p>
                <h3>Navigation and reset</h3>
                <p>
                    Use <code>Show Archived</code> to open archived applications and switch the demo navigation to
                    archived records. Use <code>Show Active</code> to return to active applications. Use{' '}
                    <code>Exit Demo</code> to return to sign in without logging out or verifying authentication.
                </p>
            </>
        ),
    },
    {
        id: 'offer-decisions',
        title: 'Offer Comparison',
        icon: 'briefcase',
        content: (
            <>
                <h3>Compare current offers</h3>
                <p>
                    Open Offer Comparison from the active navigation bar. Only active applications with status{' '}
                    <code>Offer</code> appear in Compare current offers, and only those applications can add or edit an
                    evaluation.
                </p>
                <p>
                    Select <code>Add evaluation</code> for an unevaluated offer. New fit ratings begin at 3 of 5. Select{' '}
                    <code>Cancel evaluation</code> to discard a new evaluation before it is saved.
                </p>
                <h3>Record terms and rate fit</h3>
                <p>
                    Enter the required decision deadline, currency and monthly base salary. Currency starts as{' '}
                    <code>SGD</code>. Bonus, annual leave, work arrangement, pros and cons are optional. After the offer
                    terms, rate career growth, company and culture fit, work-life balance, and compensation from 1 to 5
                    with the sliders; the equal-weight fit rating updates immediately.
                </p>
                <p>
                    Select <code>Save evaluation</code> on that offer. A successful first save moves it from Offers to
                    evaluate into Evaluated offers, locks its fields and shows a confirmation. Select{' '}
                    <code>Edit evaluation</code> to unlock it again. Save evaluation stays available and validates the
                    required fields when selected. You can also press Enter from a form field to save. Unsaved changes
                    remain on screen if saving fails.
                </p>
                <p>
                    The decision deadline stays visible above the fit rating when details are collapsed. Evaluated and
                    expired offers are sorted by deadline, then fit rating and name. Expired offers remain available to
                    review, edit or delete when their applications still have Offer status.
                </p>
                <h3>Try different priorities</h3>
                <p>
                    When at least two active, non-expired offers have saved evaluations, select{' '}
                    <code>Try priorities</code> in Evaluated offers. Change how important career growth, company and
                    culture fit, work-life balance, and compensation are. The results show your top match and whether a
                    small priority change could change it.
                </p>
                <p>
                    This uses saved ratings only. Your changes and results are not saved, do not change an offer&apos;s
                    fit rating, and reset when you close the tool. It is not available for expired, previous or archived
                    evaluations.
                </p>
                <h3>Plan a counteroffer</h3>
                <p>
                    For an active, non-expired offer with a saved evaluation, select <code>Plan counteroffer</code> on
                    its card. The dialog shows the read-only Current offer first and one editable Ideal offer directly
                    below it. The Ideal offer starts with the current terms and all four current ratings. Terms and
                    ratings remain separate inputs: changing salary, bonus, leave or work arrangement does not change a
                    rating automatically.
                </p>
                <p>
                    The Ideal offer shows its equal-weight fit rating, the difference from the current offer and how it
                    compares with your other active evaluated offers. Its rating comparison clearly separates Current,
                    Ideal and Change values. Individual rating differences use rating points; Fit rating differences use
                    percentage points. The Ideal offer must differ from the current offer and cannot have a lower
                    overall Fit rating. It never alters the saved evaluation or application status.
                </p>
                <p>
                    Saved plans remain available to review or delete after a deadline passes, the application moves to
                    Accepted or Declined, or the application is archived. Editing is available again only while the
                    offer is active, not archived and within its decision window.
                </p>
                <h3>Status changes, deletion and archive</h3>
                <p>
                    While a saved evaluation exists, its application can only remain at Offer or move to Accepted or
                    Declined. Accepted and declined applications stay under Previous evaluations as read-only records.
                    Deleting the evaluation removes only that evaluation and restores the normal status options, subject
                    to the existing interview restriction.
                </p>
                <p>
                    <code>Show Archived</code> opens Archived Offer Comparisons. Archived evaluations are read-only but
                    can be shown, hidden or deleted there. Deleting an application still permanently deletes its saved
                    evaluation through the existing cascade.
                </p>
            </>
        ),
    },
    {
        id: 'applications',
        title: 'Adding and managing applications',
        icon: 'briefcase',
        content: (
            <>
                <h3>Add a job application</h3>
                <p>
                    Enter the company name, job title and status. Application date, location and job URL are optional.
                    If the application date is blank, the current date is used.
                </p>
                <ul>
                    <li>
                        Company name is required, trimmed before saving, and limited to {FIELD_MAX_LENGTHS.companyName}{' '}
                        characters.
                    </li>
                    <li>
                        Job title is required, trimmed before saving, and limited to {FIELD_MAX_LENGTHS.jobTitle}{' '}
                        characters.
                    </li>
                    <li>The application date cannot be in the future.</li>
                    <li>
                        Job location is a separate application field and is limited to {FIELD_MAX_LENGTHS.location}{' '}
                        characters.
                    </li>
                    <li>
                        Job URLs are limited to {FIELD_MAX_LENGTHS.jobURL} characters and must use <code>http://</code>{' '}
                        or <code>https://</code> with a valid domain and suffix.
                    </li>
                </ul>
                <p>If the server rejects the submission, the entered application details remain in the form.</p>
                <h3>Quick capture from a job posting</h3>
                <p>
                    Sign in to Job Tracker before using Quick Capture. In a desktop browser, make the bookmarks bar
                    visible, then install the bookmark once. If you already use an older Quick Capture bookmark, replace
                    that saved bookmark once to enable smart prefilling:
                </p>
                <p>Expand Quick Capture at the top of the Add Application form for the same setup shortcut.</p>
                <QuickCaptureBookmarklet />
                <ol>
                    <li>Visit a job advertisement and select the saved bookmark.</li>
                    <li>Job Tracker opens the Add Application page in a new tab.</li>
                    <li>The Job Posting URL is prefilled from the current page.</li>
                    <li>
                        When the page provides structured job-posting metadata, Quick Capture fills only the company
                        name, job title and location provided by that metadata.
                    </li>
                    <li>
                        Missing details stay empty, and the Quick Capture reference panel keeps the browser-tab title as
                        a reference.
                    </li>
                    <li>Review every populated field and complete the application before submitting.</li>
                </ol>
                <p>
                    Quick Capture reads the current top-level URL, browser-tab title and Schema.org JobPosting metadata.
                    It does not guess from visible page text or inspect an Easy Apply modal or embedded iframe. Some
                    portals may also use temporary or session-dependent URLs.
                </p>
                <p>
                    Quick Capture works on most standard desktop job pages. Pages without supported metadata keep the
                    existing URL and page-title fallback. Some websites or browser security settings may block
                    bookmarklets. If it does not open, copy the job page URL and paste it into the Job Posting URL field
                    manually.
                </p>
                <h3>View job applications</h3>
                <p>
                    The application viewer lets you delete applications, edit their status and open their original job
                    posting URL. Select <code>Edit Status</code> to reveal the status menu.
                </p>
                <p>
                    Use the <strong>List</strong> and <strong>Board</strong> switch to choose between the standard card
                    list and the board layout. The active application board groups cards by status, shows the
                    application date, and lets you drag cards between columns or use the <code>Move to</code> menu to
                    update status.
                </p>
                <p>
                    Changing a status to <code>Interview</code> displays a link for creating an interview tied to that
                    application. If an interview already exists, delete it before changing the status back to{' '}
                    <code>Applied</code>. The board also prevents moving an application back to <code>Applied</code>{' '}
                    while it still has an interview.
                </p>
                <p>
                    Use <strong>Filter by</strong> to show one or more statuses, or select <code>Show All</code>. The
                    archive toggle reveals or hides the archive action for each application.
                </p>
                <p>
                    An orange <strong>Upcoming Interviews</strong> badge appears below the status when an application
                    has one or more interviews scheduled in the future.
                </p>
            </>
        ),
    },
    {
        id: 'interviews',
        title: 'Interviews',
        icon: 'interview',
        content: (
            <>
                <h3>Add an interview</h3>
                <p>
                    Interview date and interview location are required. The interview date must be after the related
                    application date.
                </p>
                <ul>
                    <li>
                        Interview location is separate from job location, but both use the same{' '}
                        {FIELD_MAX_LENGTHS.location}-character limit.
                    </li>
                    <li>Interview type is optional and limited to {FIELD_MAX_LENGTHS.interviewType} characters.</li>
                    <li>Interview notes are optional and limited to {FIELD_MAX_LENGTHS.notes} characters.</li>
                </ul>
                <p>
                    Before saving, Job Tracker warns you if the interview overlaps another active interview or runs past
                    another active offer&apos;s decision deadline. A warning does not add the interview unless you
                    choose <strong>Add Anyway</strong>. Choose <strong>Cancel</strong> to keep the form unchanged.
                </p>
                <p>If the server rejects the submission, the entered interview details remain in the form.</p>
                <h3>View interviews</h3>
                <p>
                    Interview records are linked to their job applications and can be deleted from the interview viewer.
                    Use the <strong>List</strong> and <strong>Board</strong> switch to choose a standard card list or a
                    responsive multi-column card grid. Both views keep exactly the same interview order.
                </p>
                <p>
                    Select <code>Click here to review corresponding job application</code> to return to the related
                    application. The relevant active or archived Application page must be in List view. The application
                    is then scrolled into view and highlighted for four seconds if it is visible in the current filter
                    (e.g. if the application has status <code>Interview</code>, the filter must include that status).
                </p>
                <p>
                    Both active and archived interviews are sorted with upcoming interviews first (closest date at the
                    top), followed by past interviews (earliest date first).
                </p>
            </>
        ),
    },
    {
        id: 'notes',
        title: 'Notes and visibility',
        icon: 'notes',
        content: (
            <>
                <p>
                    The notes toggle at the top of an application viewer shows or hides notes for every visible
                    application.
                </p>
                <h3>Active applications</h3>
                <p>
                    Application notes are editable, limited to {FIELD_MAX_LENGTHS.notes} characters, and automatically
                    saved after you stop typing for half a second.
                </p>
                <p>
                    Application notes and interview notes are separate fields, but both use the same{' '}
                    {FIELD_MAX_LENGTHS.notes}-character limit.
                </p>
                <h3>Archived applications</h3>
                <p>
                    Archived notes are read-only in both list and board views. Unarchive the application before making
                    further changes.
                </p>
            </>
        ),
    },
    {
        id: 'archive',
        title: 'Archive mode',
        icon: 'archive',
        content: (
            <>
                <p>
                    Select <code>Show Archived</code> to open archived applications and replace the active navigation
                    links with archived applications, archived interviews and archived offer comparisons. Select{' '}
                    <code>Show Active</code> to return to active job applications. When toggled from either Offer
                    Comparison page, the button opens its directly paired active or archived page.
                </p>
                <ul>
                    <li>
                        <strong>Archived applications:</strong> View, filter, delete or unarchive applications in list
                        or board view. Archived board cards use the same visual format as active board cards, but they
                        cannot be dragged, cannot change status, and cannot edit notes. Unarchiving also restores the
                        linked interview, if one exists.
                    </li>
                    <li>
                        <strong>Archived interviews:</strong> View them in list or responsive board view. They are
                        read-only; unarchive their related application to restore them. Sorted with upcoming first, past
                        last.
                    </li>
                </ul>
            </>
        ),
    },
    {
        id: 'deletion',
        title: 'Deletion, archiving and restoration rules',
        icon: 'delete',
        content: (
            <>
                <ul>
                    <li>Deleting an active or archived application also deletes its linked interview.</li>
                    <li>Deleting an active or archived application also deletes its saved offer evaluation.</li>
                    <li>Archiving an application automatically archives its linked interview.</li>
                    <li>Archiving preserves its saved offer evaluation as a read-only snapshot.</li>
                    <li>Unarchiving an application automatically restores its linked interview.</li>
                    <li>Unarchiving restores access to its saved evaluation; only Offer status makes it editable.</li>
                    <li>Archived records are not editable until they are restored.</li>
                    <li>
                        <strong>Archive All</strong> affects every active application you own, not only applications
                        visible under the current filters, and archives all related active interviews.
                    </li>
                    <li>
                        <strong>Unarchive All</strong> affects every archived application you own, not only archived
                        applications visible under the current filters, and restores all related archived interviews.
                    </li>
                    <li>
                        <strong>Delete All applications</strong> permanently deletes the complete active or archived
                        application collection selected, all of its related interviews and all saved offer evaluations,
                        regardless of filters.
                    </li>
                    <li>
                        <strong>Delete All interviews</strong> permanently deletes the complete active or archived
                        interview collection selected without changing the opposite collection.
                    </li>
                </ul>
                <p>
                    Bulk confirmations show the current application, related-interview and saved-evaluation counts
                    before the action. Single and bulk deletions are permanent, so review the selected records before
                    confirming.
                </p>
            </>
        ),
    },
    {
        id: 'export-sorting',
        title: 'Exporting and sorting records',
        icon: 'export',
        content: (
            <>
                <h3>Export as CSV</h3>
                <p>
                    Application exports contain the records visible under the selected status filters in their current
                    display order. List exports follow the visible list. Board exports move from left to right through
                    the visible status columns and keep each column&apos;s selected ordering. Interview and
                    archived-record viewers also provide CSV export actions under <strong>More...</strong> when at least
                    one record is available.
                </p>
                <p>
                    Values that spreadsheet apps could interpret as formulas are exported as text for safer opening in
                    CSV software.
                </p>
                <h3>Sorting order</h3>
                <p>
                    Use <strong>Sort by</strong> to order application lists by <code>Job Status</code>,{' '}
                    <code>Newest Application</code>, <code>Oldest Application</code>, <code>Company A–Z</code> or{' '}
                    <code>Company Z–A</code>. The default list order is <code>Job Status</code>, which groups
                    applications by status and shows the newest application first within each status.
                </p>
                <p>
                    Application boards keep columns in this order: <code>Accepted</code>, <code>Offer</code>,{' '}
                    <code>Declined</code>, <code>Interview</code>, <code>Applied</code>, <code>Ghosted</code> and{' '}
                    <code>Rejected</code>. Board sorting applies inside each column and defaults to{' '}
                    <code>Newest Application</code>. Active and archived list and board choices are saved independently.
                </p>
                <p>
                    Interviews are grouped with upcoming dates first (closest at the top), then past dates (earliest
                    first). This applies to both upcoming and archived interviews.
                </p>
            </>
        ),
    },
    {
        id: 'highlighting',
        title: 'Auto scroll and highlighting',
        icon: 'highlight',
        content: (
            <>
                <p>
                    Use the <strong>Auto scroll after job status change</strong> toggle under{' '}
                    <strong>Display options</strong> in list view to control scrolling behavior. When enabled (green),
                    auto scroll only applies when Sort by is set to Job Status. When both conditions are met, changing
                    the job status via the edit dropdown will automatically scroll the application into view.
                </p>
                <p>
                    After an eligible list-view status update, the application receives a green highlight for four
                    seconds. The page stays in place when auto scroll is disabled, another sort order is selected or the
                    status did not change.
                </p>
                <p>
                    The same feedback appears when navigating from an interview to its corresponding application, but
                    only while the relevant Application page is in List view.
                </p>
            </>
        ),
    },
    {
        id: 'dark-mode',
        title: 'Dark mode',
        icon: 'darkMode',
        content: (
            <>
                <p>
                    Click the moon or sun icon in the navigation bar to switch between light and dark mode. The icon
                    appears between the archive toggle and the Logout link.
                </p>
                <p>
                    Your preference is saved to <strong>localStorage</strong> and persists across sessions. On your
                    first visit, if no saved preference is found, the app checks your operating system setting (light or
                    dark mode) and uses that.
                </p>
                <p>All colours — text, backgrounds, buttons, badges, charts and form inputs — adapt automatically.</p>
            </>
        ),
    },
];

const UserGuide = () => {
    const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

    return (
        <main data-testid='ug' className={styles.userGuide}>
            <div className={styles.guideContainer}>
                <Link className={styles.backButton} to={routes.signIn}>
                    <Icon name='arrowBack' />
                    Back to sign in
                </Link>
                <header className={styles.header}>
                    <span className={styles.headerIcon}>
                        <Icon name='guide' />
                    </span>
                    <div>
                        <h1>Job Tracker User Guide</h1>
                        <p>Quick answers for managing applications, interviews and archived records.</p>
                    </div>
                </header>

                <div className={styles.accordion}>
                    {guideSections.map((section) => {
                        const isOpen = activeSectionId === section.id;
                        const panelId = `${section.id}-panel`;

                        return (
                            <section
                                key={section.id}
                                className={`${styles.accordionItem} ${isOpen ? styles.accordionItemOpen : ''}`}
                            >
                                <h2 className={styles.accordionHeading}>
                                    <PrimaryButton
                                        variant='navigation'
                                        className={styles.accordionButton}
                                        type='button'
                                        aria-expanded={isOpen}
                                        aria-controls={panelId}
                                        onClick={() => setActiveSectionId(isOpen ? null : section.id)}
                                    >
                                        <span className={styles.sectionIcon}>
                                            <Icon name={section.icon} />
                                        </span>
                                        <span>{section.title}</span>
                                        <Icon
                                            name='chevronDown'
                                            className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}
                                        />
                                    </PrimaryButton>
                                </h2>
                                <div id={panelId} className={styles.accordionPanel} hidden={!isOpen}>
                                    {section.content}
                                </div>
                            </section>
                        );
                    })}
                </div>

                <p className={styles.tip}>
                    Tip: Archive records instead of deleting them when you may need them later.
                </p>
            </div>
        </main>
    );
};

export default UserGuide;
