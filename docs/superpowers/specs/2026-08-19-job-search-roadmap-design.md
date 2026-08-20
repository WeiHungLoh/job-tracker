# Job Search Roadmap Design

**Status:** Quiet Road revision approved on 2026-08-20

## Goal

Replace the separate dashboard Application Pipeline and Closed Outcomes charts with one distinctive, Apple-like Job Search Roadmap card, while preserving the existing status-filter navigation contract and aligning the page-loading fallback route to the four application stages.

## Scope

-   Combine Application Pipeline and Closed Outcomes inside one dashboard card.
-   Render a restrained Rose Ledger road with permanent geometry, four fixed pipeline pins, Start/finish markers, and centered closed-outcome signposts.
-   Preserve the shared legend filtering behavior with animated visual updates.
-   Preserve active and demo dashboard navigation to the Applications page with the selected status filter.
-   Change the `pageLoading` fallback route to Applied → Interview → Offer → Accepted and make its moving marker visit those four checkpoints in that order.

This work does not change application statuses, server APIs, saved filters, sorting, dashboard data fetching, or other fallback variants.

## Approved Copy And Status Order

-   Card title: `Job Search Roadmap`
-   Card description: `See Where Every Application Is Headed.`
-   Section label: `Application Pipeline`
-   Pipeline order: Applied → Interview → Offer → Accepted
-   Section label: `Closed Outcomes`
-   Closed-outcome order: Rejected, Withdrawn, Ghosted, Declined
-   Fallback title and message remain `Opening your tracker` and `Putting your applications in place.`

Counts appear in the markers. Counts are not repeated in the legends.

The instructional copy below the card is `Select A Marker To Open Applications With That Status.`

## Reference Layout Contract

The supplied reference controls the card's visual order and proportions:

1. Card title and description.
2. Application Pipeline heading.
3. One compact fixed-geometry road map with Start at the lower left, alternating lower/upper stage pins, and the finish flag at the upper right.
4. While at least one closed-outcome marker is visible, a dotted divider followed by the Closed Outcomes heading and one centered signpost row.
5. A card footer separated by a solid border, with labelled Application Pipeline and Closed Outcomes legend rows.
6. The instructional copy immediately below the card.

The reference's decorative overflow ellipsis is intentionally omitted because the card exposes no overflow-menu actions.

## Visual Treatment

The card uses the existing `DashboardCard`, Rose Ledger tokens, system typography, status colors, radii, and focus treatment. Rose remains an accent rather than universal chrome. The roadmap must inherit the same card-title and description sizes as `Job Search Activity`, `Upcoming Interviews`, and the other dashboard cards; it must not locally enlarge the shared `DashboardCard` header.

The approved visual direction is **Quiet Road**. The Application Pipeline is a compact flat SVG road with a rose-tinted surface, a restrained center line, a Start sign, and a finish flag. It intentionally omits checkpoint numbers, directional chevrons, label tabs, decorative terrain, shadows, gradients, generated-image assets, and new dependencies.

Pipeline statuses use compact map-pin markers whose circle, stem, and road foot share one SVG coordinate system. Each status name sits above its circle, never below the road anchor. The foot center is the marker anchor and must sit directly on the road path at every responsive size. The stem is painted behind the circle so it cannot enter the circle, and hover/focus motion moves the complete label-and-pin unit rather than moving the circle independently.

Closed statuses use the reference signpost layout and their existing semantic status colors: count circle, short vertical stem, small right-pointing sign, then a separate status label below. Closed Outcomes never has a connecting route. Both marker types remain semantic buttons when `onStatusSelect` is available.

The card contains no decorative overflow menu because there is no roadmap menu behavior to expose.

Application Pipeline and Closed Outcomes each show a compact total beside the section label, using the same 22px pill treatment as the dashboard's Needs Attention count. Each total sums its complete canonical four-status group and remains stable when legend filters change. The count is supplementary visual context, so it is hidden from assistive technology and does not alter the section heading's accessible name. When every closed outcome is filtered off, its heading and count retract with the rest of that section.

The vertical rhythm stays intentionally compact and balanced. The pipeline composition sits directly below its section heading with one control-space reserved below the map, moving the road-and-marker group upward as one unit without changing its internal coordinates. Closed-outcome signposts are vertically centered inside a map only 10px taller than their controls, followed by one control-space before the footer divider; the section must not retain a large invisible region below the status labels.

## Application Pipeline Behavior

Pipeline markers have permanent coordinates determined by status identity, never by the number or order of currently visible statuses:

-   Applied always occupies the first/lower checkpoint.
-   Interview always occupies the second/upper checkpoint.
-   Offer always occupies the third/lower checkpoint.
-   Accepted always occupies the fourth/upper checkpoint.

A pipeline status is always present in the marker set and legend, including when its count is zero. A zero-count marker displays `0` and renders the complete label-and-pin unit at 20% opacity. It remains a native button and preserves the same status-filter navigation as a positive-count marker.

Hiding a pipeline stage through the legend makes only that marker visually absent and non-interactive while retaining its legend control for restoration. It must not move any other marker.

When the total pipeline count is greater than zero, at least one pipeline marker must remain visible. If exactly one pipeline status remains visible, its Hide legend control is disabled until another status is restored. This applies even when the final visible marker itself has a zero count. When the total pipeline count is zero, all four legend filters may be hidden because there are no applications to preserve in the visible pipeline.

The road, Start sign, and finish flag always use the complete canonical geometry. Data counts and legend visibility never redraw, shorten, extend, or otherwise change the road. When the total pipeline count is zero and all four markers are hidden through the legend, the complete road remains visible and the four-item legend remains available. If every pipeline count is zero before filtering, the complete road, four muted zero-count markers, and four-item legend still render; there is no pipeline empty-state replacement.

## Closed Outcomes Behavior

All four closed outcomes appear as signposts and legend items, including when their counts are zero. A zero-count closed marker displays `0` and renders the complete signpost-and-label unit at 20% opacity. It remains clickable and preserves the same status-filter navigation as a positive-count marker.

Hiding a closed outcome through the legend makes only that signpost visually absent and non-interactive while retaining its legend control for restoration.

Unlike the pipeline, visible closed-outcome signposts redistribute after every data or legend change:

-   One visible outcome is centered.
-   Two visible outcomes are centered as a balanced pair.
-   Three visible outcomes are centered with even spacing.
-   Four visible outcomes fill the available row evenly.

Counts do not affect closed-outcome positioning. The centering rule applies only to legend visibility: every visible positive- or zero-count signpost participates in the centered layout. When one is hidden, every remaining signpost animates into a new centered position.

If all four closed outcomes are hidden through the legend, omit the Closed Outcomes heading, dotted divider, and signpost map so the card does not reserve empty outcome space. The Closed Outcomes legend row remains visible in the footer as the recovery control. Restoring any outcome brings the section back and centers the restored signposts.

If every closed-outcome count is zero in the source data, show the complete Closed Outcomes section with four 20%-opacity signposts and the complete four-item legend. Source data never removes a closed-outcome marker; only its legend filter can do that.

## Marker Navigation

Selecting any visible pipeline pin or closed-outcome signpost, including a zero-count marker, calls the existing `onStatusSelect(status)` handler.

-   The active dashboard navigates to `routes.viewApplications` with `{ applicationJobStatus: status }` in `ApplicationCollectionNavigationState`.
-   The demo dashboard navigates to `routes.demoViewApplications` with the same state shape.
-   The Applications page continues to consume that state through its existing navigation/filter resolver and applies the selected status filter.
-   Legend controls only change roadmap visibility. They never navigate.

Mouse, touch, Enter, and Space activation all use the same native-button behavior.

## Component Boundaries

`JobSearchRoadmap` remains the single card owner. Keep the two visual sections focused:

-   The pipeline section owns fixed stage coordinates and one permanent full-road geometry.
-   The closed-outcomes section owns all four signposts, their zero-state emphasis, and centered visible positions.
-   Each section owns an independent instance of the roadmap-owned `useStatusChartVisibility` hook.
-   The roadmap-owned `StatusLegend` is reused by both sections without exposing a repository-wide shared module.
-   A small shared status-group module owns the canonical pipeline and closed-outcome orders so the dashboard and fallback cannot disagree on Applied → Interview → Offer → Accepted.

`DashboardContent` renders one full-width roadmap section instead of separate pipeline and closed chart cards. Production and demo continue sharing `DashboardContent`; only their existing route-specific `onStatusSelect` handlers differ.

## Loading, Error, And Empty States

Pipeline and closed outcomes use the same status-summary request, so the combined card has one loading state and one error state. The existing loading spinner, error copy, Retry action, and request ownership remain unchanged.

After successful loading, the pipeline always renders its complete four-stage roadmap. Closed Outcomes renders all four source statuses regardless of count and disappears only when the user filters all four outcomes off; its footer legend remains available for restoration.

## Motion

Legend changes animate for roughly 160–240 ms using existing motion tokens:

-   Pipeline markers scale/fade at their fixed coordinates.
-   Closed-outcome signposts move into their new centered positions while the filtered signpost retracts. If the final signpost is filtered, the complete Closed Outcomes visual section retracts while its legend row stays in place.

The road does not animate or redraw when legend state changes. There is no initial looping dashboard animation. `prefers-reduced-motion: reduce` disables marker and signpost transitions without changing content or interaction.

## Fallback Alignment

Only `pageLoading` gains four markers: Applied, Interview, Offer, Accepted. Authentication, not-found, authentication-error, and route-error variants retain their existing three-label routes and semantics.

The `pageLoading` moving ticket follows four explicit checkpoint transforms in order:

1. Applied
2. Interview
3. Offer
4. Accepted

The animation must not introduce a separate midpoint between Interview and Offer. It pauses briefly at each named checkpoint, reaches Accepted, then fades out while remaining at Accepted. While fully transparent, the ticket resets to Applied and fades back in there for the next forward journey; it never visibly travels backward. Reduced motion shows a static named checkpoint without looping.

## Accessibility

-   The decorative road, Start sign, and finish flag are hidden from assistive technology.
-   Visible status markers are native buttons with labels such as `Offer: 2 applications`.
-   Zero-count pipeline and closed-outcome markers remain labelled, focusable, and operable, for example `Accepted: 0 applications` and `Declined: 0 applications`.
-   The pipeline and closed-outcome collections expose concise accessible summaries of visible statuses and counts.
-   Visually hidden markers are disabled or removed from keyboard navigation.
-   Legend controls retain their existing Show/Hide labels and pressed state. The final visible pipeline Hide control exposes a native disabled state when the pipeline total is greater than zero.
-   Focus outlines use the existing Rose Ledger focus token and remain visible in light and dark themes.
-   Touch targets remain at least 44×44 CSS pixels without globally resizing unrelated controls.

## Responsive Behavior

The roadmap card spans all dashboard columns. It remains one card at desktop, tablet, and mobile widths.

Pipeline coordinates and road geometry remain identical at every breakpoint. The roadmap removes its custom oversized card-header rules and inherits shared dashboard typography: 20px card title and 16px description at desktop, plus the existing shared mobile reductions. Local section labels are no larger than the shared body/card-title scale.

The compact route targets an approximately 280–320px desktop map height with roughly 60×80px pins, then proportionally reduces the road, circle, count type, stem, foot, label, Start/finish ornaments, and closed signposts on tablet and mobile. The small-phone treatment targets approximately 44×58px pipeline pins and 48×54px closed signposts. Scaling must not independently reposition the road or marker anchors, reorder stages, or horizontally scroll the route. The pin foot remains centered on its road checkpoint at desktop, laptop, tablet, 390 px, and 320 px widths. Closed-outcome signposts remain centered and evenly distributed down to 320 px. Legends wrap below their section labels without clipping.

## Testing And Acceptance

Automated coverage must verify:

-   All four pipeline markers and legend entries render in canonical order, including zero-count statuses.
-   Zero-count pipeline and closed-outcome markers render their complete marker units at 20% opacity, expose their exact counts, and preserve status navigation.
-   Pipeline status coordinates remain fixed when earlier, middle, or final stages are hidden.
-   The complete road path, Start sign, and finish flag remain byte-for-byte unchanged after data-count and legend-visibility changes.
-   Pipeline status names sit above their circles, each pin foot center matches its fixed road checkpoint, and the stem cannot paint over the count circle in default, hover, or focus states.
-   The roadmap card title and description resolve to the same computed sizes as other `DashboardCard` consumers at desktop and mobile widths.
-   The compact map, markers, and local typography scale down at tablet, 390 px, and 320 px widths without changing checkpoint coordinates or introducing overlap.
-   Pipeline labels remain visually grouped with their heading, and closed-outcome labels do not leave excess reserved height before the footer divider.
-   Closed outcomes center correctly with one, two, three, and four visible statuses.
-   Pipeline and closed-outcome headings expose their complete group totals using the Needs Attention count treatment, and those totals remain unchanged when legend markers are hidden.
-   All four closed outcomes render in canonical order and semantic colors even when every source count is zero.
-   The Closed Outcomes heading, dotted divider, and marker map are absent when all four outcomes are filtered off, while the complete footer legend remains available and restores the section.
-   When the pipeline total is greater than zero, the final visible pipeline Hide control is disabled and at least one marker remains visible.
-   Both pipeline and closed markers call `onStatusSelect` with the matching status.
-   Active and demo marker clicks navigate to the correct Applications route and apply the exact status filter.
-   Legend clicks do not navigate.
-   With a nonzero pipeline total, the pipeline cannot be filtered to zero visible markers; with a zero pipeline total, all four may be hidden and restored from the footer legend.
-   Every closed-outcome status remains restorable from the footer legend after all four closed markers are hidden.
-   `pageLoading` exposes four labels in order, contains the four named checkpoints without an intermediate detour, and uses an opacity-hidden Accepted-to-Applied reset instead of visible reverse travel.
-   The other fallback variants remain three-stage routes.

Run focused dashboard, demo, fallback, and Rose Ledger design tests, then lint, typecheck, and build. Visually verify fresh light and dark renders at desktop and mobile widths, including pipeline filtering, closed-outcome centering, focus states, and reduced motion.

## Non-Goals

-   No server, schema, API, status, sorting, or preference changes.
-   No new charting, animation, icon, or image dependency.
-   No changes to unrelated dashboard cards.
-   No changes to the Applications page filtering contract.
-   No commits or branch operations; all changes remain uncommitted for review.
