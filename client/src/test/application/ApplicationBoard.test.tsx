import type { ReactNode } from 'react';
import { act, render, screen } from '@testing-library/react';
import ApplicationBoard, {
    getCenteredBoardScrollLeft,
    getCenteredPageScrollTop,
} from '../../pages/application/jobApplication/applicationBoard/ApplicationBoard';
import { JOB_STATUSES } from '../../pages/application/models';

const boardApplication = {
    job_id: 1,
    company_name: 'ABC Pte Ltd',
    job_title: 'Software Engineer',
    job_location: 'Remote',
    application_date: '2025-06-20T00:00:00Z',
    job_status: 'Applied' as const,
    job_posting_url: '',
    notes: '',
    is_pinned: false,
};

const dndState = vi.hoisted(() => ({
    canScroll: undefined as ((element: Element) => boolean) | undefined,
    collisionDetection: undefined as ((args: unknown) => unknown[]) | undefined,
    pointerCollisions: [] as unknown[],
    rectangleCollisions: [] as unknown[],
    sensorOptions: [] as unknown[],
}));

vi.mock('../../pages/application/applicationBoard/ApplicationBoard.module.css', () => ({
    default: { board: 'production-board', cardHighlighted: 'card-highlighted' },
}));

vi.mock('@dnd-kit/core', () => ({
    DndContext: ({
        autoScroll,
        children,
        collisionDetection,
    }: {
        autoScroll: { canScroll: (element: Element) => boolean };
        children: ReactNode;
        collisionDetection: (args: unknown) => unknown[];
    }) => {
        dndState.canScroll = autoScroll.canScroll;
        dndState.collisionDetection = collisionDetection;
        return children;
    },
    KeyboardSensor: class KeyboardSensor {},
    PointerSensor: class PointerSensor {},
    pointerWithin: vi.fn(() => dndState.pointerCollisions),
    rectIntersection: vi.fn(() => dndState.rectangleCollisions),
    useSensor: vi.fn((_sensor, options) => {
        dndState.sensorOptions.push(options);
        return {};
    }),
    useSensors: vi.fn(() => []),
}));

vi.mock('../../pages/application/applicationBoard/ApplicationBoardColumn', () => ({
    default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('../../pages/application/jobApplication/applicationBoard/ApplicationBoardCard', () => ({
    default: ({ application, isHighlighted }: { application: typeof boardApplication; isHighlighted?: boolean }) => (
        <article className={isHighlighted ? 'card-highlighted' : undefined} id={String(application.job_id)}>
            {application.company_name}
        </article>
    ),
}));

const createBoardProps = () => ({
    deletingApplicationIds: new Set<number>(),
    editedNotes: {},
    hasInterview: () => false,
    hasOfferEvaluation: () => false,
    isArchivingApplication: () => false,
    isUpdatingApplicationPin: () => false,
    isUpdatingApplicationStatus: () => false,
    noteSaveStatuses: {},
    onArchive: vi.fn(),
    onDelete: vi.fn(),
    onEditNotes: vi.fn(),
    onNotesBlur: vi.fn(),
    onNotesVisibilityChange: vi.fn(),
    onPinToggle: vi.fn(),
    onRetryNotes: vi.fn(),
    onStatusChange: vi.fn(),
    selectedJobStatuses: JOB_STATUSES,
    upcomingInterviewCountByJob: {},
});

describe('ApplicationBoard', () => {
    const originalMatchMedia = window.matchMedia;

    beforeEach(() => {
        dndState.sensorOptions = [];
    });

    afterEach(() => {
        Object.defineProperty(window, 'matchMedia', {
            configurable: true,
            value: originalMatchMedia,
        });
    });

    test('allows horizontal auto-scroll while dragging a card', () => {
        render(
            <ApplicationBoard
                applications={[]}
                deletingApplicationIds={new Set()}
                editedNotes={{}}
                hasInterview={() => false}
                hasOfferEvaluation={() => false}
                isArchivingApplication={() => false}
                isUpdatingApplicationStatus={() => false}
                noteSaveStatuses={{}}
                onArchive={vi.fn()}
                onDelete={vi.fn()}
                onEditNotes={vi.fn()}
                onNotesBlur={vi.fn()}
                onNotesVisibilityChange={vi.fn()}
                onRetryNotes={vi.fn()}
                onStatusChange={vi.fn()}
                selectedJobStatuses={JOB_STATUSES}
                upcomingInterviewCountByJob={{}}
            />
        );

        const board = screen.getByRole('region', { name: 'Application board' });
        Object.defineProperties(board, {
            clientWidth: { configurable: true, value: 320 },
            scrollWidth: { configurable: true, value: 960 },
        });

        expect(dndState.canScroll).toBeTypeOf('function');
        expect(dndState.canScroll?.(board)).toBe(true);
        expect(dndState.sensorOptions).toEqual([undefined, undefined]);
    });

    test('uses the pointer drop column with rectangle collision as the keyboard fallback', () => {
        const pointerCollision = { id: 'Interview' };
        const rectangleCollision = { id: 'Declined' };
        dndState.pointerCollisions = [pointerCollision];
        dndState.rectangleCollisions = [rectangleCollision];

        render(
            <ApplicationBoard
                applications={[]}
                deletingApplicationIds={new Set()}
                editedNotes={{}}
                hasInterview={() => false}
                hasOfferEvaluation={() => false}
                isArchivingApplication={() => false}
                isUpdatingApplicationStatus={() => false}
                noteSaveStatuses={{}}
                onArchive={vi.fn()}
                onDelete={vi.fn()}
                onEditNotes={vi.fn()}
                onNotesBlur={vi.fn()}
                onNotesVisibilityChange={vi.fn()}
                onRetryNotes={vi.fn()}
                onStatusChange={vi.fn()}
                selectedJobStatuses={JOB_STATUSES}
                upcomingInterviewCountByJob={{}}
            />
        );

        expect(dndState.collisionDetection?.({})).toEqual([pointerCollision]);

        dndState.pointerCollisions = [];
        expect(dndState.collisionDetection?.({})).toEqual([rectangleCollision]);
    });

    test('centers a target card within the board and clamps the horizontal destination', () => {
        expect(
            getCenteredBoardScrollLeft(
                { clientWidth: 300, scrollLeft: 200, scrollWidth: 1000 },
                { left: 100, width: 300 },
                { left: 450, width: 100 }
            )
        ).toBe(450);
        expect(
            getCenteredBoardScrollLeft(
                { clientWidth: 300, scrollLeft: 650, scrollWidth: 1000 },
                { left: 100, width: 300 },
                { left: 650, width: 200 }
            )
        ).toBe(700);
        expect(
            getCenteredBoardScrollLeft(
                { clientWidth: 300, scrollLeft: 0, scrollWidth: 1000 },
                { left: 100, width: 300 },
                { left: 105, width: 100 }
            )
        ).toBe(0);
    });

    test('centers a target card in the page and clamps the vertical destination', () => {
        expect(getCenteredPageScrollTop(300, 800, 2000, { height: 100, top: 900 })).toBe(850);
        expect(getCenteredPageScrollTop(0, 800, 2000, { height: 100, top: 50 })).toBe(0);
        expect(getCenteredPageScrollTop(1100, 800, 2000, { height: 100, top: 700 })).toBe(1200);
    });

    test('scrolls without animation and briefly highlights each requested application when reduced motion is preferred', () => {
        vi.useFakeTimers();
        Object.defineProperty(window, 'matchMedia', {
            configurable: true,
            value: vi.fn().mockReturnValue({ matches: true }),
        });
        const boardProps = createBoardProps();
        const { rerender } = render(<ApplicationBoard {...boardProps} applications={[boardApplication]} />);
        const board = screen.getByRole('region', { name: 'Application board' });
        const card = screen.getByText('ABC Pte Ltd');
        const scrollTo = vi.fn();
        const windowScrollTo = vi.fn();
        const onTargetHandled = vi.fn();

        Object.defineProperties(board, {
            clientWidth: { configurable: true, value: 300 },
            scrollLeft: { configurable: true, value: 200, writable: true },
            scrollTo: { configurable: true, value: scrollTo },
            scrollWidth: { configurable: true, value: 1000 },
        });
        Object.defineProperties(window, {
            innerHeight: { configurable: true, value: 800 },
            scrollTo: { configurable: true, value: windowScrollTo },
            scrollY: { configurable: true, value: 300 },
        });
        Object.defineProperty(document.documentElement, 'scrollHeight', { configurable: true, value: 2000 });
        board.getBoundingClientRect = () => ({
            bottom: 400,
            height: 300,
            left: 100,
            right: 400,
            top: 100,
            width: 300,
            x: 100,
            y: 100,
            toJSON: () => ({}),
        });
        card.getBoundingClientRect = () => ({
            bottom: 250,
            height: 100,
            left: 450,
            right: 550,
            top: 150,
            width: 100,
            x: 450,
            y: 150,
            toJSON: () => ({}),
        });

        rerender(
            <ApplicationBoard
                {...boardProps}
                applications={[boardApplication]}
                onTargetHandled={onTargetHandled}
                targetRequest={{ applicationId: 1, requestId: 1 }}
            />
        );

        expect(scrollTo).toHaveBeenCalledWith({ behavior: 'auto', left: 450 });
        expect(windowScrollTo).toHaveBeenCalledWith({ behavior: 'auto', top: 100 });
        expect(onTargetHandled).toHaveBeenCalledWith({ applicationId: 1, requestId: 1 });
        expect(card).toHaveClass('card-highlighted');

        rerender(<ApplicationBoard {...boardProps} applications={[boardApplication]} targetRequest={null} />);
        scrollTo.mockClear();
        windowScrollTo.mockClear();

        expect(card).toHaveClass('card-highlighted');
        expect(scrollTo).not.toHaveBeenCalled();
        expect(windowScrollTo).not.toHaveBeenCalled();

        act(() => vi.advanceTimersByTime(4000));

        expect(card).not.toHaveClass('card-highlighted');
        vi.useRealTimers();
    });

    test('reveals a pending target after its filtered status column becomes visible', () => {
        const boardProps = createBoardProps();
        const applications = [boardApplication];
        const onTargetHandled = vi.fn();
        const targetRequest = { applicationId: 1, requestId: 1 };
        const windowScrollTo = vi.fn();
        Object.defineProperty(window, 'scrollTo', { configurable: true, value: windowScrollTo });

        const { rerender } = render(
            <ApplicationBoard
                {...boardProps}
                applications={applications}
                onTargetHandled={onTargetHandled}
                selectedJobStatuses={['Offer']}
                targetRequest={targetRequest}
            />
        );

        expect(onTargetHandled).not.toHaveBeenCalled();

        const board = screen.getByRole('region', { name: 'Application board' });
        const boardScrollTo = vi.fn();
        Object.defineProperty(board, 'scrollTo', { configurable: true, value: boardScrollTo });
        rerender(
            <ApplicationBoard
                {...boardProps}
                applications={applications}
                onTargetHandled={onTargetHandled}
                selectedJobStatuses={JOB_STATUSES}
                targetRequest={targetRequest}
            />
        );

        expect(boardScrollTo).toHaveBeenCalled();
        expect(windowScrollTo).toHaveBeenCalled();
        expect(onTargetHandled).toHaveBeenCalledWith(targetRequest);
        expect(screen.getByText('ABC Pte Ltd')).toHaveClass('card-highlighted');
    });
});
