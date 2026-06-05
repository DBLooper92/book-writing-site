const HARD_TIME_INFERENCE_NOTES = [
  "Preserve the old man / replication technology / digital prison setup.",
  "Keep the human federation and alien federation distinction explicit.",
  "Keep time dilation, AI teachers, the digital city, and the guild economy visible.",
  "Do not invent dates unless the source text provides them.",
];

function buildHardTimeBrainDumpRegressionFixtures() {
  const baseText = `an old man in the future is arrested for trying to offer free technology to the universe.
he wanted to share replication technology, but he hacked into a company system, got caught, and was imprisoned.
his prison is a digital prison.
the federation humanity belongs to has only included humans for about 400 years, so humans are treated like a lower species.
a slick digital security employee sells the old man's digital self to a different federation made up of more violent alien races.
the two federations still trade, travel, and do business across each other's space, but each area has its own rules.
the old man is used as a pawn in sporting events inside the prison system, including digital battles.
the battles range from gladiator-style fights to ww2 d-day style battles to alien battle formats.
time dilation means the battles can last days or two weeks of digital time for every 24 hours in real time.
he spends 100 years in that cycle.
when he is not battling, he is housed in a training program with simple AI teachers that only teach specific skills.
the prisoners can also roam a digital city when they are not being watched.
most prisoners train so they do not die constantly in battle.
there are guilds that sponsor special programs like taste receptors, temporary digital goods, prostitutes, food, and games.
the old man is offered guild positions because of his hacker skills, but he never joins one.
he becomes detached from everyone except for a small group of people with a similar disposition.`;

  return [
    {
      id: "hard-time-original",
      title: "Original BrainDump",
      insertionIndex: 2,
      mustPreservePhrases: [
        "free technology",
        "replication technology",
        "digital prison",
        "lower species",
        "different federation",
        "sporting events",
        "digital battles",
        "time dilation",
        "simple AI teachers",
        "digital city",
        "guilds",
        "hacker skills",
      ],
      duplicateFocus: ["old man"],
      sourceText: baseText,
    },
    {
      id: "hard-time-shorter",
      title: "Shorter Variant",
      insertionIndex: 2,
      mustPreservePhrases: [
        "old man",
        "replication technology",
        "digital prison",
        "human federation",
        "alien races",
        "digital battles",
        "time dilation",
        "guilds",
      ],
      duplicateFocus: ["old man"],
      sourceText: `old man offers free replication tech, gets hacked-caught, and ends up in a digital prison.
humans are treated like a lower species by the federation, then his digital self gets sold to another alien federation for money.
he is used in sporting events and repeated digital battles while time dilation stretches the punishment.
simple ai teachers, a digital city, guild sponsors, and hacker skill offers all show up around him.
he never joins the guilds and mostly keeps to himself.`,
    },
    {
      id: "hard-time-duplicate-heavy",
      title: "Duplicate Heavy Variant",
      insertionIndex: 2,
      mustPreservePhrases: [
        "old man",
        "digital prison",
        "human federation",
        "alien federation",
        "digital city",
        "guilds",
        "time dilation",
      ],
      duplicateFocus: ["old man"],
      sourceText: `old man old man old man.
future old man offers free technology, free replication tech, free replication tech, free replication tech.
he hacks company software and gets caught and gets caught and gets caught.
digital prison, digital prison, digital prison.
human federation looks down on humans, alien federation buys the old man, alien federation buys him again in the notes.
sporting events, digital battles, gladiator-style battles, ww2 d-day style battles, alien battles.
time dilation stretches everything, time dilation stretches everything.
simple ai teachers, digital city, guilds, guild sponsors, taste receptors, food, games, prostitutes, temporary digital goods.
old man never joins a guild, old man never joins a guild.`,
    },
    {
      id: "hard-time-sparse-context",
      title: "Sparse Context Variant",
      insertionIndex: 2,
      mustPreservePhrases: [
        "old man",
        "replication technology",
        "digital prison",
        "digital battles",
        "time dilation",
      ],
      duplicateFocus: ["old man"],
      sourceText: `old man in the future.
tries to give away free replication technology.
gets caught for hacking company software.
digital prison.
sold to another federation.
digital battles with time dilation.
question: what is his hacker ability?
question: who notices him first?
question: does he join a guild or stay isolated?`,
    },
  ];
}

module.exports = {
  HARD_TIME_INFERENCE_NOTES,
  buildHardTimeBrainDumpRegressionFixtures,
};
