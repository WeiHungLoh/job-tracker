import { scrollAndHighlight } from '../../../helper/highlightElement';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

type UseDemoHashHighlightOptions = {
    highlightClass: string;
    isBoardView?: boolean;
    onBoardTarget?: (targetId: string) => void;
    timeouts: Record<string, ReturnType<typeof setTimeout>>;
    visibleIds: string[];
};

export const useDemoHashHighlight = ({
    highlightClass,
    isBoardView = false,
    onBoardTarget,
    timeouts,
    visibleIds,
}: UseDemoHashHighlightOptions) => {
    const location = useLocation();
    const navigate = useNavigate();
    const [pendingHighlightId, setPendingHighlightId] = useState<string | null>(null);

    useEffect(() => {
        const targetId = location.hash.substring(1);
        if (!targetId || !visibleIds.includes(targetId)) {
            return;
        }

        if (isBoardView) {
            onBoardTarget?.(targetId);
            setPendingHighlightId(null);
        } else {
            setPendingHighlightId(targetId);
        }
        navigate(location.pathname, { replace: true });
    }, [isBoardView, location.hash, location.pathname, navigate, onBoardTarget, visibleIds]);

    useEffect(() => {
        if (isBoardView || !pendingHighlightId || !visibleIds.includes(pendingHighlightId)) {
            return;
        }

        scrollAndHighlight(pendingHighlightId, highlightClass, timeouts);
        setPendingHighlightId(null);
    }, [highlightClass, isBoardView, pendingHighlightId, timeouts, visibleIds]);
};
