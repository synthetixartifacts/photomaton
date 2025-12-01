import type { PresetPrompt } from '@photomaton/shared';

// Optimized prompts based on Nano Banana best practices
// Following the structured approach: Subject → Composition → Lighting → Style → Negatives

export const optimizedPrompts: Record<string, PresetPrompt> = {
  'toon-yellow': {
    id: 'toon-yellow',
    name: 'Yellow Toon',
    description: 'Vibrant cartoon transformation with warm yellow palette',
    enabled: true,
    icon: '🎨',
    prompt: 'Transform to cartoon style, vibrant yellow color scheme, flat colors, simple shapes, cheerful mood',
    advancedPrompt: {
      basePrompt: `Transform this photograph into a vibrant cartoon illustration in the style of modern 3D animation studios.
        The scene should be dominated by a bright, cheerful yellow color palette with warm oranges and soft amber tones.
        Create a playful, family-friendly character design that would fit perfectly in a Pixar or DreamWorks animated film.`,

      subjectPrompt: `The subject should be transformed into a cartoon character with these specific qualities:
        - Exaggerated but friendly and approachable facial features
        - Large, expressive eyes that convey warmth and personality
        - Simplified anatomical proportions suitable for animation
        - Smooth, rounded forms without sharp angles
        - The original person's key identifying features must remain recognizable
        - Maintain the original pose and general body position`,

      compositionPrompt: `Frame the subject with these compositional elements:
        - Centered positioning with comfortable margins
        - Clean, simplified background with soft gradients
        - Minimal environmental detail to keep focus on character
        - Flat, illustration-style depth of field
        - 1024x1024 square aspect ratio
        - Eye-level or slightly elevated viewing angle for friendliness`,

      lightingPrompt: `Apply bright, optimistic lighting conditions:
        - High-key lighting with minimal shadows
        - Soft, even illumination across the entire character
        - Warm color temperature emphasizing yellows and golds
        - Subtle rim lighting for character separation
        - No harsh shadows or dramatic contrasts
        - Animation studio style ambient lighting`,

      stylePrompt: `Render in a modern cartoon animation style:
        - Flat, cel-shaded colors with minimal gradients
        - Vector-art quality with clean, smooth edges
        - Saturated, vibrant color palette dominated by yellows
        - Simplified textures without photorealistic detail
        - Cheerful, uplifting mood throughout
        - Similar to Minions, SpongeBob, or Simpsons color schemes`,

      negativePrompt: `Avoid these elements completely:
        - No realistic skin texture or pores
        - No complex shadows or realistic lighting
        - No photographic elements or textures
        - No dark, muted, or desaturated colors
        - No sharp edges or angular geometric shapes
        - No realistic hair strands, use simplified hair shapes instead
        - No gore, violence, or scary elements
        - No anatomical imperfections or asymmetry`,

      promptStrength: 1.2,
      preserveIdentity: true,
      outputResolution: '1024x1024'
    }
  },

  'vampire': {
    id: 'vampire',
    name: 'Vampire',
    description: 'Gothic vampire portrait with aristocratic elegance',
    enabled: true,
    icon: '🧛',
    prompt: 'Transform to vampire portrait, gothic aesthetic, pale skin, dark atmosphere, mysterious, no gore or blood',
    advancedPrompt: {
      basePrompt: `Transform this portrait into an elegant gothic vampire with aristocratic bearing and timeless beauty.
        Create a romanticized vampire aesthetic inspired by Victorian Gothic literature and classic vampire films.
        The subject should appear mysterious, alluring, and otherworldly while maintaining their core identity.`,

      subjectPrompt: `Transform the subject into an elegant vampire with these characteristics:
        - Pale, porcelain-like skin with subtle blue or purple undertones
        - Hypnotic eyes with a subtle red or amber gleam in the iris
        - Refined, aristocratic facial features with enhanced symmetry
        - If mouth is visible, add subtle, tasteful fangs (not exaggerated)
        - Maintain the subject's recognizable facial structure
        - Add an aura of timeless beauty and supernatural grace
        - Victorian-era or timeless formal attire if clothing is visible`,

      compositionPrompt: `Compose a dramatic vampire portrait:
        - Classic portrait composition with subject as focal point
        - Dark, atmospheric background suggesting castle or manor setting
        - Gothic architectural elements like arches or columns if appropriate
        - Shallow depth of field with sharp focus on subject
        - Vertical orientation emphasizing height and elegance
        - Low angle to suggest power and presence`,

      lightingPrompt: `Create dramatic, moody lighting:
        - Chiaroscuro technique with strong light-dark contrasts
        - Cool, moonlight-quality key light from above
        - Subtle warm rim lighting to separate from background
        - Deep shadows that suggest mystery without obscuring features
        - Candlelight or moonlight color temperature
        - Fog or mist effects in the background for atmosphere`,

      stylePrompt: `Render in a romantic Gothic art style:
        - Oil painting quality with visible brushwork texture
        - Rich, luxurious color palette of deep reds, purples, and blacks
        - Victorian Gothic aesthetic with baroque influences
        - Velvet and brocade textures for clothing
        - Silver and jewel-tone accents
        - Dark romantic fantasy atmosphere
        - Reference: Anne Rice novels, Castlevania art, Victorian portraits`,

      negativePrompt: `Strictly avoid these elements:
        - No blood, gore, or violence of any kind
        - No zombie-like decay or decomposition
        - No excessive horror or frightening elements
        - No modern clothing or contemporary accessories
        - No bright, cheerful colors or daylight
        - No cartoonish or comedic vampire stereotypes
        - No bat transformation or animal features
        - No religious symbols or crosses`,

      promptStrength: 1.3,
      preserveIdentity: true,
      outputResolution: '1024x1024'
    }
  },

  'comic-ink': {
    id: 'comic-ink',
    name: 'Comic Ink',
    description: 'Dynamic comic book art with bold ink lines',
    enabled: true,
    icon: '💥',
    prompt: 'Transform to comic book art style, bold ink lines, halftone pattern, dramatic shadows, pop art colors',
    advancedPrompt: {
      basePrompt: `Transform this image into dynamic American comic book art from the golden and silver age of comics.
        Create bold, graphic artwork with strong black ink outlines, classic Ben Day dots, and high contrast colors.
        The style should evoke classic Marvel and DC comics with heroic, larger-than-life qualities.`,

      subjectPrompt: `Transform the subject into a comic book character:
        - Heroic, idealized proportions while maintaining identity
        - Dynamic, action-ready pose even if originally static
        - Exaggerated but recognizable facial features
        - Strong, confident expression with dramatic emotions
        - Comic book style hair with ink-defined strands
        - Muscular or athletic build appropriate to comic heroes
        - Costume elements suggesting superhero or action character if appropriate`,

      compositionPrompt: `Create dynamic comic book composition:
        - Dramatic angles suggesting movement and energy
        - Comic panel style framing with implied borders
        - Action lines and speed effects where appropriate
        - Dramatic perspective with possible foreshortening
        - Bold, graphic negative space usage
        - Multiple focal points connected by visual flow
        - Environmental elements suggesting urban or dramatic setting`,

      lightingPrompt: `Apply dramatic comic book lighting:
        - High contrast with stark blacks and bright highlights
        - Noir-influenced dramatic shadows
        - Strong directional lighting creating bold shadow shapes
        - Rim lighting for character separation
        - Selective spot lighting for dramatic effect
        - No subtle gradients, use hard light transitions
        - Comic book style colored lighting effects`,

      stylePrompt: `Render in classic American comic book style:
        - Bold black ink outlines with varying line weights
        - Thicker lines for major forms, thinner for details
        - Ben Day dots and halftone patterns for mid-tones
        - Cross-hatching techniques for shadow depth
        - Limited but vibrant color palette (primary colors plus black)
        - Flat color fills with minimal blending
        - Pop art influence with graphic sensibility
        - Reference: Jack Kirby, Jim Lee, Frank Miller styles`,

      negativePrompt: `Avoid these non-comic elements:
        - No photorealistic textures or rendering
        - No soft gradients or airbrush effects
        - No watercolor or painted effects
        - No muted or pastel colors
        - No manga or anime style elements
        - No excessive detail that muddies the bold graphic style
        - No realistic proportions, embrace comic book idealization
        - No subtle color variations, keep colors flat and bold`,

      promptStrength: 1.4,
      preserveIdentity: true,
      outputResolution: '1024x1024'
    }
  }
};

// Helper function to build complete prompt from components
export function buildCompletePrompt(preset: PresetPrompt): string {
  if (!preset.advancedPrompt) {
    return preset.prompt;
  }

  const {
    basePrompt,
    subjectPrompt,
    compositionPrompt,
    lightingPrompt,
    stylePrompt,
    negativePrompt
  } = preset.advancedPrompt;

  // Build structured prompt following Nano Banana best practices
  const sections = [
    basePrompt,
    subjectPrompt && `[Subject Details] ${subjectPrompt}`,
    compositionPrompt && `[Composition] ${compositionPrompt}`,
    lightingPrompt && `[Lighting] ${lightingPrompt}`,
    stylePrompt && `[Style Reference] ${stylePrompt}`,
    negativePrompt && `[Avoid] ${negativePrompt}`,
    `Output: ${preset.advancedPrompt.outputResolution || '1024x1024'}, maintain subject identity.`
  ].filter(Boolean);

  return sections.join('\n\n');
}

// Function to get optimized prompt for a preset
export function getOptimizedPrompt(presetId: string): PresetPrompt | undefined {
  return optimizedPrompts[presetId];
}

// Function to merge user customizations with base prompts
export function mergePromptCustomizations(
  basePreset: PresetPrompt,
  customizations: Partial<PresetPrompt['advancedPrompt']>
): PresetPrompt {
  if (!basePreset.advancedPrompt) {
    return basePreset;
  }

  return {
    ...basePreset,
    advancedPrompt: {
      ...basePreset.advancedPrompt,
      ...customizations
    }
  };
}