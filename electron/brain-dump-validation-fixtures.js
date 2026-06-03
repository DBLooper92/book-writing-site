const BASE_TRILOGY_CONTEXT = `
trilogy arc: Book 1 "Fallow House", Book 2 "The Well Under Salt", Book 3 "Lungglass Winter"
era tags: Before the Ashfall, Lantern Years, After Red Snow
locations recurring: Gutterbank Parish, Saint Veya Catacombs, Hushwater Marsh, Black Choir Mill
factions recurring: Lantern Wardens, Bone Choir, Pilgrim Syndicate
culture/religion/tech recurring: Salt-Kept culture, Rite of Third Breath, lungglass mask filtration tech
themes recurring: inherited guilt, body horror, memory rot, civic denial
`;

function buildInsertionContext(label, helperText, beforeTitles, afterTitles) {
  const beforeEvents = beforeTitles.map((title, index) => ({
    chronologyLabel: `anchor ${index + 1}`,
    id: `before_${index + 1}`,
    position: index + 1,
    relation: "before",
    title,
  }));
  const afterEvents = afterTitles.map((title, index) => ({
    chronologyLabel: `anchor ${beforeEvents.length + index + 1}`,
    id: `after_${index + 1}`,
    position: beforeEvents.length + index + 1,
    relation: "after",
    title,
  }));

  return {
    helperText,
    label,
    surroundingEvents: [...beforeEvents, ...afterEvents],
  };
}

function buildSingleFixtures() {
  return [
    {
      id: "single-01",
      expectedTargets: ["character", "location", "faction", "theme"],
      requiredFields: ["title", "summary", "description", "eventType", "yearStart"],
      insertionContext: buildInsertionContext(
        "Between the mill omen and the catacomb fallout",
        "Place the draft in the gap after the lantern sweep and before the riot.",
        [
          "A wardens' lantern circles the mill yard",
          "Bone Choir clerk checks the salt ledger",
          "Mara watches the key hook from the rafters",
          "The mill office door is left unlatched",
          "A rumor of blood in the prayer bowl spreads",
        ],
        [
          "Mara slips the choir key from the hook",
          "Brother Cal begins the broken third-breath prayer",
          "A fake relic is discovered at the fish stair",
          "The catacomb rite is rushed to cover the theft",
          "Mara is marked with choir ash at dawn",
        ]
      ),
      text: `${BASE_TRILOGY_CONTEXT}
      mara prentice breaks in @ black choir mill before dawn, she sees jars of teeth humming,
      does this work as inciting thing? maybe yes maybe too soon.
      date maybe lantern years 13 late frost. bone choir present, hushwater side door, rain + oil smell.
      cause: father debt to pilgrim syndicate. consequence: mara marked by choir ash.`
    },
    {
      id: "single-02",
      expectedTargets: ["character", "religion", "location"],
      requiredFields: ["title", "summary", "description", "eventType"],
      insertionContext: buildInsertionContext(
        "Around the broken prayer",
        "Keep the event between the catacomb setup and the rumor that follows the blood cough.",
        [
          "Brother Cal prepares the prayer bowl in silence",
          "Salt candles burn low at the catacomb gate",
          "Mara hears the first crack in the hymn",
          "The wardens pretend not to notice the ash smell",
          "Someone drops a candle into the drain channel",
        ],
        [
          "Brother Cal coughs blood into the choir bowl",
          "The congregation freezes as the rite splits open",
          "A winter-child rumor starts in the upper parish",
          "Lantern Wardens deny the omen at sunrise",
          "The catacombs are sealed before noon",
        ]
      ),
      text: `not clean notes:
      Brother Cal drops the third-breath prayer halfway + coughs blood into choir bowl, saint veya catacombs.
      everyone pretends normal. question: does this signal memory rot early enough?
      after red snow year 2-ish maybe evening.
      consequence city rumor: rite broken = winter children wake`
    },
    {
      id: "single-03",
      expectedTargets: ["technology", "culture", "character"],
      requiredFields: ["title", "summary", "description"],
      text: `nora weld tests lungglass mask on child volunteer (bad!) in gutterbank clinic.
      salt-kept families watching from doorway no speaking.
      maybe discovery / maybe conflict. lantern years maybe 19?
      mask fog writes words on inside, says "do not open the well".`
    },
    {
      id: "single-04",
      expectedTargets: ["plotThread", "theme", "location"],
      requiredFields: ["title", "summary", "description"],
      text: `book2 mid: rowan + mara descend well under salt by rope chain.
      they find registry tablets listing unborn names tied to the memory tax plot thread.
      open question: is this revelation or world_event?
      causes old flood maps + archived lies in the lower salt chambers. consequences trust collapse w wardens.`
    },
    {
      id: "single-05",
      expectedTargets: ["faction", "character", "chapter"],
      requiredFields: ["title", "summary", "description"],
      text: `chapter draft "choir vote" maybe chapter 11?
      lantern wardens convene, vote to seal marsh bridges, rowan objects, exiled.
      before ashfall lore invoked as legal precedent.
      does this step on previous political beat?`
    },
    {
      id: "single-06",
      expectedTargets: ["scene", "location", "religion"],
      requiredFields: ["title", "summary", "description"],
      insertionContext: buildInsertionContext(
        "Chapel bell at the mill annex",
        "The draft should read as a place-specific scene inside the Black Choir Mill annex, not just a ritual beat.",
        [
          "The side chapel is still empty when the bell rope is pulled",
          "Mara is already hidden in the rafters above the annex",
          "A soot-smudged map of the mill hangs by the altar",
          "The annex doors are shut against the wind",
          "A guard watches the catwalk from the yard below",
        ],
        [
          "The chapel bell rings 33 times at the Black Choir Mill annex",
          "The third-breath rite is altered to omit the final inhale",
          "Mara leaves a blood print on the annex beam",
          "The wardens find the annex floor marked with ash",
          "The mill priest seals the side chapel before dawn",
        ]
      ),
      text: `scene nugget: chapel bell rung 33 times at the black choir mill annex in gutterbank parish.
      scene beat: the chapel scene in the side chapel is a ritual scene, not just a place note.
      religion beat: the Rite of Third Breath is altered in the side chapel; no final inhale, only ash swallow.
      mara witnesses from rafters above the annex, leaves blood print on the beam by the altar.
      open question: is this a scene beat or a location beat or both?
      place detail matters here because the annex is the place where the rite breaks.`
    },
    {
      id: "single-07",
      expectedTargets: ["book", "theme", "plotThread"],
      requiredFields: ["title", "summary", "description"],
      text: `book3 kickoff turning point?
      red snow hits in noon sunlight, city daylight goes bruise color.
      plot thread memory tax comes due, people forget dead siblings names.
      theme inherited guilt strongest here.`
    },
    {
      id: "single-08",
      expectedTargets: ["technology", "faction", "location"],
      requiredFields: ["title", "summary", "description"],
      text: `pilgrim syndicate deploys steam ossuary cart w lungglass condenser near gutterbank bridge.
      crowd panic. does this read as world_event not personal?
      consequence marsh exodus starts same night.`
    },
    {
      id: "single-09",
      expectedTargets: ["era", "culture", "character"],
      requiredFields: ["title", "summary", "description"],
      text: `era callback: before the ashfall festival reenactment goes wrong.
      character beat: Nora Prentice denounces the salt-kept oath in public square.
      political + personal + religion overlap messy. maybe aftermath beat?`
    },
    {
      id: "single-10",
      expectedTargets: ["character", "location", "theme", "plotThread"],
      requiredFields: ["title", "summary", "description", "publicWikiSummary"],
      text: `finale shard notes:
      mara + rowan burn the name ledgers at saint veya catacombs gate.
      question: does this actually end memory rot or only stop harvest for one winter?
      consequence unresolved: city saved / souls maybe not.
      want public-facing summary line too.`
    },
  ];
}

function buildMultiFixtures() {
  return [
    {
      id: "multi-01",
      minEvents: 3,
      insertionContext: buildInsertionContext(
        "Mill theft to catacomb rupture",
        "Anchor the chain between the quiet pre-dawn theft and the later riot and rite fallout.",
        [
          "Mara scouts the mill roof before dawn",
          "The key hook is left exposed",
          "A wardens' lantern sweeps the yard",
          "Brother Cal still trusts the prayer bowl",
          "Nobody has raised the alarm yet",
        ],
        [
          "Mara steals the choir key from the mill office",
          "Rowan lies at the morning hearing",
          "The fish stair riot breaks out over the fake relic",
          "The catacomb rite goes off-script",
          "The city starts blaming the Bone Choir",
        ]
      ),
      text: `${BASE_TRILOGY_CONTEXT}
      dumping whole sequence rough:
      1) mara steals choir key from mill office midnight.
      2) morning warden hearing, rowan lies to protect her.
      3) noon riot at gutterbank fish stair when fake relic revealed.
      4) evening catacomb rite goes off-script.
      link cause chain: theft -> hearing -> riot -> rite fracture.`
    },
    {
      id: "multi-02",
      minEvents: 3,
      insertionContext: buildInsertionContext(
        "Rope break and bridge blockade",
        "Keep the chain localized to the bridge crisis instead of drifting into later political fallout.",
        [
          "Nora prepares ropes for the well descent",
          "Pilgrims are already gathering on the bridge",
          "A watchman notes the marsh tide is rising",
          "The Bone Choir is seen counting ballots nearby",
          "No one has crossed yet",
        ],
        [
          "The rope breaks and nearly kills Nora",
          "Pilgrims blockade the bridge",
          "The Bone Choir buys city votes at the mill table",
          "A filter ration rumor starts before dusk",
          "The wardens seal the bridge approach",
        ]
      ),
      text: `Book 2 spread bad grammar:
      well rope break almost kills nora,
      then pilgrims blockade bridge,
      then bone choir buys city votes at black choir mill table.
      does blockade happen before rope break? i think after maybe.
      keep ambiguity warning if order uncertain.`
    },
    {
      id: "multi-03",
      minEvents: 3,
      text: `mess notes:
      saint veya bells ring wrong time, children sleepwalk to marsh edge,
      lantern wardens issue curfew,
      mara discovers wardens edited burial registry,
      rowan leaks registry pages to parish wall.`
    },
    {
      id: "multi-04",
      minEvents: 3,
      text: `sequence maybe:
      lungglass shipment arrives broken,
      nora patches masks w mirror resin,
      first patient hallucinates drowned choir,
      syndicate weaponizes panic broadcast.
      era lantern years late period.`
    },
    {
      id: "multi-05",
      minEvents: 3,
      text: `political chain:
      council hearing,
      emergency ash levy passed,
      salt-kept neighborhoods denied filter rations,
      protest march into black choir mill yard,
      rowan detained.
      cause/consequence heavy.`
    },
    {
      id: "multi-06",
      minEvents: 3,
      text: `book3: red snow starts, then catacomb flood, then marsh fire, then ledger burning.
      maybe also hidden event: brother cal confesses rite fraud between flood+fire.`
    },
    {
      id: "multi-07",
      minEvents: 3,
      text: `whole chapter braid:
      mara dream-memory of ashfall,
      waking interrogation by wardens,
      secret meet w pilgrim fixer in fish market,
      late-night sabotage of condenser carts.`
    },
    {
      id: "multi-08",
      minEvents: 3,
      text: `timeline vomit:
      before ashfall ritual archive found,
      experts say forged,
      culture elders confirm symbols real,
      city splits into denial camps + choir loyalists.
      if uncertain ask warning.`
    },
    {
      id: "multi-09",
      minEvents: 3,
      text: `book2-book3 bridge:
      mara exiled,
      marsh caravan ambushed by bone choir scouts,
      nora invents portable lungglass veil,
      caravan returns to gutterbank under smoke cover.`
    },
    {
      id: "multi-10",
      minEvents: 3,
      text: `endgame chain no polish:
      rowan exposes vote ledger,
      council fractures,
      pilgrims torch archive annex,
      mara saves one registry tablet only,
      final rite rewritten on chapel wall by dawn.`
    },
  ];
}

function buildStressFixtures() {
  const stressBase = `
  fragmented notebook + voice memo transcript merged:
  everyone coughing / wet snow / bell ringing out of sequence / no clean chronology
  names repeated maybe wrong spellings mara, maira, rowen, rowan, noraa, nora
  locations clipped: gutterbank, veya, marsh, mill, underwell
  does this work does this work does this work maybe maybe maybe
  `;

  return [1, 2, 3, 4].map((index) => {
    const repeatedBlock = new Array(70 + index * 15).fill(
      `event shard ${index}: choir ash marks on door, warden denial speech, child mask fog writing, marsh lantern collapse?`
    ).join("\n");

    return {
      id: `stress-0${index}`,
      minEvents: 6,
      text: `${stressBase}\n${repeatedBlock}\nfinal question: is order reliable or contradictory?`,
    };
  });
}

function buildValidationFixtures() {
  return {
    multi: buildMultiFixtures(),
    single: buildSingleFixtures(),
    stress: buildStressFixtures(),
  };
}

module.exports = {
  buildValidationFixtures,
};
