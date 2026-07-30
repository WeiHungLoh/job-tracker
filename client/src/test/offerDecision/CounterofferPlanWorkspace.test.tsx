import { act, fireEvent, screen, within } from '@testing-library/react';
import OfferDecisionWorkspace from '../../pages/offerDecision/OfferDecisionWorkspace';
import type { CounterofferPlan, OfferDecisionWorkspaceData } from '../../pages/offerDecision/models';
import offerEvaluationStyles from '../../pages/offerDecision/OfferEvaluation.module.css';
import { render } from '../renderWithProviders';

const mockConfirm = vi.hoisted(() => vi.fn().mockResolvedValue({ confirmed: true }));

vi.mock('material-ui-confirm', () => ({ useConfirm: () => mockConfirm }));
vi.mock('../../hooks/useUnsavedChangesBlocker', () => ({
    useUnsavedChangesBlocker: vi.fn(),
}));

const click = async (element: HTMLElement) => {
    fireEvent.click(element);
    await act(async () => {
        await Promise.resolve();
    });
};

const openCardMore = async (companyName: string) => {
    await click(screen.getByRole('button', { name: `More actions for ${companyName}` }));
    return screen.getByRole('menu', { name: `More actions for ${companyName}` });
};

const evaluation = {
    job_id: 11,
    ratings: {
        career_growth: 4 as const,
        company_culture_fit: 4 as const,
        work_life_balance: 3 as const,
        compensation: 4 as const,
    },
    details: {
        currency: 'SGD',
        monthly_base_salary: 10000,
        bonus: '',
        annual_leave_days: 20,
        work_arrangement: 'Hybrid' as const,
        decision_deadline: '2099-08-15T10:00:00.000Z',
        pros: '',
        concerns: '',
    },
};

const data: OfferDecisionWorkspaceData = {
    applications: [
        {
            job_id: 11,
            company_name: 'Acme',
            job_title: 'Engineer',
            job_status: 'Offer',
            application_date: '2026-07-01T10:00:00.000Z',
            evaluation,
            has_counteroffer_plan: false,
        },
        {
            job_id: 12,
            company_name: 'Expired Co',
            job_title: 'Engineer',
            job_status: 'Offer',
            application_date: '2026-06-01T10:00:00.000Z',
            evaluation: {
                ...evaluation,
                job_id: 12,
                details: { ...evaluation.details, decision_deadline: '2000-08-15T10:00:00.000Z' },
            },
            has_counteroffer_plan: false,
        },
        {
            job_id: 13,
            company_name: 'Previous Co',
            job_title: 'Engineer',
            job_status: 'Accepted',
            application_date: '2026-06-01T10:00:00.000Z',
            evaluation: { ...evaluation, job_id: 13 },
            has_counteroffer_plan: false,
        },
        {
            job_id: 14,
            company_name: 'Saved Previous',
            job_title: 'Engineer',
            job_status: 'Accepted',
            application_date: '2026-06-01T10:00:00.000Z',
            evaluation: { ...evaluation, job_id: 14 },
            has_counteroffer_plan: true,
        },
    ],
};

const savedPlan: CounterofferPlan = {
    monthly_base_salary: 11000,
    bonus: '',
    annual_leave_days: 20,
    work_arrangement: 'Hybrid',
    ratings: { ...evaluation.ratings, compensation: 5 },
};

describe('Counteroffer plan card entry point', () => {
    test('keeps details and destructive deletion visible while grouping workflow actions in More', async () => {
        render(
            <OfferDecisionWorkspace
                data={{ applications: [data.applications[0]] }}
                onDelete={vi.fn()}
                onDeleteCounterofferPlan={vi.fn()}
                onGetCounterofferPlan={vi.fn().mockResolvedValue(savedPlan)}
                onSave={vi.fn()}
                onSaveCounterofferPlan={vi.fn()}
                readOnly={false}
            />
        );

        const card = screen.getByRole('article', { name: 'Acme Engineer' });
        expect(within(card).getByRole('button', { name: 'Show details for Acme' })).toBeVisible();
        expect(within(card).getByRole('button', { name: 'Delete evaluation for Acme' })).toHaveTextContent('Delete');
        expect(within(card).queryByRole('button', { name: 'Edit evaluation for Acme' })).not.toBeInTheDocument();
        expect(within(card).queryByRole('button', { name: 'Plan counteroffer for Acme' })).not.toBeInTheDocument();

        const moreButton = within(card).getByRole('button', { name: 'More actions for Acme' });
        expect(moreButton).toHaveClass(offerEvaluationStyles.cardActionTrigger);
        await click(moreButton);

        const menu = within(card).getByRole('menu', { name: 'More actions for Acme' });
        expect(within(menu).getByRole('menuitem', { name: 'Edit evaluation for Acme' })).toBeVisible();
        expect(within(menu).getByRole('menuitem', { name: 'Plan counteroffer for Acme' })).toBeVisible();
    });

    test('shows creation only for eligible offers and view access for an ineligible saved plan', async () => {
        render(
            <OfferDecisionWorkspace
                data={data}
                onDeleteCounterofferPlan={vi.fn()}
                onGetCounterofferPlan={vi.fn().mockResolvedValue(savedPlan)}
                onSaveCounterofferPlan={vi.fn()}
                readOnly={false}
            />
        );

        expect(
            within(await openCardMore('Acme')).getByRole('menuitem', { name: 'Plan counteroffer for Acme' })
        ).toBeVisible();
        await click(screen.getByRole('button', { name: 'More actions for Acme' }));

        expect(screen.queryByRole('button', { name: 'More actions for Expired Co' })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Edit evaluation for Expired Co' })).toBeVisible();
        expect(screen.queryByRole('button', { name: 'Plan counteroffer for Expired Co' })).not.toBeInTheDocument();

        expect(screen.queryByRole('button', { name: 'More actions for Previous Co' })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Edit evaluation for Previous Co' })).toBeVisible();
        expect(
            within(await openCardMore('Saved Previous')).getByRole('menuitem', {
                name: 'View counteroffer plan for Saved Previous',
            })
        ).toBeVisible();
    });

    test('shows archived saved plans between details and evaluation deletion with read-only dialog actions', async () => {
        render(
            <OfferDecisionWorkspace
                data={{ applications: [data.applications[3]] }}
                onDelete={vi.fn()}
                onDeleteCounterofferPlan={vi.fn()}
                onGetCounterofferPlan={vi.fn().mockResolvedValue(savedPlan)}
                onSaveCounterofferPlan={vi.fn()}
                readOnly
            />
        );

        const card = screen.getByRole('article', { name: 'Saved Previous Engineer' });
        expect(
            within(card)
                .getAllByRole('button')
                .map((button) => button.textContent)
        ).toEqual(['Show details', 'View counteroffer plan', 'Delete']);

        await click(within(card).getByRole('button', { name: 'View counteroffer plan for Saved Previous' }));
        await screen.findByRole('heading', { name: 'Counteroffer plan' });
        expect(screen.getByRole('button', { name: 'Close' })).toBeVisible();
        expect(screen.getByRole('button', { name: 'Delete counteroffer plan' })).toBeVisible();
        expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
    });

    test('changes the card action label after saving and back after deleting', async () => {
        const onSaveCounterofferPlan = vi.fn().mockResolvedValue(undefined);
        const onDeleteCounterofferPlan = vi.fn().mockResolvedValue(undefined);
        const onGetCounterofferPlan = vi.fn().mockResolvedValue(savedPlan);
        render(
            <OfferDecisionWorkspace
                data={{ applications: [data.applications[0]] }}
                onDeleteCounterofferPlan={onDeleteCounterofferPlan}
                onGetCounterofferPlan={onGetCounterofferPlan}
                onSaveCounterofferPlan={onSaveCounterofferPlan}
                readOnly={false}
            />
        );

        await click(within(await openCardMore('Acme')).getByRole('menuitem', { name: 'Plan counteroffer for Acme' }));
        fireEvent.change(screen.getByLabelText('Acme Ideal offer monthly base salary'), {
            target: { value: '11000' },
        });
        await click(screen.getByRole('button', { name: 'Save' }));
        expect(await screen.findByText('Counteroffer plan saved.')).toBeInTheDocument();
        await click(screen.getByRole('button', { name: 'Close' }));
        expect(
            within(await openCardMore('Acme')).getByRole('menuitem', { name: 'View counteroffer plan for Acme' })
        ).toBeVisible();
        await click(screen.getByRole('button', { name: 'More actions for Acme' }));

        await click(
            within(await openCardMore('Acme')).getByRole('menuitem', { name: 'View counteroffer plan for Acme' })
        );
        await screen.findByRole('heading', { name: 'Counteroffer plan' });
        await click(within(screen.getByRole('dialog')).getByText('Delete', { selector: 'button' }));
        expect(screen.getByText('Counteroffer plan deleted.')).toBeInTheDocument();
        expect(
            within(await openCardMore('Acme')).getByRole('menuitem', { name: 'Plan counteroffer for Acme' })
        ).toBeVisible();
    });
});
