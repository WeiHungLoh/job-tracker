import { Children, isValidElement, useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import PrimaryButton from '../../components/button/PrimaryButton';
import Icon from '../../components/icon/Icon';
import DirectionalLink from '../../components/directionalLink/DirectionalLink';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '../../helper/formValidation';
import { routes } from '../../routes';
import { loadDemoRoute } from '../../routeLoaders';
import QuickCaptureBookmarklet from '../application/jobApplication/QuickCaptureBookmarklet';
import styles from './UserGuide.module.css';
import type { UserGuideSection } from './models';

const preloadDemoRoute = () => {
    void loadDemoRoute().catch(() => undefined);
};

const guideSections: readonly UserGuideSection[] = [
    {
        id: 'getting-started',
        title: 'Getting started',
        summary: 'The quickest path from sign-in to your first tracked job',
        icon: 'guide',
        searchTerms: ['begin', 'first application', 'status', 'interview', 'offer', 'archive'],
        content: (
            <>
                <p>
                    Job Tracker keeps your applications, interviews, offers, notes and follow-ups in one place. You do
                    not need to set everything up at once. Start with the jobs you are applying for today, then add more
                    detail when you need it.
                </p>
                <h3>A simple way to begin</h3>
                <ol>
                    <li>Add an application with the company, job title and current status.</li>
                    <li>Update the status whenever the application moves forward.</li>
                    <li>Add interview details when an interview is arranged.</li>
                    <li>Use Offer Comparison when you receive an offer.</li>
                    <li>Archive finished records that you may want to look back on.</li>
                </ol>
                <p>
                    The main menu takes you to your Dashboard, Applications, Interviews and Offer Comparison. On list
                    pages, choose <strong>Show archived</strong> to see records you have put away.
                </p>
                <p>
                    Want to look around first?{' '}
                    <Link
                        onFocus={preloadDemoRoute}
                        onPointerDown={preloadDemoRoute}
                        onPointerEnter={preloadDemoRoute}
                        rel='noreferrer'
                        target='_blank'
                        to={routes.demoViewApplications}
                    >
                        Explore Demo
                    </Link>{' '}
                    with sample data. No account is needed.
                </p>
            </>
        ),
    },
    {
        id: 'dashboard',
        title: 'Dashboard and reminders',
        summary: 'Stats, Needs Attention, follow-ups and reminder settings',
        icon: 'dashboard',
        searchTerms: ['rates', 'pipeline', 'urgent tasks', 'draft messages', 'settings'],
        subtopics: [
            { id: 'dashboard-overview', label: 'At a glance' },
            { id: 'needs-attention', label: 'Needs Attention' },
            { id: 'reminder-settings', label: 'Reminder settings' },
            { id: 'follow-up-drafts', label: 'Follow-up drafts' },
            { id: 'dashboard-rates', label: 'Rates' },
        ],
        content: (
            <>
                <h3 id='dashboard-overview'>Your job search at a glance</h3>
                <p>
                    The Dashboard shows your total applications, recent activity, upcoming interviews, interview rate
                    and offer rate. It also includes charts for weekly activity, your current application pipeline and
                    closed outcomes.
                </p>
                <p>
                    Each part loads on its own. If one part cannot load, the rest of the Dashboard stays available. Use
                    <strong> Try again</strong> on the part that needs to be reloaded.
                </p>

                <h3 id='needs-attention'>Needs Attention</h3>
                <p>
                    Needs Attention brings urgent or easy-to-miss tasks to the top of the Dashboard. Depending on your
                    records and settings, it can remind you about:
                </p>
                <ul>
                    <li>offers that are due soon, overdue or still waiting to be evaluated;</li>
                    <li>follow-ups after a completed interview;</li>
                    <li>interview applications that do not yet have an interview date;</li>
                    <li>applications that have been waiting for a follow-up; and</li>
                    <li>applications that have not moved after a follow-up was sent.</li>
                </ul>
                <p>
                    Each reminder suggests a next step. When that step opens another page, Job Tracker finds the exact
                    application, interview or offer even if it is outside your current filters.
                </p>

                <h3 id='reminder-settings'>Choose which reminders you see</h3>
                <p>
                    Open <strong>Settings</strong> in Needs Attention to turn reminder types on or off, change how long
                    Job Tracker waits and choose the maximum number of reminders shown. Reminders keep their built-in
                    priority order so the most time-sensitive work appears first.
                </p>
                <p>
                    <strong>Reset to default</strong> restores the original choices in the open window. Select
                    <strong> Save</strong> to keep those changes. Changing reminder settings does not change your
                    applications, interviews or offers.
                </p>

                <h3 id='follow-up-drafts'>Follow-up reminders are private drafts</h3>
                <p>
                    Job Tracker can prepare a message for you to copy, but it never sends email and cannot read your
                    inbox. Check the message, replace any placeholders and send it using your usual email service. Then
                    choose <strong>Mark as sent</strong> in Job Tracker. Use <strong>Undo</strong> if you marked it by
                    mistake.
                </p>

                <h3 id='dashboard-rates'>How the rates are worked out</h3>
                <p>
                    Interview rate is the share of applications that reached Interview, Offer, Accepted or Declined.
                    Offer rate is the share that reached Offer, Accepted or Declined. Archived applications are not
                    included in the Dashboard totals.
                </p>
            </>
        ),
    },
    {
        id: 'applications',
        title: 'Applications',
        summary: 'Add, capture, organise and update your applications',
        icon: 'briefcase',
        searchTerms: [
            'Quick Capture',
            'Save to Job Tracker',
            'bookmark',
            'List',
            'Board',
            'statuses',
            'pin',
            'job posting',
        ],
        subtopics: [
            { id: 'add-application', label: 'Add an application' },
            { id: 'quick-capture', label: 'Quick Capture' },
            { id: 'list-board-views', label: 'List and Board' },
            { id: 'application-statuses', label: 'Application statuses' },
            { id: 'linked-record-statuses', label: 'Linked records' },
        ],
        content: (
            <>
                <h3 id='add-application'>Add an application</h3>
                <p className={styles.requirements}>
                    <strong>Required:</strong> company, job title and status.
                </p>
                <ol aria-label='Add an application steps'>
                    <li>Enter the company, job title and current status.</li>
                    <li>
                        Add the application date, location or job posting link when available. These are optional. If
                        the date is blank, Job Tracker uses today&apos;s date; a future date cannot be saved.
                    </li>
                    <li>
                        Save the application. If something goes wrong, your details stay on the page so you can try
                        again without retyping them.
                    </li>
                </ol>

                <h3 id='quick-capture'>Quick Capture from a job posting</h3>
                <p>
                    Drag the button below to your browser&apos;s bookmarks bar. When you are viewing a job posting,
                    select the bookmark to open Job Tracker with any available company, job title, location and link
                    already filled in. Always check the details before saving because job sites arrange their pages
                    differently.
                </p>
                <QuickCaptureBookmarklet />
                <p>
                    If your browser blocks the shortcut or the page does not provide enough information, copy the job
                    posting link and add the application normally.
                </p>

                <h3 id='list-board-views'>List and Board views</h3>
                <p>
                    <strong>List</strong> puts applications in rows that are easy to scan. <strong>Board</strong> groups
                    them by status so you can see your pipeline. On the Board, drag a card to another column or use
                    <strong> Move to</strong> from the card menu. Both views use the same records, filters and actions.
                </p>
                <p>
                    You can filter and sort your applications, pin important ones and choose whether notes are shown.
                    Your List and Board choices are remembered separately for active and archived records.
                </p>

                <h3 id='application-statuses'>Application statuses</h3>
                <ul>
                    <li>
                        <strong>Applied:</strong> your application has been sent.
                    </li>
                    <li>
                        <strong>Interview:</strong> you are in the interview process.
                    </li>
                    <li>
                        <strong>Offer:</strong> you have received an offer.
                    </li>
                    <li>
                        <strong>Accepted:</strong> you accepted the offer.
                    </li>
                    <li>
                        <strong>Declined:</strong> you declined or turned down the offer.
                    </li>
                    <li>
                        <strong>Rejected:</strong> the employer ended the application.
                    </li>
                    <li>
                        <strong>Withdrawn:</strong> you chose to stop the application.
                    </li>
                    <li>
                        <strong>Ghosted:</strong> the employer stopped responding.
                    </li>
                </ul>

                <h3 id='linked-record-statuses'>When a status is tied to another record</h3>
                <p>
                    An interview can only be added to an active application with the Interview status. If an application
                    already has an interview, it cannot be moved back to Applied until the linked interviews are
                    removed.
                </p>
                <p>
                    A saved offer evaluation keeps its application in Offer, Accepted or Declined. Delete the evaluation
                    first if you need to move the application to an earlier status.
                </p>
                <p>
                    Applications with a future interview show an upcoming-interview badge. Select it to open the
                    matching interview.
                </p>
            </>
        ),
    },
    {
        id: 'interviews',
        title: 'Interviews',
        summary: 'Schedule, organise, link and export interview details',
        icon: 'interview',
        searchTerms: ['calendar', 'Upcoming', 'Past', 'meeting link', 'overlap'],
        content: (
            <>
                <h3>Add an interview</h3>
                <p>
                    Choose an active application with the Interview status, then enter the interview date, time and
                    location. Interview type, duration, meeting link and notes are optional. The interview cannot be
                    earlier than the application date.
                </p>
                <p>
                    If the time overlaps another interview or an offer deadline is close, Job Tracker warns you before
                    saving. Review the warning, then choose <strong>Add anyway</strong> if the timing is correct or
                    <strong> Cancel</strong> to make a change.
                </p>

                <h3>Organise interviews</h3>
                <p>
                    Use List or Board view, switch between Upcoming and Past, and pin the interviews you need most.
                    Notes are available from each interview&apos;s Actions area when they are not shown on the card.
                </p>
                <p>
                    Select the corresponding application from an interview to go directly to it. Job Tracker keeps your
                    current List or Board view, preserves your filters, reveals the record and briefly highlights it.
                </p>

                <h3>Add interviews to your calendar</h3>
                <p>
                    Download one interview or all currently shown interviews as a calendar file. Open that file in Apple
                    Calendar, Google Calendar, Outlook or another calendar app. This is a one-time copy, not a live
                    calendar connection, so download it again if the interview changes.
                </p>
            </>
        ),
    },
    {
        id: 'offer-comparison',
        title: 'Offer Comparison',
        summary: 'Evaluate offers, test priorities and plan a counteroffer',
        icon: 'highlight',
        searchTerms: ['Table', 'Cards', 'ratings', 'deadline', 'counteroffer', 'accept', 'decline'],
        subtopics: [
            { id: 'add-review-offers', label: 'Add and review' },
            { id: 'offer-view-options', label: 'View options' },
            { id: 'filter-compare-offers', label: 'Filter and compare' },
            { id: 'counteroffer-plan', label: 'Counteroffer plan' },
            { id: 'offer-decisions-export', label: 'Decisions and export' },
            { id: 'delete-evaluations', label: 'Delete evaluations' },
        ],
        content: (
            <>
                <h3 id='add-review-offers'>Add and review offers</h3>
                <p>
                    Applications with the Offer status appear under <strong>Offers to Evaluate</strong>. Once you save
                    an evaluation, the offer stays available in the suitable Evaluated, Expired or Previous section,
                    even if its application later becomes Accepted or Declined.
                </p>
                <p>
                    Add the pay, benefits, decision deadline and any other details you know. Rate career growth, company
                    and culture fit, work-life balance, and compensation from 1 to 5. Job Tracker uses those ratings to
                    calculate the overall fit. You can edit the evaluation whenever the offer changes.
                </p>

                <h3 id='offer-view-options'>Choose the view that works for you</h3>
                <p>
                    View offers as <strong>Cards or Table</strong>. Cards keep each offer in its own panel. Table places
                    details next to one another for quicker comparison. In Table view, choose
                    <strong> Horizontal or Vertical</strong> to change which direction the information is arranged.
                </p>
                <p>
                    Cards and Table use the same evaluations and actions. In Cards, you add and edit details in the
                    card. In Table, the same form opens in a window. Your chosen view is remembered separately for
                    active and archived offers.
                </p>

                <h3 id='filter-compare-offers'>Filter and compare</h3>
                <p>
                    Use the section filters to show Offers to Evaluate, Evaluated Offers, Expired Evaluated Offers and
                    Previous Offers. Select at least two current evaluated offers to <strong>Try priorities</strong>.
                    This lets you see how different priorities affect the ranking without changing your saved ratings.
                </p>
                <p>
                    An offer moves to Expired when its deadline passes without an Accepted or Declined decision.
                    Accepted and Declined offers move to Previous Offers, where their evaluation remains available for
                    reference.
                </p>

                <h3 id='counteroffer-plan'>Plan a counteroffer</h3>
                <p>
                    A current, non-expired evaluated offer can have a saved counteroffer plan. Start with the present
                    offer, enter the outcome you want and compare the difference. Change at least one term or rating;
                    the plan cannot have a lower overall fit than the current offer. Saving a plan does not change the
                    application status or original evaluation.
                </p>
                <p>
                    Previous offers keep saved plans for reference. Archived offers are read-only, so their evaluation
                    and plan can be viewed but not changed.
                </p>

                <h3 id='offer-decisions-export'>Record a decision, export or add a deadline</h3>
                <p>
                    Choose <strong>Accept offer</strong> or <strong>Decline offer</strong> to update the application and
                    keep the evaluation as a previous offer. You can export the offer sections you are viewing, and
                    download decision deadlines as a calendar file.
                </p>

                <h3 id='delete-evaluations'>Delete evaluations carefully</h3>
                <p>
                    Deleting all evaluations removes the saved evaluations and their counteroffer plans from the active
                    or archived collection you are viewing. It does not delete the applications themselves.
                    <strong> Offers without evaluations are not deleted.</strong>
                </p>
            </>
        ),
    },
    {
        id: 'notes-follow-ups',
        title: 'Notes and follow-ups',
        summary: 'Autosave notes and prepare private follow-up drafts',
        icon: 'notes',
        searchTerms: ['Saving', 'Saved', 'Retry', 'email', 'Mark as sent', 'Undo'],
        content: (
            <>
                <h3>Keep notes with the right record</h3>
                <p>
                    Applications and interviews each have their own notes. Use <strong>Display</strong> to show notes on
                    List cards. On Board cards, open <strong>Actions</strong> to view or edit them.
                </p>
                <p>
                    Notes on active records save automatically about one second after you stop typing. The label shows
                    <strong> Saving</strong>, <strong>Saved</strong> or <strong>Couldn&apos;t save</strong>. Choose
                    <strong> Retry</strong> if needed. Leaving the note or hiding it also starts a final save. Archived
                    notes are read-only.
                </p>

                <h3>Follow-up messages</h3>
                <p>
                    Job Tracker can prepare a follow-up draft for an older application or a completed interview. The
                    draft stays on your device and is never sent automatically. Review it, replace any placeholders and
                    copy it into your email service.
                </p>
                <p>
                    After you send the message yourself, choose <strong>Mark as sent</strong>. List view shows the sent
                    time on the card. Board view shows a smaller indicator, with the full details under Actions. Use
                    <strong> Undo</strong> if you need to remove the sent mark.
                </p>
                <p>
                    An application follow-up mark clears when you use Undo or move the application away from Applied. An
                    interview follow-up remains as part of that interview&apos;s history until you undo it or delete the
                    interview. Only the latest sent time is kept for each follow-up.
                </p>
            </>
        ),
    },
    {
        id: 'archived-records-deletion',
        title: 'Archived records and deletion',
        summary: 'Understand what is reversible and what is permanent',
        icon: 'archive',
        searchTerms: ['unarchive', 'Delete all', 'Archive all', 'restore'],
        content: (
            <>
                <h3>Archive when you may need the record later</h3>
                <p>
                    Archiving removes a record from your active workspace without erasing it. Choose
                    <strong> Show archived</strong> to see archived records, then choose <strong>Show active</strong> to
                    return.
                </p>
                <p>
                    When you archive an application, all of its linked interviews are archived with it. Saved offer
                    evaluations and counteroffer plans are kept as read-only records. Unarchiving the application brings
                    its linked interviews and offer information back to the active workspace.
                </p>

                <h3>Deletion cannot be undone</h3>
                <p>
                    Deleting an application permanently removes the application, all linked interviews, its offer
                    evaluation and any saved counteroffer plan. Deleting an interview removes only that interview.
                </p>
                <p>
                    Bulk actions such as <strong>Archive all</strong>, <strong>Unarchive all</strong> and
                    <strong> Delete all</strong> affect the full active or archived collection you selected, not only
                    the records currently shown by your search or filters. The confirmation tells you how many related
                    records and plans will be affected. Read it carefully before continuing.
                </p>
            </>
        ),
    },
    {
        id: 'exporting-sorting-display',
        title: 'Exporting, sorting and display',
        summary: 'Download the current view and control how records appear',
        icon: 'export',
        searchTerms: ['CSV', 'More', 'pin', 'filters', 'order', 'Display options'],
        content: (
            <>
                <h3>Export what you are viewing</h3>
                <p>
                    Open <strong>More</strong> and choose Export to download a CSV file. Application and interview
                    exports follow your current filters and order. A Board export moves from the leftmost column to the
                    rightmost column. Follow-up sent times are included when available.
                </p>
                <p>
                    Offer Comparison exports the sections you selected and includes counteroffer plan details when they
                    exist. Exported text is prepared so spreadsheet apps do not treat ordinary notes as formulas.
                </p>

                <h3>Sort and pin records</h3>
                <p>
                    Application List view can sort by job status, newest or oldest application date, or company name.
                    Board view can sort cards within each status column by application date or company name. Interview
                    views keep Upcoming and Past records in a useful date order, while pinned records stay easy to
                    reach.
                </p>
                <p>
                    Sorting choices are remembered separately for active and archived records. Use Display options to
                    show or hide notes and to control automatic movement after updates.
                </p>
            </>
        ),
    },
    {
        id: 'finding-records',
        title: 'Finding records after updates',
        summary: 'Movement, highlighting, direct links and preserved filters',
        icon: 'highlight',
        searchTerms: ['automatic movement', 'scroll', 'changed record'],
        content: (
            <>
                <h3>Automatic movement and highlighting</h3>
                <p>
                    When automatic movement is on, Job Tracker brings a changed record into view and briefly highlights
                    it. This is helpful when a status change moves an application to another List position or Board
                    column, or when an offer moves to another section.
                </p>
                <p>
                    Turn this off in Display options if you prefer the page to stay where it is after ordinary updates.
                    Direct links from the Dashboard or an interview still find and highlight the exact record, because
                    you asked to go to it.
                </p>
                <p>
                    Moving between an interview and its application keeps your current List or Board view and preserves
                    your filters. On long collection pages, use the up-arrow button to return to the top.
                </p>
            </>
        ),
    },
    {
        id: 'demo-mode',
        title: 'Demo mode',
        summary: 'Explore Job Tracker with sample data and no account',
        icon: 'dashboard',
        searchTerms: ['refresh', 'reset', 'Exit Demo'],
        content: (
            <>
                <p>
                    <Link
                        onFocus={preloadDemoRoute}
                        onPointerDown={preloadDemoRoute}
                        onPointerEnter={preloadDemoRoute}
                        rel='noreferrer'
                        target='_blank'
                        to={routes.demoViewApplications}
                    >
                        Explore Demo
                    </Link>{' '}
                    to try Job Tracker with sample data. No account is needed.
                </p>
                <p>
                    You can explore the Dashboard, Applications, Interviews, Offer Comparison, Cards and Table views,
                    notes, follow-ups, archives and exports. Changes stay in the demo while you use it, then the sample
                    data resets when you refresh the page.
                </p>
                <p>
                    Demo changes never affect a real account. Choose <strong>Exit Demo</strong> when you are ready to
                    return to sign in.
                </p>
            </>
        ),
    },
    {
        id: 'account-appearance',
        title: 'Account and appearance',
        summary: 'Password basics, sign-in protection and light or dark mode',
        icon: 'lock',
        searchTerms: ['email', 'password', 'rate limit', 'theme'],
        content: (
            <>
                <h3>Account basics</h3>
                <p>
                    Email addresses are saved in lowercase, so using capital letters does not create a different
                    account.
                </p>
                <p>
                    Passwords must be {PASSWORD_MIN_LENGTH}–{PASSWORD_MAX_LENGTH} characters long. Spaces and
                    international characters are allowed. The strength meter is a helpful guide, not another password
                    rule.
                </p>
                <p>
                    If there are too many sign-in or sign-up attempts, Job Tracker may ask you to wait before trying
                    again. This helps protect accounts.
                </p>

                <h3>Light and dark appearance</h3>
                <p>
                    Use the moon or sun button to switch between light and dark appearance. On your first visit, Job
                    Tracker follows your device setting. After that, it remembers your choice. Text, controls, charts
                    and loading indicators all change with the selected appearance.
                </p>
            </>
        ),
    },
];

const getGuideText = (node: ReactNode): string =>
    Children.toArray(node)
        .map((child) => {
            if (typeof child === 'string' || typeof child === 'number') {
                return String(child);
            }

            return isValidElement<{ children?: ReactNode }>(child) ? getGuideText(child.props.children) : '';
        })
        .join(' ');

const normalizeGuideText = (text: string) => text.replace(/\s+/g, ' ').trim();

const getGuideContentSentences = (node: ReactNode): string[] =>
    Children.toArray(node).flatMap((child) => {
        if (!isValidElement<{ children?: ReactNode }>(child)) {
            return [];
        }

        if (child.type === 'p' || child.type === 'li') {
            const blockText = normalizeGuideText(getGuideText(child.props.children));
            return (
                blockText
                    .match(/[^.!?]+(?:[.!?]+|$)/g)
                    ?.map(normalizeGuideText)
                    .filter(Boolean) ?? []
            );
        }

        return getGuideContentSentences(child.props.children);
    });

const guideSearchText = new Map(
    guideSections.map((section) => [
        section.id,
        [
            section.title,
            section.summary,
            ...(section.searchTerms ?? []),
            ...(section.subtopics ?? []).map(({ label }) => label),
            getGuideText(section.content),
        ]
            .join(' ')
            .toLocaleLowerCase(),
    ])
);

const getFilteredGuideSections = (normalizedSearchQuery: string): readonly UserGuideSection[] =>
    normalizedSearchQuery
        ? guideSections.filter((section) => guideSearchText.get(section.id)?.includes(normalizedSearchQuery))
        : guideSections;

const guideContentSentences = new Map(
    guideSections.map((section) => [section.id, getGuideContentSentences(section.content)])
);

const getGuideSearchExcerpt = (section: UserGuideSection, normalizedSearchQuery: string) =>
    guideContentSentences
        .get(section.id)
        ?.find((sentence) => sentence.toLocaleLowerCase().includes(normalizedSearchQuery)) ?? section.summary;

const renderHighlightedSearchExcerpt = (excerpt: string, normalizedSearchQuery: string) => {
    const matchIndex = excerpt.toLocaleLowerCase().indexOf(normalizedSearchQuery);

    if (matchIndex < 0) {
        return excerpt;
    }

    const matchEnd = matchIndex + normalizedSearchQuery.length;

    return (
        <>
            {excerpt.slice(0, matchIndex)}
            <mark className={styles.searchMatch}>{excerpt.slice(matchIndex, matchEnd)}</mark>
            {excerpt.slice(matchEnd)}
        </>
    );
};

const guideTargetSections = new Map<string, string>();

guideSections.forEach((section) => {
    guideTargetSections.set(section.id, section.id);
    section.subtopics?.forEach((subtopic) => guideTargetSections.set(subtopic.id, section.id));
});

const getGuideTargetId = (hash: string) => {
    const rawTargetId = hash.replace(/^#/, '');

    if (!rawTargetId) {
        return null;
    }

    try {
        return decodeURIComponent(rawTargetId);
    } catch {
        return rawTargetId;
    }
};

const UserGuide = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const activeTargetId = getGuideTargetId(location.hash);
    const activeSectionId = activeTargetId ? guideTargetSections.get(activeTargetId) ?? null : null;
    const normalizedSearchQuery = searchQuery.trim().toLocaleLowerCase();
    const filteredSections = getFilteredGuideSections(normalizedSearchQuery);
    const resultLabel = `${filteredSections.length} ${filteredSections.length === 1 ? 'section' : 'sections'}`;

    const updateGuideTarget = (targetId: string | null) => {
        void navigate(
            {
                pathname: location.pathname,
                search: location.search,
                hash: targetId ? `#${targetId}` : '',
            },
            { replace: true }
        );
    };

    const updateSearchQuery = (nextSearchQuery: string) => {
        const normalizedNextSearchQuery = nextSearchQuery.trim().toLocaleLowerCase();
        const nextFilteredSections = getFilteredGuideSections(normalizedNextSearchQuery);
        const nextActiveSectionId =
            normalizedNextSearchQuery && nextFilteredSections.length === 1 ? nextFilteredSections[0].id : null;

        setSearchQuery(nextSearchQuery);

        if (activeSectionId !== nextActiveSectionId) {
            updateGuideTarget(nextActiveSectionId);
        }
    };

    useEffect(() => {
        if (!activeTargetId || !guideTargetSections.has(activeTargetId)) {
            return;
        }

        const target = document.getElementById(activeTargetId);
        const targetBounds = target?.getBoundingClientRect();

        if (targetBounds && (targetBounds.top < 0 || targetBounds.bottom > window.innerHeight)) {
            target?.scrollIntoView?.({ block: 'start' });
        }
    }, [activeTargetId]);

    return (
        <main data-testid='ug' className={styles.userGuide}>
            <div className={styles.guideContainer}>
                <DirectionalLink className={styles.backButton} direction='back' to={routes.signIn}>
                    Back to Job Tracker
                </DirectionalLink>
                <header className={styles.header}>
                    <span className={styles.headerIcon}>
                        <Icon name='guide' />
                    </span>
                    <div>
                        <h1>Job Tracker User Guide</h1>
                        <p>Straightforward help for every part of Job Tracker.</p>
                    </div>
                </header>

                <div className={styles.searchControl}>
                    <Icon name='search' size={20} />
                    <input
                        aria-label='Search the User Guide'
                        onChange={(event) => updateSearchQuery(event.target.value)}
                        placeholder='Search the guide'
                        type='search'
                        value={searchQuery}
                    />
                    {searchQuery ? (
                        <button
                            aria-label='Clear search'
                            className={styles.clearSearchButton}
                            onClick={() => updateSearchQuery('')}
                            type='button'
                        >
                            <Icon name='close' size={20} />
                        </button>
                    ) : null}
                </div>
                <p aria-live='polite' className={styles.resultCount}>
                    {resultLabel}
                </p>

                {filteredSections.length > 0 ? (
                    <div className={styles.accordion}>
                        {filteredSections.map((section) => {
                            const isOpen = activeSectionId === section.id;
                            const panelId = `${section.id}-panel`;
                            const searchExcerpt = normalizedSearchQuery
                                ? getGuideSearchExcerpt(section, normalizedSearchQuery)
                                : section.summary;

                            return (
                                <section
                                    key={section.id}
                                    className={`${styles.accordionItem} ${isOpen ? styles.accordionItemOpen : ''}`}
                                >
                                    <h2 id={section.id} className={styles.accordionHeading}>
                                        <PrimaryButton
                                            variant='navigation'
                                            className={styles.accordionButton}
                                            type='button'
                                            aria-expanded={isOpen}
                                            aria-controls={panelId}
                                            onClick={() => updateGuideTarget(isOpen ? null : section.id)}
                                        >
                                            <span className={styles.sectionIcon}>
                                                <Icon name={section.icon} />
                                            </span>
                                            <span className={styles.sectionCopy}>
                                                <span>{section.title}</span>
                                                <span
                                                    aria-hidden='true'
                                                    className={`${styles.sectionSummary} ${
                                                        normalizedSearchQuery ? styles.sectionSearchExcerpt : ''
                                                    }`}
                                                    data-testid={
                                                        normalizedSearchQuery
                                                            ? `guide-search-excerpt-${section.id}`
                                                            : undefined
                                                    }
                                                >
                                                    {normalizedSearchQuery
                                                        ? renderHighlightedSearchExcerpt(
                                                              searchExcerpt,
                                                              normalizedSearchQuery
                                                          )
                                                        : searchExcerpt}
                                                </span>
                                            </span>
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
                ) : (
                    <div className={styles.emptyState}>
                        <p>No guide sections match your search.</p>
                        <p>Try a feature or task, such as applications, calendar, counteroffer or password.</p>
                    </div>
                )}
            </div>
        </main>
    );
};

export default UserGuide;
