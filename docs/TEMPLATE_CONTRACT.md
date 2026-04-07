# Template Contract

This document defines the interface for creating custom code-based templates that can be imported into Hospitality Channels.

## Overview

There are two types of templates in the system:

1. **Built-in templates** — Code-based React scene components bundled with the application
2. **Composable templates** — User-created templates built via the in-browser template editor

This contract covers **built-in templates** — the code-based variety that developers create and import.

## Template Package Structure

A template package is a directory containing:

```
my-template/
├── metadata.ts      # Template metadata and field definitions
├── scene.tsx        # React component that renders the template
├── index.ts         # Re-exports metadata and scene
├── preview.png      # Optional preview image (1920x1080)
└── README.md        # Optional documentation
```

## Metadata (`metadata.ts`)

Export a `metadata` object with this shape:

```typescript
export const metadata = {
  slug: string           // Unique identifier, kebab-case (e.g., "my-custom-welcome")
  name: string           // Display name (e.g., "My Custom Welcome")
  description?: string   // Brief description shown in template browser
  category?: string      // Grouping category (e.g., "welcome", "info", "directory")
  version: number        // Schema version (start at 1)
  status: "active"       // Template status
  schema: {
    fields: TemplateField[]
  }
}
```

### Field Definitions

Each field in `schema.fields` defines a user-editable input:

```typescript
interface TemplateField {
  key: string        // Unique field identifier (e.g., "guestName")
  label: string      // Display label (e.g., "Guest Name")
  type: FieldType    // Input type (see below)
  default: string    // Default value
  required?: boolean // Whether the field is required
}

type FieldType =
  | "string"    // Single-line text input
  | "textarea"  // Multi-line text input
  | "markdown"  // Multi-line with markdown support (bold, italic, lists, headings)
  | "image"     // Image asset picker
  | "video"     // Video asset picker
  | "audio"     // Audio asset picker
  | "boolean"   // Checkbox toggle (value will be "true" or "false")
```

## Scene Component (`scene.tsx`)

Export a React component that renders the template at **exactly 1920x1080 pixels**.

```typescript
import type { TemplateSceneProps } from '../types'

export function MyTemplateScene({ data }: TemplateSceneProps) {
  const title = data.title || 'Default Title'
  const body = data.body || ''

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center text-white"
         style={{ background: 'linear-gradient(to bottom, #0f172a, #020617)' }}>
      <h1 style={{ fontSize: 64 }} className="font-bold">{title}</h1>
      {body && <p style={{ fontSize: 28 }} className="mt-4 text-white/70">{body}</p>}
    </div>
  )
}
```

### Props Interface

```typescript
interface TemplateSceneProps {
  data: Record<string, string>  // All field values as strings, keyed by field.key
}
```

### Rules and Constraints

1. **Resolution**: Scene must render at exactly 1920x1080. Use the `SceneContainer` component from `@hospitality-channels/ui` or set dimensions directly.

2. **Data format**: All values in `data` are strings. Boolean fields come as `"true"` or `"false"`. Numbers come as string representations.

3. **No external requests**: Do not make network requests at render time. All assets (images, videos) are served locally through the asset system. Image URLs will be local paths like `/api/assets/serve?path=...`.

4. **No `<canvas>` or WebGL**: The rendering pipeline uses Chromium screenshots. Standard HTML/CSS is captured perfectly; `<canvas>` elements and WebGL may not render correctly.

5. **No iframes**: Iframes will not be captured by the rendering pipeline.

6. **Styling**: Tailwind CSS is available. Inline styles work. Use `style={{ fontSize: N }}` for text sizing to ensure precise control.

7. **Fonts**: Use system fonts or fonts from the bundled font list. Custom fonts must be available in the Docker container's font directory. The render pipeline waits for `document.fonts.ready` before capturing.

8. **Background images/videos**: Use the established pattern for backgrounds:
   ```tsx
   // Background image
   style={{ background: `url(${imageUrl}) center / cover no-repeat` }}

   // Overlay for readability
   <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.55)' }} />
   ```

9. **Markdown**: Use the `SimpleMarkdown` component from `@/lib/markdown` for rendering user markdown content.

10. **QR Codes**: Use the `QrCode` component from `@/templates/qr-code` or `WifiQrCode` from `@/templates/wifi-qr-code`.

## Index File (`index.ts`)

Re-export both the metadata and scene component:

```typescript
export { metadata } from './metadata'
export { MyTemplateScene } from './scene'
```

## Registration

To make a template available in the application:

1. Place the template directory in `packages/templates/src/`
2. Add the metadata export to `packages/templates/src/registry.ts`
3. Add the scene component to `apps/web/src/templates/registry.ts`

### In `packages/templates/src/registry.ts`:

```typescript
import { metadata as myTemplate } from './my-template'

// Add to the registry array
const registry = [
  // ... existing templates
  myTemplate,
]
```

### In `apps/web/src/templates/registry.ts`:

```typescript
import { MyTemplateScene } from './my-template'

const sceneRegistry = {
  // ... existing entries
  'my-template': { scene: MyTemplateScene },
}
```

## Example

See any of the built-in templates for reference implementations:

- `packages/templates/src/welcome/` — Simple welcome screen with WiFi QR code
- `packages/templates/src/daily-agenda/` — Agenda with timed items
- `packages/templates/src/checkout/` — Checkout info with grid layout

## Future: Git Repository Templates

In a future phase, templates will be importable from external git repositories. The contract defined here will serve as the validation interface — any template package that conforms to this structure will be automatically importable.

Template repository structure:
```
my-template-repo/
├── templates/
│   ├── template-one/
│   │   ├── metadata.ts
│   │   ├── scene.tsx
│   │   └── index.ts
│   └── template-two/
│       ├── metadata.ts
│       ├── scene.tsx
│       └── index.ts
└── package.json
```
