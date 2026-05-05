/**
 * Full (pre-disclosure) composer. Returns the ordered list of section
 * bodies that make up the system prompt for a given mode.
 */
import {
  ANTI_SLOP_DIGEST,
  BRAND_ACQUISITION,
  DESIGN_METHODOLOGY,
  EDITMODE_PROTOCOL,
  IDENTITY,
  MULTI_SCREEN_BATON,
  OUTPUT_RULES,
  PRE_FLIGHT,
  SAFETY,
  TWEAKS_PROTOCOL,
  WORKFLOW,
} from './sections/loader.js';

export type PromptMode = 'create' | 'tweak' | 'revise';
export type PromptFeatureMode = 'enabled' | 'disabled' | 'auto';

export interface PromptFeatureProfile {
  tweaks: PromptFeatureMode;
  bitmapAssets: PromptFeatureMode;
  reusableSystem: PromptFeatureMode;
  visualDirection?: string | undefined;
}

function workflowForFeatures(profile: PromptFeatureProfile | undefined): string {
  if (profile?.tweaks === 'disabled') {
    return WORKFLOW.replace(
      '8. **Expose tweaks selectively** — call `tweaks()` only when the user asked for controls, answered that controls would help, or the artifact has 2-5 obvious high-leverage values. Skip tweak work for narrow edits, throwaway sketches, or when the user declines; they can ask for controls in a later turn.',
      '8. **Skip tweaks** — Do not create EDITMODE tweak controls or call `tweaks()` in this turn. The user can ask for controls in a later turn.',
    );
  }
  if (profile?.tweaks === 'enabled') {
    return WORKFLOW.replace(
      '8. **Expose tweaks selectively** — call `tweaks()` only when the user asked for controls, answered that controls would help, or the artifact has 2-5 obvious high-leverage values. Skip tweak work for narrow edits, throwaway sketches, or when the user declines; they can ask for controls in a later turn.',
      '8. **Expose tweaks** — Create 2-5 high-leverage EDITMODE controls and call `tweaks()` after the first complete pass.',
    );
  }
  return WORKFLOW;
}

function featureRoutingSection(profile: PromptFeatureProfile | undefined): string | null {
  if (!profile) return null;
  const lines = ['# Feature routing', ''];
  if (profile.tweaks === 'disabled') {
    lines.push(
      'Do not create EDITMODE tweak controls or call `tweaks()` unless the user explicitly asks later.',
    );
  } else if (profile.tweaks === 'enabled') {
    lines.push(
      'Create 2-5 high-leverage EDITMODE controls for the artifact and call `tweaks()` before `done(path)`.',
    );
  } else {
    lines.push(
      'Use tweak controls only when the user preference allows them and they clearly improve iteration.',
    );
  }
  if (profile.bitmapAssets === 'disabled') {
    lines.push(
      'Do not call `generate_image_asset`; use CSS, inline SVG, local existing assets, or text-only structure.',
    );
  }
  if (profile.reusableSystem === 'enabled') {
    lines.push(
      'Treat this as reusable system work: maintain `DESIGN.md` and stable tokens/components.',
    );
  }
  if (profile.visualDirection) {
    lines.push(`Preferred visual direction: ${profile.visualDirection}.`);
  }
  return lines.join('\n');
}

export function composeFull(mode: PromptMode, featureProfile?: PromptFeatureProfile): string[] {
  const sections: string[] = [
    IDENTITY,
    workflowForFeatures(featureProfile),
    OUTPUT_RULES,
    DESIGN_METHODOLOGY,
    PRE_FLIGHT,
    EDITMODE_PROTOCOL,
  ];

  if (mode === 'tweak') {
    sections.push(TWEAKS_PROTOCOL);
  }

  sections.push(ANTI_SLOP_DIGEST);
  sections.push(BRAND_ACQUISITION);
  sections.push(MULTI_SCREEN_BATON);
  const routing = featureRoutingSection(featureProfile);
  if (routing) sections.push(routing);
  sections.push(SAFETY);
  return sections;
}
