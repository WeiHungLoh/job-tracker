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
        expect(screen.getByText(/shows up to six applications/i)).toBeVisible();
        expect(
            screen.getByText(/at least seven full days have passed since the latest interview ended/i)
        ).toBeVisible();
        expect(screen.getByText(/latest interview's end time, including its duration/i)).toBeVisible();
        expect(screen.getByText(/interview with no scheduled interview prompt you to add one/i)).toBeVisible();
        expect(screen.getByText(/evaluated offers with a decision deadline in the next 72 hours appear first/i)).toBeVisible();
        expect(screen.getByText(/passed deadline do not appear/i)).toBeVisible();
        expect(screen.getByText(/unevaluated offers appear next regardless of deadline/i)).toBeVisible();
        expect(
            screen.getByText(/applied applications with no linked interview appear after seven days/i)
        ).toBeVisible();
        expect(screen.getByText(/suggests one next action for each selected application/i)).toBeVisible();
        expect(screen.getByText(/copyable application follow-up template/i)).toBeVisible();
        expect(screen.getByText(/copyable post-interview template/i)).toBeVisible();
        expect(screen.getByText(/opens add interview/i)).toBeVisible();
        expect(screen.getByText(/opens job applications in list view/i)).toBeVisible();
        expect(screen.getByText(/opens active offer comparison/i)).toBeVisible();
        expect(screen.getByText(/templates are generated locally and are not sent or saved/i)).toBeVisible();
        expect(screen.getByText(/replace bracketed placeholders/i)).toBeVisible();
        expect(screen.getByText(/does not mark an application as followed up/i)).toBeVisible();
        expect(screen.getByText(/future and ongoing interviews remain in the upcoming interviews card/i)).toBeVisible();

        await userEvent.click(screen.getByRole('button', { name: /demo mode/i }));

        expect(screen.getByText(/demo mode mirrors the signed-in job tracker flows/i)).toBeVisible();
        expect(screen.getByRole('link', { name: /explore demo/i })).toHaveAttribute(
            'href',
            routes.demoViewApplications
        );
        expect(screen.getByText(/no account, authentication, backend request or database write/i)).toBeVisible();
        expect(screen.getByText(/four fit ratings/i)).toBeVisible();

        await userEvent.click(screen.getByRole('button', { name: /^offer comparison$/i }));

        expect(screen.getByText(/open offer comparison from the active navigation bar/i)).toBeVisible();
        expect(screen.getByText(/only those applications can add or edit an evaluation/i)).toBeVisible();
        expect(screen.getByText(/currency starts as/i)).toBeVisible();
        expect(screen.getByText(/successful first save moves it from offers to evaluate/i)).toBeVisible();
        expect(screen.getByText(/save evaluation stays available/i)).toBeVisible();
        expect(screen.getByText(/decision deadline stays visible above the fit rating/i)).toBeVisible();
        expect(
            screen.getByText(/review, edit or delete when their applications still have offer status/i)
        ).toBeVisible();
        expect(screen.getByText(/when at least two active, non-expired offers have saved evaluations/i)).toBeVisible();
        expect(screen.getByText(/results show your top match/i)).toBeVisible();
        expect(screen.getByText(/your changes and results are not saved/i)).toBeVisible();
        expect(screen.getByText(/not available for expired, previous or archived evaluations/i)).toBeVisible();
        expect(screen.getByText(/while a saved evaluation exists/i)).toBeVisible();
        expect(screen.getByText(/deleting the evaluation removes only that evaluation/i)).toBeVisible();
        expect(screen.getByText(/archived evaluations are read-only/i)).toBeVisible();

        await userEvent.click(screen.getByRole('button', { name: /adding and managing applications/i }));

        expect(screen.getByText(/enter the company name/i)).toBeVisible();
        expect(screen.getByText(/job URLs are limited to 2048 characters/i)).toBeVisible();
        expect(screen.getByText(/standard card list and the board layout/i)).toBeVisible();
        expect(screen.getByText(/active application board groups cards by status/i)).toBeVisible();
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

        expect(screen.getByText(/interview location is separate from job location/i)).toBeVisible();
        expect(screen.getByText(/interview notes are optional and limited to 3000 characters/i)).toBeVisible();

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
                    /application boards keep columns in this order:.*accepted.*offer.*declined.*interview.*applied.*ghosted.*rejected/i.test(
                        text
                    )
                );
            })
        ).toBeVisible();

        await userEvent.click(screen.getByRole('button', { name: /auto scroll and highlighting/i }));

        expect(screen.getByText(/auto scroll only applies when sort by is set to job status/i)).toBeVisible();
    });
});
