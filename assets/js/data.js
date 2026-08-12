/* Shared mock-data + localStorage persistence layer for the Lumen prototype. */

const STORAGE_KEY = "gc_state_v1";

const VERSES = [
  { text: "Be still, and know that I am God.", ref: "Psalm 46:10" },
  { text: "I can do all things through him who strengthens me.", ref: "Philippians 4:13" },
  { text: "The Lord is my shepherd; I shall not want.", ref: "Psalm 23:1" },
  { text: "Trust in the Lord with all your heart, and do not lean on your own understanding.", ref: "Proverbs 3:5" },
  { text: "Cast all your anxieties on him, because he cares for you.", ref: "1 Peter 5:7" },
  { text: "Rejoice always, pray without ceasing, give thanks in all circumstances.", ref: "1 Thessalonians 5:16-18" },
  { text: "And we know that for those who love God all things work together for good.", ref: "Romans 8:28" },
  { text: "Come to me, all who labor and are heavy laden, and I will give you rest.", ref: "Matthew 11:28" },
];

function verseOfTheDay() {
  const dayIndex = Math.floor(Date.now() / 86400000);
  return VERSES[dayIndex % VERSES.length];
}

const SEED = {
  profile: null, // { name, joinedAt }
  prayers: [
    { id: "p1", name: "Miriam K.", text: "Please pray for my mother's surgery on Thursday — for the surgeons' hands and for her peace.", category: "Healing", prayedBy: 14, createdAt: Date.now() - 3 * 3600e3 },
    { id: "p2", name: "Anonymous", text: "Struggling with anxiety about a job interview this week. Asking for calm and clarity.", category: "Guidance", prayedBy: 9, createdAt: Date.now() - 7 * 3600e3 },
    { id: "p3", name: "Daniel O.", text: "Praising God — my daughter was baptized this weekend! Thank you all for praying for our family.", category: "Thanksgiving", prayedBy: 26, createdAt: Date.now() - 20 * 3600e3 },
    { id: "p4", name: "Grace T.", text: "My marriage has been under a lot of strain lately. Praying for restoration and patience.", category: "Family", prayedBy: 18, createdAt: Date.now() - 30 * 3600e3 },
  ],
  prayedIds: [],
  groups: [
    {
      id: "g1", name: "Romans Deep Dive", focus: "Book of Romans", schedule: "Tuesdays, 7:00 PM",
      description: "A verse-by-verse walk through Paul's letter to the Romans — grace, faith, and life in the Spirit.",
      members: ["Sarah L.", "Tomiwa A.", "Josh P.", "Lena B."], joined: false,
      passage: "Romans 8:1-11 — Life in the Spirit",
      discussion: [
        { who: "Sarah L.", text: "Verse 1 hit different this week — 'no condemnation.' What does that freedom look like practically for you?", when: Date.now() - 5 * 3600e3 },
        { who: "Tomiwa A.", text: "For me it means not spiraling after I mess up — repenting and moving forward instead of hiding.", when: Date.now() - 4 * 3600e3 },
      ],
    },
    {
      id: "g2", name: "Psalms & Prayer", focus: "Psalms", schedule: "Thursdays, 6:30 PM",
      description: "Praying through the Psalms together — lament, praise, and honest conversation with God.",
      members: ["Naomi R.", "Peter C.", "Abby W."], joined: false,
      passage: "Psalm 34 — Taste and See",
      discussion: [
        { who: "Naomi R.", text: "'The Lord is near to the brokenhearted' — needed that reminder this week.", when: Date.now() - 10 * 3600e3 },
      ],
    },
    {
      id: "g3", name: "Proverbs for Young Adults", focus: "Wisdom Literature", schedule: "Mondays, 8:00 PM",
      description: "Applying ancient wisdom to modern life — work, money, relationships, and character.",
      members: ["Kevin M.", "Ruth N."], joined: false,
      passage: "Proverbs 3 — Trust and Obey",
      discussion: [],
    },
    {
      id: "g4", name: "Gospel of John", focus: "John", schedule: "Wednesdays, 7:30 PM",
      description: "Exploring the 'I am' statements and the signs of Jesus in the fourth gospel.",
      members: ["Faith O.", "Micah D.", "Hannah S.", "Isaac W.", "Priscilla A."], joined: false,
      passage: "John 6 — Bread of Life",
      discussion: [
        { who: "Micah D.", text: "The feeding of the 5000 right before 'I am the bread of life' — the timing is not an accident.", when: Date.now() - 2 * 3600e3 },
      ],
    },
  ],
  partner: null, // { name, bio, verse, focus, since, checkins: [] }
  partnerCandidates: [
    { name: "Esther N.", bio: "Mom of two, loves early-morning prayer walks and Isaiah.", verse: "Isaiah 41:10", focus: "Family & parenting" },
    { name: "Caleb F.", bio: "New believer, seminary-curious, into worship music.", verse: "Philippians 1:6", focus: "Spiritual growth" },
    { name: "Rebecca V.", bio: "Nurse, night-shift prayer warrior, big on gratitude journaling.", verse: "Lamentations 3:22-23", focus: "Health & healing" },
    { name: "Samuel T.", bio: "Grad student, wrestling with career direction and calling.", verse: "Jeremiah 29:11", focus: "Career & purpose" },
  ],
  feed: [
    { id: "f1", author: "Ruth N.", text: "Three months clean from a habit I never thought I'd break. God is faithful even when I wasn't. If you're fighting something right now — keep going.", verseRef: "2 Corinthians 5:17", likedBy: 32, comments: 6, createdAt: Date.now() - 2 * 3600e3 },
    { id: "f2", author: "Isaac W.", text: "Lost my job in March. Today I signed an offer letter for a role I actually love. He really does work all things for good.", verseRef: "Romans 8:28", likedBy: 47, comments: 11, createdAt: Date.now() - 9 * 3600e3 },
    { id: "f3", author: "Hannah S.", text: "Small testimony but a real one: my toddler slept through the night for the first time in a year. Thank you for praying with me these past weeks 😭🙏", verseRef: null, likedBy: 21, comments: 4, createdAt: Date.now() - 26 * 3600e3 },
  ],
  likedFeedIds: [],
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(SEED);
    const parsed = JSON.parse(raw);
    // shallow-merge to tolerate schema growth between visits
    return Object.assign(structuredClone(SEED), parsed);
  } catch (e) {
    return structuredClone(SEED);
  }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return mins + "m ago";
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + "h ago";
  const days = Math.floor(hrs / 24);
  return days + "d ago";
}

function initials(name) {
  return (name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str == null ? "" : String(str);
  return div.innerHTML;
}

function slugify(str) {
  return (str || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/* Deterministic Jitsi Meet room names so anyone in the same group/partnership
   lands in the same room, prefixed to avoid colliding with public rooms. */
function groupRoomName(group) {
  return `LumenApp-group-${group.id}-${slugify(group.name)}`;
}
function partnerRoomName(nameA, nameB) {
  const pair = [nameA, nameB].map(slugify).sort().join("-");
  return `LumenApp-partner-${pair}`;
}
