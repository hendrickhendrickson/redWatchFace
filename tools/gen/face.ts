/**
 * The face: the single source of truth for watchface.xml.
 *
 * WHY THE GENERATOR MUST NOT READ THE FILE IT WRITES. An earlier version of
 * --check parsed watchface.xml and compared the result to watchface.xml, so its
 * output equalled its input by construction and a hand edit passed silently.
 * That is this project's signature failure - green result, wrong artifact -
 * reintroduced by the safety net itself. Everything here is built from
 * TypeScript; the differ's baseline is face.model.json, a semantic snapshot, and
 * nothing derived from watchface.xml is ever an input to watchface.xml.
 */

import { el, EOL, type Node } from "./xml.ts";
import { sections } from "./face/index.ts";

/** WFF format version. Keep in step with AndroidManifest.xml and build.gradle.kts. */
export const WFF_VERSION = 5;

export const CANVAS_WIDTH = 450;
export const CANVAS_HEIGHT = 450;

/**
 * The interactive background is OLED black, the same as ambient, so the two
 * modes differ only in weight and in what is shown - which is also the cheapest
 * thing to light up. Everything non-essential is faded out in ambient via
 * <Variant mode="AMBIENT">.
 */
export const SCENE_BACKGROUND = "#ff000000";

/**
 * PREVIEW_TIME is what the watch face picker renders in its tile. It is not the
 * time any screenshot is taken at - mock-state.ts pins that separately.
 */
const METADATA: Array<[string, string]> = [
  ["CLOCK_TYPE", "DIGITAL"],
  ["PREVIEW_TIME", "10:09:00"],
];

/**
 * The one comment that survives into the output.
 *
 * Without it, someone iterating on the wrist opens watchface.xml, edits it
 * directly and loses the change on the next generate. That is a certainty
 * rather than a risk, and it is cheap to prevent.
 */
const BANNER = [
  "",
  "    GENERATED FILE - DO NOT EDIT.",
  "",
  "    Source:     tools/gen/*.ts",
  "    Regenerate: node tools/gen/build.ts",
  "    Verify:     node tools/gen/build.ts (with the diff flag) - checks that",
  "                the face still renders the same as before the migration.",
  "",
  "    The design notes that used to live here now sit on the constants they",
  "    explain - see palette.ts, geometry.ts and expr.ts.",
  "",
].join(EOL);

/**
 * XML forbids "--" inside a comment, and the WFF validator enforces it. Writing
 * the regenerate command with its flag spelled out cost one failed build; catch
 * it here instead, where the error names the cause.
 */
if (BANNER.includes("--")) {
  throw new Error(
    'BANNER contains "--", which is illegal inside an XML comment.',
  );
}

/**
 * THE LINE ENDING COMES FROM xml.ts, in one place.
 *
 * These four separators and the BANNER's own join were hard-coded to "\r\n" while
 * the serialiser had its own copy - so the document's endings were defined twice,
 * and switching the serialiser to LF left twelve CRLF lines behind at the top of
 * the file. See the note on EOL in xml.ts for why LF, and for the release-long bug
 * the CRLF was causing.
 */
export function face(): Node[] {
  return [
    { k: "decl", text: '<?xml version="1.0" encoding="utf-8"?>' },
    { k: "text", text: EOL },
    { k: "comment", text: BANNER, raw: `<!--${BANNER}-->` },
    { k: "text", text: EOL },
    el("WatchFace", { width: CANVAS_WIDTH, height: CANVAS_HEIGHT }, [
      ...METADATA.map(([key, value]) => el("Metadata", { key, value })),
      el("Scene", { backgroundColor: SCENE_BACKGROUND }, sections()),
    ]),
    { k: "text", text: EOL },
  ];
}
