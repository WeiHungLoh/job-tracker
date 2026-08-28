import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import PrimaryButton from '../../../components/button/PrimaryButton';
import { useToast } from '../../../components/toast/ToastProvider';
import { useUserPreferences } from '../../../components/userPreferences/UserPreferencesProvider';
import type { NeedsAttentionCategory } from '../../../components/userPreferences/models';
import { getErrorToastMessage } from '../../../helper/getErrorToastMessage';
import {
    DEFAULT_NEEDS_ATTENTION_SETTINGS,
    getNeedsAttentionPreferenceUpdate,
    getNeedsAttentionSettings,
    NEEDS_ATTENTION_LIMITS,
    NEEDS_ATTENTION_OPTIONS,
    type NeedsAttentionTimingKey,
    type NeedsAttentionSettings,
} from './needsAttentionSettings';
import styles from './NeedsAttentionSettingsDialog.module.css';

type NeedsAttentionSettingsDialogProps = {
    onClose: () => void;
    open: boolean;
};

type SettingsDraft = {
    enabledCategories: NeedsAttentionCategory[];
    maxItems: string;
} & Record<NeedsAttentionTimingKey, string>;

const createDraft = (settings: NeedsAttentionSettings): SettingsDraft => ({
    enabledCategories: [...settings.enabledCategories],
    maxItems: String(settings.maxItems),
    offerDueDays: String(settings.offerDueDays),
    offerOverdueDays: String(settings.offerOverdueDays),
    postInterviewStaleDays: String(settings.postInterviewStaleDays),
    postInterviewFollowUpDays: String(settings.postInterviewFollowUpDays),
    applicationStaleDays: String(settings.applicationStaleDays),
    applicationFollowUpDays: String(settings.applicationFollowUpDays),
});

const parseWholeDays = (value: string, minimum: number, maximum: number): number | null => {
    if (!/^\d+$/.test(value)) {
        return null;
    }
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : null;
};

const getBoundedWholeNumberInput = (
    nextValue: string,
    currentValue: string,
    minimum: number,
    maximum: number
): string => {
    if (nextValue === '') {
        return '';
    }
    return parseWholeDays(nextValue, minimum, maximum) === null ? currentValue : nextValue;
};

const getDraftSettings = (draft: SettingsDraft): NeedsAttentionSettings | null => {
    const maxItems = parseWholeDays(
        draft.maxItems,
        NEEDS_ATTENTION_LIMITS.maxItems.minimum,
        NEEDS_ATTENTION_LIMITS.maxItems.maximum
    );
    if (maxItems === null) {
        return null;
    }
    const values = {} as Record<NeedsAttentionTimingKey, number>;
    for (const option of NEEDS_ATTENTION_OPTIONS) {
        if (!option.timing) {
            continue;
        }
        const parsed = parseWholeDays(draft[option.timing.key], option.timing.minimum, option.timing.maximum);
        const enabled = draft.enabledCategories.includes(option.category);
        if (parsed === null && enabled) {
            return null;
        }
        values[option.timing.key] = parsed ?? DEFAULT_NEEDS_ATTENTION_SETTINGS[option.timing.key];
    }

    return { enabledCategories: draft.enabledCategories, maxItems, ...values };
};

const NeedsAttentionSettingsDialog = ({ onClose, open }: NeedsAttentionSettingsDialogProps) => {
    const { preferences, updatePreferences } = useUserPreferences();
    const { showErrorToast, showSuccessToast } = useToast();
    const [draft, setDraft] = useState<SettingsDraft | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const savingRef = useRef(false);
    const mountedRef = useRef(true);
    const validSettings = useMemo(() => (draft ? getDraftSettings(draft) : null), [draft]);

    useEffect(() => {
        setDraft(open ? createDraft(getNeedsAttentionSettings(preferences)) : null);
    }, [open, preferences]);

    useEffect(
        () => () => {
            mountedRef.current = false;
        },
        []
    );

    const requestClose = () => {
        if (!isSaving) {
            onClose();
        }
    };

    const handleCategoryChange = (category: NeedsAttentionCategory) => {
        setDraft((current) => {
            if (!current) {
                return current;
            }
            const isEnabled = current.enabledCategories.includes(category);
            return {
                ...current,
                enabledCategories: isEnabled
                    ? current.enabledCategories.filter((value) => value !== category)
                    : [...current.enabledCategories, category],
            };
        });
    };

    const save = async () => {
        if (!validSettings || savingRef.current) {
            return;
        }
        savingRef.current = true;
        setIsSaving(true);
        try {
            await updatePreferences(getNeedsAttentionPreferenceUpdate(validSettings));
            if (!mountedRef.current) {
                return;
            }
            showSuccessToast('Needs Attention settings saved.');
            onClose();
        } catch (error) {
            if (mountedRef.current) {
                showErrorToast(
                    getErrorToastMessage(error, 'Unable to save Needs Attention settings. Please try again.')
                );
            }
        } finally {
            savingRef.current = false;
            if (mountedRef.current) {
                setIsSaving(false);
            }
        }
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        void save();
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
        if (event.key !== 'Enter') {
            return;
        }
        event.preventDefault();
        void save();
    };

    return (
        <Dialog
            aria-describedby='needs-attention-settings-description'
            fullWidth
            maxWidth='md'
            onClose={requestClose}
            onKeyDown={handleKeyDown}
            open={open}
            PaperProps={{ className: styles.dialogPaper }}
        >
            <DialogTitle>Customise dashboard reminders</DialogTitle>
            <DialogContent className={styles.content}>
                <p id='needs-attention-settings-description'>
                    Choose what appears in Needs Attention and when each reminder should show.
                </p>
                {draft ? (
                    <form className={styles.form} id='needs-attention-settings-form' onSubmit={handleSubmit}>
                        <section className={styles.listSettings} aria-labelledby='dashboard-list-settings-heading'>
                            <div className={styles.sectionHeading}>
                                <h3 id='dashboard-list-settings-heading'>Dashboard list</h3>
                                <p>
                                    Set how many reminders the dashboard can include. The card shows six before it
                                    scrolls.
                                </p>
                            </div>
                            <label className={`${styles.timingLabel} ${styles.maxItems}`}>
                                <span>Maximum reminders shown (1–50)</span>
                                <input
                                    aria-label='Maximum reminders shown (1–50)'
                                    max={NEEDS_ATTENTION_LIMITS.maxItems.maximum}
                                    min={NEEDS_ATTENTION_LIMITS.maxItems.minimum}
                                    onChange={(event) =>
                                        setDraft((current) =>
                                            current
                                                ? {
                                                      ...current,
                                                      maxItems: getBoundedWholeNumberInput(
                                                          event.target.value,
                                                          current.maxItems,
                                                          NEEDS_ATTENTION_LIMITS.maxItems.minimum,
                                                          NEEDS_ATTENTION_LIMITS.maxItems.maximum
                                                      ),
                                                  }
                                                : current
                                        )
                                    }
                                    required
                                    step='1'
                                    type='number'
                                    value={draft.maxItems}
                                />
                            </label>
                        </section>

                        <section className={styles.reminderSettings} aria-labelledby='reminder-order-heading'>
                            <div className={styles.sectionHeading}>
                                <h3 id='reminder-order-heading'>Reminder order</h3>
                                <p>
                                    Reminders are checked from 1 to 8. If several are due, lower numbers appear first.
                                    Select the reminder types you want to include. Their order stays the same.
                                </p>
                            </div>

                            <div className={styles.optionList}>
                                {NEEDS_ATTENTION_OPTIONS.map((option, index) => {
                                    const isEnabled = draft.enabledCategories.includes(option.category);
                                    return (
                                        <div
                                            className={`${styles.option} ${isEnabled ? styles.optionSelected : ''}`}
                                            key={option.category}
                                            onClick={(event) => {
                                                if (event.target instanceof HTMLInputElement) {
                                                    return;
                                                }
                                                handleCategoryChange(option.category);
                                            }}
                                        >
                                            <input
                                                aria-label={option.label}
                                                checked={isEnabled}
                                                className={styles.selectionInput}
                                                onChange={() => handleCategoryChange(option.category)}
                                                type='checkbox'
                                            />
                                            <div className={styles.optionSummary}>
                                                <span aria-label={`Priority ${index + 1}`} className={styles.priority}>
                                                    {index + 1}
                                                </span>
                                                <span className={styles.optionCopy}>
                                                    <strong>{option.label}</strong>
                                                    <span>{option.description}</span>
                                                </span>
                                            </div>
                                            {option.timing && (
                                                <div
                                                    className={`${styles.optionDetails} ${
                                                        isEnabled ? '' : styles.optionDetailsDisabled
                                                    }`}
                                                >
                                                    <label className={styles.timingLabel}>
                                                        <span>{option.timing.label}</span>
                                                        <input
                                                            aria-label={option.timing.label}
                                                            disabled={!isEnabled}
                                                            max={option.timing.maximum}
                                                            min={option.timing.minimum}
                                                            onChange={(event) =>
                                                                setDraft((current) =>
                                                                    current
                                                                        ? {
                                                                              ...current,
                                                                              [option.timing!.key]:
                                                                                  getBoundedWholeNumberInput(
                                                                                      event.target.value,
                                                                                      current[option.timing!.key],
                                                                                      option.timing!.minimum,
                                                                                      option.timing!.maximum
                                                                                  ),
                                                                          }
                                                                        : current
                                                                )
                                                            }
                                                            required={isEnabled}
                                                            step='1'
                                                            type='number'
                                                            value={draft[option.timing.key]}
                                                        />
                                                    </label>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    </form>
                ) : null}
            </DialogContent>
            <DialogActions className={styles.actions}>
                <PrimaryButton
                    className={styles.reset}
                    disabled={!draft || isSaving}
                    onClick={() => {
                        setDraft(createDraft(DEFAULT_NEEDS_ATTENTION_SETTINGS));
                        showSuccessToast('Reminder settings reset to default. Click save to apply these changes.');
                    }}
                    type='button'
                    variant='destructive'
                >
                    Reset to default
                </PrimaryButton>
                <div className={styles.rightActions}>
                    <PrimaryButton disabled={isSaving} onClick={requestClose} type='button' variant='secondary'>
                        Cancel
                    </PrimaryButton>
                    <PrimaryButton form='needs-attention-settings-form' isLoading={isSaving} type='submit'>
                        Save
                    </PrimaryButton>
                </div>
            </DialogActions>
        </Dialog>
    );
};

export default NeedsAttentionSettingsDialog;
