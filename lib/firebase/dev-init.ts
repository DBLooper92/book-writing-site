import "client-only";

import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  writeBatch,
} from "firebase/firestore";

import { db } from "@/lib/firebase/client";

export const DEFAULT_PROJECT_ID = "default-story-bible";

const seedDocKeys = [
  ["books", "book_001"],
  ["chapters", "chapter_001"],
  ["scenes", "scene_001"],
  ["characters", "char_001"],
  ["locations", "loc_001"],
  ["factions", "faction_001"],
  ["species", "species_001"],
  ["items", "item_001"],
  ["timeline_events", "event_001"],
  ["plot_threads", "thread_001"],
  ["notes", "note_001"],
  ["retcons", "retcon_001"],
  ["cultures", "culture_001"],
  ["relationships", "relationship_001"],
  ["themes", "theme_001"],
  ["eras", "era_001"],
  ["technologies", "technology_001"],
  ["religions", "religion_001"],
  ["governments", "government_001"],
  ["languages", "language_001"],
  ["organizations", "organization_001"],
  ["outlines", "outline_001"],
  ["glossary_terms", "term_001"],
  ["attachments", "attachment_001"],
  ["ai_sessions", "session_001"],
] as const;

export const STORY_BIBLE_STRUCTURE_PATHS = [
  "users/{uid}",
  `users/{uid}/projects/${DEFAULT_PROJECT_ID}`,
  ...seedDocKeys.map(
    ([collectionName, documentId]) =>
      `users/{uid}/projects/${DEFAULT_PROJECT_ID}/${collectionName}/${documentId}`
  ),
] as const;

export type StoryBibleInitUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
};

type SeedDocument = {
  collectionName: (typeof seedDocKeys)[number][0];
  documentId: (typeof seedDocKeys)[number][1];
  data: Record<string, unknown>;
};

export type StoryBibleInitSummary = {
  userPath: string;
  projectPath: string;
  projectId: string;
  createdPaths: string[];
  updatedPaths: string[];
  skippedPaths: string[];
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
};

export async function initializeStoryBibleDevData(
  user: StoryBibleInitUser
): Promise<StoryBibleInitSummary> {
  if (!user.uid) {
    throw new Error("A signed-in user is required to initialize story-bible data.");
  }

  const userRef = doc(db, "users", user.uid);
  const projectRef = doc(userRef, "projects", DEFAULT_PROJECT_ID);
  const starterDocs = buildStarterDocs(DEFAULT_PROJECT_ID);

  const [userSnapshot, projectSnapshot, ...starterSnapshots] = await Promise.all([
    getDoc(userRef),
    getDoc(projectRef),
    ...starterDocs.map((seed) =>
      getDoc(doc(projectRef, seed.collectionName, seed.documentId))
    ),
  ]);

  const createdPaths: string[] = [];
  const updatedPaths: string[] = [];
  const skippedPaths: string[] = [];
  const userData = userSnapshot.exists()
    ? {
        id: user.uid,
        email: user.email ?? null,
        displayName: user.displayName ?? null,
        activeProjectId: DEFAULT_PROJECT_ID,
        role: "owner",
        plan: "personal",
        status: "active",
        updatedAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
      }
    : {
        id: user.uid,
        email: user.email ?? null,
        displayName: user.displayName ?? null,
        activeProjectId: DEFAULT_PROJECT_ID,
        role: "owner",
        plan: "personal",
        status: "active",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
      };
  const projectData = projectSnapshot.exists()
    ? {
        id: DEFAULT_PROJECT_ID,
        ownerId: user.uid,
        status: "active",
        updatedAt: serverTimestamp(),
      }
    : {
        id: DEFAULT_PROJECT_ID,
        ownerId: user.uid,
        title: "The Last Ember",
        slug: "the-last-ember",
        summary:
          "Private story bible for a multi-book fantasy series set in Greyfen after the ward fires begin to fail.",
        description:
          "Development seed project for a private AI-assisted writing system following Lyra Vale as she investigates the myth of the Last Ember and the collapsing memory infrastructure around Greyfen.",
        genre: "Epic fantasy",
        tone: "Reflective, tense, and mythic",
        themes: ["memory", "duty", "truth"],
        timelineStartYear: 412,
        timelineEndYear: 418,
        defaultCalendarSystemId: "calendar_standard_solar",
        primaryPointOfViewStyle: "Close third person with rotating focus by book",
        writingStatus: "planning",
        bookOrderMode: "series-order",
        notesRootId: "note_001",
        settings: {
          allowPublicWiki: false,
          allowAIWriting: true,
          allowAIEditing: true,
          defaultTimelineScale: "year",
          defaultLanguageId: "language_001",
          spoilerPolicy: "internal-only",
        },
        status: "active",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

  await setDoc(
    userRef,
    userData,
    { merge: true }
  );

  if (userSnapshot.exists()) {
    updatedPaths.push(userRef.path);
  } else {
    createdPaths.push(userRef.path);
  }

  await setDoc(
    projectRef,
    projectData,
    { merge: true }
  );

  if (projectSnapshot.exists()) {
    updatedPaths.push(projectRef.path);
  } else {
    createdPaths.push(projectRef.path);
  }

  const batch = writeBatch(db);
  let hasBatchWrites = false;

  starterDocs.forEach((seed, index) => {
    const snapshot = starterSnapshots[index];
    const seedRef = doc(projectRef, seed.collectionName, seed.documentId);

    if (snapshot.exists()) {
      skippedPaths.push(seedRef.path);
      return;
    }

    hasBatchWrites = true;
    createdPaths.push(seedRef.path);
    batch.set(
      seedRef,
      {
        ...seed.data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  });

  if (hasBatchWrites) {
    await batch.commit();
  }

  return {
    userPath: userRef.path,
    projectPath: projectRef.path,
    projectId: DEFAULT_PROJECT_ID,
    createdPaths,
    updatedPaths,
    skippedPaths,
    createdCount: createdPaths.length,
    updatedCount: updatedPaths.length,
    skippedCount: skippedPaths.length,
  };
}

function buildStarterDocs(projectId: string): SeedDocument[] {
  return [
    {
      collectionName: "books",
      documentId: "book_001",
      data: withTitleBase(projectId, "book_001", "Ashes of Dawn", "ashes-of-dawn", {
        summary:
          "Book one follows Lyra Vale as the theft of a ward ember forces Greyfen's archives into the open.",
        description:
          "Opening novel of The Last Ember series, centered on a stolen ember key, a failing river city, and the first cracks in the official record.",
        status: "planning",
        tags: ["book", "series-opener"],
        canonLevel: "core",
        confidence: 0.96,
        seriesOrder: 1,
        internalChronologyStart: 412,
        internalChronologyEnd: 413,
        premise:
          "An archivist must trace a stolen ward ember through a city built on inherited myths before Greyfen loses the fire that remembers its dead.",
        draftStage: "outline",
        wordCountTarget: 95000,
        wordCountCurrent: 0,
        primaryThemes: ["theme_001"],
        mainCharacters: ["char_001"],
        keyLocations: ["loc_001"],
        relatedPlotThreads: ["thread_001"],
      }),
    },
    {
      collectionName: "chapters",
      documentId: "chapter_001",
      data: withTitleBase(
        projectId,
        "chapter_001",
        "Chapter 1: Smoke Over Greyfen",
        "chapter-1-smoke-over-greyfen",
        {
          summary:
            "Lyra arrives at the North Gate as Greyfen learns the ward ember has been stolen.",
          description:
            "Opening chapter that introduces Greyfen, Lyra's role in the archives, and the inciting theft that pulls the series plot into motion.",
          status: "outline",
          tags: ["chapter", "opening"],
          canonLevel: "core",
          confidence: 0.94,
          bookId: "book_001",
          chapterNumber: 1,
          purpose: "Introduce Lyra, Greyfen, and the ember theft.",
          pointOfViewCharacterId: "char_001",
          timelineEventIds: ["event_001"],
          sceneIds: ["scene_001"],
          locationIds: ["loc_001"],
          characterIds: ["char_001"],
          plotThreadIds: ["thread_001"],
          foreshadows: [
            "The stolen ember key matches a sealed archive sketch.",
            "Greyfen's official ledgers have already been altered.",
          ],
          payoffs: ["Lyra commits to a quiet investigation inside the archive."],
        }
      ),
    },
    {
      collectionName: "scenes",
      documentId: "scene_001",
      data: withTitleBase(
        projectId,
        "scene_001",
        "Scene 1: Embers at the Gate",
        "scene-1-embers-at-the-gate",
        {
          summary:
            "The North Gate alarm forces Lyra to choose between following protocol and preserving the evidence.",
          description:
            "Introductory scene at the gatehouse, framed around urgency, civic ritual, and the first hint that the theft was enabled from inside Greyfen.",
          status: "outline",
          tags: ["scene", "inciting-incident"],
          canonLevel: "core",
          confidence: 0.93,
          bookId: "book_001",
          chapterId: "chapter_001",
          sceneNumber: 1,
          sceneType: "opening",
          goal: "Reach the gatehouse before the ward fire collapses completely.",
          conflict:
            "Wardens want the scene sealed, but Lyra sees evidence that the ledger entries were changed before the theft.",
          outcome:
            "Lyra pockets a copied symbol from the ledger and silently begins her own investigation.",
          timelineEventIds: ["event_001"],
          characterIds: ["char_001"],
          locationIds: ["loc_001"],
          plotThreadIds: ["thread_001"],
          textDraft:
            "Placeholder draft: cold river wind, ash-light failing, gate bells striking three.",
        }
      ),
    },
    {
      collectionName: "characters",
      documentId: "char_001",
      data: withNameBase(projectId, "char_001", "Lyra Vale", "lyra-vale", {
        summary:
          "Greyfen archivist whose gift for pattern recall makes her the first to notice the official record has been altered.",
        description:
          "Primary series protagonist. Lyra balances civic duty, private grief, and an obsessive need to keep Greyfen's memory from being rewritten by those in power.",
        status: "active",
        tags: ["character", "protagonist"],
        canonLevel: "core",
        confidence: 0.97,
        aliases: ["Ashkeeper's Daughter"],
        characterType: "protagonist",
        importanceLevel: "primary",
        birthYear: 394,
        deathYear: null,
        apparentAge: 28,
        actualAge: 28,
        speciesId: "species_001",
        cultureIds: ["culture_001"],
        factionIds: ["faction_001"],
        religionIds: ["religion_001"],
        languageIds: ["language_001"],
        homeLocationId: "loc_001",
        currentLocationId: "loc_001",
        occupation: "Archive field registrar",
        skills: ["pattern recall", "field notes", "quiet negotiation"],
        traits: ["observant", "guarded", "persistent"],
        flaws: ["withholds information", "overcommits", "avoids trusting institutions"],
        motivations: [
          "Protect Greyfen from civic collapse.",
          "Find out why the archive record was altered.",
        ],
        fears: ["Becoming unreliable like her father", "Losing Greyfen's shared memory"],
        secrets: ["Keeps a banned sketch of the ember network in her satchel."],
        beliefs: ["Memory is a duty, not a luxury."],
        appearance: "Dark coat, soot-stained satchel, copper signet, ash-burned gloves.",
        voiceProfile:
          "Controlled, precise, and wary in dialogue; sharply associative in internal narration.",
        arcSummary:
          "Lyra moves from dutiful archivist to active challenger of Greyfen's official mythology.",
        arcStartState: "Trusts the archive more than the people running it.",
        arcEndState: "Builds a new canon grounded in witness rather than inherited authority.",
        keyRelationshipIds: ["relationship_001"],
        timelineEventIds: ["event_001"],
        bookIds: ["book_001"],
        chapterIds: ["chapter_001"],
        sceneIds: ["scene_001"],
        importantItems: ["item_001"],
        publicWikiSummary:
          "Archivist drawn into the search for the Last Ember after the North Gate theft.",
      }),
    },
    {
      collectionName: "locations",
      documentId: "loc_001",
      data: withNameBase(projectId, "loc_001", "Greyfen", "greyfen", {
        summary:
          "River city built beneath basalt bluffs, sustained by archive ledgers and a failing ember relay network.",
        description:
          "Primary setting for book one. Greyfen is a trade city where memory, infrastructure, and political legitimacy are all tied to the maintenance of civic fire.",
        status: "active",
        tags: ["location", "city", "primary-setting"],
        canonLevel: "core",
        confidence: 0.96,
        locationType: "river-city",
        parentLocationId: null,
        childLocationIds: [],
        eraIds: ["era_001"],
        cultureIds: ["culture_001"],
        factionIds: ["faction_001"],
        populationNotes: "Trade city of ferrymen, archivists, ward engineers, and floodwall laborers.",
        climate: "Cold river winds, long wet winters, and smoke-heavy autumns.",
        geography: "Split riverbanks beneath basalt bluffs linked by bridges and stair towers.",
        architecture: "Slate roofs, iron bridges, carved cliff archives, and ember-lit signal masts.",
        economy: "River tolls, archive services, ward maintenance, and controlled ember trade.",
        customs: ["Lantern vigils at dusk", "Ash-marking at memorials", "Floodwall oath recitations"],
        dangerLevel: "moderate",
        notableFeatures: ["North Gate", "Archive of Cinders", "Ember relay tower"],
        timelineEventIds: ["event_001"],
        bookIds: ["book_001"],
        characterIds: ["char_001"],
        publicWikiSummary:
          "Greyfen survives on trade, records, and the dangerous belief that its fires still remember the truth.",
      }),
    },
    {
      collectionName: "factions",
      documentId: "faction_001",
      data: withNameBase(projectId, "faction_001", "Ember Wardens", "ember-wardens", {
        summary:
          "Civic order responsible for maintaining Greyfen's ward fires, relay towers, and emergency response at the gates.",
        description:
          "Greyfen's most visible public force. The wardens keep the city stable, but their secrecy around failing infrastructure places them at odds with archivists and citizens alike.",
        status: "active",
        tags: ["faction", "civic-order"],
        canonLevel: "core",
        confidence: 0.92,
        factionType: "civic order",
        foundedYear: 356,
        endedYear: null,
        leaderCharacterIds: [],
        baseLocationIds: ["loc_001"],
        cultureIds: ["culture_001"],
        religionIds: ["religion_001"],
        governmentId: "government_001",
        goals: ["Preserve the ward network", "Contain ember smuggling", "Prevent panic"],
        resources: ["Gatehouse crews", "Signal towers", "Ward ledgers"],
        rivals: [],
        allies: ["government_001"],
        timelineEventIds: ["event_001"],
        bookIds: ["book_001"],
        publicWikiSummary:
          "Greyfen's wardens guard the city, but their control of the ember network also lets them hide how unstable it has become.",
      }),
    },
    {
      collectionName: "species",
      documentId: "species_001",
      data: withNameBase(projectId, "species_001", "Humans of Aster", "humans-of-aster", {
        summary:
          "Primary human population across the Aster basin, with regional identities shaped by trade, climate, and memory customs.",
        description:
          "Baseline human species entry used by the seed project. Cultural variation matters more than biology, but ember infrastructure has still shaped social expectations and labor roles.",
        status: "active",
        tags: ["species", "baseline"],
        canonLevel: "core",
        confidence: 0.91,
        origin: "Native peoples of the Aster basin and surrounding flood plains.",
        lifespan: "Roughly 60 to 90 years depending on region and class.",
        appearance: "Wide range of appearances; Greyfen fashion favors dark wool, layered coats, and ashproof gloves.",
        biology: "Baseline human physiology with no innate ember affinity.",
        reproduction: "Sexual reproduction; family lines tracked through civic and religious ledgers.",
        diet: "River fish, smoke-cured grains, root stews, and preserved citrus.",
        psychology: "Strong social emphasis on memory, obligation, and recorded legacy.",
        socialStructure: "Kin houses, trade guilds, civic councils, and temple-aligned services.",
        abilities: ["Adaptive learning", "Fine tool work", "Oral and written recordkeeping"],
        limitations: ["No natural resistance to ember burns", "Highly dependent on shared infrastructure"],
        notableSubgroups: ["Fenfolk", "Highbank clans", "Southern ferry houses"],
      }),
    },
    {
      collectionName: "items",
      documentId: "item_001",
      data: withNameBase(projectId, "item_001", "Ember Compass", "ember-compass", {
        summary:
          "Inherited brass instrument that trembles when pointed toward unstable ember signatures.",
        description:
          "Lyra's most important field tool and the seed project's first inspectable artifact record. It ties personal history to the wider mythology of the Last Ember.",
        status: "active",
        tags: ["item", "artifact"],
        canonLevel: "core",
        confidence: 0.95,
        itemType: "artifact",
        ownerCharacterIds: ["char_001"],
        locationIds: ["loc_001"],
        factionIds: ["faction_001"],
        createdYear: 401,
        material: "Brass, smoked glass, and ember filament.",
        abilities: [
          "Points toward unstable ember signatures.",
          "Vibrates near fractured ward lines.",
        ],
        symbolicMeaning: "Represents inherited duty and the burden of unfinished work.",
        timelineEventIds: ["event_001"],
      }),
    },
    {
      collectionName: "timeline_events",
      documentId: "event_001",
      data: withTitleBase(
        projectId,
        "event_001",
        "The North Gate Ember Theft",
        "the-north-gate-ember-theft",
        {
          summary:
            "A ward ember and its key vanish from Greyfen's North Gate, exposing deeper corruption inside the city's official record.",
          description:
            "Primary inciting incident for the seed project. This event ties together the first book, first chapter, first scene, and the central mystery of the series.",
          status: "active",
          tags: ["timeline-event", "inciting-incident"],
          canonLevel: "core",
          confidence: 0.97,
          eventType: "inciting-incident",
          yearStart: 412,
          yearEnd: 412,
          displayDateLabel: "Winter, 412 AE",
          eraId: "era_001",
          bookIds: ["book_001"],
          chapterIds: ["chapter_001"],
          sceneIds: ["scene_001"],
          characterIds: ["char_001"],
          locationIds: ["loc_001"],
          factionIds: ["faction_001"],
          cultureIds: ["culture_001"],
          technologyIds: ["technology_001"],
          religionIds: ["religion_001"],
          plotThreadIds: ["thread_001"],
          themeIds: ["theme_001"],
          consequences: [
            "Greyfen loses a stable ward flame at the North Gate.",
            "Lyra begins investigating altered archive records.",
          ],
          causes: [
            "Years of neglected relay maintenance.",
            "A covert buyer seeks access to a higher ember record.",
          ],
          predecessorEventIds: [],
          successorEventIds: [],
          publicWikiSummary:
            "The theft at the North Gate begins Greyfen's slow public unmaking.",
        }
      ),
    },
    {
      collectionName: "plot_threads",
      documentId: "thread_001",
      data: withTitleBase(
        projectId,
        "thread_001",
        "Mystery of the Last Ember",
        "mystery-of-the-last-ember",
        {
          summary:
            "Core series thread about whether a lost ember can preserve a truer record than Greyfen's official archives.",
          description:
            "Primary seed plot thread connecting Lyra, the North Gate theft, and the wider conspiracy behind the city's failing memory infrastructure.",
          status: "active",
          tags: ["plot-thread", "series-core"],
          canonLevel: "core",
          confidence: 0.95,
          threadType: "series-core",
          introducedInBookId: "book_001",
          resolvedInBookId: null,
          characterIds: ["char_001"],
          timelineEventIds: ["event_001"],
          bookIds: ["book_001"],
          chapterIds: ["chapter_001"],
          setupNotes: [
            "The stolen key matches a diagram hidden in a restricted archive drawer.",
          ],
          payoffNotes: [
            "The thread resolves when Greyfen's official canon is publicly disproved.",
          ],
          openQuestions: [
            "Who commissioned the theft?",
            "Why do the civic ledgers omit the last keeper's name?",
          ],
        }
      ),
    },
    {
      collectionName: "notes",
      documentId: "note_001",
      data: withTitleBase(
        projectId,
        "note_001",
        "Project Root Note",
        "project-root-note",
        {
          summary:
            "Seed note for project-level planning, canon questions, and cross-links into the starter dataset.",
          description:
            "Acts as the visible root note referenced by the project document. Future notes can branch from here into books, characters, scenes, and timeline work.",
          status: "active",
          tags: ["note", "root"],
          canonLevel: "working",
          confidence: 0.9,
          content:
            "Use this root note for canon TODOs, unresolved questions, and links to the first seeded entities.",
          noteType: "root",
          linkedEntityType: "project",
          linkedEntityId: DEFAULT_PROJECT_ID,
          linkedBookIds: ["book_001"],
          linkedChapterIds: ["chapter_001"],
          linkedCharacterIds: ["char_001"],
          linkedLocationIds: ["loc_001"],
          linkedEventIds: ["event_001"],
          linkedThreadIds: ["thread_001"],
        }
      ),
    },
    {
      collectionName: "retcons",
      documentId: "retcon_001",
      data: withTitleBase(
        projectId,
        "retcon_001",
        "Greyfen District Layout Revision",
        "greyfen-district-layout-revision",
        {
          summary:
            "Tracks an intentional canon change to give Greyfen vertical geography and stronger scene dynamics.",
          description:
            "Seed retcon record showing how old canon, new canon, and downstream impact can be documented without losing development history.",
          status: "open",
          tags: ["retcon", "worldbuilding"],
          canonLevel: "working",
          confidence: 0.88,
          oldCanon:
            "Greyfen was previously mapped as a flat river port with all districts on one bank.",
          newCanon:
            "Greyfen now spans two riverbanks beneath basalt bluffs, with the archive carved into the cliff face.",
          reason:
            "The revised layout supports stronger scene geography, infrastructure logic, and thematic verticality.",
          impactLevel: "medium",
          affectedEntityTypes: ["locations", "chapters", "scenes"],
          affectedEntityIds: ["loc_001", "chapter_001", "scene_001"],
          resolved: false,
        }
      ),
    },
    {
      collectionName: "cultures",
      documentId: "culture_001",
      data: withNameBase(projectId, "culture_001", "Fenfolk", "fenfolk", {
        summary:
          "River-born culture centered on practical duty, inherited memory, and flood-season mutual aid.",
        description:
          "Primary culture in Greyfen. Fenfolk customs influence how the city records grief, shares labor, and interprets the spiritual role of fire.",
        status: "active",
        tags: ["culture", "primary"],
        canonLevel: "core",
        confidence: 0.91,
        coreValues: ["Memory", "Reciprocity", "Practical honor"],
        traditions: ["Lantern vigils", "Floodwall oaths", "Winter ledger readings"],
        associatedLocationIds: ["loc_001"],
        languageIds: ["language_001"],
        religionIds: ["religion_001"],
        factionIds: ["faction_001"],
        eraIds: ["era_001"],
        publicWikiSummary:
          "Fenfolk culture treats memory as shared labor, not private property.",
      }),
    },
    {
      collectionName: "relationships",
      documentId: "relationship_001",
      data: withTitleBase(
        projectId,
        "relationship_001",
        "Lyra Vale and the Ember Wardens",
        "lyra-vale-and-the-ember-wardens",
        {
          summary:
            "Institutional relationship defining Lyra's strained loyalty to Greyfen's wardens.",
          description:
            "Seed relationship record showing that relationships can link different entity types, not just two character documents.",
          status: "active",
          tags: ["relationship", "institutional"],
          canonLevel: "core",
          confidence: 0.9,
          relationshipType: "institutional",
          entityAType: "characters",
          entityAId: "char_001",
          entityBType: "factions",
          entityBId: "faction_001",
          dynamicStatus: "strained loyalty",
          history:
            "Lyra grew up around the wardens and still works with them as an archive liaison, but no longer trusts their full account of the city's decline.",
          tensions: ["Ward secrecy", "Missing ledgers", "Conflicting duties"],
          strengths: ["Shared duty", "Crisis familiarity", "Mutual knowledge of Greyfen"],
        }
      ),
    },
    {
      collectionName: "themes",
      documentId: "theme_001",
      data: withNameBase(projectId, "theme_001", "Memory vs Myth", "memory-vs-myth", {
        summary:
          "Central thematic tension between inherited stories that stabilize society and uncomfortable truths that might undo it.",
        description:
          "Primary seed theme running through Greyfen's politics, Lyra's personal arc, and the mystery surrounding the Last Ember.",
        status: "active",
        tags: ["theme", "core"],
        canonLevel: "core",
        confidence: 0.94,
        centralQuestion:
          "What happens when the stories protecting a city become more useful than the truth?",
        associatedBookIds: ["book_001"],
        associatedCharacterIds: ["char_001"],
        associatedPlotThreadIds: ["thread_001"],
        motifs: ["embers", "archives", "lantern smoke", "rewritten ledgers"],
        publicWikiSummary:
          "Greyfen survives on stories that may no longer be true.",
      }),
    },
    {
      collectionName: "eras",
      documentId: "era_001",
      data: withNameBase(projectId, "era_001", "Ashen Recovery", "ashen-recovery", {
        summary:
          "Current historical era marked by reconstruction after the flood wars and rising dependence on civic fire systems.",
        description:
          "Seed era record anchoring the first book's chronology and the political assumptions that shape Greyfen's present day.",
        status: "active",
        tags: ["era", "current"],
        canonLevel: "core",
        confidence: 0.9,
        startYear: 398,
        endYear: 430,
        definingEvents: ["Postwar rebuilding of the ward network.", "Expansion of archive authority."],
        keyLocations: ["loc_001"],
        keyFactions: ["faction_001"],
        dominantThemes: ["theme_001"],
        publicWikiSummary:
          "An era built on reconstruction, rationed trust, and infrastructure that quietly decays beneath official optimism.",
      }),
    },
    {
      collectionName: "technologies",
      documentId: "technology_001",
      data: withNameBase(
        projectId,
        "technology_001",
        "Ember Relay Network",
        "ember-relay-network",
        {
          summary:
            "The magical-civic infrastructure that stores, routes, and stabilizes Greyfen's ember fires.",
          description:
            "Seed technology entry connecting the city's material systems to its mythology and politics. The failure of this network drives the opening crisis.",
          status: "active",
          tags: ["technology", "infrastructure"],
          canonLevel: "core",
          confidence: 0.92,
          technologyType: "magical infrastructure",
          inventedYear: 367,
          inventorNotes:
            "Attributed jointly to early ward engineers and archive mathematicians.",
          powerSource: "Refined ember cores and calibrated relay housings.",
          limitations: [
            "Requires constant calibration.",
            "Fails when ledger maps diverge from physical routes.",
          ],
          associatedLocationIds: ["loc_001"],
          associatedFactionIds: ["faction_001"],
          timelineEventIds: ["event_001"],
          publicWikiSummary:
            "Greyfen's civic fire network is both miracle and single point of failure.",
        }
      ),
    },
    {
      collectionName: "religions",
      documentId: "religion_001",
      data: withNameBase(
        projectId,
        "religion_001",
        "Church of the First Flame",
        "church-of-the-first-flame",
        {
          summary:
            "State-adjacent religion treating memory, mourning, and honest recordkeeping as sacred duties.",
          description:
            "Seed religious record showing how belief, civic ritual, and archive politics overlap in the worldbuilding model.",
          status: "active",
          tags: ["religion", "civic-faith"],
          canonLevel: "core",
          confidence: 0.9,
          deityOrFocus:
            "The first ordered flame that taught people to remember the dead and keep faith with the living.",
          beliefSystemType: "state-adjacent religion",
          coreBeliefs: [
            "Memory is sacred labor.",
            "Fire reveals truth when tended honestly.",
          ],
          rituals: ["Lantern vigils", "Ash blessings", "Memorial ledger recitations"],
          holySites: ["loc_001"],
          associatedCultures: ["culture_001"],
          associatedOrganizations: ["organization_001"],
          publicWikiSummary:
            "A civic faith that binds grief, recordkeeping, and public legitimacy together.",
        }
      ),
    },
    {
      collectionName: "governments",
      documentId: "government_001",
      data: withNameBase(projectId, "government_001", "Greyfen Council", "greyfen-council", {
        summary:
          "Civic ruling body balancing trade demands, archive authority, and the increasingly fragile ward network.",
        description:
          "Seed government record for Greyfen's central decision-making structure. This document anchors faction and organization references across the starter project.",
        status: "active",
        tags: ["government", "civic"],
        canonLevel: "core",
        confidence: 0.9,
        governmentType: "civic council",
        seatLocationId: "loc_001",
        leaderTitles: ["First Speaker", "Harbor Warden", "Archive Minister"],
        jurisdictionNotes: "Rules Greyfen and its surrounding ferry wards.",
        factionIds: ["faction_001"],
        organizationIds: ["organization_001"],
        lawPriorities: [
          "Maintain ward infrastructure",
          "Control ember trade",
          "Preserve public order",
        ],
        publicWikiSummary:
          "Greyfen's council governs through compromise, rationing, and selective transparency.",
      }),
    },
    {
      collectionName: "languages",
      documentId: "language_001",
      data: withNameBase(projectId, "language_001", "Common Asteric", "common-asteric", {
        summary:
          "Trade and civic language used across Greyfen, with a dockside dialect that compresses technical ward jargon into quick shorthand.",
        description:
          "Seed language record linking the project's default language setting to culture, place, and future glossary work.",
        status: "active",
        tags: ["language", "default"],
        canonLevel: "core",
        confidence: 0.88,
        languageFamily: "Aster river tongues",
        writingSystem: "Alphabetic trade script",
        primaryRegions: ["loc_001"],
        dialects: ["Greyfen Dock Cant"],
        loanSources: ["Liturgical ember script", "Flood-war engineering shorthand"],
        publicWikiSummary:
          "Common Asteric carries civic, trade, and religious language across Greyfen's archives and docks.",
      }),
    },
    {
      collectionName: "organizations",
      documentId: "organization_001",
      data: withNameBase(
        projectId,
        "organization_001",
        "Archive of Cinders",
        "archive-of-cinders",
        {
          summary:
            "Greyfen's central archive, responsible for preserving civic memory, restricted maps, and ember anomaly records.",
          description:
            "Seed organization record representing the scholarly-institutional arm of Greyfen's power structure and Lyra's workplace.",
          status: "active",
          tags: ["organization", "archive"],
          canonLevel: "core",
          confidence: 0.94,
          organizationType: "scholarly archive",
          foundedYear: 372,
          baseLocationIds: ["loc_001"],
          leaderTitles: ["Archivist Supreme", "Field Registrar"],
          memberCountEstimate: 120,
          goals: ["Preserve civic memory", "Catalog ember anomalies", "Control restricted records"],
          resources: ["Vault ledgers", "Field journals", "Restricted maps"],
          alliances: ["government_001"],
          rivals: [],
          publicWikiSummary:
            "The Archive of Cinders decides what Greyfen remembers and what quietly disappears.",
        }
      ),
    },
    {
      collectionName: "outlines",
      documentId: "outline_001",
      data: withTitleBase(projectId, "outline_001", "Series Spine", "series-spine", {
        summary:
          "High-level outline capturing the current direction of the multi-book series.",
        description:
          "Seed outline record for testing structured planning data before chapter and scene editing tools exist.",
        status: "active",
        tags: ["outline", "series"],
        canonLevel: "working",
        confidence: 0.87,
        outlineType: "series",
        scope: "Books one through three",
        actStructure: [
          "Book one exposes the false ledger.",
          "Book two expands the archive conspiracy.",
          "Book three reveals the truth of the Last Ember.",
        ],
        milestones: [
          "Lyra links the theft to a restricted archive map.",
          "Greyfen's public faith in the ward system fractures.",
          "The Last Ember reframes the city's entire canon.",
        ],
        bookIds: ["book_001"],
        threadIds: ["thread_001"],
        noteIds: ["note_001"],
      }),
    },
    {
      collectionName: "glossary_terms",
      documentId: "term_001",
      data: withTitleBase(projectId, "term_001", "Last Ember", "last-ember", {
        summary:
          "Mythic term for a supposedly perfect ember record that can no longer be altered by civic institutions.",
        description:
          "Seed glossary entry used across the project's title, central mystery, and item lore.",
        status: "active",
        tags: ["glossary", "mythic"],
        canonLevel: "core",
        confidence: 0.9,
        term: "Last Ember",
        definition:
          "A semi-mythic ember said to preserve the truest possible record of every oath sworn in its light.",
        category: "mythic object",
        relatedEntityTypes: ["items", "themes", "timeline_events"],
        relatedEntityIds: ["item_001", "theme_001", "event_001"],
        publicWikiSummary:
          "The Last Ember is either Greyfen's salvation or its most useful lie.",
      }),
    },
    {
      collectionName: "attachments",
      documentId: "attachment_001",
      data: withTitleBase(
        projectId,
        "attachment_001",
        "Greyfen map placeholder",
        "greyfen-map-placeholder",
        {
          summary:
            "Seed attachment record for future maps, diagrams, and visual reference files.",
          description:
            "No upload is stored yet; this document exists so the attachments collection is visible and linked into the default project.",
          status: "placeholder",
          tags: ["attachment", "reference"],
          canonLevel: "working",
          confidence: 0.8,
          attachmentType: "reference-note",
          storageStatus: "not-uploaded",
          fileName: "greyfen-map-placeholder.txt",
          mimeType: "text/plain",
          sourceNote:
            "Create a real upload workflow later; this is a structural placeholder for development.",
          url: null,
          linkedEntityType: "locations",
          linkedEntityId: "loc_001",
          linkedNoteIds: ["note_001"],
          linkedOutlineIds: ["outline_001"],
        }
      ),
    },
    {
      collectionName: "ai_sessions",
      documentId: "session_001",
      data: withTitleBase(
        projectId,
        "session_001",
        "Initial story bible seeding session",
        "initial-story-bible-seeding-session",
        {
          summary:
            "Represents the first tracked AI/dev session used to scaffold the project schema.",
          description:
            "Seed ai_sessions record showing how future prompt logs, summaries, and linked entities can be stored alongside the rest of the story bible.",
          status: "completed",
          tags: ["ai-session", "seed"],
          canonLevel: "working",
          confidence: 0.82,
          sessionType: "schema-seed",
          provider: "manual-dev-init",
          model: "n/a",
          purpose: "Create a deterministic starter dataset for inspection and iteration.",
          promptExcerpt:
            "Initialize the story bible scaffold for The Last Ember and seed linked starter records.",
          outputSummary:
            "Created a default project plus linked starter docs across core worldbuilding collections.",
          linkedEntityTypes: ["projects", "books", "characters", "timeline_events"],
          linkedEntityIds: [DEFAULT_PROJECT_ID, "book_001", "char_001", "event_001"],
          messagesCount: 1,
        }
      ),
    },
  ];
}

function withTitleBase(
  projectId: string,
  id: string,
  title: string,
  slug: string,
  data: Record<string, unknown>
) {
  return {
    id,
    projectId,
    title,
    slug,
    isArchived: false,
    ...data,
  };
}

function withNameBase(
  projectId: string,
  id: string,
  name: string,
  slug: string,
  data: Record<string, unknown>
) {
  return {
    id,
    projectId,
    name,
    slug,
    isArchived: false,
    ...data,
  };
}
