import type { TemplateSceneEntry } from "./types";
import { WelcomeRenderScene, WelcomePreviewScene } from "./welcome";
import { HouseGuideRenderScene, HouseGuidePreviewScene } from "./house-guide";

const sceneRegistry: Record<string, TemplateSceneEntry> = {
  welcome: {
    renderScene: WelcomeRenderScene,
    previewScene: WelcomePreviewScene,
  },
  "house-guide": {
    renderScene: HouseGuideRenderScene,
    previewScene: HouseGuidePreviewScene,
  },
};

export function getTemplateScenes(slug: string): TemplateSceneEntry | undefined {
  return sceneRegistry[slug];
}

export function getRegisteredTemplateSlugs(): string[] {
  return Object.keys(sceneRegistry);
}
