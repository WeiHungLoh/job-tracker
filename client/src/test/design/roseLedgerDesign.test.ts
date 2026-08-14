import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { relative, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const clientRoot = resolve(process.cwd());
const sourceRoot = resolve(clientRoot, 'src');

const readSource = (path: string) => readFileSync(resolve(clientRoot, path), 'utf8');

const collectCssFiles = (directory: string): string[] =>
    readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const path = resolve(directory, entry.name);

        if (entry.isDirectory()) return collectCssFiles(path);
        if (!entry.name.endsWith('.css')) return [];

        return [path];
    });

const countMatches = (source: string, pattern: RegExp) => source.match(pattern)?.length ?? 0;

const countsByFile = (pattern: RegExp) =>
    Object.fromEntries(
        collectCssFiles(sourceRoot)
            .map((path) => [
                relative(clientRoot, path).replaceAll('\\', '/'),
                countMatches(readFileSync(path, 'utf8'), pattern),
            ])
            .filter(([, count]) => count !== 0)
    );

const declarationsByFile = (pattern: RegExp) =>
    Object.fromEntries(
        collectCssFiles(sourceRoot)
            .map((path) => [
                relative(clientRoot, path).replaceAll('\\', '/'),
                (readFileSync(path, 'utf8').match(pattern) ?? []).map((declaration) =>
                    declaration.replace(/\s+/g, ' ').trim()
                ),
            ])
            .filter(([, declarations]) => declarations.length !== 0)
    );

const expectedLinearGradientCounts = {
    'src/components/activityControls/ActivityControls.module.css': 2,
    'src/components/activityControls/ControlDropdown.module.css': 2,
    'src/components/skeletonLoader/skeletonBoard/SkeletonBoard.module.css': 2,
    'src/components/skeletonLoader/skeletonCard/SkeletonCard.module.css': 1,
    'src/pages/application/applicationBoard/ApplicationBoard.module.css': 6,
};

const expectedRadialGradientCounts = {
    'src/components/loadingSpinner/LoadingSpinner.module.css': 2,
    'src/index.css': 2,
};

const expectedConicGradientCounts = {
    'src/components/loadingSpinner/LoadingSpinner.module.css': 1,
};

const expectedGradientDeclarations = {
    'src/components/activityControls/ActivityControls.module.css': [
        'background: linear-gradient(135deg, var(--activityGlassBaseStart), transparent 46%, var(--activityGlassBaseEnd)), color-mix(in srgb, var(--colorCardBg) var(--activityGlassFillOpacity), transparent);',
        'background: linear-gradient( 110deg, transparent 18%, var(--activityGlassSheenCore) 46%, var(--activityGlassSheenTint) 55%, transparent 72% );',
    ],
    'src/components/activityControls/ControlDropdown.module.css': [
        'background: linear-gradient(135deg, var(--activityGlassBaseStart), transparent 52%, var(--activityGlassBaseEnd)), color-mix(in srgb, var(--colorCardBg) var(--activityGlassFillOpacity), transparent);',
        'background: linear-gradient( 110deg, transparent 16%, var(--activityGlassSheenCore) 45%, var(--activityGlassSheenTint) 56%, transparent 74% );',
    ],
    'src/components/loadingSpinner/LoadingSpinner.module.css': [
        'background: conic-gradient( transparent 0 4%, var(--spinnerColor) 4.2% 54%, transparent 54.2% 58%, var(--spinnerTrackColor) 58.2% 100% );',
        '-webkit-mask: radial-gradient( farthest-side, transparent calc(70% - 1px), #000 70%, #000 calc(100% - 1px), transparent 100% );',
        'mask: radial-gradient( farthest-side, transparent calc(70% - 1px), #000 70%, #000 calc(100% - 1px), transparent 100% );',
    ],
    'src/components/skeletonLoader/skeletonBoard/SkeletonBoard.module.css': [
        'background: linear-gradient(180deg, color-mix(in srgb, var(--colorPrimary) 9%, transparent), transparent 120px), var(--colorCardBg);',
        'background: linear-gradient( 90deg, var(--colorSkeletonBase) 25%, var(--colorSkeletonHighlight) 50%, var(--colorSkeletonBase) 75% );',
    ],
    'src/components/skeletonLoader/skeletonCard/SkeletonCard.module.css': [
        'background: linear-gradient( 90deg, var(--colorSkeletonBase) 25%, var(--colorSkeletonHighlight) 50%, var(--colorSkeletonBase) 75% );',
    ],
    'src/index.css': [
        '--colorPublicPageBg: radial-gradient(circle at top left, var(--colorStatIconBg), transparent 45%), var(--colorPageBg);',
        '--colorPublicPageBg: radial-gradient(circle at top left, var(--colorStatIconBg), transparent 45%), var(--colorPageBg);',
    ],
    'src/pages/application/applicationBoard/ApplicationBoard.module.css': [
        '--boardColumnAccent: linear-gradient(var(--boardStatusColor), var(--boardStatusColor)) top / 100% 4px no-repeat;',
        'background: var(--boardColumnAccent), linear-gradient(180deg, color-mix(in srgb, var(--boardStatusColor) 9%, transparent), transparent 120px), var(--colorCardBg);',
        'background: var(--boardColumnAccent), linear-gradient(180deg, color-mix(in srgb, var(--boardStatusColor) 16%, transparent), transparent 120px), var(--colorCardBg);',
        'background: var(--boardColumnAccent), repeating-linear-gradient( 135deg, color-mix(in srgb, var(--colorBtnDestructiveBg) 18%, transparent) 0, color-mix(in srgb, var(--colorBtnDestructiveBg) 18%, transparent) 2px, transparent 2px, transparent 14px ), linear-gradient(180deg, color-mix(in srgb, var(--colorBtnDestructiveBg) 13%, transparent), transparent 120px), var(--colorCardBg);',
        'background: linear-gradient( 180deg, color-mix(in srgb, var(--boardStatusColor) 30%, var(--colorCardBg)), color-mix(in srgb, var(--boardStatusColor) 18%, var(--colorPageBg)) );',
    ],
};

const expectedBoxShadowDeclarations = {
    'src/components/activityControls/ActivityControls.module.css': [
        'box-shadow: 0 12px 28px var(--colorControlShadow), inset 0 0 0 1px var(--activityGlassRim), inset 0 1px 0 var(--activityGlassTopEdge), inset 0 -1px 0 var(--activityGlassInnerEdge);',
        'box-shadow: 0 12px 28px rgb(56 50 53 / 14%), 0 2px 6px rgb(56 50 53 / 8%), inset 0 0 0 1px var(--activityGlassRim), inset 0 1px 0 var(--activityGlassTopEdge), inset 0 -1px 0 var(--activityGlassInnerEdge);',
    ],
    'src/components/activityControls/ControlDropdown.module.css': [
        'box-shadow: 0 1px 2px var(--colorControlShadow), inset 0 1px 0 rgb(255 255 255 / 24%);',
        'box-shadow: 0 3px 8px var(--colorControlShadow), inset 0 1px 0 rgb(255 255 255 / 38%);',
        'box-shadow: none;',
        'box-shadow: 0 6px 18px var(--colorAuthCardShadow);',
        'box-shadow: 0 18px 38px var(--colorControlShadow), inset 0 0 0 1px var(--activityGlassRim), inset 0 1px 0 var(--activityGlassTopEdge), inset 0 -1px 0 var(--activityGlassInnerEdge);',
    ],
    'src/components/activityControls/collectionViewToggle/CollectionViewToggle.module.css': [
        'box-shadow: 0 8px 18px var(--colorControlShadow), inset 0 1px 0 rgb(255 255 255 / 36%);',
    ],
    'src/components/authProductIntro/AuthProductIntro.module.css': ['box-shadow: none;', 'box-shadow: none;'],
    'src/components/fallbackScreen/FallbackScreen.module.css': ['box-shadow: 0 0px 20px var(--colorAuthCardShadow);'],
    'src/components/formPage/FormPage.module.css': ['box-shadow: 0 0 0 3px var(--colorPrimaryFocusShadow);'],
    'src/components/navbar/Navbar.module.css': [
        'box-shadow: 0 2px 8px var(--colorControlShadow);',
        'box-shadow: inset 0 0 0 1px var(--colorControlBorder);',
        'box-shadow: 0 1px 2px var(--colorControlShadow);',
        'box-shadow: 0 3px 8px var(--colorControlShadow);',
    ],
    'src/components/offlineBanner/OfflineBanner.module.css': [
        'box-shadow: 0 18px 42px var(--colorOfflineBannerShadow);',
    ],
    'src/components/toggleButton/ToggleButton.module.css': ['box-shadow: 0 1px 3px rgb(0 0 0 / 24%);'],
    'src/index.css': [
        '-webkit-box-shadow: 0 0 0 1000px #fff inset !important;',
        '-webkit-box-shadow: 0 0 0 1000px #2a2a36 inset !important;',
    ],
    'src/pages/application/ApplicationCard.module.css': [
        'box-shadow: 2px 2px 10px var(--colorNotesShadow);',
        'box-shadow: none;',
    ],
    'src/pages/application/applicationBoard/ApplicationBoard.module.css': [
        'box-shadow: 0 0 0 4px color-mix(in srgb, var(--boardStatusColor) 15%, transparent);',
        'box-shadow: 0 8px 20px var(--colorAuthCardShadow);',
        'box-shadow: 0 12px 26px var(--colorAuthCardShadow);',
        'box-shadow: 0 18px 36px var(--colorAuthCardShadow);',
    ],
    'src/pages/interview/InterviewCard.module.css': [
        'box-shadow: 2px 2px 10px var(--colorNotesShadow);',
        'box-shadow: none;',
    ],
    'src/pages/authentication/Authentication.module.css': [
        'box-shadow: 0 20px 48px var(--colorAuthCardShadow);',
        'box-shadow: 0 0 0 3px var(--colorPrimaryFocusShadow);',
    ],
    'src/pages/userGuide/UserGuide.module.css': [
        'box-shadow: 0 14px 38px var(--colorGuideHeaderShadow);',
        'box-shadow: 0 10px 28px var(--colorStatIconBg);',
        'box-shadow: 0 8px 22px var(--colorGuideTipShadow);',
    ],
};

const getThemeBlock = (source: string, theme: 'light' | 'dark') => {
    const startMarker = `[data-theme='${theme}'] {`;
    const endMarker = theme === 'light' ? "[data-theme='dark'] {" : '\n* {';
    const start = source.indexOf(startMarker);
    const end = source.indexOf(endMarker, start + startMarker.length);

    if (start === -1 || end === -1) throw new Error(`Missing ${theme} theme block`);

    return source.slice(start, end);
};

const getHexToken = (source: string, token: string) => {
    const value = source.match(new RegExp(`--${token}:\\s*(#[0-9a-fA-F]{6});`))?.[1];

    if (!value) throw new Error(`Missing hexadecimal --${token}`);

    return value;
};

const relativeLuminance = (hex: string) => {
    const channels = hex
        .slice(1)
        .match(/.{2}/g)!
        .map((channel) => parseInt(channel, 16) / 255)
        .map((channel) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4));

    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
};

const contrastRatio = (first: string, second: string) => {
    const firstLuminance = relativeLuminance(first);
    const secondLuminance = relativeLuminance(second);
    const lighter = Math.max(firstLuminance, secondLuminance);
    const darker = Math.min(firstLuminance, secondLuminance);

    return (lighter + 0.05) / (darker + 0.05);
};

describe('Rose Ledger visual contract', () => {
    it('keeps responsibility-specific modules with their owners', () => {
        const expectedPaths = [
            'src/test/renderWithProviders.tsx',
            'src/components/confirmation/bulkConfirmations.ts',
            'src/components/confirmation/deleteConfirmation.ts',
            'src/pages/application/applicationRelationConfirmation.ts',
            'src/pages/application/applicationNavigation.ts',
            'src/pages/application/duplicateApplicationConfirmation.ts',
            'src/pages/interview/interviewConflictConfirmation.tsx',
            'src/pages/dashboard/dashboardNavigation.ts',
            'src/components/passwordStrengthMeter/passwordStrength.ts',
            'src/components/activityControls/useControlDropdown.ts',
            'src/helper/csvExport.ts',
            'src/pages/dashboard/dashboardSelectors.ts',
            'src/pages/dashboard/attentionCenter/attentionItems.ts',
            'src/pages/dashboard/attentionCenter/followUpDrafts.ts',
            'src/pages/dashboard/attentionCenter/FollowUpDraftDialog.tsx',
            'src/pages/demo/state/demoDates.ts',
            'src/pages/application/jobApplication/QuickCaptureBookmarklet.tsx',
            'src/components/pinControl/PinControl.tsx',
            'src/components/pinControl/PinControl.module.css',
        ];
        const obsoletePaths = [
            'src/test/renderWithToast.tsx',
            'src/helper/bulkConfirmation.ts',
            'src/helper/deleteConfirmation.ts',
            'src/helper/applicationRelationConfirmation.ts',
            'src/helper/duplicateApplicationConfirmation.ts',
            'src/helper/interviewConflictConfirmation.tsx',
            'src/helper/applicationUnavailableMessage.ts',
            'src/helper/dashboardNavigation.ts',
            'src/helper/passwordStrength.ts',
            'src/hooks/useDropdown.ts',
            'src/helper/csvData.ts',
            'src/pages/dashboard/data/dashboardData.ts',
            'src/pages/dashboard/attentionCenter/attentionCenterData.ts',
            'src/pages/demo/state/demoDateHelpers.ts',
            'src/pages/userGuide/components/quickCaptureBookmarklet/QuickCaptureBookmarklet.tsx',
            'src/pages/application/jobApplication/QuickCaptureSetupDialog.tsx',
            'src/pages/application/ApplicationPin.tsx',
            'src/pages/application/ApplicationPin.module.css',
        ];

        expectedPaths.forEach((path) => expect(existsSync(resolve(clientRoot, path)), path).toBe(true));
        obsoletePaths.forEach((path) => expect(existsSync(resolve(clientRoot, path)), path).toBe(false));
    });

    it('keeps Quick Capture setup and reference UI compact and responsive', () => {
        const addApplicationCss = readSource(
            'src/pages/application/jobApplication/addApplication/AddApplication.module.css'
        );
        const indexCss = readSource('src/index.css');

        expect(addApplicationCss).not.toContain('linear-gradient');
        expect(addApplicationCss).not.toContain('box-shadow');
        expect(addApplicationCss).toContain('background-color: var(--colorTintSurface);');
        expect(addApplicationCss).toContain('border-left: 4px solid var(--colorTintBorder);');
        expect(addApplicationCss).toMatch(/\.quickCaptureSetupTriggerRow\s*\{[^}]*justify-content:\s*flex-end;/s);
        expect(addApplicationCss).toMatch(
            /\.quickCaptureSetupTrigger\s*\{[^}]*border:\s*0;[^}]*background:\s*transparent;/s
        );
        expect(addApplicationCss).toMatch(/\.quickCaptureChevronOpen\s*\{[^}]*transform:\s*rotate\(180deg\);/s);
        expect(addApplicationCss).toContain('@media (prefers-reduced-motion: reduce)');
        expect(addApplicationCss).toMatch(
            /\.quickCaptureSetupContent\s*\{[^}]*background-color:\s*var\(--colorQuickCaptureSurface\);/s
        );
        expect(addApplicationCss).not.toContain("[data-theme='dark']");
        expect(indexCss).toMatch(
            /\[data-theme='light'\]\s*\{[^}]*--colorQuickCaptureSurface:\s*var\(--colorControlSurface\);/s
        );
        expect(indexCss).toMatch(
            /\[data-theme='dark'\]\s*\{[^}]*--colorQuickCaptureSurface:\s*var\(--colorControlMutedSurface\);/s
        );
        expect(addApplicationCss).toMatch(
            /\.capturedPageTitle\s*\{[^}]*line-height:\s*1\.45;[^}]*overflow-wrap:\s*anywhere;/s
        );
        expect(addApplicationCss).toMatch(
            /@media \(max-width: 600px\)\s*\{[^}]*\.quickCaptureSetup\s*\{[^}]*display:\s*none;/s
        );
    });

    it('reuses the production application boards in demo views', () => {
        const activeDemoView = readSource(
            'src/pages/demo/application/jobApplication/viewApplication/DemoViewApplication.tsx'
        );
        const archivedDemoView = readSource(
            'src/pages/demo/application/archivedApplication/viewArchivedApplication/DemoViewArchivedApplication.tsx'
        );
        const activeDemoBoardName = ['Demo', 'ApplicationBoard'].join('');
        const archivedDemoBoardName = ['Demo', 'ArchivedApplicationBoard'].join('');

        expect(activeDemoView).toContain(
            "import ApplicationBoard from '../../../../application/jobApplication/applicationBoard/ApplicationBoard'"
        );
        expect(activeDemoView).not.toContain(activeDemoBoardName);
        expect(archivedDemoView).toContain(
            "import ArchivedApplicationBoard from '../../../../application/archivedApplication/archivedApplicationBoard/ArchivedApplicationBoard'"
        );
        expect(archivedDemoView).not.toContain(archivedDemoBoardName);
    });

    it('keeps the Application Board Move to select free of a native caret', () => {
        const applicationBoardCss = readSource('src/pages/application/applicationBoard/ApplicationBoard.module.css');

        expect(applicationBoardCss).toMatch(
            /\.statusSelectLabel select\s*\{[^}]*-webkit-appearance:\s*none;[^}]*appearance:\s*none;/s
        );
    });

    it('keeps Offer Comparison inside the existing solid-surface design system', () => {
        const offerDecisionWorkspace = readSource('src/pages/offerDecision/OfferDecisionWorkspace.tsx');
        const offerDecisionWorkspaceCss = readSource('src/pages/offerDecision/OfferDecisionWorkspace.module.css');
        const offerEvaluationCss = readSource('src/pages/offerDecision/OfferEvaluation.module.css');
        const offerDecisionSkeletonCss = readSource('src/pages/offerDecision/OfferDecisionSkeleton.module.css');
        const offerComparisonTableSkeletonCss = readSource(
            'src/components/skeletonLoader/skeletonOfferComparisonTable/SkeletonOfferComparisonTable.module.css'
        );
        const robustnessCss = readSource('src/pages/offerDecision/robustness/OfferDecisionRobustnessLab.module.css');
        const counterofferCss = readSource('src/pages/offerDecision/counteroffer/CounterofferPlanDialog.module.css');
        const counterofferDialog = readSource('src/pages/offerDecision/counteroffer/CounterofferPlanDialog.tsx');
        const muiTheme = readSource('src/components/theme/muiTheme.ts');
        const followUpDialog = readSource('src/pages/dashboard/attentionCenter/FollowUpDraftDialog.tsx');
        const needsAttentionSettingsCss = readSource(
            'src/pages/dashboard/attentionCenter/NeedsAttentionSettingsDialog.module.css'
        );
        const needsAttentionSettingsDialog = readSource(
            'src/pages/dashboard/attentionCenter/NeedsAttentionSettingsDialog.tsx'
        );
        const pageScrollControls = readSource('src/components/pageScrollControls/PageScrollControls.tsx');
        const activityControlsCss = readSource('src/components/activityControls/ActivityControls.module.css');

        expect(offerDecisionWorkspaceCss).not.toContain('linear-gradient');
        expect(offerDecisionWorkspaceCss).not.toContain('box-shadow');
        expect(offerDecisionWorkspaceCss).toMatch(/\.workspace\s*\{[^}]*overflow-anchor:\s*none;/s);
        expect(offerDecisionWorkspace).toContain("import evaluationStyles from './OfferEvaluation.module.css';");
        expect(offerDecisionWorkspace).toContain('evaluationStyles.highlighted');
        expect(offerEvaluationCss).not.toContain('linear-gradient');
        expect(offerEvaluationCss).not.toContain('box-shadow');
        expect(robustnessCss).not.toContain('linear-gradient');
        expect(robustnessCss).not.toContain('box-shadow');
        expect(robustnessCss).toMatch(
            /\.lab\s*\{[^}]*border-radius:\s*var\(--radiusCard\);[^}]*background-color:\s*var\(--colorCardBg\);/s
        );
        expect(robustnessCss).toMatch(
            /\.results\s*\{[^}]*padding-left:\s*var\(--spaceSection\);[^}]*border-left:\s*1px solid var\(--colorCardBorder\);/s
        );
        expect(robustnessCss).toMatch(
            /\.ranking\s*\{[^}]*border-radius:\s*var\(--radiusControl\);[^}]*background-color:\s*var\(--colorControlMutedSurface\);/s
        );
        expect(robustnessCss).toMatch(/\.ranking li\s*\{[^}]*border-bottom:\s*1px solid var\(--colorControlBorder\);/s);
        expect(robustnessCss).toMatch(
            /\.importanceHeader output\s*\{[^}]*border:\s*1px solid var\(--colorTintBorder\);[^}]*border-radius:\s*var\(--radiusPill\);[^}]*background-color:\s*var\(--colorTintSurface\);/s
        );
        expect(robustnessCss).toMatch(/\.fitResult\s*\{[^}]*display:\s*grid;[^}]*justify-items:\s*end;/s);
        expect(robustnessCss).toMatch(
            /\.newFitRating\s*\{[^}]*color:\s*var\(--colorText\);[^}]*font-size:\s*var\(--fontSizeBody\);/s
        );
        expect(robustnessCss).toContain('.header > button {\n        align-self: flex-end;');
        expect(counterofferCss).not.toContain('linear-gradient');
        expect(counterofferCss).not.toContain('box-shadow');
        expect(counterofferCss).not.toMatch(/\.tabs\s*\{/);
        expect(muiTheme).toMatch(/MuiDialog:\s*\{[\s\S]*?paper:\s*\{[^}]*backgroundColor:\s*'var\(--colorCardBg\)'/s);
        expect(muiTheme).toMatch(
            /MuiDialogActions:\s*\{[\s\S]*?root:\s*\{[^}]*backgroundColor:\s*'var\(--colorCardBg\)'/s
        );
        expect(counterofferCss).toMatch(/\.currentOffer,[\s\S]*?background-color:\s*var\(--colorCardBg\);/s);
        expect(counterofferCss).toMatch(
            /\.idealOffer\s*\{[^}]*border-color:\s*var\(--colorTintBorder\);[^}]*background-color:\s*var\(--colorTintSurface\);/s
        );
        expect(counterofferDialog).not.toContain('dividers');
        expect(followUpDialog).not.toContain('dividers');
        expect(counterofferCss).toMatch(
            /\.ratingSlider\s*\{[^}]*width:\s*100%;[^}]*min-width:\s*0;[^}]*box-sizing:\s*border-box;/s
        );
        expect(counterofferCss).toContain('color: var(--colorToastSuccessText);');
        expect(counterofferCss).toContain('color: var(--colorToastErrorText);');
        expect(counterofferCss).toMatch(
            /\.scenarioResult\s*\{[^}]*border:\s*1px solid var\(--colorCardBorder\);[^}]*background-color:\s*var\(--colorControlSurface\);/s
        );
        expect(counterofferCss).not.toMatch(/\.scenarioResult\s*\{[^}]*border-left:/s);
        expect(counterofferCss).toMatch(
            /\.resultValues > div\s*\{[^}]*padding:\s*var\(--spaceControl\);[^}]*border-radius:\s*var\(--radiusControl\);[^}]*background-color:\s*var\(--colorControlMutedSurface\);/s
        );
        expect(counterofferCss).toMatch(/\.scenarioResult > p\s*\{[^}]*padding-top:\s*var\(--spaceCompact\);/s);
        expect(counterofferCss).not.toMatch(/\.scenarioResult > p\s*\{[^}]*border-top:/s);
        expect(counterofferCss).not.toMatch(/\.requestedChanges\s*\{[^}]*border-top:/s);
        expect(counterofferCss).not.toMatch(/\.scenarioResult\s*\{[^}]*background-color:\s*var\(--colorStatIconBg\);/s);
        expect(counterofferCss).toMatch(
            /\.applicationContext span\s*\{[^}]*font-weight:\s*var\(--fontWeightEmphasis\);[^}]*\}/s
        );
        expect(counterofferCss).toMatch(
            /\.description\s*\{[^}]*margin:\s*var\(--spaceControl\) 0 var\(--spaceSection\);[^}]*\}/s
        );
        expect(counterofferCss).not.toMatch(/@media \(max-width: 600px\)[\s\S]*?\.actions\s*\{/);
        expect(counterofferCss).toMatch(
            /\.actions\s*\{[^}]*padding:\s*var\(--spaceCompact\) var\(--spaceSection\) !important;/s
        );
        expect(counterofferCss).toMatch(/\.actionSpacer\s*\{[^}]*flex:\s*1;/s);
        expect(counterofferCss).toMatch(
            /\.dialogContent\s*\{[^}]*padding:\s*0 var\(--spaceSection\) var\(--spaceSection\) !important;/s
        );
        expect(counterofferDialog).toContain('<DialogTitle className={styles.dialogTitle}>{title}</DialogTitle>');
        expect(counterofferCss).toMatch(/\.dialogTitle\s*\{[^}]*padding-left:\s*var\(--spaceSection\) !important;/s);
        expect(counterofferCss).not.toMatch(/@media \(max-width: 768px\)[\s\S]*?\.dialogContent\s*\{/);
        expect(counterofferCss).not.toContain(".actions[data-button-count='2']");
        expect(counterofferCss).not.toContain(".actions[data-button-count='3']");
        expect(counterofferCss).not.toMatch(/@media \(max-width: 600px\)[\s\S]*?\.actionSpacer\s*\{/);
        expect(needsAttentionSettingsCss).toMatch(
            /\.actions\s*\{[^}]*display:\s*flex;[^}]*justify-content:\s*flex-end;[^}]*padding:\s*var\(--spaceCompact\) var\(--spaceSection\) !important;/s
        );
        expect(needsAttentionSettingsDialog).toContain(
            "<section className={styles.reminderSettings} aria-labelledby='reminder-order-heading'>"
        );
        expect(needsAttentionSettingsCss).toMatch(
            /\.listSettings,\s*\.reminderSettings\s*\{[^}]*padding:\s*var\(--spaceCard\);[^}]*border:\s*1px solid var\(--colorCardBorder\);[^}]*border-radius:\s*var\(--radiusCard\);/s
        );
        expect(needsAttentionSettingsCss).toMatch(/\.listSettings\s*\{[^}]*background-color:\s*var\(--colorCardBg\);/s);
        expect(needsAttentionSettingsCss).toMatch(
            /\.reminderSettings\s*\{[^}]*background-color:\s*var\(--colorControlSurface\);/s
        );
        expect(needsAttentionSettingsCss).toMatch(/\.reset\s*\{[^}]*margin-right:\s*auto;/s);
        expect(needsAttentionSettingsCss).toMatch(
            /\.option\s*\{[^}]*border:\s*1px solid var\(--colorCardBorder\);[^}]*border-radius:\s*var\(--radiusCard\);[^}]*background-color:\s*var\(--colorCardBg\);/s
        );
        expect(needsAttentionSettingsCss).toMatch(
            /\.priority\s*\{[^}]*border:\s*1px solid var\(--colorTintBorder\);[^}]*border-radius:\s*var\(--radiusPill\);[^}]*background-color:\s*var\(--colorTintSurface\);/s
        );
        expect(needsAttentionSettingsCss).toMatch(
            /\.optionDetails\s*\{[^}]*border-top:\s*1px solid var\(--colorControlBorder\);/s
        );
        expect(needsAttentionSettingsCss).not.toMatch(
            /@media \(max-width: 550px\)[\s\S]*?\.actions\s*\{[^}]*flex-direction:\s*column;/
        );
        expect(needsAttentionSettingsCss).not.toMatch(
            /@media \(max-width: 550px\)[\s\S]*?\.reset\s*\{[^}]*width:\s*100%;/
        );
        expect(pageScrollControls).not.toContain('MdKeyboardArrowDown');
        expect(pageScrollControls).not.toContain('Scroll to bottom');
        expect(counterofferCss).toMatch(
            /@media \(max-width: 768px\)[\s\S]*?\.idealColumns\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\);/s
        );
        expect(counterofferCss).toMatch(
            /@media \(max-width: 600px\)[\s\S]*?\.dialogPaper\s*\{[^}]*max-height:\s*calc\(100dvh - 16px\);/s
        );
        expect(counterofferCss).toMatch(
            /\.requestedChangeValue\s*\{[^}]*min-width:\s*0;[^}]*overflow-wrap:\s*anywhere;/s
        );
        expect(counterofferCss).toMatch(
            /\.requestedChangeColumns\s*\{[^}]*align-items:\s*stretch;[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/s
        );
        expect(counterofferCss).toMatch(
            /@media \(max-width: 600px\)[\s\S]*?\.requestedChangeColumns\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\);/s
        );
        expect(counterofferCss).toMatch(
            /\.requestedChangeColumn\s*\{[^}]*grid-template-rows:\s*auto minmax\(0,\s*1fr\);/s
        );
        expect(counterofferCss).toMatch(
            /\.requestedChangeColumn:first-child \.requestedChangeValue\s*\{[^}]*border-left-color:\s*var\(--colorToastErrorAccent\);[^}]*background-color:\s*var\(--colorToastErrorBg\);[^}]*color:\s*var\(--colorToastErrorText\);/s
        );
        expect(counterofferCss).toMatch(
            /\.requestedChangeColumn:last-child \.requestedChangeValue\s*\{[^}]*border-left-color:\s*var\(--colorToastSuccessAccent\);[^}]*background-color:\s*var\(--colorToastSuccessBg\);[^}]*color:\s*var\(--colorToastSuccessText\);/s
        );
        expect(counterofferCss).not.toContain('.requestedChangeArrow');
        expect(counterofferCss).not.toContain('.requestedChangeDifference');
        expect(robustnessCss).toMatch(/\.lab\s*\{[^}]*background-color:\s*var\(--colorCardBg\);/s);
        expect(robustnessCss).toContain('border: 1px solid var(--colorCardBorder);');
        expect(robustnessCss).toContain('accent-color: var(--colorPrimary);');
        expect(robustnessCss).toContain('@media (max-width: 768px)');
        expect(robustnessCss).toMatch(
            /@media \(max-width: 768px\)[\s\S]*?\.content\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\);/s
        );
        expect(activityControlsCss).toMatch(/\.controls\s*\{[^}]*margin:\s*20px 0;/s);
        expect(offerDecisionWorkspaceCss).toMatch(/\.workspace\s*\{[^}]*padding:\s*0 32px 32px;/s);
        expect(offerDecisionWorkspaceCss).toMatch(
            /@media \(max-width: 768px\)[\s\S]*?\.workspace\s*\{[^}]*padding:\s*0 16px 16px;/s
        );
        expect(offerDecisionWorkspaceCss).not.toMatch(/\.workspace\s*\{[^}]*padding:\s*32px;/s);
        expect(offerEvaluationCss).toContain('background-color: var(--colorCardBg);');
        expect(offerEvaluationCss).toContain('border: 1px solid var(--colorCardBorder);');
        expect(offerDecisionWorkspaceCss).toContain('color: var(--colorTextSecondary);');
        expect(offerDecisionWorkspaceCss).toContain(".evaluationGrid[data-card-count='one']");
        expect(offerDecisionWorkspaceCss).toContain(".evaluationGrid[data-card-count='two']");
        expect(offerDecisionWorkspaceCss).toContain('align-items: start;');
        expect(offerEvaluationCss).toContain('outline: 3px solid var(--colorPrimaryFocusShadow);');
        expect(offerDecisionWorkspaceCss).toContain('white-space: nowrap;');
        expect(offerDecisionWorkspaceCss).toContain('align-items: flex-end;');
        expect(offerEvaluationCss).not.toContain('.cardActions button {\n        width: 100%;');
        expect(offerEvaluationCss.slice(0, offerEvaluationCss.indexOf('@media (max-width: 768px)'))).toMatch(
            /\.cardActions \.mobileActionButton,\s*\.cardActions \.cardActionTrigger\s*\{[^}]*height:\s*35px;[^}]*box-sizing:\s*border-box;[^}]*-webkit-appearance:\s*none;[^}]*appearance:\s*none;/s
        );
        expect(offerEvaluationCss).toMatch(/\.ratingFields legend\s*\{[^}]*padding-right:/s);
        expect(offerEvaluationCss).toMatch(
            /\.detailsReview dt,\s*\.reviewValue dt\s*\{[^}]*color:\s*var\(--colorLabel\);[^}]*font-size:\s*var\(--fontSizeBody\);[^}]*font-weight:\s*500;/s
        );
        expect(offerEvaluationCss).toMatch(
            /\.detailsReview dd\s*\{[^}]*color:\s*var\(--colorTextSecondary\);[^}]*font-size:\s*var\(--fontSizeBody\);[^}]*font-weight:\s*400;/s
        );
        expect(offerEvaluationCss).toMatch(
            /\.detailsReview,\s*\.reviewValues\s*\{[^}]*padding:\s*var\(--spaceCompact\);[^}]*background-color:\s*var\(--colorControlMutedSurface\);/s
        );
        expect(offerDecisionWorkspaceCss).toMatch(
            /\.comparisonSection\s*\+\s*\.comparisonSection\s*\{[^}]*padding-top:\s*var\(--spacePageGrid\);[^}]*border-top:\s*1px solid var\(--colorCardBorder\);/s
        );
        expect(offerEvaluationCss).toMatch(
            /\.reviewSection h4\s*\{[^}]*color:\s*var\(--colorText\);[^}]*font-size:\s*var\(--fontSizeMetadata\);[^}]*font-weight:\s*var\(--fontWeightEmphasis\);/s
        );
        expect(offerEvaluationCss).toMatch(
            /\.expiredBadge\s*\{[^}]*min-height:\s*var\(--heightCompactPill\);[^}]*padding:\s*0 9px;[^}]*align-items:\s*center;[^}]*gap:\s*5px;[^}]*font-size:\s*var\(--fontSizeMicro\);[^}]*font-weight:\s*var\(--fontWeightEmphasis\);[^}]*line-height:\s*1\.2;[^}]*box-sizing:\s*border-box;/s
        );
        expect(offerEvaluationCss).toMatch(
            /\.expiredBadge::before\s*\{[^}]*width:\s*5px;[^}]*height:\s*5px;[^}]*flex:\s*0 0 5px;[^}]*border-radius:\s*var\(--radiusPill\);[^}]*background-color:\s*var\(--colorToastErrorAccent\);[^}]*content:\s*'';/s
        );
        expect(offerDecisionWorkspaceCss).toMatch(
            /\.sectionHeading h2\s*\{[^}]*font-size:\s*var\(--fontSizePageTitle\);/s
        );
        expect(offerEvaluationCss).toMatch(/\.cardHeader h3\s*\{[^}]*font-size:\s*var\(--fontSizeSectionTitle\);/s);
        expect(offerDecisionWorkspaceCss).toContain('@media (max-width: 768px)');
        expect(offerEvaluationCss).toContain('@media (max-width: 768px)');
        expect(offerEvaluationCss).not.toMatch(/\.cardActions\s*\{[^}]*flex-direction:\s*column;/s);
        expect(offerDecisionSkeletonCss).toContain(
            "composes: skeletonLine from '../../components/skeletonLoader/skeletonCard/SkeletonCard.module.css';"
        );
        expect(offerDecisionSkeletonCss).not.toContain('linear-gradient');
        expect(offerDecisionSkeletonCss).not.toContain('box-shadow');
        expect(offerComparisonTableSkeletonCss).toContain(
            "composes: skeletonLine from '../skeletonCard/SkeletonCard.module.css';"
        );
        expect(offerComparisonTableSkeletonCss).not.toContain('linear-gradient');
        expect(offerComparisonTableSkeletonCss).not.toContain('box-shadow');
    });

    it('groups the cohesive counteroffer implementation without generic nesting', () => {
        const counterofferDialog = readSource('src/pages/offerDecision/counteroffer/CounterofferPlanDialog.tsx');
        const counterofferIdealOffer = readSource('src/pages/offerDecision/counteroffer/CounterofferIdealOffer.tsx');
        const offerDecisionFieldError = readSource('src/pages/offerDecision/OfferDecisionFieldError.tsx');
        const offerEvaluationForm = readSource('src/pages/offerDecision/OfferEvaluationForm.tsx');

        [
            'CounterofferCurrentOffer.tsx',
            'CounterofferIdealOffer.tsx',
            'CounterofferPlanDialog.module.css',
            'CounterofferPlanDialog.tsx',
            'CounterofferRequestedChanges.tsx',
            'counterofferPlan.ts',
        ].forEach((fileName) =>
            expect(existsSync(resolve(sourceRoot, 'pages/offerDecision/counteroffer', fileName))).toBe(true)
        );

        expect(existsSync(resolve(sourceRoot, 'pages/offerDecision/CounterofferPlanDialog.tsx'))).toBe(false);
        expect(existsSync(resolve(sourceRoot, 'pages/offerDecision/components'))).toBe(false);
        expect(existsSync(resolve(sourceRoot, 'pages/offerDecision/utils'))).toBe(false);
        expect(counterofferDialog).toContain("import CounterofferCurrentOffer from './CounterofferCurrentOffer';");
        expect(counterofferIdealOffer).toContain(
            "import CounterofferRequestedChanges from './CounterofferRequestedChanges';"
        );
        expect(counterofferDialog).not.toContain('const CurrentOfferPanel');
        expect(offerDecisionFieldError).toContain('export const getOfferDecisionErrorProps');
        expect(offerDecisionFieldError).toContain('const OfferDecisionFieldError');
        expect(offerEvaluationForm).toContain('getOfferDecisionErrorProps');
        expect(counterofferIdealOffer).toContain('getOfferDecisionErrorProps');
        expect(offerEvaluationForm).not.toContain('const getErrorProps');
        expect(counterofferIdealOffer).not.toContain('const errorProps');
    });

    it('uses the established application and Offer Comparison typography hierarchy on dashboard cards', () => {
        const dashboardCardCss = readSource('src/pages/dashboard/shared/dashboardCard/DashboardCard.module.css');
        const dashboardStatsCss = readSource('src/pages/dashboard/overview/dashboardStats/DashboardStats.module.css');
        const attentionCenterCss = readSource('src/pages/dashboard/attentionCenter/AttentionCenter.module.css');
        const attentionSettingsCss = readSource(
            'src/pages/dashboard/attentionCenter/NeedsAttentionSettingsDialog.module.css'
        );
        const attentionCenterDesktopCss = attentionCenterCss.slice(0, attentionCenterCss.indexOf('@media'));
        const followUpDialogCss = readSource('src/pages/dashboard/attentionCenter/FollowUpDraftDialog.module.css');

        expect(dashboardCardCss).toMatch(/\.header h2\s*\{[^}]*font-size:\s*var\(--fontSizeSectionTitle\);/s);
        expect(dashboardCardCss).toMatch(/\.header p\s*\{[^}]*font-size:\s*var\(--fontSizeBody\);/s);
        expect(dashboardCardCss).toMatch(
            /@media \(max-width: 768px\)[\s\S]*?\.header h2\s*\{[^}]*font-size:\s*var\(--fontSizeCardTitle\);/s
        );
        expect(dashboardCardCss).toMatch(
            /@media \(max-width: 768px\)[\s\S]*?\.header p\s*\{[^}]*font-size:\s*var\(--fontSizeBodyCompact\);/s
        );
        expect(attentionCenterDesktopCss).toMatch(
            /\.applicationDetails h3,\s*\.centered h3\s*\{[^}]*font-size:\s*var\(--fontSizeCardTitle\);/s
        );
        expect(attentionCenterCss).toMatch(
            /@media \(max-width: 803px\)[\s\S]*?\.applicationDetails h3,\s*\.centered h3\s*\{[^}]*font-size:\s*var\(--fontSizeBody\);/s
        );
        expect(attentionCenterCss).toMatch(
            /\.actionRow\s*\{[^}]*justify-content:\s*flex-end;[^}]*margin-top:\s*auto;/s
        );
        expect(attentionCenterCss).toMatch(
            /@media \(max-width: 550px\)[\s\S]*?\.actionButton\s*\{[^}]*width:\s*100%;/s
        );
        expect(dashboardStatsCss).toMatch(
            /@media \(min-width: 551px\) and \(max-width: 900px\)[\s\S]*?\.statsRow\s*\{[^}]*grid-template-columns:\s*repeat\(6, minmax\(0, 1fr\)\);/s
        );
        expect(dashboardStatsCss).toMatch(
            /@media \(max-width: 550px\)[\s\S]*?\.card:first-child\s*\{[^}]*grid-column:\s*1 \/ -1;/s
        );
        expect(dashboardStatsCss).not.toContain('text-transform: uppercase;');
        expect(dashboardStatsCss).not.toContain('letter-spacing: 0.5px;');
        expect(followUpDialogCss).not.toContain('linear-gradient');
        expect(followUpDialogCss).not.toContain('box-shadow');
        expect(followUpDialogCss).toContain('white-space: pre-wrap;');
        expect(followUpDialogCss).toContain('overflow-wrap: anywhere;');
        expect(attentionSettingsCss).toMatch(/\.content\s*>\s*p\s*\{[^}]*font-size:\s*var\(--fontSizeControl\);/s);
        expect(attentionSettingsCss).toMatch(
            /\.optionCopy\s*>\s*span\s*\{[^}]*font-size:\s*var\(--fontSizeControl\);/s
        );
        expect(attentionSettingsCss).toMatch(/\.timingLabel\s*\{[^}]*font-size:\s*var\(--fontSizeControl\);/s);
    });

    it('defines both approved palettes and the shared metric aliases', () => {
        const globalCss = readSource('src/index.css');
        const lightCss = getThemeBlock(globalCss, 'light');
        const darkCss = getThemeBlock(globalCss, 'dark');

        [
            '--fontSizeBody: 1rem;',
            '--fontSizeControl: 0.875rem;',
            '--fontSizeCompactControl: 0.8125rem;',
            '--fontSizeMetadata: 0.8125rem;',
            '--heightCompactPill: 26px;',
            '--heightCompactNavigationControl: 32px;',
            '--radiusControl: 10px;',
            '--radiusMenuItem: 8px;',
            '--radiusToolbar: 14px;',
            '--radiusPanel: 15px;',
            '--radiusCard: 16px;',
            '--radiusPill: 999px;',
            '--spaceControl: 8px;',
            '--spaceCompact: 10px;',
            '--spaceCard: 16px;',
            '--spaceSection: 20px;',
            '--spacePageGrid: 24px;',
        ].forEach((declaration) => expect(globalCss).toContain(declaration));

        [
            'color-scheme: light;',
            '--colorPageBg: #f8f4f1;',
            '--colorCardBg: #fffdfb;',
            '--colorText: #2b2529;',
            '--colorTextSecondary: #71666b;',
            '--colorTooltipBg: #2b2529;',
            '--colorTooltipText: #fffafb;',
            '--colorPrimary: #a81f4c;',
            '--colorInteractiveBorder: #987f84;',
            '--colorLinkText: #0b57d0;',
            '--colorAuthLink: #0b57d0;',
            '--colorBtnDestructiveText: #b02a37;',
            '--colorNoteSavingText: #0b57d0;',
            '--colorNoteSavedText: #155724;',
            '--colorNoteErrorText: #b02a37;',
            '--colorSwitchOff: #987f84;',
            '--colorSwitchOffBorder: #71666b;',
            '--colorSwitchThumb: #ffffff;',
            '--colorSelectedControlText: #ffffff;',
            '--colorBtnDestructiveFilledText: #ffffff;',
            '--colorStatusApplied: #17a2b8;',
            '--colorStatusOffer: #ffc107;',
            '--colorStatusAppliedBadgeBg: #d7f1f4;',
            '--colorStatusInterviewBadgeBg: #e1ebff;',
            '--colorStatusOfferBadgeBg: #fff0bd;',
            '--colorStatusAcceptedBadgeBg: #ddefe5;',
            '--colorStatusRejectedBadgeBg: #f8dfe2;',
            '--colorStatusGhostedBadgeBg: #e5e7ea;',
            '--colorStatusDeclinedBadgeBg: #ece3f5;',
            '--colorStatusWithdrawnBadgeBg: #eee3da;',
            '--colorStatusAppliedText: #075c66;',
            '--colorStatusInterviewText: #174c9e;',
            '--colorStatusOfferText: #664d03;',
            '--colorStatusAcceptedText: #146c43;',
            '--colorStatusRejectedText: #9f2632;',
            '--colorStatusGhostedText: #4e555b;',
            '--colorStatusDeclinedText: #573080;',
            '--colorStatusWithdrawn: #8b5e3c;',
            '--colorStatusWithdrawnText: #6d452b;',
            '--colorLocationText: #005f56;',
            '--colorInterviewType: #6d28d9;',
            '--colorUpcomingBadge: #f57c00;',
            '--colorUpcomingBadgeBg: #fff1dc;',
            '--colorUpcomingBadgeText: #7a4800;',
        ].forEach((declaration) => expect(lightCss).toContain(declaration));

        [
            'color-scheme: dark;',
            '--colorPageBg: #171517;',
            '--colorCardBg: #211e22;',
            '--colorText: #f4edf0;',
            '--colorTextSecondary: #c1b4ba;',
            '--colorTooltipBg: #f4edf0;',
            '--colorTooltipText: #211e22;',
            '--colorPrimary: #ff779b;',
            '--colorInteractiveBorder: #7a6c74;',
            '--colorSelectedControlText: #261019;',
            '--colorBtnDestructiveFilledText: #ffffff;',
            '--colorNoteSavingText: #6ea8fe;',
            '--colorNoteSavedText: #75b798;',
            '--colorNoteErrorText: #ff7b86;',
            '--colorStatusApplied: #148f9e;',
            '--colorStatusOffer: #d39e00;',
            '--colorStatusAppliedBadgeBg: #163b40;',
            '--colorStatusInterviewBadgeBg: #1d3154;',
            '--colorStatusOfferBadgeBg: #493c17;',
            '--colorStatusAcceptedBadgeBg: #183c2c;',
            '--colorStatusRejectedBadgeBg: #482429;',
            '--colorStatusGhostedBadgeBg: #34383c;',
            '--colorStatusDeclinedBadgeBg: #352743;',
            '--colorStatusWithdrawnBadgeBg: #412d23;',
            '--colorStatusAppliedText: #7edce5;',
            '--colorStatusInterviewText: #9fc0ff;',
            '--colorStatusOfferText: #f5d56b;',
            '--colorStatusAcceptedText: #8dd5ae;',
            '--colorStatusRejectedText: #ff9ba5;',
            '--colorStatusGhostedText: #d0d4d7;',
            '--colorStatusDeclinedText: #d1afe9;',
            '--colorStatusWithdrawn: #7a4a2e;',
            '--colorStatusWithdrawnText: #e2b99b;',
            '--colorLocationText: #5eead4;',
            '--colorInterviewType: #c4b5fd;',
            '--colorUpcomingBadge: #f57c00;',
            '--colorUpcomingBadgeBg: #3f2d1b;',
            '--colorUpcomingBadgeText: #ffc47d;',
        ].forEach((declaration) => expect(darkCss).toContain(declaration));

        expect(globalCss).toContain("--fontFamilyBase: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;");
        expect(globalCss).toContain('font-size: var(--fontSizeBody);');
    });

    it('uses one restrained typography, tint, and continuity system across every major surface', () => {
        const globalCss = readSource('src/index.css');
        const lightCss = getThemeBlock(globalCss, 'light');
        const darkCss = getThemeBlock(globalCss, 'dark');
        const buttonCss = readSource('src/components/button/PrimaryButton.module.css');
        const dropdownCss = readSource('src/components/activityControls/ControlDropdown.module.css');
        const navbarCss = readSource('src/components/navbar/Navbar.module.css');
        const formCss = readSource('src/components/formPage/FormPage.module.css');
        const emptyStateCss = readSource('src/components/emptyState/EmptyState.module.css');
        const fallbackCss = readSource('src/components/fallbackScreen/FallbackScreen.module.css');
        const authCss = readSource('src/pages/authentication/Authentication.module.css');
        const userGuideCss = readSource('src/pages/userGuide/UserGuide.module.css');
        const dashboardCardCss = readSource('src/pages/dashboard/shared/dashboardCard/DashboardCard.module.css');
        const attentionCss = readSource('src/pages/dashboard/attentionCenter/AttentionCenter.module.css');
        const applicationCss = readSource('src/pages/application/ApplicationCard.module.css');
        const interviewCss = readSource('src/pages/interview/InterviewCard.module.css');
        const offerWorkspaceCss = readSource('src/pages/offerDecision/OfferDecisionWorkspace.module.css');
        const offerEvaluationCss = readSource('src/pages/offerDecision/OfferEvaluation.module.css');
        const robustnessCss = readSource('src/pages/offerDecision/robustness/OfferDecisionRobustnessLab.module.css');
        const attentionSettingsCss = readSource(
            'src/pages/dashboard/attentionCenter/NeedsAttentionSettingsDialog.module.css'
        );
        const muiTheme = readSource('src/components/theme/muiTheme.ts');

        [
            '--fontSizeHero: clamp(2.75rem, 4.25vw, 3.75rem);',
            '--fontSizePageTitle: 1.5rem;',
            '--fontSizeSectionTitle: 1.25rem;',
            '--fontSizeCardTitle: 1.125rem;',
            '--fontSizeBodyCompact: 0.9375rem;',
            '--fontSizeMicro: 0.75rem;',
            '--lineHeightHeading: 1.25;',
            '--lineHeightBody: 1.5;',
            '--letterSpacingHeading: -0.02em;',
            '--fontWeightHeading: 700;',
            '--fontWeightEmphasis: 600;',
            '--motionDurationFast: 160ms;',
            '--motionDurationStandard: 200ms;',
            '--motionEasingStandard: cubic-bezier(0.25, 0.1, 0.25, 1);',
            '--motionEasingEmphasized: cubic-bezier(0.22, 1, 0.36, 1);',
        ].forEach((declaration) => expect(globalCss).toContain(declaration));

        [lightCss, darkCss].forEach((themeCss) => {
            expect(themeCss).toContain('--colorTintSurface:');
            expect(themeCss).toContain('--colorTintSurfaceStrong:');
            expect(themeCss).toContain('--colorTintBorder:');
            expect(themeCss).toContain('--colorTintText:');
            expect(themeCss).toContain('--colorNavHoverBg: var(--colorTintSurface);');
            expect(themeCss).toContain('--colorNavActiveBg: var(--colorTintSurfaceStrong);');
            expect(themeCss).toContain('--colorNavActiveText: var(--colorTintText);');
            expect(themeCss).toContain('--colorBtnSecondaryHoverBg: var(--colorTintSurface);');
            expect(themeCss).toContain('--colorStatIconBg: var(--colorTintSurfaceStrong);');
        });

        [
            [formCss, /\.formPage h2\s*\{[^}]*font-size:\s*var\(--fontSizePageTitle\);/s],
            [emptyStateCss, /\.emptyState h2\s*\{[^}]*font-size:\s*var\(--fontSizeSectionTitle\);/s],
            [fallbackCss, /\.content h1\s*\{[^}]*font-size:\s*var\(--fontSizePageTitle\);/s],
            [authCss, /\.title\s*\{[^}]*font-size:\s*var\(--fontSizePageTitle\);/s],
            [userGuideCss, /\.header h1\s*\{[^}]*font-size:\s*var\(--fontSizePageTitle\);/s],
            [dashboardCardCss, /\.header h2\s*\{[^}]*font-size:\s*var\(--fontSizeSectionTitle\);/s],
            [attentionCss, /\.applicationDetails h3,[^}]*font-size:\s*var\(--fontSizeCardTitle\);/s],
            [applicationCss, /\.applicationContent h2\s*\{[^}]*font-size:\s*var\(--fontSizeSectionTitle\);/s],
            [interviewCss, /\.interviewContent h2\s*\{[^}]*font-size:\s*var\(--fontSizeSectionTitle\);/s],
            [offerWorkspaceCss, /\.sectionHeading h2\s*\{[^}]*font-size:\s*var\(--fontSizePageTitle\);/s],
            [offerEvaluationCss, /\.cardHeader h3\s*\{[^}]*font-size:\s*var\(--fontSizeSectionTitle\);/s],
        ].forEach(([source, pattern]) => expect(source as string).toMatch(pattern as RegExp));

        expect(buttonCss).toMatch(
            /\.secondary\s*\{[^}]*border:\s*1\.5px solid var\(--colorPrimary\);[^}]*background:\s*transparent;[^}]*color:\s*var\(--colorPrimary\);/s
        );
        expect(buttonCss).toMatch(
            /\.secondary:not\(:disabled\):hover\s*\{[^}]*background-color:\s*var\(--colorBtnSecondaryHoverBg\);/s
        );
        expect(offerEvaluationCss).toMatch(
            /\.deadlineSummary\s*\{[^}]*border:\s*1px solid var\(--colorTintBorder\);[^}]*background-color:\s*var\(--colorTintSurface\);/s
        );
        expect(robustnessCss).toMatch(
            /\.importanceHeader output\s*\{[^}]*border:\s*1px solid var\(--colorTintBorder\);[^}]*background-color:\s*var\(--colorTintSurface\);/s
        );
        expect(attentionSettingsCss).toMatch(
            /\.priority\s*\{[^}]*border:\s*1px solid var\(--colorTintBorder\);[^}]*background-color:\s*var\(--colorTintSurface\);/s
        );

        expect(buttonCss).toContain('transition: transform var(--motionDurationFast) var(--motionEasingStandard)');
        expect(buttonCss).toContain('transform: scale(0.98);');
        expect(dropdownCss).toContain(
            'animation: dropdownEnter var(--motionDurationStandard) var(--motionEasingEmphasized);'
        );
        expect(navbarCss).toContain('var(--motionDurationFast) var(--motionEasingStandard)');
        expect(buttonCss).toMatch(
            /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.button\s*\{[^}]*transition:\s*none;/s
        );
        expect(buttonCss).toMatch(
            /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.button:active\s*\{[^}]*transform:\s*none;/s
        );
        expect(dropdownCss).toMatch(
            /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.dropdown\s*\{[^}]*animation:\s*none;/s
        );
        expect(muiTheme).toContain("fontSize: 'var(--fontSizePageTitle)'");
        expect(muiTheme).toContain("fontWeight: 'var(--fontWeightHeading)'");
        expect(muiTheme).toContain("border: '1.5px solid var(--colorPrimary)'");
        expect(muiTheme).toContain("backgroundColor: 'transparent'");
        expect(muiTheme).toContain("color: 'var(--colorPrimary)'");
        expect(muiTheme).toContain("backgroundColor: 'var(--colorBtnSecondaryHoverBg)'");
    });

    it.each(['light', 'dark'] as const)('%s theme meets the planned contrast floors', (theme) => {
        const themeCss = getThemeBlock(readSource('src/index.css'), theme);
        const pairs: Array<[string, string, number]> = [
            ['Text', 'PageBg', 4.5],
            ['TextSecondary', 'PageBg', 4.5],
            ['TextSecondary', 'ControlMutedSurface', 4.5],
            ['TooltipText', 'TooltipBg', 4.5],
            ['TextSecondary', 'OverlayBg', 3],
            ['Primary', 'OverlayBg', 3],
            ['BtnPrimaryText', 'Primary', 4.5],
            ['BtnDestructiveFilledText', 'BtnDestructiveBg', 4.5],
            ['LinkText', 'LinkBg', 4.5],
            ['AuthLink', 'AuthCardBg', 4.5],
            ['BtnDestructiveText', 'CardBg', 4.5],
            ['SwitchOffBorder', 'CardBg', 3],
            ['SwitchThumb', 'SwitchOff', 3],
            ['InputBorder', 'InputBg', 3],
            ['InteractiveBorder', 'ControlMutedSurface', 3],
            ['PrimaryFocusOutline', 'PageBg', 3],
            ['PrimaryFocusOutline', 'OverlayBg', 3],
            ['LocationText', 'CardBg', 4.5],
            ['InterviewType', 'CardBg', 4.5],
            ['TimeLeft', 'CardBg', 4.5],
            ['ToastErrorText', 'ToastErrorBg', 4.5],
            ['NoteSavingText', 'NotesBg', 4.5],
            ['NoteSavedText', 'NotesBg', 4.5],
            ['NoteErrorText', 'NotesBg', 4.5],
            ['StatusAppliedText', 'StatusAppliedBadgeBg', 4.5],
            ['StatusInterviewText', 'StatusInterviewBadgeBg', 4.5],
            ['StatusOfferText', 'StatusOfferBadgeBg', 4.5],
            ['StatusAcceptedText', 'StatusAcceptedBadgeBg', 4.5],
            ['StatusRejectedText', 'StatusRejectedBadgeBg', 4.5],
            ['StatusGhostedText', 'StatusGhostedBadgeBg', 4.5],
            ['StatusDeclinedText', 'StatusDeclinedBadgeBg', 4.5],
            ['StatusWithdrawnText', 'StatusWithdrawnBadgeBg', 4.5],
            ['UpcomingBadgeText', 'UpcomingBadgeBg', 4.5],
        ];

        if (theme === 'light') {
            pairs.push(['SwitchOff', 'CardBg', 3], ['LocationText', 'PageBg', 4.5], ['InterviewType', 'PageBg', 4.5]);
        }

        pairs.forEach(([foreground, background, minimum]) =>
            expect(
                contrastRatio(getHexToken(themeCss, `color${foreground}`), getHexToken(themeCss, `color${background}`)),
                `${theme} --color${foreground} on --color${background}`
            ).toBeGreaterThanOrEqual(minimum)
        );
    });

    it('keeps Material UI on the shared font and theme foreground tokens', () => {
        const muiTheme = readSource('src/components/theme/muiTheme.ts');

        expect(muiTheme).toContain("fontFamily: 'var(--fontFamilyBase)'");
        expect(muiTheme).toContain("main: theme === 'dark' ? '#ff779b' : '#a81f4c'");
        expect(muiTheme).toContain("color: 'var(--colorBtnPrimaryText)'");
        expect(muiTheme).toContain("padding: 'var(--spaceControl) var(--spaceCompact)'");
        expect(muiTheme).toContain("borderRadius: 'var(--radiusControl)'");
        expect(countMatches(muiTheme, /boxShadow:/g)).toBe(3);
    });

    it('freezes the connected view toggle, dropdown caret, checkbox, and switch semantics', () => {
        const viewToggle = readSource('src/components/activityControls/collectionViewToggle/CollectionViewToggle.tsx');
        const dropdown = readSource('src/components/activityControls/ControlDropdown.tsx');
        const checkbox = readSource('src/components/activityControls/checkboxFilter/CheckboxFilter.tsx');
        const toggle = readSource('src/components/toggleButton/ToggleButton.tsx');
        const viewToggleCss = readSource(
            'src/components/activityControls/collectionViewToggle/CollectionViewToggle.module.css'
        );
        const dropdownCss = readSource('src/components/activityControls/ControlDropdown.module.css');
        const checkboxCss = readSource('src/components/activityControls/checkboxFilter/CheckboxFilter.module.css');
        const toggleCss = readSource('src/components/toggleButton/ToggleButton.module.css');

        expect(viewToggle).toContain("{ label: 'List', value: 'list' }");
        expect(viewToggle).toContain("{ label: 'Board', value: 'board' }");
        expect(viewToggle).toContain('aria-pressed={currentView === value}');
        expect(viewToggle.match(/<button/g)).toHaveLength(1);
        expect(viewToggle).toContain('{options.map(({ label, value }) => (');
        expect(dropdown).toContain('styles.chevronOpen');
        expect(dropdown).toContain('aria-expanded={isOpen}');
        expect(checkbox).toContain("type='checkbox'");
        expect(checkbox).toContain('input.indeterminate = someSelected;');
        expect(toggle).toContain("role='switch'");
        expect(toggle).toContain('aria-checked={toggled}');
        expect(viewToggleCss).toContain('display: inline-flex;');
        expect(viewToggleCss).toContain('overflow: hidden;');
        expect(viewToggleCss).toContain('border-right: 1px solid');
        expect(viewToggleCss).toContain('.option:last-child');
        expect(dropdownCss).toContain('.chevronOpen');
        expect(dropdownCss).toContain('transform: rotate(180deg);');
        expect(dropdownCss).toContain('@media (prefers-reduced-motion: reduce)');
        expect(checkboxCss).toContain('.option input {');
        expect(checkboxCss).toContain('clip-path: inset(50%);');
        expect(checkboxCss).toContain('.option input:checked + .checkbox');
        expect(checkboxCss).toContain('.option input:focus-visible + .checkbox');
        expect(toggleCss).toContain('.switch.toggled');
        expect(toggleCss).toContain('translate3d(var(--switch-thumb-translate), -50%, 0)');
        expect(toggleCss).toContain('@media (prefers-reduced-motion: reduce)');
    });

    it('freezes all three application notes layouts', () => {
        const applicationCard = readSource('src/pages/application/ApplicationCard.module.css');
        const applicationCardComponent = readSource('src/pages/application/ApplicationCard.tsx');
        const mediumStart = applicationCard.indexOf('@media (min-width: 804px) and (max-width: 1422px)');
        const mobileStart = applicationCard.indexOf('@media (max-width: 803px)');
        const desktopRules = applicationCard.slice(0, mediumStart);
        const mediumRules = applicationCard.slice(mediumStart, mobileStart);
        const mobileRules = applicationCard.slice(mobileStart);

        expect(mediumStart).toBeGreaterThan(0);
        expect(mobileStart).toBeGreaterThan(mediumStart);
        expect(desktopRules).toContain('position: absolute;');
        expect(desktopRules).toContain('right: -330px;');
        expect(desktopRules).toContain('width: 300px;');
        expect(desktopRules).toContain('height: 89%;');
        expect(desktopRules).toContain('width: 500px;');
        expect(desktopRules).toContain('width: 190px;');
        expect(desktopRules).toMatch(/\.buttonGroup\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*1fr 1fr;/s);
        expect(desktopRules).toContain('top: 15px;');
        expect(mediumRules).toContain('flex-wrap: wrap;');
        expect(mediumRules).toContain('flex: 1 1 500px;');
        expect(mediumRules).toContain('width: auto;');
        expect(mediumRules).toContain('min-width: 0;');
        expect(mediumRules).toContain('flex: 1 0 100%;');
        expect(mediumRules).toContain('margin-top: 16px;');
        expect(mediumRules).toContain('position: static;');
        expect(mediumRules).toContain('width: 100%;');
        expect(mediumRules).toContain('height: 160px;');
        expect(mobileRules).toContain('overflow-x: auto;');
        expect(mobileRules).toContain('-webkit-overflow-scrolling: touch;');
        expect(mobileRules).toContain('padding-right: 0;');
        expect(mobileRules).toContain('gap: 8px;');
        expect(mobileRules).toContain('grid-template-columns: 1fr;');
        expect(mobileRules).toContain('width: auto;');
        expect(mobileRules).toContain('padding-right: 16px;');
        expect(mobileRules).toContain('padding-left: 24px;');
        expect(mobileRules).toContain('right: -316px;');
        expect(mobileRules).toContain('top: 0;');
        expect(mobileRules).toContain('height: 100%;');
        expect(mobileRules).toContain('border: none;');
        expect(mobileRules).toContain('border-top-left-radius: 0;');
        expect(mobileRules).toContain('border-bottom-left-radius: 0;');

        const detailsIndex = applicationCardComponent.indexOf('styles.applicationContent');
        const actionsIndex = applicationCardComponent.indexOf('styles.buttonGroup');
        const notesIndex = applicationCardComponent.indexOf('styles.notes');

        expect(detailsIndex).toBeGreaterThan(0);
        expect(actionsIndex).toBeGreaterThan(detailsIndex);
        expect(notesIndex).toBeGreaterThan(actionsIndex);
    });

    it('keeps interview notes in wide side, medium stacked, and narrow scrollable layouts', () => {
        const interviewCard = readSource('src/pages/interview/InterviewCard.module.css');
        const mediumStart = interviewCard.indexOf('@media (min-width: 804px) and (max-width: 1422px)');
        const narrowStart = interviewCard.indexOf('@media (max-width: 803px)');
        const wideRules = interviewCard.slice(0, mediumStart);
        const mediumRules = interviewCard.slice(mediumStart, narrowStart);
        const narrowRules = interviewCard.slice(narrowStart);

        expect(mediumStart).toBeGreaterThan(0);
        expect(narrowStart).toBeGreaterThan(mediumStart);
        expect(wideRules).toMatch(/\.listNotes\s*\{[^}]*position:\s*absolute;[^}]*right:\s*-330px;/s);
        expect(wideRules).toMatch(/\.listNotes\s*\{[^}]*width:\s*300px;/s);
        expect(mediumRules).toMatch(/\.interview\.notesVisible\s*\{[^}]*flex-wrap:\s*wrap;[^}]*row-gap:\s*0;/s);
        expect(mediumRules).toMatch(/\.interview\.notesVisible \.interviewContent\s*\{[^}]*flex:\s*1 1 0;/s);
        expect(mediumRules).toMatch(/\.listNotes\s*\{[^}]*position:\s*static;[^}]*flex:\s*1 0 100%;/s);
        expect(mediumRules).toMatch(/\.listNotes textarea\s*\{[^}]*width:\s*100%;[^}]*height:\s*160px;/s);
        expect(narrowRules).toMatch(/\.interview\s*\{[^}]*overflow-x:\s*auto;/s);
        expect(narrowRules).toMatch(/\.interviewContent\s*\{[^}]*min-width:\s*0;/s);
        expect(narrowRules).not.toMatch(/\.interviewContent\s*\{[^}]*min-width:\s*260px;/s);
        expect(narrowRules).toMatch(/\.listNotes\s*\{[^}]*right:\s*-316px;[^}]*top:\s*0;[^}]*height:\s*100%;/s);
        expect(narrowRules).toMatch(
            /\.listNotes textarea\s*\{[^}]*border:\s*none;[^}]*box-shadow:\s*none;[^}]*border-top-left-radius:\s*0;[^}]*border-bottom-left-radius:\s*0;/s
        );
        expect(narrowRules).toMatch(/\.board\s*\{[^}]*overflow:\s*visible;[^}]*padding-right:\s*var\(--spaceCard\);/s);
        expect(narrowRules).toMatch(/\.boardDeleteButton\s*\{[^}]*margin-right:\s*0;/s);
        expect(wideRules).not.toContain('.listNotes textarea:focus-visible');

        const boardActionLinkRules = interviewCard.match(/\.boardActionLink\s*\{([^}]*)\}/)?.[1] ?? '';
        expect(boardActionLinkRules).not.toContain('margin-top');
        expect(boardActionLinkRules).not.toContain('margin-bottom');

        const interviewBoardNotesRules = interviewCard.match(/\.boardNotesField textarea\s*\{([^}]*)\}/)?.[1] ?? '';
        expect(interviewBoardNotesRules).toContain('outline: none;');
        expect(interviewCard).not.toContain('.boardNotesField textarea:focus');
    });

    it('keeps application and interview Board notes free of focus highlighting', () => {
        const applicationBoard = readSource('src/pages/application/applicationBoard/ApplicationBoard.module.css');
        const applicationBoardNotesRules = applicationBoard.match(/\.notesField textarea\s*\{([^}]*)\}/)?.[1] ?? '';

        expect(applicationBoardNotesRules).toContain('outline: none;');
        expect(applicationBoard).not.toContain('.notesField textarea:focus');
    });

    it('freezes the other responsive layout boundaries', () => {
        const activityControls = readSource('src/components/activityControls/ActivityControls.module.css');
        const applicationsLineChart = readSource(
            'src/pages/dashboard/charts/applicationsTrend/ApplicationsLineChart.module.css'
        );
        const navbar = readSource('src/components/navbar/Navbar.module.css');
        const dashboard = readSource('src/pages/dashboard/Dashboard.module.css');
        const upcomingInterviews = readSource('src/pages/dashboard/overview/upcomingInterviews/UpcomingInterviews.tsx');
        const upcomingInterviewsCss = readSource(
            'src/pages/dashboard/overview/upcomingInterviews/UpcomingInterviews.module.css'
        );
        const formPage = readSource('src/components/formPage/FormPage.module.css');
        const authProductIntro = readSource('src/components/authProductIntro/AuthProductIntro.module.css');
        const offerDecisionWorkspace = readSource('src/pages/offerDecision/OfferDecisionWorkspace.module.css');

        [
            '@media (max-width: 803px)',
            '@media (max-width: 600px)',
            '@media (max-width: 350px)',
            '@media (max-width: 290px)',
            '@container (max-width: 610px)',
            '@container (max-width: 500px)',
            '@container (max-width: 435px)',
            '@container (max-width: 425px)',
            '@container (max-width: 350px)',
            '@container (max-width: 285px)',
            'grid-row: 1;',
            'grid-row: 2;',
            'grid-column: 1 / 3;',
        ].forEach((declaration) => expect(activityControls).toContain(declaration));

        expect(activityControls).toMatch(
            /\.collectionResponsive\s*\{[^}]*grid-template-columns:\s*repeat\(2, max-content\);[^}]*justify-content:\s*center;[^}]*justify-items:\s*center;/s
        );
        expect(activityControls).toMatch(
            /\.collectionResponsive\.hasActions \.actions\s*\{[^}]*grid-row:\s*1;[^}]*grid-column:\s*2;/s
        );
        expect(activityControls).toMatch(
            /\.collectionResponsive \.secondaryControls\s*\{[^}]*grid-row:\s*2;[^}]*grid-column:\s*1 \/ -1;[^}]*justify-self:\s*center;/s
        );
        expect(offerDecisionWorkspace).toMatch(
            /@media \(max-width:\s*768px\)[\s\S]*?\.controlsRow\s*\{[^}]*width:\s*100%;[^}]*container-type:\s*inline-size;/s
        );

        ['@media (max-width: 1150px)', '@media (max-width: 600px)', '@media (max-width: 430px)'].forEach(
            (declaration) => expect(navbar).toContain(declaration)
        );
        [
            '@media (max-width: 900px)',
            '@media (max-width: 768px)',
            'grid-column: span 8;',
            'grid-column: span 4;',
        ].forEach((declaration) => expect(dashboard).toContain(declaration));
        expect(upcomingInterviews).toContain('className={styles.upcomingCard}');
        expect(upcomingInterviewsCss).toMatch(/\.upcomingCard\s*\{[^}]*height:\s*auto;/s);
        expect(dashboard).toMatch(/\.interviewsSection\s*\{[^}]*display:\s*grid;/s);
        expect(formPage).toContain('@media (max-width: 1150px) and (orientation: portrait), (max-width: 600px)');
        expect(formPage).toContain('    .fieldError {\n        font-size: var(--fontSizeCompactControl);\n    }');
        expect(formPage).toMatch(/\.formPage input,[\s\S]*?font-size:\s*var\(--fontSizeBody\);/s);
        expect(formPage).toContain('flex-wrap: nowrap;');
        expect(formPage).toContain('flex: 1 1 0;');
        expect(applicationsLineChart).toMatch(/\.summary span\s*\{[^}]*overflow-wrap:\s*anywhere;/s);
        expect(applicationsLineChart).toMatch(
            /@media \(max-width: 768px\)[\s\S]*?\.chartArea\s*\{[^}]*min-height:\s*280px;[^}]*flex:\s*0 0 280px;/s
        );
        expect(applicationsLineChart).toMatch(
            /@media \(max-width: 768px\)[\s\S]*?\.total\s*\{[^}]*margin:\s*16px 0 10px;/s
        );
        [
            'width: min(100%, 1240px);',
            '@media (max-width: 1100px)',
            '@media (max-width: 900px)',
            '@media (max-width: 600px)',
        ].forEach((declaration) => expect(authProductIntro).toContain(declaration));
    });

    it('keeps carousel dots and their focus indicator visible', () => {
        const authProductIntro = readSource('src/components/authProductIntro/AuthProductIntro.module.css');
        const inactiveDotStart = authProductIntro.indexOf('.carouselDot {');
        const activeDotStart = authProductIntro.indexOf('.activeCarouselDot {');
        const activeDotEnd = authProductIntro.indexOf('@media (max-width: 1100px) {', activeDotStart);
        const inactiveDotRules = authProductIntro.slice(inactiveDotStart, activeDotStart);
        const activeDotRules = authProductIntro.slice(activeDotStart, activeDotEnd);

        expect(inactiveDotStart).toBeGreaterThan(0);
        expect(activeDotStart).toBeGreaterThan(inactiveDotStart);
        expect(activeDotEnd).toBeGreaterThan(activeDotStart);
        expect(inactiveDotRules).toContain('width: 9px;');
        expect(inactiveDotRules).toContain('height: 9px;');
        expect(inactiveDotRules).toContain('background-color: var(--colorTextSecondary);');
        expect(inactiveDotRules).not.toContain('opacity: 0.45;');
        expect(activeDotRules).not.toMatch(/\bwidth:/);
        expect(activeDotRules).not.toMatch(/\bheight:/);
        expect(activeDotRules).toContain('background-color: var(--colorPrimary);');
        expect(activeDotRules).toContain('opacity: 1;');
        expect(authProductIntro).toContain('.carouselDot:focus-visible {\n    outline-offset: 2px;\n}');
    });

    it('keeps the four product tabs compact while previews crossfade without a wide image track', () => {
        const authProductIntro = readSource('src/components/authProductIntro/AuthProductIntro.module.css');
        const productPreviewCarousel = readSource('src/components/authProductIntro/ProductPreviewCarousel.tsx');
        const previewMotionRules = authProductIntro.slice(
            authProductIntro.indexOf('.previewLayer'),
            authProductIntro.indexOf('.fullPageAffordance')
        );
        const mobilePreviewRules = authProductIntro.slice(
            authProductIntro.indexOf('@media (max-width: 600px)'),
            authProductIntro.indexOf('@media (prefers-reduced-motion: reduce)')
        );

        expect(authProductIntro).toMatch(
            /\.previewLayer\s*\{[^}]*object-fit:\s*cover;[^}]*object-position:\s*top;[^}]*opacity:\s*1;[^}]*transform:\s*translateX\(0\);/s
        );
        expect(authProductIntro).toMatch(
            /\.featureTabs\s*\{[^}]*grid-template-columns:\s*repeat\(4, minmax\(0, 1fr\)\);/s
        );
        expect(authProductIntro).toMatch(/\.featureTab\[aria-selected='true'\]\s*\{/s);
        expect(authProductIntro).toMatch(/\.previewLayerOutgoing\s*\{[^}]*opacity:\s*0;[^}]*translateX\(-10px\);/s);
        expect(authProductIntro).toMatch(
            /\.previewLayerIncomingInitial\s*\{[^}]*opacity:\s*0;[^}]*translateX\(10px\);/s
        );
        expect(authProductIntro).toMatch(
            /\.fullscreenViewer\s*\{[^}]*display:\s*grid;[^}]*grid-template-rows:\s*auto minmax\(0, 1fr\) auto;/s
        );
        expect(authProductIntro).toMatch(
            /\.fullscreenImageViewport\s*\{[^}]*min-width:\s*0;[^}]*min-height:\s*0;[^}]*overflow:\s*auto;/s
        );
        expect(authProductIntro).toMatch(/\.fullscreenTrackSnapshot\s*\{[^}]*width:\s*100%;[^}]*height:\s*auto;/s);
        expect(mobilePreviewRules).not.toContain('.fullscreenImageViewport');
        expect(mobilePreviewRules).not.toContain('.fullscreenTrackSnapshot');
        expect(authProductIntro).toMatch(/\.fullscreenToolbar\s*\{[^}]*flex-wrap:\s*wrap;/s);
        expect(productPreviewCarousel).toContain('const PREVIEW_TRANSITION_FALLBACK_MS = 380;');
        expect(authProductIntro).toMatch(
            /@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.previewLayer,\s*\.fullscreenTrackPanel\s*\{[^}]*opacity:\s*1;[^}]*transform:\s*none;[^}]*transition:\s*none;/s
        );
        expect(previewMotionRules).toContain('opacity');
        expect(previewMotionRules).not.toContain('rotate');
        expect(authProductIntro).not.toContain('@keyframes previewTrack');
        expect(authProductIntro).not.toContain('width: 200%');
        expect(authProductIntro).not.toContain('linear-gradient');
        expect(productPreviewCarousel).toContain("role='tablist'");
        expect(productPreviewCarousel).toContain("role='tab'");
        expect(productPreviewCarousel).toContain("role='tabpanel'");
        expect(productPreviewCarousel).toContain('void loadPreviewImage(nextImage).then(() => {');
        expect(productPreviewCarousel).toContain(
            'void loadPreviewImage(getPreviewImage(productPreviews[nextIndex], displayedTheme));'
        );
        expect(productPreviewCarousel.match(/label: '/g)).toHaveLength(4);
        expect(productPreviewCarousel).not.toContain('.png');
    });

    it('keeps offer filter config and demo status badge ownership with their runtime features', () => {
        const offerModels = readSource('src/pages/offerDecision/models.ts');
        const offerConfig = readSource('src/pages/offerDecision/offerDecisionConfig.ts');
        const demoApplicationCard = readSource('src/pages/demo/application/DemoApplicationCard.tsx');

        expect(offerModels).not.toContain('export const OFFER_DECISION_FILTER_CONFIG');
        expect(offerConfig).toContain('export const OFFER_DECISION_FILTER_CONFIG');
        expect(offerConfig).toContain('satisfies Record<OfferDecisionFilter, OfferDecisionFilterConfig>');
        expect(demoApplicationCard).toContain('<ApplicationStatusBadge');
        expect(demoApplicationCard).not.toContain('const JOB_STATUS_CLASS_MAP');
    });

    it('keeps application actions single-line and every scrollbar color native', () => {
        const applicationCard = readSource('src/pages/application/ApplicationCard.module.css');
        const demoApplicationCard = readSource('src/pages/demo/application/DemoApplicationCard.module.css');
        const interviewCard = readSource('src/pages/interview/InterviewCard.module.css');
        const calendarOptions = readSource('src/pages/interview/calendarOptions/CalendarOptions.module.css');
        const applicationBoard = readSource('src/pages/application/applicationBoard/ApplicationBoard.module.css');
        const applicationBoardCard = readSource(
            'src/pages/application/jobApplication/applicationBoard/ApplicationBoardCard.tsx'
        );
        const boardCardActions = readSource('src/components/boardCardActions/BoardCardActions.module.css');
        const boardCardActionsComponent = readSource('src/components/boardCardActions/BoardCardActions.tsx');
        const followUpSentBadgeComponent = readSource('src/components/followUpSentBadge/FollowUpSentBadge.tsx');
        const followUpSentBadge = readSource('src/components/followUpSentBadge/FollowUpSentBadge.module.css');
        const tooltip = readSource('src/components/tooltip/Tooltip.tsx');
        const tooltipStyles = readSource('src/components/tooltip/Tooltip.module.css');
        const allCss = collectCssFiles(sourceRoot)
            .map((path) => readFileSync(path, 'utf8'))
            .join('\n');

        ['Applied', 'Interview', 'Offer', 'Accepted', 'Rejected', 'Withdrawn', 'Ghosted', 'Declined'].forEach(
            (status) => expect(`${applicationCard}\n${applicationBoard}`).toContain(`var(--colorStatus${status}Text)`)
        );
        expect(applicationCard).toMatch(/\.application\s*\{[^}]*gap:\s*0;/s);
        expect(applicationCard).toMatch(/\.application\s*\{[^}]*overflow-anchor:\s*none;/s);
        expect(interviewCard).toMatch(/\.interview\s*\{[^}]*overflow-anchor:\s*none;/s);
        expect(applicationCard).toMatch(/\.applicationContent\s*\{[^}]*padding-right:\s*60px;/s);
        expect(applicationCard).toContain('border-radius: var(--radiusPill);');
        expect(applicationCard).toMatch(/\.navigationLink\s*\{[^}]*border-radius:\s*var\(--radiusMenuItem\);/s);
        expect(applicationCard).toMatch(/\.applicationContent select\s*\{[^}]*border-radius:\s*var\(--radiusPill\);/s);
        expect(applicationCard).toMatch(/\.badgeGroup\s*\{[^}]*gap:\s*var\(--spaceCompact\);/s);
        expect(applicationCard).toMatch(/\.buttonGroup button\s*\{[^}]*white-space: nowrap;/s);
        expect(interviewCard).toMatch(/\.buttonGroup\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*1fr 1fr;/s);
        expect(interviewCard).toMatch(/\.buttonGroup\s*\{[^}]*flex-shrink:\s*0;/s);
        expect(interviewCard).toMatch(
            /\.navigationLink,\s*\.boardActionLink\s*\{[^}]*border-radius:\s*var\(--radiusMenuItem\);/s
        );
        expect(interviewCard).toMatch(
            /\.board \.interviewContent \.headingRow\s*\{[^}]*align-items:\s*center;[^}]*\}/s
        );
        expect(applicationCard).toMatch(/\.location\s*\{[^}]*color:\s*var\(--colorLocationText\);/s);
        expect(interviewCard).toMatch(/\.location\s*\{[^}]*color:\s*var\(--colorLocationText\);/s);
        expect(interviewCard).toMatch(/\.type\s*\{[^}]*color:\s*var\(--colorInterviewType\);/s);
        expect(demoApplicationCard).toMatch(
            /\.location\s*\{[^}]*composes:\s*location from '\.\.\/\.\.\/application\/ApplicationCard\.module\.css';/s
        );
        expect(`${applicationCard}\n${interviewCard}`).not.toMatch(/#(?:005f56|5eead4|6d28d9|c4b5fd)/i);
        expect(interviewCard).toContain('@media (min-width: 804px)');
        expect(interviewCard).toMatch(/\.buttonGroup\s*>\s*:only-child\s*\{[^}]*grid-column:\s*2;/s);
        expect(interviewCard).toMatch(/@media \(max-width: 803px\)\s*\{\s*\.interview\s*\{[^}]*padding-right:\s*0;/s);
        expect(calendarOptions).toMatch(/\.trigger\s*\{[^}]*width:\s*100%;/s);
        expect(applicationBoard).toContain('border-radius: var(--radiusPill);');
        expect(applicationBoard).toMatch(/\.navigationLink\s*\{[^}]*border-radius:\s*var\(--radiusMenuItem\);/s);
        expect(applicationBoard).toMatch(/\.boardFollowUp\s*\{[^}]*font-size:\s*0\.6875rem;/s);
        expect(applicationBoardCard).toContain('className={styles.boardFollowUp}');
        expect(applicationBoardCard).toContain('<BoardCardActions');
        expect(applicationBoardCard).toContain('compactSizing');
        expect(boardCardActionsComponent).toContain('compactSizing?: boolean;');
        expect(boardCardActions).toMatch(
            /\.compactSizing summary\s*\{[^}]*min-height:\s*28px;[^}]*font-size:\s*var\(--fontSizeCompactControl\);/s
        );
        expect(boardCardActions).toMatch(
            /\.compactSizing \.actionButtons button\s*\{[^}]*min-height:\s*28px;[^}]*padding:\s*6px 8px;[^}]*border-radius:\s*var\(--radiusMenuItem\);[^}]*font-size:\s*var\(--fontSizeMetadata\);/s
        );
        expect(followUpSentBadge).toMatch(/\.badge\s*\{[^}]*border:\s*0;[^}]*border-radius:\s*var\(--radiusPill\);/s);
        expect(followUpSentBadge).toMatch(/\.badge\s*\{[^}]*margin-top:\s*var\(--spaceCompact\);/s);
        expect(followUpSentBadge).toMatch(
            /\.compact\s*\{[^}]*padding:\s*3px 9px;[^}]*border-radius:\s*var\(--radiusPill\);[^}]*background:/s
        );
        expect(followUpSentBadge).toMatch(/\.mobileLabel\s*\{[^}]*display:\s*none;/s);
        expect(followUpSentBadge).toMatch(
            /\.copy,\s*\.compactLabel,\s*\.mobileLabel\s*\{[^}]*color:\s*var\(--colorToastSuccessText\);[^}]*font-weight:\s*var\(--fontWeightEmphasis\);/s
        );
        expect(followUpSentBadge).not.toContain('.mobileTime');
        expect(followUpSentBadge).not.toContain('::after');
        expect(followUpSentBadge).toMatch(
            /@media \(max-width:\s*803px\)[\s\S]*?\.badge\s*\{[^}]*display:\s*flex;[^}]*flex-wrap:\s*nowrap;[^}]*font-size:\s*var\(--fontSizeMicro\);[^}]*font-weight:\s*var\(--fontWeightEmphasis\);[^}]*\}[\s\S]*?\.copy\s*\{[^}]*display:\s*none;/s
        );
        expect(followUpSentBadgeComponent).toContain("from '../tooltip/Tooltip'");
        expect(followUpSentBadgeComponent).toContain('<Tooltip mobileOnly');
        expect(followUpSentBadgeComponent).toContain("<Tooltip placement='top' title='Undo'>");
        expect(tooltip).toContain('arrow');
        expect(tooltip).toContain("name: 'flip'");
        expect(tooltip).toContain("name: 'preventOverflow'");
        expect(tooltipStyles).toMatch(/\.popper\s*\{[^}]*z-index:\s*1600 !important;/s);
        expect(tooltipStyles).toContain('background-color: var(--colorTooltipBg) !important;');
        expect(tooltipStyles).toContain('color: var(--colorTooltipText) !important;');
        expect(tooltipStyles).toContain('@media (min-width: 804px)');
        expect(existsSync(resolve(sourceRoot, 'components/tooltip/JobTrackerTooltip.tsx'))).toBe(false);
        expect(existsSync(resolve(sourceRoot, 'helper/companyNameSorting.ts'))).toBe(false);
        [
            'scrollbar-color',
            '::-webkit-scrollbar-track',
            '::-webkit-scrollbar-thumb',
            '--colorScrollbarTrack',
            '--colorScrollbarThumb',
        ].forEach((customScrollbarColor) => expect(allCss).not.toContain(customScrollbarColor));
    });

    it('uses one calm badge rhythm across application and interview cards', () => {
        const applicationCard = readSource('src/pages/application/ApplicationCard.module.css');
        const applicationBoard = readSource('src/pages/application/applicationBoard/ApplicationBoard.module.css');
        const interviewCard = readSource('src/pages/interview/InterviewCard.module.css');
        const followUpSentBadge = readSource('src/components/followUpSentBadge/FollowUpSentBadge.module.css');

        expect(applicationCard).toMatch(
            /\.upcomingBadge\s*\{[^}]*min-height:\s*var\(--heightCompactPill\);[^}]*padding:\s*0 10px;[^}]*font-weight:\s*var\(--fontWeightEmphasis\);[^}]*font-size:\s*var\(--fontSizeCompactControl\);[^}]*align-items:\s*center;[^}]*gap:\s*7px;[^}]*letter-spacing:\s*0;[^}]*background-color:\s*var\(--colorUpcomingBadgeBg\);[^}]*box-sizing:\s*border-box;/s
        );
        expect(applicationCard).toMatch(
            /\.applicationContent select\s*\{[^}]*height:\s*var\(--heightCompactPill\);[^}]*padding:\s*0 9px;[^}]*font-weight:\s*var\(--fontWeightEmphasis\);[^}]*font-size:\s*var\(--fontSizeCompactControl\);[^}]*letter-spacing:\s*0;[^}]*line-height:\s*1\.2;[^}]*border:\s*1px solid var\(--colorControlBorder\);[^}]*margin:\s*0;[^}]*box-sizing:\s*border-box;/s
        );
        expect(applicationCard).toMatch(
            /\.applicationContent select:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--colorFilterSelectText\);[^}]*outline-offset:\s*2px;/s
        );
        expect(applicationCard).not.toMatch(
            /\.applicationContent select:focus-visible\s*\{[^}]*var\(--colorPrimaryFocusOutline\)/s
        );
        expect(applicationCard).toMatch(
            /\.applied,\s*\.interview,\s*\.offer,\s*\.accepted,\s*\.rejected,\s*\.ghosted,\s*\.declined,\s*\.withdrawn\s*\{[^}]*min-height:\s*var\(--heightCompactPill\);[^}]*padding:\s*0 10px;[^}]*font-weight:\s*var\(--fontWeightEmphasis\);[^}]*font-size:\s*var\(--fontSizeCompactControl\);[^}]*align-items:\s*center;[^}]*gap:\s*7px;[^}]*letter-spacing:\s*0;[^}]*line-height:\s*1\.2;[^}]*box-sizing:\s*border-box;/s
        );
        expect(applicationCard).toMatch(
            /\.applied::before,[\s\S]*?\.upcomingBadge::before\s*\{[^}]*width:\s*6px;[^}]*height:\s*6px;[^}]*background-color:\s*var\(--statusBadgeAccent\);[^}]*content:\s*'';/s
        );

        const statusNames = [
            'Applied',
            'Interview',
            'Offer',
            'Accepted',
            'Rejected',
            'Ghosted',
            'Declined',
            'Withdrawn',
        ];
        statusNames.forEach((status) => {
            expect(applicationCard).toContain(`--statusBadgeAccent: var(--colorStatus${status});`);
            expect(applicationCard).toContain(`background-color: var(--colorStatus${status}BadgeBg);`);
            expect(applicationBoard).toContain(`--badgeAccent: var(--colorStatus${status});`);
            expect(applicationBoard).toContain(`background-color: var(--colorStatus${status}BadgeBg);`);
        });

        expect(applicationBoard).toMatch(
            /\.statusBadge,\s*\.upcomingBadge\s*\{[^}]*min-height:\s*var\(--heightCompactPill\);[^}]*padding:\s*0 9px;[^}]*align-items:\s*center;[^}]*gap:\s*5px;[^}]*font-size:\s*0\.6875rem;[^}]*font-weight:\s*var\(--fontWeightEmphasis\);[^}]*letter-spacing:\s*0;[^}]*line-height:\s*1\.2;[^}]*box-sizing:\s*border-box;/s
        );
        expect(applicationBoard).toMatch(
            /\.upcomingBadge\s*\{[^}]*--badgeAccent:\s*var\(--colorUpcomingBadge\);[^}]*background-color:\s*var\(--colorUpcomingBadgeBg\);/s
        );
        expect(applicationBoard).toMatch(
            /\.statusBadge::before,\s*\.upcomingBadge::before\s*\{[^}]*width:\s*5px;[^}]*height:\s*5px;[^}]*background-color:\s*var\(--badgeAccent\);/s
        );
        expect(interviewCard).toMatch(
            /\.interviewContent \.timingBadge\s*\{[^}]*min-height:\s*var\(--heightCompactPill\);[^}]*padding:\s*0 10px;[^}]*align-items:\s*center;[^}]*gap:\s*7px;[^}]*font-size:\s*var\(--fontSizeCompactControl\);[^}]*font-weight:\s*var\(--fontWeightEmphasis\);[^}]*letter-spacing:\s*0;[^}]*line-height:\s*1\.2;[^}]*box-sizing:\s*border-box;/s
        );
        expect(interviewCard).toMatch(
            /\.timeLeft\s*\{[^}]*--statusBadgeAccent:\s*var\(--colorTimeLeft\);[^}]*background-color:\s*var\(--colorStatusRejectedBadgeBg\);[^}]*color:\s*var\(--colorStatusRejectedText\);/s
        );
        expect(followUpSentBadge).toMatch(
            /\.badge\s*\{[^}]*min-height:\s*var\(--heightCompactPill\);[^}]*padding:\s*3px var\(--spaceCompact\);[^}]*box-sizing:\s*border-box;[^}]*font-size:\s*var\(--fontSizeCompactControl\);[^}]*font-weight:\s*var\(--fontWeightEmphasis\);[^}]*line-height:\s*1\.2;/s
        );
        expect(followUpSentBadge).toMatch(
            /\.compact\s*\{[^}]*min-height:\s*var\(--heightCompactPill\);[^}]*padding:\s*3px 9px;[^}]*font-size:\s*0\.6875rem;[^}]*font-weight:\s*var\(--fontWeightEmphasis\);/s
        );

        expect(applicationCard).toMatch(
            /@media \(max-width: 803px\)[\s\S]*?\.withdrawn,[\s\S]*?\.upcomingBadge\s*\{[^}]*font-size:\s*var\(--fontSizeMicro\);/s
        );
        expect(applicationCard).toMatch(
            /@media \(max-width: 803px\)[\s\S]*?\.navigationLink\s*\{[^}]*font-size:\s*var\(--fontSizeMicro\);/s
        );
        expect(interviewCard).toMatch(
            /@media \(max-width: 803px\)[\s\S]*?\.timingBadge,[\s\S]*?\.navigationLink,[\s\S]*?\.boardActionLink\s*\{[^}]*font-size:\s*var\(--fontSizeMicro\);/s
        );
    });

    it('uses tinted navigation controls that remain distinct from passive badges and command buttons', () => {
        const applicationCard = readSource('src/pages/application/ApplicationCard.module.css');
        const applicationCardComponent = readSource('src/pages/application/ApplicationCard.tsx');
        const demoApplicationCard = readSource('src/pages/demo/application/DemoApplicationCard.tsx');
        const applicationBoard = readSource('src/pages/application/applicationBoard/ApplicationBoard.module.css');
        const applicationBoardCard = readSource(
            'src/pages/application/jobApplication/applicationBoard/ApplicationBoardCard.tsx'
        );
        const archivedApplicationBoardCard = readSource(
            'src/pages/application/archivedApplication/archivedApplicationBoard/ArchivedApplicationBoardCard.tsx'
        );
        const interviewCard = readSource('src/pages/interview/InterviewCard.module.css');
        const interviewCardComponent = readSource('src/pages/interview/InterviewCard.tsx');
        const iconComponent = readSource('src/components/icon/Icon.tsx');
        const iconModels = readSource('src/components/icon/models.ts');

        expect(applicationCard).toMatch(
            /\.navigationLink\s*\{[^}]*min-height:\s*var\(--heightCompactNavigationControl\);[^}]*padding:\s*0 9px;[^}]*align-items:\s*center;[^}]*gap:\s*6px;[^}]*border:\s*0;[^}]*border-radius:\s*var\(--radiusMenuItem\);[^}]*background-color:\s*var\(--colorLinkBg\);[^}]*color:\s*var\(--colorLinkText\);[^}]*display:\s*flex;[^}]*font-weight:\s*var\(--fontWeightEmphasis\);[^}]*text-decoration:\s*none;/s
        );
        expect(applicationCard).toMatch(
            /\.navigationLink:hover\s*\{[^}]*background-color:\s*var\(--colorLinkHoverBg\);/s
        );
        expect(applicationCard).toMatch(/\.navigationLink:active\s*\{[^}]*transform:\s*scale\(0\.98\);/s);
        expect(applicationCard).toMatch(
            /\.navigationLink:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--colorPrimaryFocusOutline\);/s
        );
        expect(applicationCard).not.toMatch(/\.navigationLink\s*\{[^}]*var\(--radiusPill\)/s);
        expect(applicationCard).not.toMatch(/\.navigationLink\s*\{[^}]*var\(--heightCompactPill\)/s);
        expect(applicationCard).not.toMatch(/\.navigationLink\s*\{[^}]*background:\s*transparent/s);

        expect(applicationBoard).toMatch(
            /\.navigationLink\s*\{[^}]*min-height:\s*var\(--heightCompactNavigationControl\);[^}]*padding:\s*0 9px;[^}]*gap:\s*6px;[^}]*border:\s*0;[^}]*border-radius:\s*var\(--radiusMenuItem\);[^}]*background-color:\s*var\(--colorLinkBg\);[^}]*display:\s*inline-flex;/s
        );
        expect(applicationBoard).toMatch(
            /\.navigationLink:hover\s*\{[^}]*background-color:\s*var\(--colorLinkHoverBg\);/s
        );
        expect(applicationBoard).toMatch(/\.navigationLink:active\s*\{[^}]*transform:\s*scale\(0\.98\);/s);
        expect(interviewCard).toMatch(
            /\.navigationLink,\s*\.boardActionLink\s*\{[^}]*min-height:\s*var\(--heightCompactNavigationControl\);[^}]*padding:\s*0 9px;[^}]*align-items:\s*center;[^}]*gap:\s*6px;[^}]*border:\s*0;[^}]*border-radius:\s*var\(--radiusMenuItem\);[^}]*background-color:\s*var\(--colorLinkBg\);[^}]*color:\s*var\(--colorLinkText\);/s
        );
        expect(interviewCard).toMatch(
            /\.navigationLink:hover,\s*\.boardActionLink:hover\s*\{[^}]*background-color:\s*var\(--colorLinkHoverBg\);/s
        );
        expect(interviewCard).toMatch(
            /\.navigationLink:active,\s*\.boardActionLink:active\s*\{[^}]*transform:\s*scale\(0\.98\);/s
        );
        expect(interviewCard).not.toMatch(/\.navigationLink,\s*\.boardActionLink\s*\{[^}]*var\(--radiusPill\)/s);
        expect(interviewCard).not.toMatch(/\.navigationLink,\s*\.boardActionLink\s*\{[^}]*var\(--heightCompactPill\)/s);
        expect(interviewCard).not.toMatch(/\.navigationLink,\s*\.boardActionLink\s*\{[^}]*background:\s*transparent/s);

        [applicationCardComponent, demoApplicationCard].forEach((component) => {
            expect(component).toContain('className={styles.navigationLink}');
            expect(component).toContain('className={`${styles.navigationLink} ${styles.externalLink}`}');
            expect(component).not.toContain('styles.linkLabel');
            expect(component).toContain("name='chevronRight'");
            expect(component).toContain("name='externalLink'");
        });
        [applicationBoardCard, archivedApplicationBoardCard].forEach((component) => {
            expect(component).toContain('className={`${styles.navigationLink} ${styles.externalLink}`}');
            expect(component).toContain("name='externalLink'");
        });
        expect(interviewCardComponent).toContain('className={styles.navigationLink}');
        expect(interviewCardComponent).toContain('className={`${styles.navigationLink} ${styles.externalLink}`}');
        expect(interviewCardComponent).toContain('className={`${styles.boardActionLink} ${styles.externalLink}`}');
        expect(interviewCardComponent).not.toContain('styles.linkLabel');
        expect(interviewCardComponent).toContain("name='chevronRight'");
        expect(interviewCardComponent).toContain("name='externalLink'");
        expect(iconComponent).toContain('MdChevronRight');
        expect(iconComponent).toContain('MdOpenInNew');
        expect(iconModels).toContain("| 'chevronRight'");
        expect(iconModels).toContain("| 'externalLink'");
        expect(iconModels).not.toContain('(typeof ICON_NAMES)[number]');

        expect(applicationCardComponent).toContain("variant='secondary'");
        expect(applicationCardComponent).toContain("variant='destructive'");
        expect(interviewCardComponent).toContain("variant='destructive'");
        [applicationCard, applicationBoard, interviewCard].forEach((stylesheet) => {
            expect(stylesheet).not.toContain('.linkLabel');
            expect(stylesheet).not.toContain('text-decoration: underline;');
        });
    });

    it('preserves the original stacked layout for card action links without changing the badge gap', () => {
        const applicationCard = readSource('src/pages/application/ApplicationCard.module.css');
        const applicationCardComponent = readSource('src/pages/application/ApplicationCard.tsx');
        const demoApplicationCard = readSource('src/pages/demo/application/DemoApplicationCard.tsx');
        const interviewCard = readSource('src/pages/interview/InterviewCard.module.css');
        const interviewCardComponent = readSource('src/pages/interview/InterviewCard.tsx');

        expect(applicationCard).toMatch(
            /\.badgeGroup\s*\{[^}]*display:\s*flex;[^}]*flex-direction:\s*column;[^}]*align-items:\s*flex-start;[^}]*gap:\s*var\(--spaceCompact\);/s
        );
        expect(applicationCard).toMatch(
            /\.statusEditRow\s*\{[^}]*display:\s*flex;[^}]*flex-wrap:\s*wrap;[^}]*align-items:\s*center;[^}]*gap:\s*var\(--spaceCompact\);/s
        );
        expect(applicationCard).toMatch(/\.badgeGroup\s+\.stackedBadge\s*\{[^}]*margin-top:\s*0;/s);
        [applicationCardComponent, demoApplicationCard].forEach((component) => {
            expect(component).toContain('<div className={styles.statusEditRow}>');
            expect(component).toContain('className={styles.stackedBadge}');
        });
        expect(interviewCard).toMatch(
            /\.badgeGroup\s*\{[^}]*display:\s*flex;[^}]*flex-direction:\s*column;[^}]*align-items:\s*flex-start;[^}]*gap:\s*var\(--spaceCompact\);/s
        );
        expect(interviewCard).toMatch(/\.badgeGroup\s+\.stackedBadge\s*\{[^}]*margin-top:\s*0;/s);
        expect(interviewCardComponent).toContain('<div className={styles.badgeGroup}>');
        expect(interviewCardComponent).toContain('className={styles.stackedBadge}');
        expect(applicationCard).toMatch(/\.navigationLink\s*\{[^}]*display:\s*flex;[^}]*max-width:\s*fit-content;/s);
        expect(applicationCard).not.toMatch(/\.navigationLink\s*\{[^}]*display:\s*inline-flex/s);
        expect(interviewCard).toMatch(/\.navigationLink\s*\{[^}]*display:\s*flex;[^}]*max-width:\s*fit-content;/s);
        expect(interviewCard).not.toMatch(/\.navigationLink\s*\{[^}]*display:\s*inline-flex/s);
    });

    it('keeps the approved linear-gradient inventory bounded', () => {
        expect(countsByFile(/linear-gradient\(/g)).toEqual(expectedLinearGradientCounts);
    });

    it('does not expand the existing radial or conic gradient inventory', () => {
        expect(countsByFile(/radial-gradient\(/g)).toEqual(expectedRadialGradientCounts);
        expect(countsByFile(/conic-gradient\(/g)).toEqual(expectedConicGradientCounts);

        const globalCss = readSource('src/index.css');
        expect(
            countMatches(
                globalCss,
                /--colorPublicPageBg:\s*radial-gradient\(circle at top left, var\(--colorStatIconBg\), transparent 45%\),\s*var\(--colorPageBg\);/g
            )
        ).toBe(2);
    });

    it('preserves every approved gradient declaration and stop', () => {
        expect(declarationsByFile(/^\s*[-\w]+:\s*[^;]*gradient\([^;]+;/gm)).toEqual(expectedGradientDeclarations);
    });

    it('uses the shared public-page tint with a border-led product preview', () => {
        const authLayout = readSource('src/components/authLayout/AuthLayout.module.css');
        const authIntro = readSource('src/components/authProductIntro/AuthProductIntro.module.css');

        expect(authLayout).toMatch(/\.authPage\s*\{[^}]*background:\s*var\(--colorPublicPageBg\);/s);
        expect(authIntro).toMatch(/\.authPanel\s*\{[^}]*background:\s*var\(--colorPublicPageBg\);/s);
        expect(authIntro).toMatch(/\.productBrand\s*\{[^}]*color:\s*var\(--colorText\);/s);
        expect(authIntro).toMatch(/\.heroRow h1\s*\{[^}]*color:\s*var\(--colorText\);/s);
        expect(authIntro).not.toContain('box-shadow: 0 18px 45px var(--colorAuthCardShadow);');
    });

    it('uses a balanced product story and preview with a centred full-page account stage', () => {
        const authLayout = readSource('src/components/authLayout/AuthLayout.module.css');
        const authIntro = readSource('src/components/authProductIntro/AuthProductIntro.module.css');

        expect(authLayout).toMatch(/\.authPage\s*\{[^}]*background:\s*var\(--colorPublicPageBg\);/s);
        expect(authLayout).toMatch(/\.authPage\s*\{[^}]*padding:\s*16px 28px 48px;/s);
        expect(authIntro).toMatch(/\.authContainer\s*\{[^}]*width:\s*min\(100%, 1240px\);/s);
        expect(authIntro).toMatch(
            /\.authContainer\s*\{[^}]*--auth-motion-duration:\s*560ms;[^}]*--auth-return-duration:\s*680ms;[^}]*--auth-motion-easing:\s*cubic-bezier\(0\.32, 0\.72, 0, 1\);/s
        );
        expect(authIntro).toMatch(
            /\.productPanel\s*\{[^}]*grid-template-columns:\s*minmax\(280px, 0\.72fr\) minmax\(0, 1\.28fr\);[^}]*grid-template-areas:\s*'header header'\s*'story preview';/s
        );
        expect(authIntro).toMatch(/\.productHeader\s*\{[^}]*grid-area:\s*header;[^}]*border-bottom:/s);
        expect(authIntro).toMatch(/\.heroRow\s*\{[^}]*grid-area:\s*story;/s);
        expect(authIntro).toMatch(/\.carouselRegion\s*\{[^}]*grid-area:\s*preview;/s);
        expect(authIntro).toMatch(/\.productDetails\s*\{[^}]*gap:\s*24px;/s);
        expect(authIntro).toMatch(/\.productActions\s*\{[^}]*gap:\s*24px;/s);
        expect(authIntro).toMatch(/\.demoLink\s*\{[^}]*border-radius:\s*10px;/s);
        expect(authIntro).toMatch(/\.guideLink\s*\{[^}]*gap:\s*6px;/s);
        expect(authIntro).toMatch(
            /\.authPanel\s*\{[^}]*position:\s*fixed;[^}]*width:\s*100vw;[^}]*clip-path:\s*polygon\(110% 0, 100% 0, 100% 100%, 124% 100%\);[^}]*opacity:\s*1;/s
        );
        expect(authIntro).toMatch(
            /\.authPanel\s*\{[^}]*transform:\s*perspective\(1200px\) rotateY\(-14deg\) translateX\(40px\) scale\(0\.985\);[^}]*transform-origin:\s*right center;/s
        );
        expect(authIntro).toMatch(/\.authStage\s*\{[^}]*width:\s*min\(100%, 400px\);/s);
        expect(authIntro).toMatch(
            /\.focusedMode \.productPanel\s*\{[^}]*opacity:\s*1;[^}]*transform:\s*translateX\(-18px\) scale\(0\.992\);[^}]*visibility:\s*hidden;/s
        );
        expect(authIntro).toMatch(
            /\.focusedMode \.authPanel\s*\{[^}]*clip-path:\s*polygon\(0 0, 100% 0, 100% 100%, 0 100%\);[^}]*transform:\s*perspective\(1200px\) rotateY\(0deg\) translateX\(0\) scale\(1\);/s
        );
        expect(authIntro).toMatch(
            /\.authPanel\s*\{[^}]*transition:\s*clip-path var\(--auth-return-duration\) var\(--auth-motion-easing\),\s*transform var\(--auth-return-duration\) var\(--auth-motion-easing\),\s*visibility 0s linear var\(--auth-return-duration\);/s
        );
        expect(authIntro).toMatch(
            /\.focusedMode \.authPanel\s*\{[^}]*transition:\s*clip-path var\(--auth-motion-duration\) var\(--auth-motion-easing\),\s*transform var\(--auth-motion-duration\) var\(--auth-motion-easing\), visibility 0s linear;/s
        );
        expect(authIntro).not.toContain('.authPanel::before');
        expect(authIntro).not.toContain('@keyframes authPageCrease');
        expect(authIntro).toMatch(
            /@media \(max-width:\s*900px\)[\s\S]*?\.productPanel\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\);[^}]*grid-template-areas:\s*'header'\s*'story'\s*'preview';/s
        );
        expect(authIntro).toMatch(
            /@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.authPanel[\s\S]*?transition:\s*none;/s
        );
        expect(authIntro).not.toContain('box-shadow: 0 18px 45px var(--colorAuthCardShadow);');
    });

    it('removes account translation and product fading for reduced motion', () => {
        const authIntro = readSource('src/components/authProductIntro/AuthProductIntro.module.css');

        expect(authIntro).toMatch(
            /@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.authPanel\s*\{[^}]*clip-path:\s*none;/s
        );
        expect(authIntro).toMatch(
            /@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.focusedMode \.authPanel\s*\{[^}]*clip-path:\s*none;/s
        );
        expect(authIntro).toMatch(
            /@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.focusedMode \.productPanel\s*\{[^}]*opacity:\s*1;[^}]*transform:\s*none;/s
        );
    });

    it('centres both account forms while allowing the sign-up strength meter to grow safely', () => {
        const authIntro = readSource('src/components/authProductIntro/AuthProductIntro.module.css');

        expect(authIntro).toMatch(
            /\.authStage\s*\{[^}]*width:\s*min\(100%, 400px\);[^}]*align-content:\s*safe center;[^}]*margin:\s*0 auto;[^}]*opacity:\s*0;[^}]*transform:\s*translateX\(14px\);/s
        );
        expect(authIntro).toMatch(
            /\.focusedMode \.authStage\s*\{[^}]*opacity:\s*1;[^}]*transform:\s*translateX\(0\);/s
        );
        expect(authIntro).toMatch(
            /\.authCardSlot\s*\{[^}]*width:\s*100%;[^}]*justify-items:\s*stretch;[^}]*margin-bottom:\s*24px;/s
        );
        expect(authIntro).not.toMatch(/@media \(max-width:\s*600px\)[\s\S]*?\.authStage\s*\{[^}]*width:\s*100%;/s);
        expect(authIntro).toMatch(
            /@media \(max-width:\s*600px\)[\s\S]*?\.authPanel\s*\{[^}]*clip-path:\s*polygon\(0 112%, 100% 100%, 100% 100%, 0 100%\);/s
        );
        expect(authIntro).toMatch(
            /@media \(max-width:\s*600px\)[\s\S]*?\.authPanel\s*\{[^}]*transform:\s*perspective\(900px\) rotateX\(12deg\) translateY\(28px\) scale\(0\.99\);[^}]*transform-origin:\s*center bottom;/s
        );
        expect(authIntro).toMatch(
            /@media \(max-width:\s*600px\)[\s\S]*?\.authStage\s*\{[^}]*transform:\s*translateY\(18px\);/s
        );
        expect(authIntro).toMatch(/\.restoreOverviewButton\s*\{[^}]*justify-self:\s*start;/s);
        expect(authIntro).toMatch(
            /@media \(max-width:\s*600px\)[\s\S]*?\.restoreOverviewButton\s*\{[^}]*justify-self:\s*start;/s
        );
        expect(authIntro).toContain('clip-path');
        expect(authIntro).toContain('perspective(');
        expect(authIntro).toContain('rotateX(');
        expect(authIntro).toContain('rotateY(');
        expect(authIntro).toMatch(
            /@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.authStage\s*\{[^}]*opacity:\s*1;[^}]*transform:\s*none;[^}]*transition:\s*none;/s
        );
    });

    it('uses the product header briefcase treatment on both account cards', () => {
        const authentication = readSource('src/pages/authentication/Authentication.module.css');
        const authIntro = readSource('src/components/authProductIntro/AuthProductIntro.module.css');

        expect(authIntro).toMatch(
            /\.productBrandIcon\s*\{[^}]*background-color:\s*var\(--colorPrimary\);[^}]*color:\s*var\(--colorBtnPrimaryText\);/s
        );
        expect(authentication).toMatch(
            /\.logoIcon\s*\{[^}]*border:\s*0;[^}]*background-color:\s*var\(--colorPrimary\);[^}]*color:\s*var\(--colorBtnPrimaryText\);/s
        );
    });

    it('keeps the box-shadow inventory bounded', () => {
        const globalCss = readSource('src/index.css');
        const lightCss = getThemeBlock(globalCss, 'light');
        const darkCss = getThemeBlock(globalCss, 'dark');

        [
            '--colorControlBorder: #ead7de;',
            '--colorPrimaryFocusShadow: rgb(241 53 109 / 12%);',
            '--colorControlShadow: rgb(74 40 54 / 10%);',
            '--colorAuthCardShadow: rgb(64 32 48 / 10%);',
            '--colorNotesShadow: rgba(0, 0, 0, 0.1);',
            '--colorToastShadow: rgb(61 35 48 / 18%);',
            '--colorOfflineBannerShadow: rgb(0 64 133 / 16%);',
            '--colorGuideHeaderShadow: rgb(91 42 59 / 8%);',
            '--colorGuideTipShadow: rgb(91 42 59 / 6%);',
            '--colorStatIconBg: var(--colorTintSurfaceStrong);',
        ].forEach((declaration) => expect(lightCss).toContain(declaration));

        [
            '--colorControlBorder: #3a3a48;',
            '--colorPrimaryFocusShadow: rgb(244 80 126 / 16%);',
            '--colorControlShadow: rgb(0 0 0 / 30%);',
            '--colorAuthCardShadow: rgb(0 0 0 / 30%);',
            '--colorNotesShadow: rgba(0, 0, 0, 0.3);',
            '--colorToastShadow: rgb(0 0 0 / 42%);',
            '--colorOfflineBannerShadow: rgb(0 0 0 / 28%);',
            '--colorGuideHeaderShadow: rgb(0 0 0 / 20%);',
            '--colorGuideTipShadow: rgb(0 0 0 / 20%);',
            '--colorStatIconBg: var(--colorTintSurfaceStrong);',
        ].forEach((declaration) => expect(darkCss).toContain(declaration));

        expect(declarationsByFile(/^\s*(?:-webkit-)?box-shadow\s*:[^;]+;/gm)).toEqual(expectedBoxShadowDeclarations);
    });

    it('keeps persistent neutral toasts readable without a duration animation', () => {
        const globalCss = readSource('src/index.css');
        const lightCss = getThemeBlock(globalCss, 'light');
        const darkCss = getThemeBlock(globalCss, 'dark');
        const toastCss = readSource('src/components/toast/ToastContainer.module.css');

        ['Accent', 'Soft', 'Bg', 'Text'].forEach((token) => {
            expect(lightCss).toContain(`--colorToastNeutral${token}:`);
            expect(darkCss).toContain(`--colorToastNeutral${token}:`);
        });
        expect(
            contrastRatio(getHexToken(lightCss, 'colorToastNeutralText'), getHexToken(lightCss, 'colorToastNeutralBg'))
        ).toBeGreaterThanOrEqual(4.5);
        expect(
            contrastRatio(getHexToken(darkCss, 'colorToastNeutralText'), getHexToken(darkCss, 'colorToastNeutralBg'))
        ).toBeGreaterThanOrEqual(4.5);
        expect(toastCss).toMatch(
            /\.neutralToast\s*\{[^}]*border-left:\s*3px solid var\(--toastAccent\);[^}]*border-bottom:\s*3px solid var\(--toastAccent\);/s
        );
        expect(toastCss).toMatch(/\.neutralToast::after\s*\{[^}]*display:\s*none;/s);
        expect(toastCss).toMatch(/\.message\s*\{[^}]*white-space:\s*pre-line;/s);
    });

    it('keeps the attention center distinct and matches the readable application and interview card type scale', () => {
        const attentionCenter = readSource('src/pages/dashboard/attentionCenter/AttentionCenter.module.css');
        const applicationBoard = readSource('src/pages/application/applicationBoard/ApplicationBoard.module.css');
        const applicationCard = readSource('src/pages/application/ApplicationCard.module.css');
        const interviewCard = readSource('src/pages/interview/InterviewCard.module.css');

        expect(attentionCenter).toMatch(
            /\.attentionCard\s*>\s*header\s*\{[^}]*padding-bottom:\s*14px;[^}]*border-bottom:\s*1px solid var\(--colorCardBorder\);/s
        );
        expect(attentionCenter).toMatch(
            /\.attentionTitle\s*\{[^}]*display:\s*inline-flex;[^}]*align-items:\s*center;[^}]*gap:\s*var\(--spaceControl\);/s
        );
        expect(attentionCenter).toMatch(
            /\.attentionCount\s*\{[^}]*border-radius:\s*var\(--radiusPill\);[^}]*background:\s*var\(--colorStatIconBg\);[^}]*color:\s*var\(--colorTintText\);/s
        );
        expect(attentionCenter).not.toContain('.draftActionButton');
        expect(attentionCenter).toMatch(
            /\.attentionItem\s*\{[^}]*border-inline-start:\s*4px solid var\(--attentionStatusColor\);/s
        );
        ['Applied', 'Interview', 'Offer'].forEach((status) =>
            expect(attentionCenter).toContain(`--attentionStatusColor: var(--colorStatus${status});`)
        );
        expect(attentionCenter).toContain('grid-template-columns: repeat(2, minmax(0, 1fr));');
        expect(attentionCenter).toMatch(/\.attentionItem\s*\{[^}]*min-width:\s*0;/s);
        expect(attentionCenter).toMatch(/\.applicationDetails\s*\{[^}]*min-width:\s*0;/s);
        expect(attentionCenter).toMatch(
            /\.applicationDetails h3,\s*\.centered h3\s*\{[^}]*font-size:\s*var\(--fontSizeCardTitle\);[^}]*overflow-wrap:\s*anywhere;/s
        );
        expect(attentionCenter).toMatch(
            /\.applicationDetails p,\s*\.reason,\s*\.centered p\s*\{[^}]*font-size:\s*var\(--fontSizeBody\);/s
        );
        expect(attentionCenter).toMatch(
            /\.itemHeading\s*>\s*span\s*\{[^}]*font-size:\s*var\(--fontSizeCompactControl\);/s
        );
        expect(attentionCenter).toMatch(
            /@media \(max-width: 803px\)\s*\{[\s\S]*?\.applicationDetails h3,\s*\.centered h3\s*\{[^}]*font-size:\s*var\(--fontSizeBody\);[\s\S]*?\.applicationDetails p,\s*\.reason,\s*\.centered p\s*\{[^}]*font-size:\s*var\(--fontSizeBodyCompact\);[\s\S]*?\.itemHeading\s*>\s*span\s*\{[^}]*font-size:\s*var\(--fontSizeMicro\);/
        );
        expect(attentionCenter).toMatch(
            /@media \(max-width: 768px\)\s*\{[^}]*\.attentionList\s*\{[^}]*grid-template-columns:\s*1fr;/s
        );
        expect(applicationCard).toMatch(
            /\.applicationContent h2\s*\{[^}]*font-size:\s*var\(--fontSizeSectionTitle\);/s
        );
        expect(interviewCard).toMatch(/\.interviewContent h2\s*\{[^}]*font-size:\s*var\(--fontSizeSectionTitle\);/s);
        expect(applicationCard).toMatch(
            /@media \(max-width: 803px\)\s*\{[\s\S]*?\.applicationContent\s*\{[^}]*font-size:\s*var\(--fontSizeBodyCompact\);[\s\S]*?\.applicationContent h2\s*\{[^}]*font-size:\s*var\(--fontSizeCardTitle\);/
        );
        expect(interviewCard).toMatch(
            /@media \(max-width: 803px\)\s*\{[\s\S]*?\.interviewContent\s*\{[^}]*font-size:\s*var\(--fontSizeBodyCompact\);[\s\S]*?\.interviewContent h2\s*\{[^}]*font-size:\s*var\(--fontSizeCardTitle\);/
        );
        expect(applicationBoard).toMatch(
            /\.statusBadge,\s*\.upcomingBadge\s*\{[^}]*min-height:\s*var\(--heightCompactPill\);[^}]*padding:\s*0 9px;[^}]*font-size:\s*0\.6875rem;[^}]*font-weight:\s*var\(--fontWeightEmphasis\);/s
        );
        expect(attentionCenter).not.toMatch(
            /border-top|gradient\(|box-shadow|background:\s*color-mix|\.status\s*\{|colorBtnDestructive|colorError/i
        );
    });

    it('keeps fullscreen carousel dots centered on mobile', () => {
        const authProductIntro = readSource('src/components/authProductIntro/AuthProductIntro.module.css');

        expect(authProductIntro).toMatch(
            /@media \(max-width: 600px\)\s*\{[\s\S]*?\.fullscreenDots\s*\{[^}]*justify-content:\s*center;/s
        );
    });

    it('keeps the Job Tracker wordmark and page messaging neutral while reserving rose for the brand mark', () => {
        const navbar = readSource('src/components/navbar/Navbar.module.css');
        const authProductIntro = readSource('src/components/authProductIntro/AuthProductIntro.module.css');

        expect(navbar).toMatch(/\.brand\s*\{[^}]*color:\s*var\(--colorText\);/s);
        expect(authProductIntro).toMatch(/\.productBrand\s*\{[^}]*color:\s*var\(--colorText\);/s);
        expect(authProductIntro).toMatch(/\.heroRow h1\s*\{[^}]*color:\s*var\(--colorText\);/s);
        expect(authProductIntro).toMatch(/\.productBrandIcon\s*\{[^}]*background-color:\s*var\(--colorPrimary\);/s);
    });

    it('confines Pearl Blush Liquid Glass to the shared Activity-control owners', () => {
        const indexHtml = readSource('index.html');
        const activityControls = readSource('src/components/activityControls/ActivityControls.module.css');
        const controlDropdown = readSource('src/components/activityControls/ControlDropdown.module.css');
        const viewToggle = readSource(
            'src/components/activityControls/collectionViewToggle/CollectionViewToggle.module.css'
        );
        const unrelatedSurfaces = [
            readSource('src/index.css'),
            readSource('src/components/navbar/Navbar.module.css'),
            readSource('src/pages/application/ApplicationCard.module.css'),
            readSource('src/pages/interview/InterviewCard.module.css'),
        ];

        expect(indexHtml).toContain('id="activity-control-refraction"');
        expect(indexHtml).toMatch(
            /<filter[^>]*id="activity-menu-refraction"[\s\S]*?<feDisplacementMap[\s\S]*?scale="11"/
        );
        expect(indexHtml).toContain('<feDisplacementMap');
        expect(activityControls).toMatch(
            /\.controls\s*\{[^}]*--activityGlassBaseStart:\s*color-mix\(in srgb, var\(--colorPrimary\) 7%, transparent\);[^}]*--activityGlassFillOpacity:\s*74%;[^}]*background:\s*linear-gradient\(\s*135deg,\s*var\(--activityGlassBaseStart\),[^;]*var\(--activityGlassBaseEnd\)[^;]*var\(--activityGlassFillOpacity\)/s
        );
        expect(activityControls).toContain(
            "backdrop-filter: url('#activity-control-refraction') blur(20px) saturate(135%) contrast(1.03);"
        );
        expect(activityControls).not.toContain(".controls:has([aria-expanded='true'])");
        expect(activityControls).toMatch(/\.controls\s*\{[^}]*z-index:\s*20;/s);
        expect(activityControls).toContain('@keyframes activityGlassSettle');
        expect(activityControls).toContain('@keyframes activityToolbarSheen');
        expect(activityControls).toMatch(
            /:global\(\[data-theme='light'\]\) \.controls\s*\{[^}]*--colorInteractiveBorder:\s*color-mix\(in srgb, var\(--colorText\) 24%, transparent\);[^}]*--activityGlassFillOpacity:\s*46%;[^}]*--activityGlassBorder:\s*rgb\(255 255 255 \/ 88%\);[^}]*--activityGlassRim:\s*rgb\(255 255 255 \/ 58%\);[^}]*--activityGlassTopEdge:\s*rgb\(255 255 255 \/ 100%\);[^}]*--activityGlassInnerEdge:\s*color-mix\(in srgb, var\(--colorText\) 10%, transparent\);[^}]*--activityGlassSheenCore:\s*rgb\(255 255 255 \/ 70%\);[^}]*--activityGlassSheenTint:\s*color-mix\(in srgb, var\(--colorPrimary\) 6%, transparent\);[^}]*background:\s*color-mix\(\s*in srgb,\s*color-mix\(in srgb, var\(--colorCardBg\) 94%, var\(--colorText\)\) var\(--activityGlassFillOpacity\),\s*transparent\s*\);[^}]*box-shadow:\s*0 12px 28px rgb\(56 50 53 \/ 14%\),\s*0 2px 6px rgb\(56 50 53 \/ 8%\),/s
        );
        expect(activityControls).toMatch(
            /:global\(\[data-theme='light'\]\) \.controls:hover\s*\{[^}]*--activityGlassBorder:\s*rgb\(255 255 255 \/ 96%\);[^}]*--activityGlassSheenTint:\s*color-mix\(in srgb, var\(--colorPrimary\) 10%, transparent\);/s
        );
        expect(activityControls).not.toContain(":global([data-theme='light']) .controls::after");
        expect(activityControls).not.toContain('.controls:focus-within::after');
        expect(controlDropdown).toMatch(
            /\.activityTrigger\s*\{[^}]*background:\s*color-mix\(in srgb, var\(--colorControlMutedSurface\) 38%, transparent\);/s
        );
        expect(controlDropdown).toMatch(
            /\.activityTrigger:not\(:disabled\):hover,\s*\.open \.activityTrigger\s*\{[^}]*background:\s*color-mix\(in srgb, var\(--colorPrimary\) 12%, transparent\);[^}]*inset 0 1px 0 rgb\(255 255 255 \/ 38%\);/s
        );
        expect(controlDropdown).toMatch(
            /\.activityDropdown\s*\{[^}]*--activityGlassBaseStart:\s*color-mix\(in srgb, var\(--colorPrimary\) 8%, transparent\);[^}]*--activityGlassFillOpacity:\s*86%;[^}]*background:\s*linear-gradient\(\s*135deg,\s*var\(--activityGlassBaseStart\),[^;]*var\(--activityGlassBaseEnd\)[^;]*var\(--activityGlassFillOpacity\)/s
        );
        expect(controlDropdown).toContain(
            "backdrop-filter: url('#activity-menu-refraction') blur(12px) saturate(140%) contrast(1.03);"
        );
        expect(controlDropdown).toContain('@keyframes activityGlassMenuEnter');
        expect(controlDropdown).toContain('@keyframes activityDropdownSheen');
        expect(controlDropdown).toMatch(
            /:global\(\[data-theme='light'\]\) \.activityDropdown\s*\{[^}]*--activityGlassFillOpacity:\s*46%;[^}]*--activityGlassBorder:\s*rgb\(255 255 255 \/ 88%\);[^}]*--activityGlassRim:\s*rgb\(255 255 255 \/ 58%\);[^}]*--activityGlassTopEdge:\s*rgb\(255 255 255 \/ 100%\);[^}]*--activityGlassInnerEdge:\s*color-mix\(in srgb, var\(--colorText\) 10%, transparent\);[^}]*--activityGlassSheenCore:\s*rgb\(255 255 255 \/ 70%\);[^}]*--activityGlassSheenTint:\s*color-mix\(in srgb, var\(--colorPrimary\) 6%, transparent\);[^}]*--activityGlassSheenHoverOpacity:\s*0\.58;[^}]*--activityGlassSheenDuration:\s*620ms;[^}]*background:\s*color-mix\(\s*in srgb,\s*color-mix\(in srgb, var\(--colorCardBg\) 94%, var\(--colorText\)\) var\(--activityGlassFillOpacity\),\s*transparent\s*\);/s
        );
        expect(controlDropdown).not.toContain('.activityDropdown:hover');
        expect(controlDropdown).not.toContain('.activityDropdown:hover::after');
        expect(controlDropdown).not.toContain('.activityDropdown:focus-within::after');
        [
            'src/components/activityControls/checkboxFilter/CheckboxFilter.tsx',
            'src/components/activityControls/sortOptions/SortOptions.tsx',
            'src/components/activityControls/displayOptions/DisplayOptions.tsx',
            'src/components/activityControls/moreOptions/MoreOptions.tsx',
        ].forEach((sourcePath) => expect(readSource(sourcePath)).toContain('renderDropdownInPortal'));
        expect(viewToggle).toMatch(
            /\.toggle\s*\{[^}]*background:\s*color-mix\(in srgb, var\(--colorControlMutedSurface\) 38%, transparent\);/s
        );
        expect(viewToggle).toMatch(/\.option\.active\s*\{[^}]*background:\s*var\(--colorSelectedControlBg\);/s);
        expect(viewToggle).not.toMatch(/\.toggle\s*\{[^}]*box-shadow:/s);
        expect(viewToggle).not.toMatch(/\.option\.active\s*\{[^}]*box-shadow:/s);
        expect(viewToggle).toMatch(/\.toggle:hover\s*\{[^}]*box-shadow:/s);
        [activityControls, controlDropdown, viewToggle].forEach((source) => {
            expect(source).toContain('@media (prefers-reduced-motion: reduce)');
            expect(source).toContain('@media (prefers-reduced-transparency: reduce)');
        });
        [
            'src/components/activityControls/checkboxFilter/CheckboxFilter.module.css',
            'src/components/activityControls/sortOptions/SortOptions.module.css',
            'src/components/activityControls/moreOptions/MoreOptions.module.css',
        ].forEach((sourcePath) => {
            const source = readSource(sourcePath);

            expect(source).not.toContain('background: var(--colorNavHoverBg);');
            expect(source).toContain('color-mix(in srgb, var(--colorPrimary) 10%, transparent)');
        });
        unrelatedSurfaces.forEach((source) => expect(source).not.toContain('activity-control-refraction'));
    });

    it('completes the shared button, form, and menu visual contracts', () => {
        const button = readSource('src/components/button/PrimaryButton.module.css');
        const form = readSource('src/components/formPage/FormPage.module.css');
        const activityControls = readSource('src/components/activityControls/ActivityControls.module.css');
        const controlDropdown = readSource('src/components/activityControls/ControlDropdown.module.css');
        const viewToggle = readSource(
            'src/components/activityControls/collectionViewToggle/CollectionViewToggle.module.css'
        );
        const navbar = readSource('src/components/navbar/Navbar.module.css');
        const sortOptions = readSource('src/components/activityControls/sortOptions/SortOptions.module.css');
        const moreOptions = readSource('src/components/activityControls/moreOptions/MoreOptions.module.css');

        expect(button).toContain('.button:focus-visible');
        expect(button).toContain('.button:disabled:not(.loading)');
        expect(button).toContain('opacity: 0.58;');
        expect(button).toContain('.primary:not(:disabled):hover');
        expect(button).toContain('.secondary:not(:disabled):hover');
        expect(button).toContain('.destructive:not(:disabled):hover');
        expect(button).not.toContain('.form:hover');
        expect(button).toContain('--colorSpinnerLight: var(--colorBtnPrimaryText);');
        expect(button).toContain('--colorSpinnerLight: var(--colorBtnDestructiveFilledText);');
        expect(button).toContain('line-height: normal;');
        expect(form).toContain('font-weight: var(--fontWeightEmphasis);');
        expect(form).toContain('min-height: 44px;');
        expect(form).toContain('width: clamp(560px, 42vw, 680px);');
        expect(form).toMatch(/\.field\s*\{[^}]*gap:\s*var\(--spaceControl\);/s);
        expect(form).toMatch(/\.field \+ \.field\s*\{[^}]*margin-top:\s*var\(--spaceCard\);/s);
        expect(form).toMatch(/\.optionalLabel\s*\{[^}]*color:\s*var\(--colorTextSecondary\);[^}]*font-weight:\s*400;/s);
        expect(form).toMatch(/\.selectControl\s*\{[^}]*position:\s*relative;/s);
        expect(form).toMatch(/\.selectChevron\s*\{[^}]*pointer-events:\s*none;/s);
        expect(form).toMatch(/\.context\s*\{[^}]*margin-bottom:\s*var\(--spaceCompact\);/s);
        expect(form).toMatch(/\.context h2\s*\{[^}]*margin:\s*0 0 calc\(var\(--spaceControl\) \/ 2\);/s);
        expect(form).toMatch(/\.context p\s*\{[^}]*margin:\s*0;/s);
        expect(form).not.toContain('appearance: auto;');
        [activityControls, controlDropdown, viewToggle, navbar].forEach((source) =>
            expect(source).toContain('var(--colorInteractiveBorder)')
        );
        expect(navbar).toContain('box-shadow: inset 0 0 0 1px var(--colorControlBorder);');
        expect(sortOptions).toContain('border-radius: var(--radiusMenuItem);');
        expect(moreOptions).toContain('border-radius: var(--radiusMenuItem);');
        expect(moreOptions).toMatch(/\.options\s+\.action\s*\{[^}]*font-weight:\s*400;/s);
    });

    it('keeps navbar hierarchy and destructive dialog styling under shared owners', () => {
        const navbar = readSource('src/components/navbar/Navbar.tsx');
        const demoNavbar = readSource('src/pages/demo/components/demoNavbar/DemoNavbar.tsx');
        const fallback = readSource('src/components/fallbackScreen/FallbackScreen.tsx');
        const muiTheme = readSource('src/components/theme/muiTheme.ts');

        expect(navbar).toContain('<h1>Job Tracker</h1>');
        expect(demoNavbar).toContain('<h1>Demo</h1>');
        expect(fallback).toContain('<h1>{content.title}</h1>');
        expect(muiTheme).toContain('containedError:');
        expect(muiTheme).toContain("backgroundColor: 'var(--colorBtnDestructiveBg)'");
        expect(muiTheme).toContain("backgroundColor: 'var(--colorBtnDestructiveHoverBg)'");
    });

    it('uses role-based radius tokens across shared app surfaces', () => {
        const indexCss = readSource('src/index.css');
        const tokenizedRadiusFiles = [
            'src/components/activityControls/ControlDropdown.module.css',
            'src/components/activityControls/checkboxFilter/CheckboxFilter.module.css',
            'src/components/authRequestInfo/AuthRequestInfo.module.css',
            'src/components/boardCardActions/BoardCardActions.module.css',
            'src/components/emptyState/EmptyState.module.css',
            'src/components/formPage/FormPage.module.css',
            'src/components/navbar/Navbar.module.css',
            'src/components/offlineBanner/OfflineBanner.module.css',
            'src/components/pinControl/PinControl.module.css',
            'src/components/skeletonLoader/skeletonBoard/SkeletonBoard.module.css',
            'src/components/skeletonLoader/skeletonCard/SkeletonCard.module.css',
            'src/components/skeletonLoader/skeletonOfferComparisonTable/SkeletonOfferComparisonTable.module.css',
            'src/components/toast/ToastContainer.module.css',
            'src/components/toggleButton/ToggleButton.module.css',
            'src/pages/application/ApplicationCard.module.css',
            'src/pages/application/applicationBoard/ApplicationBoard.module.css',
            'src/pages/authentication/Authentication.module.css',
            'src/pages/dashboard/attentionCenter/AttentionCenter.module.css',
            'src/pages/dashboard/charts/applicationsTrend/ApplicationsLineChart.module.css',
            'src/pages/dashboard/overview/dashboardStats/DashboardStats.module.css',
            'src/pages/dashboard/overview/upcomingInterviews/UpcomingInterviews.module.css',
            'src/pages/interview/InterviewCard.module.css',
            'src/pages/interview/calendarOptions/CalendarOptions.module.css',
        ];

        expect(indexCss).toContain('--radiusIndicator: 4px;');
        expect(indexCss).toContain('--radiusCompact: 6px;');
        expect(indexCss).toContain('--radiusInset: 12px;');
        tokenizedRadiusFiles.forEach((path) => expect(readSource(path), path).not.toMatch(/border-radius:\s*\d+px;/));
    });
});
