# Solo-Leveling-The-System

A Solo Leveling-inspired personal progression dashboard.

## Structure
- `index.html` — page structure
- `css/style.css` — all styling
- `js/app.js` — core game/state logic
- `js/features.js` — enhancement layer: live clock, keyboard shortcuts, focus mode, system search, dynamic tab title

## Existing functionality
- Player boot/onboarding
- XP and level progression
- E–S ranks
- Stat allocation
- Daily quests, streaks and penalties
- Side quests with XP and ranks
- Dungeons, objectives, deadlines and rewards
- Unlockable titles
- System log
- LocalStorage persistence
- JSON export/import
- Reset system

## Added functionality
- Live system clock/date
- Global search (`Ctrl/Cmd + K`)
- `/` shortcut to focus side quest input
- `?` command/help overlay
- `F` focus mode
- `Esc` closes overlays
- Separate enhancement layer so new UI features can be developed without mixing them into the core application

## Run
Open `index.html` directly, or use VS Code Live Server. No build process is required.

## GitHub Pages
Upload the complete folder while preserving the `css` and `js` folders. Then enable GitHub Pages from the repository Settings.

## Analytics & profile dashboard

The enhanced version includes a real in-browser command center:

- Overview metrics for level, XP, quest clears, dungeon performance, streaks and achievements
- Seven-day XP activity chart
- Seven-day quest completion chart
- Weekly scorecard with daily XP and quest counts
- Stat distribution chart
- Achievement system with locked/unlocked milestones
- Editable hunter profile: name, role, bio and primary goal
- Multiple local profiles with create/load/delete controls
- Profile snapshots stored locally in the browser
- Chart.js-powered visualizations

### Important

The analytics are based on the activity recorded by the System log. Older saves can still be loaded, but analytics cannot reconstruct activity that was never recorded.

Chart.js is loaded from jsDelivr. If you want a completely offline build, download the Chart.js library into the repository and replace the CDN script with a local file.
