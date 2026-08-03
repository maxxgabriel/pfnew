/**
 * THE SKETCHBOOK — every word in it.
 *
 * A drawing tells the story, so there is very little text. A few handwritten
 * cards carry the arc; the spreads around them carry everything else.
 *
 * WHO THE FIGURE IS. Ink. Not a metaphor standing on a page — ink, literally:
 * a drawing who knows he is a drawing, who has been drawn before, and who has
 * been forgotten before. The original conceit was a career and it was the thing
 * wrong with the book: software can be compiled again, so nothing that happened
 * to it ever had any real cost. Ink is the opposite. Ink fades. A page gets
 * turned, and whatever was on it is not there any more. You cannot run a
 * drawing again.
 *
 * With ink at the centre the scenes have a reason to happen: the first line
 * moves because the page draws it, the fall is the page losing interest rather
 * than a crash, no one redraws him but himself, and leaving the sketchbook is
 * leaving the only world that can erase him.
 *
 * WHAT THE STORY NOW COSTS. The old version had exactly one moment of friction —
 * a crash at 3am — resolved by the very next line. Nothing was sacrificed and
 * nothing was lost, and a story where nothing costs anything cannot land an
 * ending about enduring storms. So spread 03 is a real erasure: he stops, and
 * the line is the only place in the book that admits how close it came.
 *
 * WHY IT ENDS IN A STORM. The last card — STORMS / FLOODS / or even / GODS — is
 * about enduring forces vastly larger than yourself, and it is the one thing
 * here kept verbatim. For a drawing the largest force is the real world: real
 * weather, real weight, no erase key. Everything before it has to earn that
 * scale, so the escape does not end on a blank page: he tears out into weather
 * and stands in it. The final spread is the only one that is not paper.
 *
 * VOICE. THIRD PERSON, and tight about it. No "I"; the drawing is "he" and the
 * page that draws him is the only other actor. Lines are short, specific, past
 * tense, and flat — the register of intertitles on a silent film, not prose. A
 * line that would work as a tweet is wrong here. The one exception is the last
 * card, which is the loudest thing here and the only thing allowed to shout.
 */

export const book = {
  owner: 'Max',
  title: 'Sketchbook',
  /*
   * Not No. 1. Two earlier volumes ended with the ink going faint, and a book
   * that numbers itself honestly admits the last two did not make it.
   */
  subtitle: 'No. 3',
  email: 'hello@example.com',
  links: [
    { label: 'GitHub', href: 'https://github.com/' },
    { label: 'Read.cv', href: 'https://read.cv/' },
    { label: 'Are.na', href: 'https://are.na/' },
  ],
} as const;

/**
 * SPREAD 00 — the closed cover, before anything is drawn.
 *
 * The pencil note is `do not open`, which is the joke and also the truth: the
 * book has been opened before, and it knows the last two tries did not end
 * well. The hint answers the warning, so a reader who opens it anyway is doing
 * exactly what the drawing is about to do.
 */
export const cover = {
  scrawl: 'Sketchbook',
  owner: 'Max',
  note: 'do not open',
  hint: 'Open it anyway',
} as const;

/**
 * SPREAD 01 — one stroke on blank paper, and it is his spine.
 *
 * The line that starts him is the first line he ever was. It should be inert;
 * it moves. The aside lands a beat before the reader can possibly know what it
 * means, which is what makes the next page land it.
 */
export const firstLine = {
  note: 'It started with one line.',
  aside: 'He had been this line before.',
} as const;

/**
 * SPREAD 02 — the rest of it gets written, in order.
 *
 * The three parts are what the page remembers about him, in the order the six
 * strokes arrive: a spine, a head, and the hands that will one day take the
 * pen.
 */
export const becoming = {
  note: 'The page drew him from memory.',
  /*
   * Not features — FACULTIES. Each is something the page has to recall rather
   * than invent, in the order it arrives: the first of him, then the place he
   * thinks from, then the hands that will act on what he thinks.
   */
  parts: ['a spine, first', 'then a head', 'then the hands'],
  aside: 'The third time he was drawn.',
} as const;

/**
 * SPREAD 03 — THE FALL. He stops.
 *
 * Four flat blows, and the last is the one that makes it real: not that the
 * work broke, but that he was going faint — the same erasure the two earlier
 * attempts died of. The specific detail is what stops it being a page about
 * how hard things are.
 */
export const theFall = {
  note: 'The page went quiet.',
  card: ['It stopped remembering him.', 'His ink went thin.', 'He was almost gone.', 'Down to one line.'],
} as const;

/**
 * SPREAD 04 — THE TURN. He redraws himself, and takes the pen.
 *
 * The pen handover is the hinge of the whole book: up to here he is being
 * drawn, and after it he is drawing. No one came to fix him, which is the
 * hardest thing on this page and also the most useful.
 */
export const theTurn = {
  note: 'No one was coming to redraw him.',
  card: 'so he picked up the pen.',
  aside: 'Same six lines. His hand.',
} as const;

/** SPREAD 05 — the run. A tracking shot that accelerates, going nowhere and everywhere. */
export const theRun = {
  note: 'He ran for the edge.',
  card: 'the margin was the only door',
  /*
   * A COUNTDOWN, not a refrain. The gaps compress because he is not practising,
   * he is running OUT of page. Each post passes sooner than the last; the final
   * one is the word that is not a number.
   */
  milestones: ['four', 'three', 'two', 'one', 'off'],
} as const;

/**
 * SPREAD 06 — the machine. Each component is real: the things people build
 * outlive themselves, which is why this is what lets him leave.
 */
export type Part = {
  n: string;
  name: string;
  does: string;
  year: string;
  built: string;
};

export const theMachine = {
  note: 'The page could not hold all of him.',
  card: 'He is five things now.',
  parts: [
    { n: 'I', name: 'Ledger', does: 'Where the money went, entered by hand', year: '2025', built: 'Design + build' },
    { n: 'II', name: 'Hum', does: 'Hears a note, shows how far off it is', year: '2025', built: 'Web audio' },
    { n: 'III', name: 'Deadline', does: 'One date, counted down', year: '2024', built: 'Product' },
    { n: 'IV', name: 'Fieldnotes', does: 'Notes in one list, newest last', year: '2024', built: 'iOS' },
    { n: 'V', name: 'Slowly', does: 'A timer for reading. Minutes, nothing else', year: '2023', built: 'Toy' },
  ] satisfies readonly Part[],
} as const;

/**
 * SPREAD 07 — THE ESCAPE. He tears the page open and climbs out.
 *
 * The old version of this beat was a deployment dressed as a climax. What he
 * leaves now is the only world that can erase him — the safe, ruled, forgiving
 * place where every line could be redrawn. He leaves because the five things
 * gave him what he needs to stand outside it, which is exactly what the
 * previous spread argues.
 */
export const theEscape = {
  note: 'So he left the safe thing.',
  aside: 'Nothing out here is ruled.',
} as const;

/**
 * SPREAD 08 — OUT. Off the paper, in weather, on real ground.
 *
 * The only spread that is not a page: dark sky, rain, and him standing there.
 * For a drawing, weather is the largest thing there is — it has no undo, it
 * does not care who is looking, and it will keep raining whether the story
 * does. That scale change is what earns the last card: three words about
 * enduring forces on paper would not land at all.
 *
 * The three words are the one thing in the book kept verbatim from the speech
 * they came from, and the one thing allowed to shout. The colophon says so,
 * because they are not his in the way the rest of it is.
 */
export const theEnd = {
  lead: 'It is worse out here.',
  through: 'and he is still going, against',
  /*
   * Three slabs and a whisper. `or even` is deliberately NOT one of the big
   * words: it is the hinge the phrase turns on, and setting it small keeps
   * STORMS / FLOODS / GODS as three hits of equal weight with the escalation
   * carried by the quiet word between them. Four slabs made "or even" as loud
   * as the nouns, which is the one reading that does not work — GODS has to
   * land hardest and it cannot if the setup shares its size.
   */
  words: ['STORMS', 'FLOODS', 'GODS'],
  hinge: 'or even',
  reach: 'If something you made outlives you.',
  invite: 'Tell me what it is.',
  sign: '— max',
} as const;

/**
 * MARGINALIA — the only words in the edges of the whole book.
 *
 * Three of them, and the restraint is the point. A page scattered with legible
 * asides has the reader reading the edges instead of the drawing, and every one
 * of them competes with the card. Three is enough to establish that someone is
 * working out here, which is all this layer is for. Each is a real thing
 * written next to the thing it is about:
 *
 *   `you again`      beside the first stroke, because he has been it before
 *   `stay`           in the margin of the erasure, one word
 *   `no going back`  beside it tearing its way out of the book
 *
 * `x`/`y` are percentages of the page. `at` is where on that spread's playhead
 * it gets written, so it arrives with its beat rather than waiting there.
 */
export type Jot = {
  text: string;
  x: number;
  y: number;
  at: number;
};

export const marginalia: Record<string, readonly Jot[]> = {
  'first-line': [{ text: 'you', x: 74, y: 30, at: 0.5 }],
  'the-fall': [{ text: 'stay', x: 7, y: 80, at: 0.7 }],
  'the-escape': [{ text: 'no going back', x: 76, y: 20, at: 0.55 }],
};