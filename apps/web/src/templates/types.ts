import type { ComponentType } from "react";

export interface TemplateSceneProps {
  data: Record<string, string>;
  room: { name: string } | null;
}

export interface PreviewTemplateSceneProps extends TemplateSceneProps {
  renderMode: boolean;
}

export interface TemplateSceneEntry {
  renderScene: ComponentType<TemplateSceneProps>;
  previewScene: ComponentType<PreviewTemplateSceneProps>;
}
