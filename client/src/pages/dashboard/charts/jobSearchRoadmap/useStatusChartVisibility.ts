import { useCallback, useMemo, useState } from 'react';
import type { JobStatus } from '../../../application/models';

type StatusChartVisibility<Status extends JobStatus> = {
    hiddenStatuses: ReadonlySet<Status>;
    visibleStatuses: Status[];
    toggleStatus: (status: Status) => void;
};

const useStatusChartVisibility = <Status extends JobStatus>(
    statuses: readonly Status[]
): StatusChartVisibility<Status> => {
    const [hiddenStatuses, setHiddenStatuses] = useState<ReadonlySet<Status>>(() => new Set());

    const visibleStatuses = useMemo(
        () => statuses.filter((status) => !hiddenStatuses.has(status)),
        [hiddenStatuses, statuses]
    );

    const toggleStatus = useCallback((status: Status) => {
        setHiddenStatuses((currentStatuses) => {
            const nextStatuses = new Set(currentStatuses);
            if (nextStatuses.has(status)) {
                nextStatuses.delete(status);
            } else {
                nextStatuses.add(status);
            }
            return nextStatuses;
        });
    }, []);

    return { hiddenStatuses, visibleStatuses, toggleStatus };
};

export default useStatusChartVisibility;
