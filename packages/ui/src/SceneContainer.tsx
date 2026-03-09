import type { CSSProperties, ReactNode } from "react";
import { RENDER_RESOLUTION } from "@hospitality-channels/common";

export interface SceneContainerProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  showSafeOverlay?: boolean;
}

/**
 * Fixed 16:9 scene container matching render resolution (1920x1080).
 * Use for preview and render-mode pages.
 */
export function SceneContainer({
  children,
  className,
  style,
  showSafeOverlay = false,
}: SceneContainerProps) {
  return (
    <div
      className={className}
      style={{
        position: "relative",
        width: RENDER_RESOLUTION.width,
        height: RENDER_RESOLUTION.height,
        maxWidth: "100%",
        maxHeight: "100%",
        aspectRatio: "16/9",
        overflow: "hidden",
        backgroundColor: "var(--gfp-bg-primary, #0f172a)",
        ...style,
      }}
    >
      {children}
      {showSafeOverlay && <SafeAreaOverlay />}
    </div>
  );
}

function SafeAreaOverlay() {
  return (
    <div
      style={{
        position: "absolute",
        inset: "var(--gfp-safe-margin, 5%)",
        border: "2px dashed rgba(255, 255, 255, 0.2)",
        pointerEvents: "none",
      }}
      aria-hidden
    />
  );
}
