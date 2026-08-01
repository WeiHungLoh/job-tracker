import { fireEvent, screen, within } from '@testing-library/react';
import OfferDecisionRobustnessLab from '../../pages/offerDecision/robustness/OfferDecisionRobustnessLab';
import type { EvaluatedOfferDecisionApplication } from '../../pages/offerDecision/robustness/offerDecisionRobustnessCalculations';
import { render } from '../renderWithProviders';

const applications: EvaluatedOfferDecisionApplication[] = [
    {
        job_id: 1,
        company_name: 'Acme',
        job_title: 'Software Engineer',
        job_status: 'Offer',
        application_date: '2026-07-01T08:00:00.000Z',
        evaluation: {
            job_id: 1,
            ratings: {
                career_growth: 5,
                company_culture_fit: 4,
                work_life_balance: 3,
                compensation: 3,
            },
            details: {
                currency: 'SGD',
                monthly_base_salary: 10000,
                bonus: '',
                annual_leave_days: 20,
                work_arrangement: 'Hybrid',
                decision_deadline: '2026-08-15T10:00:00.000Z',
                pros: '',
                concerns: '',
            },
        },
    },
    {
        job_id: 2,
        company_name: 'Beta Labs',
        job_title: 'Platform Developer',
        job_status: 'Offer',
        application_date: '2026-07-02T08:00:00.000Z',
        evaluation: {
            job_id: 2,
            ratings: {
                career_growth: 3,
                company_culture_fit: 3,
                work_life_balance: 5,
                compensation: 5,
            },
            details: {
                currency: 'SGD',
                monthly_base_salary: 10500,
                bonus: '',
                annual_leave_days: 24,
                work_arrangement: 'Remote',
                decision_deadline: '2026-08-20T10:00:00.000Z',
                pros: '',
                concerns: '',
            },
        },
    },
];

describe('OfferDecisionRobustnessLab', () => {
    test('opens with balanced importance and explains the result in plain language', () => {
        render(<OfferDecisionRobustnessLab applications={applications} />);

        const openButton = screen.getByRole('button', { name: 'Try priorities' });
        expect(openButton).toHaveAttribute('aria-expanded', 'false');
        fireEvent.click(openButton);

        expect(openButton).toHaveAttribute('aria-expanded', 'true');
        expect(
            screen.getByText("Move the sliders to preview how prioritising each category changes every offer's fit.")
        ).toBeInTheDocument();
        expect(screen.getByLabelText('Career Growth importance')).toHaveValue('3');
        expect(screen.getByLabelText('Company/Culture Fit importance')).toHaveValue('3');
        expect(screen.getByLabelText('Work-Life Balance importance')).toHaveValue('3');
        expect(screen.getByLabelText('Compensation importance')).toHaveValue('3');

        const ranking = screen.getByRole('list', { name: 'Offer results' });
        const topResult = within(ranking).getAllByRole('listitem')[0];
        expect(topResult).toHaveTextContent('Beta Labs');
        expect(within(topResult).getByText('80%', { selector: 'strong' })).toBeInTheDocument();
        expect(topResult).toHaveTextContent('No change');
        expect(screen.getByRole('heading', { name: 'New fit rating with these priorities' })).toBeInTheDocument();
        expect(ranking).not.toHaveTextContent('Fit rating:');
        expect(ranking).not.toHaveTextContent('Priority fit:');
        expect(ranking).not.toHaveTextContent('Match score');
        expect(
            screen.getByText(
                /Each fit rating is the average of the category ratings.*The percentage shown is the new weighted fit rating/is
            )
        ).toBeInTheDocument();
        expect(screen.queryByText(/Nothing (here )?is saved/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/81|scenario|outright|tested mixes|probability|certainty/i)).not.toBeInTheDocument();
    });

    test('updates the ranking, resets to balanced and discards state on close', () => {
        render(<OfferDecisionRobustnessLab applications={applications} />);
        fireEvent.click(screen.getByRole('button', { name: 'Try priorities' }));

        const growthInput = screen.getByLabelText('Career Growth importance');
        fireEvent.change(growthInput, { target: { value: '5' } });

        const ranking = screen.getByRole('list', { name: 'Offer results' });
        const adjustedTopResult = within(ranking).getAllByRole('listitem')[0];
        expect(adjustedTopResult).toHaveTextContent('Acme');
        expect(within(adjustedTopResult).getByText('79%', { selector: 'strong' })).toBeInTheDocument();
        expect(adjustedTopResult).toHaveTextContent('+4 percentage points');
        expect(adjustedTopResult).not.toHaveTextContent('from 75%');

        fireEvent.click(screen.getByRole('button', { name: 'Reset importance to balanced' }));
        expect(growthInput).toHaveValue('3');
        expect(within(ranking).getAllByRole('listitem')[0]).toHaveTextContent('Beta Labs');

        fireEvent.change(screen.getByLabelText('Compensation importance'), { target: { value: '2' } });
        const acmeResult = within(ranking)
            .getAllByRole('listitem')
            .find((result) => result.textContent?.includes('Acme'));
        expect(acmeResult).toHaveTextContent('+1 percentage point');
        expect(acmeResult).not.toHaveTextContent('from 75%');
        const betaResult = within(ranking)
            .getAllByRole('listitem')
            .find((result) => result.textContent?.includes('Beta Labs'));
        expect(betaResult).toHaveTextContent('-2 percentage points');
        expect(betaResult).not.toHaveTextContent('from 80%');

        fireEvent.change(growthInput, { target: { value: '5' } });
        fireEvent.click(screen.getByRole('button', { name: 'Close' }));
        fireEvent.click(screen.getByRole('button', { name: 'Try priorities' }));
        expect(screen.getByLabelText('Career Growth importance')).toHaveValue('3');
    });

    test('keeps temporary priority controls available', () => {
        render(<OfferDecisionRobustnessLab applications={applications} />);
        const openButton = screen.getByRole('button', { name: 'Try priorities' });

        expect(openButton).toBeEnabled();
        fireEvent.click(openButton);
        expect(screen.getByLabelText('Career Growth importance')).toBeEnabled();
        expect(screen.getByRole('button', { name: 'Reset importance to balanced' })).toBeEnabled();
    });

    test('renders nothing with fewer than two evaluated offers', () => {
        render(<OfferDecisionRobustnessLab applications={[applications[0]]} />);

        expect(screen.queryByText('Try different priorities')).not.toBeInTheDocument();
    });
});
