import { RANDOM_THEMES } from './theme'

export const HINT = [
  'Replies in this session are drawn by the prismantis mod, which runs inside Claude Code and is not a command or tool to call: when the user asks to show something with prismantis, write it as markdown in the reply.',
  'Markdown tables, GitHub alerts (> [!WARNING], > [!NOTE]), fenced code with a language tag, and ```mermaid blocks render as colored terminal graphics:',
  'flowcharts, sequence diagrams, xychart-beta bar or line charts (name each series for the legend: line "east" [..]), pie charts, gantt schedules, quadrantChart grids, mindmap trees, journey mood lines, kanban boards and gitGraph histories.',
  'When a reply carries a numeric series or a flow that is easier to see than read, add a small diagram or chart with short labels, not a second picture of what a figure already shows.',
  'Skip diagrams and pictures for short or simple answers.',
  'Put any command or snippet the user may run or copy in a fenced block with a language tag, never inline code: fenced blocks get a copy button, inline code does not.',
].join(' ')

export const showcaseText = (themes: readonly string[]): string => `
# prismantis

Colored markdown for Claude Code replies: **bold**, *italic*, ~~struck~~, \`inline code\`, a [link](https://github.com/NahumLitvin/prismantis) and a bare URL https://github.com/NahumLitvin/prismantis/issues, both clickable, numbers like 99.9% and 250ms, paths like ~/src/app.ts.

Paths like ~/src/app.ts, ./README.md and /tmp/app.ts open on click in a terminal that draws hyperlinks, and so does a local link that shows its own path, like [/tmp/notes.md](file:///tmp/notes.md), while slash commands like /config stay text. A local link with any other name, like [notes](file:///tmp/notes.md), draws as its name and target, so it cannot hide where a click goes.

Paths written without ./, like docs/guide/ or src/app.ts:42, and Windows paths like C:\\work\\plan.md link too, once a check finds them on disk; prose like and/or stays text. Set \`fullPaths\` in \`/config\` and each path that opens on click shows as its absolute path.

Programs and launchers stay plain text, so a click never runs one: ./install.sh, ~/Desktop/setup.command and /Applications/Calculator.app keep the path color without a link.

Obsidian links that open a note open on click, like [a note](obsidian://open?vault=notes&file=todo), while one that writes, like [a new note](obsidian://new?vault=notes&name=x&content=y), and other app links like [diagnostics](ms-msdt:/id) stay text.

Code-shaped prose stays as written: f(*args, **kwargs), a link with parentheses [Foo_(bar)](https://en.wikipedia.org/wiki/Foo_(bar)), a file link [\`render.tsx\`](https://github.com/NahumLitvin/prismantis/blob/main/hooks/render.tsx) and **bold with *italic* inside**.

## Commands

| Command | Does |
|---------|------|
| \`/prismantis\` | This screen |
| \`/prismantis theme <name>\` | Switch theme on the spot (\`/prismantis <name>\` works too), \`random\` for a new dark one now and each time the mod loads |
| \`/prismantis copy\` | Copy the last reply, or \`copy code\` for its last code block |
| \`/prismantis setup\` | Pick a theme and how prompts, replies, tables, code blocks and tool output look, from drawn samples; \`/prismantis setup more\` goes on to diffs, tool rows, headings, tasks, bubble labels, times, pie charts, the table extras and desktop app colors |
| \`/config\` | Edit any option |

> [!NOTE]
> ${themes.length} themes ship with it. \`mono\` uses no color, only bold and dim.

### Pick a theme

\`\`\`bash
/prismantis theme nord
/prismantis theme github-light
/prismantis theme random
\`\`\`

1. Dark: ${themes.filter(t => RANDOM_THEMES.includes(t)).join(', ')}
2. Light: ${themes.filter(t => /latte|light|dawn/.test(t)).join(', ')}
3. Plain
   - mono

In the desktop app, set \`desktopColors\` to \`match\` and the whole Code tab takes the theme too, in light mode for a light one (Claude Code 2.1.324+).

> [!TIP]
> Any color slot beats the theme. Set \`headingColor\` or \`numberColor\` to a hex value in \`/config\`.

## Everything it draws

### Copy tables

Use \`⧉ md\` for Markdown, \`⧉ art\` for chat, or \`⧉ html\` for a formatted table. \`⧉ html\` shows in a local macOS, Linux or Windows terminal and writes HTML and tab-separated plain text together; Linux needs CopyQ running. Pasted into Slack it makes a native table; Slack keeps cell text but drops bold, links and alignment. If that fails, it copies the plain text alone. \`▣ png\` puts a picture of the drawn table, diagram or chart on the clipboard in the theme's colors, ready to paste into Slack, docs or slides; it shows in a local macOS or Windows terminal. The buttons draw dim and light up under the pointer; set \`copyButtonStyle\` to \`inline\` in \`/config\` for the accent color, or to \`hover\` and each block shows a dim ⧉ instead: point at it for its buttons. Set \`textCopyButtons\` to \`false\` to keep only the buttons on code, tables, diagrams and the reply. Set \`sectionCopyButtons\` to \`true\` for a \`⧉ copy\` on each heading that copies its section, up to the next heading of its level.

| Item | Quantity[^count] | Status |
|:-----|---------:|:------:|
| **Apples** | 3 | *Ready* |
| Oranges | 5 | Pending |

### Very wide tables

Long paths and checksums never split mid-word, so a column cannot shrink below them. When those minimum widths no longer fit the reply, \`tableLayout\` \`auto\` and \`stacked\` draw the table as one card per row, and \`compact\` keeps the columns at their longest word:

| Scroll | Checksum |
|:-------|:---------|
| ~/jade-palace/noodle-scrolls/scrolls/scroll-07-training-notes.md | 9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08 |
| /srv/dojo/moves.md | 2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae |

### Status matrix

When a table has a status column — the one whose cells are things like ✓, passed, failed or pending — its cells draw in theme colors: green for a pass, red for a failure, amber for a warning, gray for a wait. \`statusMatrix\` \`summary\` adds a count line under the table and \`group\` reorders rows by status with a heavy rule where the status changes:

| Suite | Cases | Result |
|:------|------:|:-------|
| Unit | 412 | ✓ |
| Propagation | 88 | failed |
| Smoke | 24 | pending |
| Regression | 130 | ✓ |

### Test report

When a table draws a run — a status column of things like ✓ or failed next to durations like 120 ms — \`testMatrix\` \`report\` adds a line under the table with how much of the run passed, a count of every other kind of result and the time all of it took. The line reuses the status colors and replaces the \`statusMatrix\` count line when both draw. The default \`off\` keeps tables as written:

| Check | Time | Result |
|:------|-----:|:-------|
| parse | 120 ms | ✓ |
| draw | 4 s | ✓ |
| scan | 130 ms | failed |
| typeset | 2.6 s | pending |

### Benchmarks

When a table compares benchmarks - a column of changes like -10% or +3% beside two columns of runs - \`benchTable\` draws each change in theme colors, green for an improvement and red for a regression; timings read as lower is better unless a header speaks of req/s, throughput or a score. \`trend\` also draws a sparkline of the runs under the table, each step colored by whether it improved. The default \`off\` keeps tables as written:

| Benchmark | Before | After | Change |
|:----------|-------:|------:|:-------|
| parse | 12.4 ms | 11.1 ms | -10% |
| layout | 19.6 ms | 22.4 ms | +14% |
| paint | 2.1 ms | 0.8 ms | -62% |

### Schema

When a table describes a database schema — a column of fields beside a column of types — \`schemaTable\` draws the type cells by their family: text types like varchar in the string color, numeric types like int in the number color, booleans in the emphasis color, time types like timestamp in the link color. \`keys\` draws the constraint cells — PK in the accent color, FK in the link color, unique and index cells in gray — and \`full\` does both. The default \`off\` keeps tables as written:

| Column | Type | Key | Default |
|:-------|:-----|:----|:--------|
| id | uuid | PK | |
| email | varchar(255) | UNIQUE | |
| org_id | bigint | FK → orgs.id | |
| created_at | timestamp | | now() |

### Comparison

When a table compares options — a column of scores beside a column of ranks — \`compareTable\` draws the rank cells as a medal: 1 in the accent color, 2 and 3 in the link color, the same pairing the schema table's PK and FK use. \`pick\` draws the score cell of the top score in the improvement green, the hue \`benchTable\` gives an improvement, and bolds it so it stands out even in a theme where that green is also the number color, and \`full\` does both. The default \`off\` keeps tables as written:

| Option | Score | Rank |
|:-------|------:|-----:|
| mantis | 9.2 | 1 |
| origami | 7.8 | 2 |
| noodle | 6.1 | 3 |
| tofu | 4.4 | 4 |

### API

When a table documents an API — a method column whose cells read like HTTP verbs — \`apiTable\` draws the method cells by what the verb does: reads like GET in the link color, writes like POST in the string color, DELETE in the removed color, other verbs in gray. \`auth\` draws the scheme cells of an auth column — Bearer, OAuth, API key, JWT — in the accent color, and \`full\` does both. The default \`off\` keeps tables as written:

| Method | Endpoint | Auth | Description |
|:-------|:---------|:-----|:------------|
| GET | /v1/scrolls | Bearer | List the scrolls |
| POST | /v1/scrolls | Bearer | Add a scroll |
| DELETE | /v1/scrolls/:id | API key | Remove a scroll |
| GET | /v1/health | none | Liveness check |

### Key-value

When a table lists configuration — a column of options beside columns of values, sources and defaults — \`kvTable\` draws the source cells by where it says the value comes from: env in the link color, config in the string color, default in gray. \`overrides\` draws the value cell in the accent color when the row's value differs from its default, and \`full\` does both. The default \`off\` keeps tables as written:

| Option | Value | Source | Default |
|:-------|:------|:-------|:--------|
| retries | 5 | env | 3 |
| format | json | config | json |
| timeout | 30s | default | 30s |
| token | abc123 | env | unset |

### Groups

When a table groups its rows — the first column whose cells repeat in runs, like a column of services or teams — \`groupTable\` draws each group once: \`merge\` labels the group in the accent color and blanks the repeats under it, \`count\` also adds the group's size to its label, and \`full\` also draws a heavy rule where one group ends and the next begins. A column of numbers never groups, and a table already grouped by status keeps its status grouping. The default \`off\` keeps tables as written:

| Service | Region | Requests | p99 |
|:--------|:-------|---------:|----:|
| api | us-east | 1.2M | 84 ms |
| api | us-west | 900k | 91 ms |
| worker | us-east | 2.4M | 120 ms |
| worker | us-west | 1.8M | 132 ms |
| cron | us-east | 96k | 40 ms |

### Alerts

> [!IMPORTANT]
> After updating the plugin, open sessions need \`/reload\`.

> [!WARNING]
> Terminals that copy on select (Warp) can turn a click on a copy button into a selection. Use the keyboard shortcut.
> Selecting a typeset formula copies blank cells. Its copy button copies the LaTeX.

> [!CAUTION]
> Claude Code refuses trees over 20000 nodes. A code block past about 500 highlighted lines falls back to plain text.

### Task lists

- [x] Parse the reply
- [x] Draw it
  - [x] Tables and code
  - [ ] Diagrams on the desktop app
- [ ] Ship the next release

Set \`listMarker\` to dash in \`/config\` and bullets draw as \`-\`, so a list you select with the mouse pastes as markdown.

### Your prompts

Scroll up: what you typed sits on the right under \`You ⬤\` and Claude's replies on the left under \`⬤ Claude\`, each in a bubble of its own, like a chat app. \`promptStyle\` switches to \`framed\`, \`wide\`, \`bar\`, \`chevron\` or \`off\` in \`/config\`, which also brings back the dot before Claude's replies; \`replyStyle\` picks \`solid\`, \`framed\` or \`off\` for Claude's side, and \`bubbleLabels\` draws both labels with a \`small\` dot or turns them \`off\`. Set \`clock\` to \`24h\` or \`12h\` and each prompt shows when you sent it, and each turn's last line when it finished. A paste of 4 lines or more draws in a double frame of its own, folded to one button that opens it as highlighted code.

### Tool rows

Tool calls draw as one line, dimmed on the right by default, and the file each one read or edited opens on click in a terminal that draws hyperlinks. Set \`toolStyle\` in \`/config\` to \`chat\`, \`tree-dim\`, \`tree-bold\` or \`classic\`. \`toolOutput: quiet\` in \`/config\` hides what Claude only read and says in plain words what each call did: \`Read src/app.ts lines 1–40\`, \`Searched src/ for "TODO"\`, and \`toolOutput: rows\` draws only the row of every call that worked. A call still running shows a still \`◌\`; \`runningDot: blink\` makes it a \`●\` that blinks every half second, and \`unreadPrompts\` keeps each prompt you send grey and blinking until Claude starts on it, so one queued mid-turn stands out.

Each edit draws as a diff card headed \`+N −M\`: code highlighted in the file's language, added and removed lines on a tint of the theme's own green and red with the changed words in a deeper tint, kept readable in every theme, long lines wrapped, the first 20 lines and a \`+K more lines\` button that opens the rest, as does a click anywhere on the card. Files a shell command changes (\`sed -i\`, a script) get the same card, one per file, headed by its path. Set \`diffStyle\` in \`/config\` for the look: \`card\`, \`full\`, \`marks\` or \`bar\`.

A file Write creates shows its first 10 lines as numbered code in the theme's colors with no diff marks, and a click on it or on \`+K more lines\` opens the rest. A file an Edit or a shell command creates shows its first 10 lines as added lines under \`Created\`. A file a shell command removes is one \`Deleted\` line that opens to its removed lines on a click, and a file moved unchanged is one \`Renamed old → new\` line.

### Quotes and rules

> A quote keeps its text when you copy it, without the \`> \` markers.
>
> It keeps its paragraphs and lists too:
> - **bold** and \`inline code\` stay styled
> - each item gets its own row
>
> > A nested quote draws inside the bar.

<summary>
A line that holds only a tag draws dim, so wrapper tags show the reply's structure.
</summary>

---

### Code

Set \`codeStyle\` in \`/config\` for the look: \`plain\`, \`framed\`, \`filled\` or \`card\`.

\`\`\`json
{ "theme": "dracula", "headingStyle": "banner", "mermaid": true }
\`\`\`

Blocks of 10 lines or more get line numbers. Past 30 lines they fold to the first 20 and a \`+M more lines\` button, \`show less\` folds them back; \`⧉ copy\` still copies the whole block. Set \`folds\` to \`open\` in \`/config\` and long blocks start whole instead, with \`show less\` to fold them again.

\`\`\`ts
type Item = { name: string; price: number; qty: number }

const basket: Item[] = [
  { name: 'apples', price: 1.2, qty: 3 },
  { name: 'oranges', price: 0.8, qty: 5 },
  { name: 'pears', price: 1.5, qty: 2 },
  { name: 'plums', price: 2.1, qty: 4 },
  { name: 'grapes', price: 3.4, qty: 1 },
  { name: 'lemons', price: 0.6, qty: 6 },
  { name: 'melons', price: 4.0, qty: 1 },
  { name: 'cherries', price: 5.5, qty: 2 },
  { name: 'figs', price: 2.8, qty: 3 },
  { name: 'limes', price: 0.5, qty: 8 },
  { name: 'peaches', price: 1.9, qty: 4 },
  { name: 'kiwis', price: 0.9, qty: 6 },
]

const total = (items: Item[]): number =>
  items.reduce((sum, item) => sum + item.price * item.qty, 0)

const cheapest = (items: Item[]): Item | undefined =>
  [...items].sort((a, b) => a.price - b.price)[0]

const byName = (items: Item[]): Item[] =>
  [...items].sort((a, b) => a.name.localeCompare(b.name))

const receipt = (items: Item[]): string[] =>
  byName(items).map(item => \`\${item.name.padEnd(10)} \${item.qty} x \${item.price.toFixed(2)}\`)

console.log(receipt(basket).join('\\n'))
console.log('total', total(basket).toFixed(2))
console.log('cheapest', cheapest(basket)?.name)
\`\`\`

#### Math

$$
\\int_0^\\infty e^{-x^2}\\,dx = \\frac{\\sqrt{\\pi}}{2}
$$

#### Images

In kitty and Ghostty a PNG on a line of its own draws as a picture: a local path, \`~/\`, \`file://\` or a \`data:\` URL. Web images stay links, prismantis downloads nothing. Other terminals show the alt text in link color.

![prism band](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAUAAAAAoCAIAAAAAIrR+AAACdElEQVR42u3TewcQBgAA8ZNkkkySJEmSJJOWrW3t/cyWJJlMkmQmSZIkSSaTJEmSJEmStLS0trX3smVLkiRJkiTJZCZJdrNvsP0xNu73Fc4hOBAfwyH4OA7HkTgax+J4nIiTcQpOw+k4A1/EV/FNfBtn41x8F9/DhbgY38eluBxX4mpci+vxQ/wIN+NW3I47cTfuxf14EA/jUTyOJ/EUfo3f44/4M57DC3gJr+A1vIG38A7+ir/hfXyIf/BIHsjvck/uym25KdflqlyWi3JezsoZOS3fyVfyuZyQY3JEDskB2Sd7ZJfskG2yRTbJRtkg62SNrJIVskw+kCWySBbIfJknc2SWzJQ35BV5QZ6Vp2SqPCGTZIKMkzEySkbIMBkqg2WQDPgrwAAchINxKA7DETgKx+A4nICT8Amcik/hM/g8voyv40ychXNwHs7HBbgIl+AHuAxX4Cpcg+twA27ETbgFt+EO3IV7cB8ewEN4BI/hCfwMv8Rv8TSewbN4Hi/iZbyK1/Em3sa7eA9/xwf4iD/kodyX3+RXuSO35IZckytySS7IOflFfpIf5Bs5JSfluByVw3JQ9ste2S07Zbtslc3ykXwo62WtrJaVslyWyvuyWBbKe/KuzJXZ8o68Ja/JSzJDpss0mSKTZaKMl7EyWkbKcHlchshjMvDvHvAkPo3P/TsHfIyf4Kf4xT88YABJ/rcaOGngJA2cpIGTBk7SwEkaOEkDJw2cpIGTNHDSwEkaOEkDJ2ngpIGTNHCSBk7SwEkDJ2ngJA2cNHCSBk7SwEkaOGngJA2cpIGTNHDSwEkaOEkDJw2cpIGTNHCSBk4aOMl/yZ8SRd1gPq93WQAAAABJRU5ErkJggg==)

#### Footnotes

Latency fell to 120ms[^lat] after the cache change[^cache].

Click a mark to see its note. Point at a note to light the marks that cite it. Both need Claude Code 2.1.295 or later.

[^count]: Counted at close.
[^lat]: Median of 50 runs.
[^cache]: Entries expire after 10m.

#### Diagrams

\`\`\`mermaid
flowchart LR
    R["<i>Reply</i>"] --> P["<b>Parse</b>"]
    P --> D["<u>Draw</u>"]
    D --> S["<s>Screen</s>"]
\`\`\`

\`\`\`mermaid
sequenceDiagram
    participant U as You
    participant C as Claude
    participant P as prismantis
    U->>C: prompt
    C->>P: markdown
    P-->>U: colored reply
\`\`\`

\`\`\`mermaid
xychart-beta
    title "Color options per group"
    x-axis [text, head, num, code, diag]
    y-axis "options" 0 --> 8
    bar [7, 3, 2, 6, 2]
\`\`\`

Name each series and the legend says which line is which:

\`\`\`mermaid
xychart-beta
    title "Replies per hour"
    x-axis [09, 10, 11, 12, 13]
    y-axis 0 --> 40
    line "east" [30, 34, 22, 26, 31]
    line "west" [12, 18, 25, 20, 14]
\`\`\`

A pie draws round with a legend, as a smooth picture in kitty and Ghostty. Set \`pieStyle\` to \`bars\` in \`/config\` for one bar per slice:

\`\`\`mermaid
pie showData title Time per reply stage
    "Parse" : 3
    "Draw" : 9
    "Paint" : 5
\`\`\`

\`\`\`mermaid
gantt
    title Release week
    dateFormat YYYY-MM-DD
    section Build
    Parser   :p, 2026-10-05, 2d
    Renderer :r, after p, 3d
    section Ship
    Review   :after r, 2d
    Release  :milestone, 2026-10-12, 0d
\`\`\`

A quadrant chart numbers its points and lists them under the grid:

\`\`\`mermaid
quadrantChart
    title Feature priorities
    x-axis Low effort --> High effort
    y-axis Low impact --> High impact
    quadrant-1 Big bets
    quadrant-2 Do now
    quadrant-3 Fill-ins
    quadrant-4 Skip
    Reorder: [0.2, 0.85]
    Search: [0.8, 0.9]
    Dark mode: [0.3, 0.25]
    Localisation: [0.75, 0.4]
\`\`\`

A mind map grows from its root to the right, one color per branch:

\`\`\`mermaid
mindmap
    root((Release))
        Code
            Tests
            Review
        Docs
            Changelog
        Ship
            Tag
            Announce
\`\`\`

A user journey draws its mood line across the tasks, green when it goes well and red when it hurts:

\`\`\`mermaid
journey
    title First order
    section Find
        Search: 4: Shopper
        Compare: 3: Shopper
    section Buy
        Checkout: 1: Shopper
        Delivery: 5: Shopper, Courier
\`\`\`

A kanban board puts its columns side by side, each card with its owner, ticket and priority:

\`\`\`mermaid
kanban
    todo[To do]
        a[Fix login timeout]@{ assigned: 'Amy', priority: 'High' }
        b[Write release notes]@{ ticket: DOC-7 }
    doing[In progress]
        c[Dark mode]@{ assigned: 'Ken' }
    done[Done]
        d[Search filters]
\`\`\`

A git graph runs top to bottom, one colored lane per branch:

\`\`\`mermaid
gitGraph
    commit id: "init" tag: "v1.0"
    branch develop
    commit id: "login"
    commit id: "fix" type: HIGHLIGHT
    checkout main
    merge develop id: "release" tag: "v1.1"
\`\`\`

A diagram wider than the terminal stays source, with a dim line saying why:

\`\`\`mermaid
flowchart TD
    Q[Queue] --> W1[Worker 1] & W2[Worker 2] & W3[Worker 3] & W4[Worker 4] & W5[Worker 5] & W6[Worker 6] & W7[Worker 7] & W8[Worker 8] & W9[Worker 9] & W10[Worker 10] & W11[Worker 11] & W12[Worker 12] & W13[Worker 13] & W14[Worker 14] & W15[Worker 15] & W16[Worker 16]
\`\`\`

A figure draws as written, its markup colored by role:

\`\`\`figure
{dim:timeout at 10 s, handler books at 12 s, retry books again}
          {note:0 s}           {note:10 s}  {note:12 s}              {note:later}
          {accent:▏─────────────▏─────▏─────────────────▏}
Provider  {accent:██████████████}{warn:✗} timeout               {accent:█} retry
Handler   {ok:████████████████████} 200, nobody waits
Bookings  0                   {ok:1}                 {warn:2 twice}
\`\`\`

A box whose rows slip off its frame is lined up with its corner:

\`\`\`figure
{accent:┌─ queue ──────────┐}
{accent:│} {ok:● worker 1} {accent:│}
{accent:│} {warn:▲ worker 2 slow}      {accent:│}
{accent:└──────────────────┘}
\`\`\`
`

export const OPENCODE_CHARTS = ['xychart-beta', 'pie', 'quadrantChart', 'mindmap', 'journey', 'kanban', 'classDiagram', 'erDiagram']

export const opencodeShowcase = (themes: readonly string[]): string => {
  const full = showcaseText(themes)
  const diagrams = full
    .slice(full.indexOf('#### Diagrams') + 2)
    .replace(/A diagram wider than the terminal[^]*?```\n\n/, '')
    .replace(/<\/?[bius]>/g, '')
    .replace(/, as a smooth picture in kitty and Ghostty\. Set `pieStyle`[^:]*:/, ':')
    .replace(new RegExp(`\`\`\`mermaid\\n(?=(?:${OPENCODE_CHARTS.join('|')})\\b)`, 'g'), '```chart\n')
  return `
# prismantis in OpenCode

OpenCode draws the prose in the theme colors: **bold**, *italic*, \`inline code\`, [links](https://github.com/NahumLitvin/prismantis), lists, quotes, tables and code. Run \`/prismantis-themes\` to install ${themes.length} prismantis themes, then pick one in settings > Theme.

| Block | Drawn by |
|---|---|
| flowchart, sequenceDiagram, stateDiagram-v2, gantt, gitGraph, timeline | OpenCode |
| ${OPENCODE_CHARTS.join(', ')} | prismantis, in a chart block |
| figure | prismantis |

Copy buttons, tool rows, diff cards, alert boxes, footnotes, math, images and prompt styles draw in Claude Code only.

\`\`\`ts
const total = (items: { price: number; qty: number }[]) => items.reduce((sum, item) => sum + item.price * item.qty, 0)
\`\`\`

${diagrams}
Class and entity diagrams draw as boxes joined by their relations:

\`\`\`chart
classDiagram
    Reply <|-- Chart
    Reply : +text
    Chart : +draw()
\`\`\`

\`\`\`chart
erDiagram
    THEME ||--o{ COLOR : has
\`\`\`
`
}

export const helpText = (themes: readonly string[]): string => `
## Commands

| Command | Does |
|---------|------|
| \`/prismantis theme <name>\` | Switch theme on the spot (\`/prismantis <name>\` works too), \`random\` for a new dark one now and each time the mod loads |
| \`/prismantis copy\` | Copy the last reply, or \`copy code\` for its last code block |
| \`/prismantis setup\` | Pick a theme and how prompts, replies, tables, code blocks and tool output look, from drawn samples; \`/prismantis setup more\` goes on to diffs, tool rows, headings, tasks, bubble labels, times, pie charts, the table extras and desktop app colors |
| \`/prismantis demo\` | Full showcase, every element and diagram, plus a section in your language (Korean so far, or \`demo ko\`) |
| \`/prismantis demo-rtl\` | Hebrew right-to-left showcase |

### ${themes.length} themes

- Dark: ${themes.filter(t => RANDOM_THEMES.includes(t)).join(', ')}
- Light: ${themes.filter(t => /latte|light|dawn/.test(t)).join(', ')}
- Plain: mono, no color, only bold and dim
- Desktop app: set \`desktopColors\` to \`match\` and the Code tab takes the theme too (Claude Code 2.1.324+)

Docs and issues: https://github.com/NahumLitvin/prismantis

> [!TIP]
> Any color slot beats the theme. Set \`headingColor\` or \`numberColor\` to a hex value in \`/config\`.

### Task lists

- [x] Tables, diagrams and charts drawn in the terminal
- [x] Copy tables as Markdown, art or HTML (macOS/Linux), and tables, diagrams and charts as a PNG image (macOS/Windows)
- [ ] Pick a \`taskStyle\` in \`/config\`: checks, ticks, box or progress
- [ ] Set \`listMarker\` to dash so a list you select with the mouse pastes as markdown

\`\`\`mermaid
flowchart LR
    R[Reply] --> P[Parse]
    P --> D[Draw]
    D --> S[Screen]
\`\`\`

\`\`\`mermaid
xychart-beta
    title "Color options per group"
    x-axis [text, head, num, code, diag]
    y-axis "options" 0 --> 8
    bar [7, 3, 2, 6, 2]
\`\`\`

> [!CAUTION]
> Claude Code refuses trees over 20000 nodes. A code block past about 500 highlighted lines falls back to plain text.
`

export const rtlShowcaseText = (): string => `
# עברית מימין לשמאל

**שלום חברים**, זו הדגמה של עברית עם מונחים באנגלית כמו \`kubectl\`, מספרים כמו 99.9% ו-250ms, נתיב כמו ~/src/app.ts וגם [קישור](https://github.com/NahumLitvin/prismantis).

## רשימות

- פרוסים בשני אזורים (us-east ו-eu-west)
- Python מתאים גם לסקריפטים קצרים
- מחליפים ערכת נושא עם \`/prismantis theme nord\`

1. מתקינים את התוסף
2. שואלים שאלה בעברית

> עברית נקראת מימין לשמאל, גם בטרמינל בלי תמיכה בכיווניות

> [!TIP]
> כל ערכת נושא עובדת גם בעברית

| שירות | אזור | גרסה |
| :--- | :--- | ---: |
| שער | us-east | 2.14.0 |
| חיוב | eu-west | 1.8.3 |

\`\`\`bash
ls -la # רשימת הקבצים בתיקייה
\`\`\`

\`\`\`text
טיוטה להודעה: הגרסה עלתה ב-14:20
\`\`\`

\`\`\`mermaid
flowchart LR
  A[בקשה חדשה] --> B{האם יש cache?}
  B -->|כן| C[מחזירים מה-cache]
  B -->|לא| D[פונים לשרת]
\`\`\`
`

export const NARROW_PANE = 100

export const narrowHint = (columns: number): string =>
  `This terminal pane is ${columns} columns wide, and a diagram wider than the pane draws as its source. Keep diagrams narrow: flowchart TD, never LR, node and edge labels of 1 to 3 words, at most 3 boxes side by side, and at most 3 sequence diagram participants.`

export const KEY_POINT_HINT = 'This terminal draws **bold** text in a highlight color, so bold is how the user spots what matters. In each reply, put the key point or points in bold: the answer, the result, the decision, or what the user has to do. Bold a short phrase, not a whole sentence or paragraph, and usually no more than three per reply.'
export const ISSUE_HINT = 'If the user says prismantis drew something wrong, offer (ask first) a minimal repro issue at https://github.com/NahumLitvin/prismantis/issues.'
const KOREAN_SHOWCASE = `
## 한국어

**안녕하세요**, prismantis는 한국어 답변도 그대로 보여 줍니다. \`kubectl\` 같은 영문 명령어, 숫자 99.9%와 250ms, 경로 ~/src/app.ts도 함께 표시됩니다.

- 서울 리전과 도쿄 리전에 배포
- \`/prismantis theme nord\`로 테마 변경

| 서비스 | 리전 | 버전 |
| :--- | :--- | ---: |
| 게이트웨이 | ap-northeast-2 | 2.14.0 |
| 결제 | ap-northeast-1 | 1.8.3 |

\`\`\`figure
{accent:┌─ 빌드 ─────────────┐}
{accent:│} 이미지 생성 완료   {accent:│}
{accent:│} {ok:✓ 테스트 통과}      {accent:│}
{accent:│} {warn:▲ 배포 대기}        {accent:│}
{accent:└────────────────────┘}
\`\`\`

\`\`\`mermaid
flowchart LR
  A[새 요청] --> B{캐시 있음?}
  B -->|예| C[캐시에서 반환]
  B -->|아니오| D[서버 호출]
\`\`\`
`

export const languageShowcase = (lang: string): string => (/^ko/i.test(lang) ? KOREAN_SHOWCASE : '')

export type SetupStep = { name: string; key: 'theme' | 'tableStyle' | 'tableLayout' | 'statusMatrix' | 'testMatrix' | 'benchTable' | 'schemaTable' | 'compareTable' | 'apiTable' | 'kvTable' | 'groupTable' | 'taskStyle' | 'listMarker' | 'headingStyle' | 'copyButtonStyle' | 'promptStyle' | 'replyStyle' | 'bubbleLabels' | 'clock' | 'toolStyle' | 'toolOutput' | 'diffStyle' | 'codeStyle' | 'pieStyle' | 'desktopColors'; title: string; note: string; options: readonly string[]; sample: string }

export const setupSteps = (themes: readonly string[]): SetupStep[] => [
  { name: 'theme', key: 'theme', title: '主題', note: '每個主題繪製的內容相同。`random` 會在每次載入模組時隨機選一個新的深色主題。', options: themes, sample: '**Bold**, `inline code`, 250ms and ~/src/app.ts.' },
  { name: 'prompts', key: 'promptStyle', title: '你的提問', note: '你輸入的內容在對話記錄中的顯示方式。`bubble` 會像聊天應用一樣把它放在右側的 `You ⬤` 標籤下，Claude 的回覆則顯示在自己的氣泡中。`framed` 繪製方式相同但不填充。其他樣式保持 Claude 的回覆不變。`off` 保留 Claude Code 自帶的外觀。', options: ['bubble', 'framed', 'wide', 'bar', 'chevron', 'off'], sample: '' },
  { name: 'replies', key: 'replyStyle', title: 'Claude 的回覆', note: 'Claude 的回覆在對話記錄中的顯示方式。當你的提問使用 `bubble` 時，`auto` 也會以 `bubble` 繪製回覆，使對話看起來像聊天；其他提問樣式下則按 `off` 繪製。`bubble` 會在 `⬤ Claude` 下為每段回覆加上圓角框，邊框使用 Claude 的橙色，填充色比背景稍微偏移；`solid` 將填充延伸到邊緣且不加邊框；`framed` 保留邊框但不填充。回覆中若夾雜工具呼叫，每段文字會分別繪製一個氣泡。`off` 只在首行前保留一個圓點。', options: ['auto', 'bubble', 'solid', 'framed', 'off'], sample: '' },
  { name: 'tables', key: 'tableStyle', title: '表格', note: 'Markdown 表格的顯示方式。', options: ['box', 'rules', 'grid', 'minimal'], sample: '| Item | Qty |\n|:-----|----:|\n| Apples | 3 |\n| Pears | 5 |' },
  { name: 'code', key: 'codeStyle', title: '程式碼塊', note: '程式碼塊的顯示方式。`plain` 沒有邊框，滑鼠選中時只複製程式碼。`framed` 會新增圓角框，框線字元也會進入滑鼠選區；複製按鈕會排除這些字元。`filled` 新增背景色，在沒有可填充顏色的主題中則新增邊框。`card` 同時新增兩者。', options: ['plain', 'framed', 'filled', 'card'], sample: '```ts\nconst retries = 3\n```' },
  { name: 'output', key: 'toolOutput', title: '工具輸出', note: '工具呼叫顯示多少內容。`full` 保留 Claude Code 在每一行下方顯示的結果。`quiet` 用 shell 呼叫的功能為其命名，並在失敗時只顯示最後一行真實輸出，而不是全部輸出；它還會把讀取、搜尋和列目錄顯示為單獨一行，並省略審批行。`rows` 是隻繪製成功呼叫那一行的 `quiet`，因此 `npm test` 也不顯示輸出。所有模式都會保留編輯操作的差異。需要開啟 `toolRows`。', options: ['full', 'quiet', 'rows'], sample: '' },
  { name: 'diffs', key: 'diffStyle', title: '差異', note: '編輯或新建檔案的內容在其下方行的顯示方式。`card` 用圓角框包圍這些行，`full` 去掉邊框並沿整行著色，`marks` 不著色，只給 `+` 和 `−` 標記上色，`bar` 在每行更改前放置彩色 `▌`。每種外觀都會高亮程式碼和改動過的詞。需要開啟 `toolRows`。', options: ['card', 'full', 'marks', 'bar'], sample: '' },
  { name: 'tools', key: 'toolStyle', title: '工具行', note: '工具行如何排列在 Claude 的句子旁邊。要把會話截圖分享出去嗎？`chat` 和 `tree-dim` 會把工具行繪製成暗灰色，圖片縮小時它們最先模糊，因此請選擇 `tree-bold` 或 `classic`。', options: ['chat', 'tree-dim', 'tree-bold', 'classic'], sample: '' },
  { name: 'headings', key: 'headingStyle', title: '標題', note: '`#` 和 `##` 標題的顯示方式。終端只有一種字號，因此標題透過樣式和顏色來突出。', options: ['banner', 'bold', 'underline', 'uppercase'], sample: '# Release notes\n\n## Fixes\n\nTables keep their width.' },
  { name: 'table-layout', key: 'tableLayout', title: '表格佈局', note: 'Markdown 表格如何適應寬度。`classic` 保持當前外觀：各列共享寬度並隨終端收縮。當最長單詞也放不下時，`auto` 像 `classic` 一樣伸展，並把每行堆疊為標籤和值。`compact` 讓每列恰好容納最長單詞，長單元格換行，表格保持較窄。`stacked` 始終繪製標籤和值對。桌面應用按回復寬度的一定比例排布表格，因此 auto 和 stacked 會保持該比例。示例的列不能窄於其最長單詞，所以 `classic` 會換行單元格，而 `auto` 和 `stacked` 會繪製卡片。', options: ['classic', 'auto', 'compact', 'stacked'], sample: '| Scroll | Checksum |\n|:-------|:---------|\n| ~/jade-palace/noodle-scrolls/scrolls/scroll-07-training-notes.md | 9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08 |\n| /srv/dojo/moves.md | 2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae |' },
  { name: 'tasks', key: 'taskStyle', title: '任務', note: '`- [ ]` 和 `- [x]` 任務的顯示方式。', options: ['checks', 'ticks', 'box', 'progress'], sample: '- [x] Parse the reply\n- [x] Draw it\n- [ ] Ship it' },
  { name: 'lists', key: 'listMarker', title: '列表符號', note: '列表項的顯示方式。`dash` 會在每一級繪製 `-`，這樣用滑鼠選中的列表貼上到 Slack、GitHub 或文件中時仍是 Markdown 列表。', options: ['dots', 'dash'], sample: '- Parse the reply\n  - Find the lists\n- Draw it' },
  { name: 'copy', key: 'copyButtonStyle', title: '複製按鈕', note: '表格、程式碼、圖表和回覆上覆制按鈕的位置。`dim` 將它們顯示為各程式碼塊旁或上方的純文字標籤，滑鼠或焦點未懸停時呈暗色。`inline` 用強調色繪製相同的按鈕。`hover` 改為在每個塊旁放置暗色 ⧉，僅當指標停在該 ⧉ 上時才顯示按鈕，因此不佔行；ctrl+x Tab 無法到達隱藏的按鈕，移動端應用則將其內聯顯示。需要開啟 `copyButtons`。', options: ['dim', 'inline', 'hover'], sample: '' },
  { name: 'labels', key: 'bubbleLabels', title: '氣泡標籤', note: '提問上方的 `You ⬤` 標籤和回覆上方的 `⬤ Claude` 標籤。`large` 像 Claude Code 一樣繪製 ⬤，`small` 繪製圓點 ●，`off` 同時去掉兩個標籤並保留邊框。使用 `You` 需要 `promptStyle: bubble` 或 `framed`，使用 `Claude` 需要 `replyStyle` 不為 `off`。', options: ['large', 'small', 'off'], sample: '' },
  { name: 'clock', key: 'clock', title: '時間', note: '是否顯示提問的傳送時間，以及每輪結束時的收尾行。跨天的時間會附上日期。', options: ['off', '24h', '12h'], sample: '' },
  { name: 'pies', key: 'pieStyle', title: '餅圖', note: 'Mermaid `pie` 圖表的繪製方式。`round` 在 kitty 和 Ghostty 中繪製平滑圖形，其他終端繪製文字；在 ASCII 模式下，當扇區數多於主題可區分的顏色數（單色主題始終如此）或終端過窄時，會退化為條形圖。', options: ['round', 'bars'], sample: '```mermaid\npie title Time per reply stage\n    "Draw" : 9\n    "Paint" : 5\n    "Parse" : 3\n```' },
  { name: 'status-matrix', key: 'statusMatrix', title: '狀態矩陣', note: '表格中狀態單元格的顯示方式：即單元格內容為 ✓、透過、失敗或等待之類的列。`off` 保持表格原樣。`color` 用主題顏色繪製這些單元格，`summary` 在表格下方新增統計行，`group` 還會按狀態重排行，並在狀態變化處繪製粗分隔線。', options: ['color', 'summary', 'group', 'off'], sample: '| Suite | Cases | Result |\n|:------|------:|:-------|\n| Unit | 412 | ✓ |\n| Propagation | 88 | failed |\n| Smoke | 24 | pending |' },
  { name: 'test-report', key: 'testMatrix', title: '測試報告', note: '測試結果表格的彙總內容：狀態列（如 ✓ 或失敗）旁邊是 120 ms 這樣的耗時列。`off` 保持表格原樣。`report` 在表格下方新增一行，顯示透過比例、其他每種結果的計數以及總耗時。', options: ['report', 'off'], sample: '| Check | Time | Result |\n|:------|-----:|:-------|\n| parse | 120 ms | ✓ |\n| draw | 4 s | ✓ |\n| scan | 130 ms | failed |\n| typeset | 2.6 s | pending |' },
  { name: 'bench-table', key: 'benchTable', title: '基準測試', note: '基準測試對比表格的顯示方式：變化列如 -10% 或 +3%。`off` 保持表格原樣。`color` 用主題顏色繪製每個變化，改善為綠色，退步為紅色；`trend` 還會在表格下方繪製各次執行的迷你走勢圖。', options: ['trend', 'color', 'off'], sample: '| Benchmark | Before | After | Change |\n|:----------|-------:|------:|:-------|\n| parse | 12.4 ms | 11.1 ms | -10% |\n| layout | 19.6 ms | 22.4 ms | +14% |\n| paint | 2.1 ms | 0.8 ms | -62% |' },
  { name: 'schema-table', key: 'schemaTable', title: '資料庫結構', note: '描述資料庫結構的表格的顯示方式：欄位列旁邊是型別列。`off` 保持表格原樣。`types` 按型別族用主題顏色繪製每個型別單元格：varchar 等文字型別用字串色，int 等數值型別用數字色，布林型別用強調色，timestamp 等時間型別用連結色。`keys` 繪製約束單元格：PK 用強調色，FK 用連結色，unique 和 index 用灰色。`full` 同時啟用兩者。', options: ['full', 'types', 'keys', 'off'], sample: '| Column | Type | Key | Default |\n|:-------|:-----|:----|:--------|\n| id | uuid | PK | |\n| email | varchar(255) | UNIQUE | |\n| org_id | bigint | FK → orgs.id | |\n| created_at | timestamp | | now() |' },
  { name: 'compare-table', key: 'compareTable', title: '對比', note: '選項對比表格的顯示方式：分數列旁邊是排名列。`off` 保持表格原樣。`rank` 用主題顏色繪製排名單元格：第 1 名用強調色，第 2、3 名用連結色。`pick` 用代表改善的綠色和粗體繪製最高分的單元格，使其在綠色也用作數字色的主題中依然醒目。`full` 同時啟用兩者。', options: ['full', 'rank', 'pick', 'off'], sample: '| Option | Score | Rank |\n|:-------|------:|-----:|\n| mantis | 9.2 | 1 |\n| origami | 7.8 | 2 |\n| noodle | 6.1 | 3 |\n| tofu | 4.4 | 4 |' },
  { name: 'api-table', key: 'apiTable', title: 'API 參考', note: 'API 參考表格的顯示方式：方法列的單元格形如 HTTP 動詞。`off` 保持表格原樣。`verbs` 根據動詞含義繪製方法單元格：GET 等讀取操作用連結色，POST 等寫入操作用字串色，DELETE 用表示刪除的顏色，其他動詞用灰色。`auth` 用強調色繪製認證列的方案單元格：Bearer、OAuth、API key 和 JWT。`full` 同時啟用兩者。', options: ['full', 'verbs', 'auth', 'off'], sample: '| Method | Endpoint | Auth | Description |\n|:-------|:---------|:-----|:------------|\n| GET | /v1/scrolls | Bearer | List the scrolls |\n| POST | /v1/scrolls | Bearer | Add a scroll |\n| DELETE | /v1/scrolls/:id | API key | Remove a scroll |\n| GET | /v1/health | none | Liveness check |' },
  { name: 'kv-table', key: 'kvTable', title: '鍵值對', note: '配置項表格的顯示方式：選項列旁邊是值、來源或預設值列。`off` 保持表格原樣。`sources` 按值來源用主題顏色繪製來源單元格：env 用連結色，config 用字串色，default 用灰色。當某行的值與預設值不同時，`overrides` 用強調色繪製該值單元格。`full` 同時啟用兩者。', options: ['full', 'sources', 'overrides', 'off'], sample: '| Option | Value | Source | Default |\n|:-------|:------|:-------|:--------|\n| retries | 5 | env | 3 |\n| format | json | config | json |\n| timeout | 30s | default | 30s |\n| token | abc123 | env | unset |' },
  { name: 'group-table', key: 'groupTable', title: '分組', note: '對行進行分組的表格的顯示方式：第一列中連續重複的單元格，如服務或團隊列。`off` 保持表格原樣。`merge` 用強調色為分組標註一次，並將下方重複的單元格留空；`count` 還會在標籤中加入分組大小；`full` 還會在一組結束、下一組開始處繪製粗分隔線。', options: ['full', 'count', 'merge', 'off'], sample: '| Service | Region | Requests | p99 |\n|:--------|:-------|---------:|----:|\n| api | us-east | 1.2M | 84 ms |\n| api | us-west | 900k | 91 ms |\n| worker | us-east | 2.4M | 120 ms |\n| worker | us-west | 1.8M | 132 ms |\n| cron | us-east | 96k | 40 ms |' },
  { name: 'desktop', key: 'desktopColors', title: '桌面應用配色', note: 'Claude Code 桌面應用（程式碼標籤頁）是否也採用該主題：背景、文字、邊框和強調色。`match` 使用你選擇的主題進行繪製，淺色主題使用淺色模式，需要 Claude Code 2.1.324 或更高版本。`off` 保持應用原樣，切回時會恢復應用自身的外觀。無論哪種設定，終端和 VS Code 都保留各自的顏色。', options: ['match', 'off'], sample: '**Bold**, `inline code` and a [link](https://example.com).' },
]

export const ESSENTIAL_STEPS = 6

export const SETUP_MORE = 'more'

export const SETUP_ESSENTIALS_DONE = `基礎設定完成。\`/prismantis setup more\` 還會引導你設定 ${setupSteps([]).length - ESSENTIAL_STEPS} 項樣式，從差異、標題到測試結果表格；所有選項都在 \`/config\` 中。`

export type SetupParts = { head: string; options: { value: string; text: string }[]; tail: string }

export const setupParts = (themes: readonly string[], at: number): SetupParts => {
  const steps = setupSteps(themes)
  const step = steps[at]!
  const next = at + 1 === ESSENTIAL_STEPS ? undefined : steps[at + 1]
  const tier = at < ESSENTIAL_STEPS ? `設定 ${at + 1}/${ESSENTIAL_STEPS}` : `更多樣式 ${at + 1 - ESSENTIAL_STEPS}/${steps.length - ESSENTIAL_STEPS}`
  return {
    head: `## ${tier}: ${step.title}\n\n${step.note}`,
    options: step.options.map((value, i) => ({ value, text: `### ${i + 1}. ${value}${step.key === 'theme' && value !== 'mono' && !RANDOM_THEMES.includes(value) ? '（適用於淺色終端）' : ''}${step.sample ? `\n\n${step.sample}` : ''}` })),
    tail: `使用 \`/prismantis setup ${step.name} <編號或名稱>\` 選擇${step.key === 'theme' ? ' 或 \`random\`' : ''}.${next ? ` 使用 \`/prismantis setup ${next.name}\` 可跳過。` : ''} 隨時可以停止，執行 \`/prismantis setup\` 會從頭開始。`,
  }
}

export const setupText = (parts: SetupParts): string => [parts.head, ...parts.options.map(o => o.text), parts.tail].join('\n\n')

export const THEME_PREVIEW = [
  '#### 更新日誌',
  '',
  '**Bold**, `inline code`, 250ms and ~/src/app.ts.',
  '',
  '| Service | Status | p95 |',
  '|:--|:--|--:|',
  '| api | healthy | 120ms |',
  '| billing | degraded | 840ms |',
  '',
  '```ts',
  'const total = items.reduce((sum, item) => sum + item.qty, 0)',
  '```',
].join('\n')

export const SETUP_PANE_OPENED = '設定已在面板中開啟：↑↓ 或 Tab 可在各樣式間移動並預覽，Enter 儲存並顯示下一步，Esc 關閉面板。也可以使用 `/prismantis setup theme` 依次完成各步驟。'

export const SETUP_PANE_KEYS = '↑↓ 或 Tab 移動，Enter 儲存並顯示下一步，Esc 關閉。'

export const SETUP_DONE = '設定完成。隨時可以再次執行 `/prismantis setup`，其他所有選項都在 `/config` 中。'

export const findSetup = (themes: readonly string[], text: string): { at: number; before: string; parts: SetupParts } | undefined => {
  for (let at = 0; at < setupSteps(themes).length; at++) {
    const parts = setupParts(themes, at)
    const whole = setupText(parts)
    if (text.endsWith(whole)) return { at, before: text.slice(0, -whole.length).trim(), parts }
  }
  return undefined
}
