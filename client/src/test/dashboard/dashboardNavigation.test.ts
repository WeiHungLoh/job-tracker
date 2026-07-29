import {
    getDashboardOfferDecisionFilter,
    getDashboardOfferDecisionJobId,
} from '../../pages/dashboard/dashboardNavigation';

describe('dashboard offer-decision navigation state', () => {
    test('accepts only a positive integer job ID', () => {
        expect(getDashboardOfferDecisionJobId({ dashboardOfferDecisionJobId: 42 })).toBe(42);

        [
            undefined,
            null,
            {},
            { dashboardOfferDecisionJobId: '42' },
            { dashboardOfferDecisionJobId: 1.5 },
            { dashboardOfferDecisionJobId: 0 },
            { dashboardOfferDecisionJobId: -1 },
        ].forEach((state) => expect(getDashboardOfferDecisionJobId(state)).toBeNull());
    });

    test('accepts only supported Offer Comparison target filters', () => {
        expect(getDashboardOfferDecisionFilter({ dashboardOfferDecisionFilter: 'Offers to Evaluate' })).toBe(
            'Offers to Evaluate'
        );
        expect(getDashboardOfferDecisionFilter({ dashboardOfferDecisionFilter: 'Evaluated Offers' })).toBe(
            'Evaluated Offers'
        );
        expect(getDashboardOfferDecisionFilter({ dashboardOfferDecisionFilter: 'Expired Evaluated Offers' })).toBe(
            'Expired Evaluated Offers'
        );
        expect(getDashboardOfferDecisionFilter({ dashboardOfferDecisionFilter: 'Previous Evaluations' })).toBeNull();
        expect(getDashboardOfferDecisionFilter(null)).toBeNull();
    });
});
