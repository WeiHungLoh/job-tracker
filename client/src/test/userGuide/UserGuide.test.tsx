import { MemoryRouter } from 'react-router-dom';
import UserGuide from '../../pages/userGuide/UserGuide';
import { render } from '../renderWithProviders';
import { routes } from '../../routes';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('renders user guide properly', () => {
    test('displays user guide', async () => {
        render(
            <MemoryRouter initialEntries={['/userGuide']}>
                <UserGuide />
            </MemoryRouter>
        );
        expect(screen.getByTestId('ug')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /back to sign in/i })).toHaveAttribute('href', '/');
        expect(screen.getByText(/quick visual overview/i)).not.toBeVisible();

        screen.getAllByRole('button').forEach((button) => {
            expect(button).toHaveAttribute('aria-expanded', 'false');
        });

        await userEvent.click(screen.getByRole('button', { name: /account security/i }));

        expect(screen.getByText(/passwords must contain 8–64 characters/i)).toBeVisible();

        await userEvent.click(screen.getByRole('button', { name: /dashboard/i }));

        expect(screen.getByText(/quick visual overview/i)).toBeVisible();
        expect(screen.getByText(/interview rate counts applications currently at/i)).toBeVisible();
        expect(screen.getByText(/item limit defaults to ten and can be set from 1 to 50/i)).toBeVisible();
        expect(
            screen.getByText(/does not make another preferences request or reload dashboard sections/i)
        ).toBeVisible();
        expect(
            screen.getByText(/press Enter anywhere in the dialog to save; a number field does not need focus/i)
        ).toBeVisible();
        expect(
            screen.getByText(/at least seven full days have passed since the latest interview ended/i)
        ).toBeVisible();
        expect(screen.getByText(/latest interview's end time, including its duration/i)).toBeVisible();
        expect(screen.getByText(/only the latest scheduled interview controls the reminder/i)).toBeVisible();
        expect(
            screen.getByText(/newer future, ongoing or recently completed interview prevents an older sent follow-up/i)
        ).toBeVisible();
        expect(screen.getByText(/interview with no scheduled interview prompt you to add one/i)).toBeVisible();
        expect(screen.getByRole('heading', { name: 'Evaluated offers due within 72 hours' })).toBeVisible();
        expect(screen.getByRole('heading', { name: 'Evaluated offers up to 14 days overdue' })).toBeVisible();
        expect(screen.getByText(/through exactly 14 days overdue/i)).toBeVisible();
        expect(screen.getByText(/more than 14 days overdue remain in expired evaluated offers/i)).toBeVisible();
        expect(screen.getByText(/these appear next regardless of deadline/i)).toBeVisible();
        expect(
            screen.getByText(/applied applications with no linked interview appear after seven days/i)
        ).toBeVisible();
        expect(screen.getByText(/suggests one next action for each selected application/i)).toBeVisible();
        const priorityHeadings = [
            'Evaluated offers due within 72 hours',
            'Evaluated offers up to 14 days overdue',
            'Unevaluated offers',
            'Unanswered completed-interview follow-ups',
            'Completed interviews',
            'Interview applications without a scheduled interview',
            'Applied applications unchanged after a sent follow-up',
            'Initial Applied follow-ups',
        ].map((name) => screen.getByRole('heading', { name }));
        priorityHeadings.slice(1).forEach((heading, index) => {
            expect(
                priorityHeadings[index].compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING
            ).toBeTruthy();
        });
        expect(screen.getByText(/copyable application follow-up template/i)).toBeVisible();
        expect(screen.getByText(/copyable post-interview template/i)).toBeVisible();
        expect(screen.getByText(/opens add interview/i)).toBeVisible();
        expect(screen.getByText(/ensures evaluated offers is visible/i)).toBeVisible();
        expect(screen.getByText(/ensures offers to evaluate is visible/i)).toBeVisible();
        expect(screen.getByText(/templates are generated locally and are never sent by job tracker/i)).toBeVisible();
        expect(screen.getByText(/replace bracketed placeholders/i)).toBeVisible();
        expect(screen.getByText(/copying a message does not mark it as sent/i)).toBeVisible();
        expect(screen.getByText(/server only accepts this action after the interview has finished/i)).toBeVisible();
        expect(screen.getByTestId('ug')).toHaveTextContent(/use mark as sent only after you send it yourself/i);
        expect(screen.getByText(/board cards show a compact indicator/i)).toBeVisible();
        expect(screen.getByText(/archived cards keep the sent time as read-only context/i)).toBeVisible();
        expect(screen.getByTestId('ug')).toHaveTextContent(
            /application follow-up clears when you press undo or when the application leaves applied/i
        );
        expect(screen.getByText(/only the latest sent time is kept/i)).toBeVisible();
        expect(screen.getByText(/future and ongoing interviews remain in the upcoming interviews card/i)).toBeVisible();
        expect(screen.getByText(/job tracker does not inspect email/i)).toBeVisible();
        expect(screen.getByText(/successful change updates dashboard counts immediately/i)).toBeVisible();
        expect(screen.getByText(/changing needs attention timing, categories or the item limit/i)).toBeVisible();
        expect(screen.getByText(/overdue offer starts showing when its deadline passes/i)).toBeVisible();
        expect(screen.getByText(/full days has passed since it was marked as sent/i)).toBeVisible();
        expect(screen.getByText(/sent label uses bold green text/i)).toBeVisible();
        expect(screen.getByText(/first six are visible before scrolling/i)).toBeVisible();
        expect(
            screen.getByText(
                /interview follow-up time remains as historical activity because it belongs to that interview/i
            )
        ).toBeVisible();
        expect(screen.getByTestId('ug')).toHaveTextContent(
            /interview follow-up remains until you undo it or delete the interview.*even when the application changes status/i
        );

        await userEvent.click(screen.getByRole('button', { name: /demo mode/i }));

        expect(screen.getByText(/demo mode mirrors the signed-in job tracker flows/i)).toBeVisible();
        expect(screen.getByRole('link', { name: /explore demo/i })).toHaveAttribute(
            'href',
            routes.demoViewApplications
        );
        expect(screen.getByText(/no account, authentication, backend request or database write/i)).toBeVisible();
        expect(screen.getByText(/four fit ratings/i)).toBeVisible();
        expect(screen.getByText(/follow-up marking and undo use demo state only/i)).toBeVisible();
        expect(
            screen.getByText(/post-interview follow-up marking and undo also stay entirely in demo state/i)
        ).toBeVisible();
        expect(screen.getByText(/demo mode supports withdrawn, overdue offer attention/i)).toBeVisible();
        expect(
            screen.getByText(/interview notes can be edited and autosaved in active demo list and board views/i)
        ).toBeVisible();
        expect(screen.getByText(/archived demo interview notes remain read-only/i)).toBeVisible();

        await userEvent.click(screen.getByRole('button', { name: /^interviews$/i }));

        const interviewsPanel = document.getElementById('interviews-panel');
        expect(interviewsPanel).toBeVisible();
        expect(interviewsPanel).toHaveTextContent(/show notes.*all visible interviews/i);
        expect(interviewsPanel).toHaveTextContent(/wide screens.*right.*medium widths.*below/i);
        expect(interviewsPanel).toHaveTextContent(/narrow widths.*horizontally scrollable interview card/i);
        expect(interviewsPanel).toHaveTextContent(/board mode.*inside actions/i);
        expect(interviewsPanel).toHaveTextContent(/meeting link appears above edit notes/i);
        expect(interviewsPanel).toHaveTextContent(/archived interview notes.*cannot be edited/i);

        await userEvent.click(screen.getByRole('button', { name: /notes and visibility/i }));

        const notesPanel = document.getElementById('notes-panel');
        expect(notesPanel).toBeVisible();
        expect(notesPanel).toHaveTextContent(/application and interview list pages.*show notes/i);
        expect(notesPanel).toHaveTextContent(/every visible record/i);
        expect(notesPanel).toHaveTextContent(/stored independently/i);
        expect(notesPanel).toHaveTextContent(/saving….*saved.*couldn’t save.*retry/i);
        expect(notesPanel).toHaveTextContent(/for one second/i);
        expect(screen.queryByText(/after half a second/i)).not.toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', { name: /^offer comparison$/i }));

        expect(screen.getByText(/open offer comparison from the active navigation bar/i)).toBeVisible();
        expect(screen.getByText(/saved evaluations can be edited in all active sections/i)).toBeVisible();
        expect(screen.getByText(/currency starts as/i)).toBeVisible();
        expect(screen.getByText(/successful first save moves it from offers to evaluate/i)).toBeVisible();
        expect(screen.getByText(/save evaluation stays available/i)).toBeVisible();
        expect(screen.getByText(/decision deadline stays visible above the fit rating/i)).toBeVisible();
        expect(
            screen.getByText(/review, edit, delete, accept or decline when their applications still have offer status/i)
        ).toBeVisible();
        expect(screen.getByText(/when at least two active, non-expired offers have saved evaluations/i)).toBeVisible();
        expect(screen.getByText(/results show your top match/i)).toBeVisible();
        expect(screen.getByText(/your changes and results are not saved/i)).toBeVisible();
        expect(screen.getByText(/not available for expired, previous or archived evaluations/i)).toBeVisible();
        expect(screen.getByRole('heading', { name: /plan a counteroffer/i })).toBeVisible();
        const offerCalendarHeading = screen.getByRole('heading', { name: /offer deadline calendar exports/i });
        expect(offerCalendarHeading).toBeVisible();
        expect(offerCalendarHeading.parentElement).toHaveTextContent(
            /export all active evaluated offer deadlines.*regardless of the visible offer comparison filters/i
        );
        expect(screen.getByText(/expired, previous and archived evaluations are excluded/i)).toBeVisible();
        expect(
            screen.getByText(/read-only current offer first and one editable ideal offer directly below it/i)
        ).toBeVisible();
        expect(screen.getByText(/starts with the current terms and all four current ratings/i)).toBeVisible();
        expect(screen.getByText(/individual rating differences use rating points/i)).toBeVisible();
        expect(screen.getByText(/fit rating differences use percentage points/i)).toBeVisible();
        expect(
            screen.getByText(
                /server rejects the first evaluation save and asks whether to delete the counteroffer plan/i
            )
        ).toBeVisible();
        expect(screen.getByText(/empty values that remain visible are shown as/i)).toBeVisible();
        expect(screen.getByText(/while creating or editing a counteroffer plan, press Enter anywhere/i)).toBeVisible();
        expect(screen.getByText(/Offer Comparison evaluation forms keep their field-based shortcuts/i)).toBeVisible();
        expect(screen.getByText(/saved plans remain available to review or delete/i)).toBeVisible();
        expect(screen.getByText(/under active evaluated offers and expired evaluated offers/i)).toBeVisible();
        expect(screen.getByText(/active previous evaluations can be edited/i)).toBeVisible();
        expect(screen.getByText(/change to declined/i)).toBeVisible();
        expect(screen.getByText(/archived evaluations are read-only/i)).toBeVisible();
        expect(screen.getByText(/show all can therefore export up to six tables/i)).toBeVisible();

        await userEvent.click(screen.getByRole('button', { name: /adding and managing applications/i }));

        expect(screen.getByText(/enter the company name/i)).toBeVisible();
        expect(screen.getByText(/job posting URLs are limited to 2048 characters/i)).toBeVisible();
        expect(screen.getByText(/standard card list and the board layout/i)).toBeVisible();
        expect(screen.getByText(/active application board groups cards by status/i)).toBeVisible();
        expect(screen.getByText(/compact archive and delete controls aligned to the right/i)).toBeVisible();
        expect(screen.getByRole('heading', { name: /job status definitions/i })).toBeVisible();
        ['Applied', 'Interview', 'Offer', 'Accepted', 'Declined', 'Withdrawn', 'Ghosted', 'Rejected'].forEach(
            (status) => expect(screen.getByText(`${status}:`, { selector: 'strong' })).toBeVisible()
        );
        expect(screen.getByText(/you voluntarily ended your candidacy before receiving an offer/i)).toBeVisible();
        expect(
            screen.getByText(/when a saved offer evaluation exists, only offer, accepted and declined/i)
        ).toBeVisible();
        expect(screen.getByRole('heading', { name: /quick capture from a job posting/i })).toBeVisible();
        expect(screen.getByRole('link', { name: /save to job tracker/i })).toBeVisible();
        expect(screen.getByText(/sign in to job tracker before using quick capture/i)).toBeVisible();
        expect(screen.getByText(/install the bookmark once/i)).toBeVisible();
        expect(screen.getByText(/desktop browser(?:'|’)s bookmarks bar/i)).toBeVisible();
        expect(screen.getByText(/expand quick capture at the top of the add application form/i)).toBeVisible();
        expect(screen.getByText(/job posting url is prefilled/i)).toBeVisible();
        expect(screen.getByText(/structured job-posting metadata/i)).toBeVisible();
        expect(
            screen.getByText(/fills only the company name, job title and location provided by that metadata/i)
        ).toBeVisible();
        expect(screen.getByText(/missing details stay empty/i)).toBeVisible();
        expect(screen.getByText(/browser-tab title as a reference/i)).toBeVisible();
        expect(screen.getByText(/quick capture reference/i)).toBeVisible();
        expect(screen.getByText(/replace that saved bookmark once/i)).toBeVisible();
        expect(screen.getByText(/does not guess from visible page text/i)).toBeVisible();
        expect(screen.getByText(/copy the job page url and paste it/i)).toBeVisible();
        expect(screen.getByText(/quick visual overview/i)).not.toBeVisible();

        await userEvent.click(screen.getByRole('button', { name: /^interviews$/i }));

        expect(screen.getByText(/related active application must have interview status/i)).toBeVisible();
        expect(screen.getByText(/server checks these rules as well as the form/i)).toBeVisible();
        expect(screen.getByText(/interview location is separate from job location/i)).toBeVisible();
        expect(screen.getByText(/interview notes are optional and limited to 3000 characters/i)).toBeVisible();
        expect(screen.getByText(/duration must be a whole number from 1 to 1440 minutes/i)).toBeVisible();
        expect(screen.getByText(/meeting url is optional, limited to 2048 characters/i)).toBeVisible();
        expect(screen.getByTestId('ug')).toHaveTextContent(/meeting link appears above edit notes/i);
        expect(
            screen.getByText(/reaches or passes another active offer application's present or future/i)
        ).toBeVisible();
        expect(
            screen.getByText(
                (_, element) =>
                    element?.tagName === 'P' &&
                    Boolean(element.textContent?.includes('does not add the interview unless you choose Add Anyway'))
            )
        ).toBeVisible();
        const calendarExportsHeading = screen.getByRole('heading', { name: /calendar exports/i });
        expect(calendarExportsHeading).toBeVisible();
        expect(calendarExportsHeading.parentElement).toHaveTextContent(
            /export all upcoming active interviews.*regardless of the current upcoming\/past filter/i
        );
        expect(screen.getByText(/google calendar exports include it in the description/i)).toBeVisible();
        expect(screen.getByText(/dashboard upcoming interviews remains unchanged/i)).toBeVisible();

        await userEvent.click(screen.getByRole('button', { name: /archive mode/i }));

        expect(screen.getByText(/archived board cards use the same visual format/i)).toBeVisible();

        await userEvent.click(screen.getByRole('button', { name: /exporting and sorting records/i }));

        expect(screen.getByText(/spreadsheet apps could interpret as formulas/i)).toBeVisible();
        expect(
            screen.getByText((_content, element) => {
                const text = element?.textContent?.replace(/\s+/g, ' ') ?? '';

                return element?.tagName.toLowerCase() === 'p' && /use sort by to order application lists/i.test(text);
            })
        ).toBeVisible();
        expect(screen.getByText(/active and archived list and board choices are saved independently/i)).toBeVisible();
        expect(
            screen.getByText((_content, element) => {
                const text = element?.textContent?.replace(/\s+/g, ' ') ?? '';

                return (
                    element?.tagName.toLowerCase() === 'p' &&
                    /application boards keep columns in this order:.*accepted.*offer.*declined.*interview.*applied.*withdrawn.*ghosted.*rejected/i.test(
                        text
                    )
                );
            })
        ).toBeVisible();
        expect(screen.getByText(/applications with the same status are ordered by company A–Z/i)).toBeVisible();
        expect(screen.getByText(/interviews at the same date and time are ordered by company A–Z/i)).toBeVisible();

        await userEvent.click(screen.getByRole('button', { name: /auto-scroll and highlighting/i }));

        expect(
            screen.getByText(
                /scrolls to and briefly highlights an application or interview after it is pinned or unpinned/i
            )
        ).toBeVisible();
        expect(
            screen.getByText(/controls both scrolling and highlighting after saving a first evaluation/i)
        ).toBeVisible();
        expect(
            screen.getByText(/when the preference is disabled, those updates do not scroll or highlight/i)
        ).toBeVisible();
        expect(screen.getByText(/saving an edit to an existing evaluation scrolls to the bottom/i)).toBeVisible();
        expect(screen.getByText(/cancelling an evaluation scrolls to the top of a new evaluation card/i)).toBeVisible();
        expect(screen.getByText(/board views never automatically scroll or highlight cards/i)).toBeVisible();
    });
});
