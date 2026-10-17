# Baccarat Intelligence Lab

A mobile-first Next.js app for fictional No Commission Baccarat simulation, pattern statistics, strategy experiments, and screenshot-based outcome tracking.

## Features
- 8-deck finite virtual shoe and standard baccarat drawing rules
- Player, Banker and Tie outcomes
- No Commission Banker 6 half-profit payout
- Virtual bankroll and auditable card/hand ledger
- Auto-deal mode (one virtual hand every 1.4 seconds) with stop control
- Big Road-style outcome history, streaks and frequencies
- Flat stake and Martingale demonstration selector
- Theoretical house-edge and expected-value explanations
- Screenshot upload with best-effort browser-side detection of colored road markers
- Review detected Player/Banker/Tie markers before importing; screenshots never silently alter the simulated shoe or virtual bankroll
- Automatic local-device session save/restore for recorded hands, bankroll, shoe position, and key settings
- Source-separated counts for simulated, screenshot-observed, and manual outcomes
- Retrospective strategy replay on simulated outcomes only, with net result, turnover, and peak-to-trough drawdown
- Review/cycle detected Player/Banker/Tie markers before importing
- Manual P/B/T entry as a fallback
- Separate source labels for simulated, screenshot-observed, and manual outcomes
- Balance privacy toggle
- No live Evolution connection, real-money bets, casino account access, or bet placement

## Run locally
Requires Node.js 18.17+.

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Deploy to Vercel
1. Upload the contents of this folder to a GitHub repository.
2. In Vercel, select **Add New → Project** and import the repository.
3. Keep the detected Next.js framework preset.
4. Click **Deploy**.

No environment variables are required.

## Automatic operation
- Use **Auto-deal** to continuously generate virtual hands; stop it any time.
- Upload a table screenshot in **Import Results**, review the proposed road markers, correct them, and confirm to append screenshot-observed outcomes. This is semi-automatic by design because image colors can be misread.
- Simulated outcomes, screenshot-observed outcomes, and manual entries are clearly source-labelled. The strategy backtest uses simulated hands only.
- The app does not connect to Evolution or 1xBet, monitor a live table, place bets, or fetch live outcomes.

## Screenshot detection limitations
The screenshot scanner runs locally in the browser and looks for connected blue/red/green color clusters. It is a best-effort marker detector, not robust OCR. It may miss markers or detect unrelated interface elements depending on crop, compression, theme, and screen scaling. Review and correct every proposed outcome before importing. It cannot reliably read card ranks/suits, determine hidden cards, access the live table, or infer the shoe composition.

## Important limitations
- Session data is auto-saved to this browser/device localStorage. It does not sync between devices or browsers; clearing site data removes it. Avoid using this as a financial record.
- The virtual shoe uses a seeded pseudorandom shuffle for repeatable experiments, not a certified casino RNG.
- Screenshot/manual imports record outcomes only unless actual cards are separately available. The marker scanner does not infer ranks, suits, totals, hidden cards, or shoe composition, and imported outcomes do not adjust the virtual shoe or virtual bankroll.
- Screenshot-observed results and virtual simulation results are labeled separately, but currently share one combined history view.
- Strategy and pattern analysis are descriptive and cannot reliably predict future hands. Backtests replay existing simulated outcomes and are not proof of future performance; Martingale does not change the underlying odds.
- This app does not conceal betting activity or evade casino controls.
- Check the exact table rules and payouts for the version you are studying.
