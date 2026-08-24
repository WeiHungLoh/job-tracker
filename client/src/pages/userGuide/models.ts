import type { ReactNode } from 'react';
import type { IconName } from '../../components/icon/models';

export type UserGuideSection = {
    id: string;
    title: string;
    summary: string;
    icon: IconName;
    searchTerms?: readonly string[];
    subtopics?: readonly UserGuideSubtopic[];
    content: ReactNode;
};

export type UserGuideSubtopic = {
    id: string;
    label: string;
};
