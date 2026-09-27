export const hasAffectedRows = (result: { rowCount: number | null }): boolean => {
    return (result.rowCount ?? 0) > 0;
};
