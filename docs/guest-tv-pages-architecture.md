# Guest TV Pages Platform
## High-Level Architecture and Project Overview
### AI-Ready Build Brief for Cursor and Coding Agents

**Project codename:** Guest TV Pages  
**Primary goal:** Let a host easily create, customize, preview, publish, and maintain hotel-style guest room TV pages that are authored like websites, rendered into loopable 1080p videos, and exposed as IPTV channels alongside existing Tunarr channels.

---

## 1. Product Summary

This project is a self-hosted platform for building personalized guest room TV experiences in a home environment. The system should let the host create pages such as:

- Welcome screen
- House guide
- Local recommendations
- Wi-Fi instructions
- Scenic slideshow
- “How to use this TV / Plex / IPTV” page

These pages should be authored as website-like templates and content entries, previewed in a browser, rendered into loopable 1080p videos, and published into a media location that can be consumed by Tunarr as local video content. Tunarr can then expose those rendered videos as IPTV channels to the guest-room TV.

The platform should be designed first for a single home with one or a few guest rooms, but the architecture should support future expansion to multiple rooms, multiple lineups, and optional live or dynamic page rendering.

---

## 2. Core Vision

The desired user experience is:

1. Open a self-hosted web app.
2. Choose a page template such as “Welcome”, “Tahoe Recommendations”, or “House Guide”.
3. Customize content with guest name, dates, Wi-Fi info, recommendations, photos, QR codes, and branding.
4. Preview the page in an exact 1920x1080 TV-safe canvas.
5. Click **Render & Publish**.
6. The platform generates a clean loopable 1080p video asset.
7. The asset is placed into a Tunarr-compatible media location.
8. Tunarr schedules or exposes the asset as one or more IPTV channels.
9. The guest-room TV sees those channels alongside normal IPTV channels.

The system should make this feel like editing a microsite, not like hand-building video files.

---

## 3. Problem Statement

Existing hospitality TV software is usually commercial, tied to hotel PMS systems, and far too heavy for a home guest-room use case. Existing IPTV tooling is good at playing channels, but not good at authoring beautiful custom pages. Existing digital signage tools can display web content, but they do not naturally fit into an IPTV channel workflow.

This project bridges that gap by turning webpage-authored guest pages into video assets that integrate cleanly with an existing IPTV stack.

---

## 4. Scope

### In scope for MVP
- Self-hosted web application
- Template-based page creation
- Guest-specific and room-specific content
- 1920x1080 preview mode
- Render mode for deterministic output
- Loopable 1080p video generation
- Export to a watched media directory
- Publishing workflow compatible with Tunarr local media / “other videos”
- Channel metadata manifest for easy mapping to Tunarr
- Asset library for photos, logos, and backgrounds
- Preset page types for welcome, house info, recommendations, slideshow

### Out of scope for MVP
- True live HTML-to-video broadcast playout
- Commercial hospitality PMS integrations
- Native TV apps
- DRM or streaming service integrations
- Full digital-signage fleet management
- Real-time guest interactivity on the TV screen
- Mobile remote control experience
- Multi-tenant SaaS hosting

### Future scope
- Multi-room channel sets
- Dedicated per-room Tunarr publishing profiles
- Automatic expiring guest pages
- Live data widgets such as weather or calendar
- Optional HLS output instead of only MP4
- Dispatcharr or similar lineup aggregation layer
- QR-code flows that open room-specific guest web pages
- Live mode using browser-to-video or broadcast graphics tooling

---

## 5. Assumptions and Constraints

1. The host already runs an IPTV stack with Tunarr.
2. Tunarr is used as the channel orchestration layer, not replaced by this project.
3. The guest page platform is responsible for authoring, rendering, and publishing assets.
4. The output format for MVP is a loopable video asset, not raw HTML consumed directly by the IPTV client.
5. Page design should feel like a website, but the final artifact for IPTV should be video.
6. The preview canvas must match the final video framing as closely as possible.
7. Render output must be deterministic. Dynamic elements must be frozen or normalized during render.
8. The host may later want either:
   - guest channels mixed into the main Tunarr instance, or
   - a second Tunarr instance dedicated to the guest room.
9. The platform should run cleanly in Docker on a homelab environment.

---

## 6. High-Level Architecture

```text
+------------------------+
|   Host Admin Browser   |
|  (create/edit/preview) |
+-----------+------------+
            |
            v
+-----------------------------+
| Guest TV Pages Web App      |
|-----------------------------|
| Templates                   |
| Content models              |
| Asset library               |
| Brand settings              |
| Room/guest profiles         |
| Preview runtime             |
| Publish workflows           |
+------+----------------------+
       |
       +-------------------------------+
       |                               |
       v                               v
+-------------------+         +----------------------+
| App Database      |         | Asset Storage        |
|-------------------|         |----------------------|
| pages             |         | uploads              |
| templates         |         | backgrounds          |
| guests            |         | logos                |
| rooms             |         | photos               |
| publish jobs      |         | generated posters    |
+-------------------+         +----------------------+
       |
       v
+-------------------------------------------+
| Render Pipeline                            |
|-------------------------------------------|
| Chromium / Playwright                      |
| 1920x1080 render mode                      |
| deterministic page load                    |
| timed animation capture                    |
| FFmpeg normalization / trim / loop polish  |
| MP4 output + thumbnails + metadata         |
+----------------------+--------------------+
                       |
                       v
+-------------------------------------------+
| Publish Target                             |
|-------------------------------------------|
| watched export directory                   |
| optional per-room output folders           |
| tunarr-ready media + sidecar metadata      |
+----------------------+--------------------+
                       |
                       v
+-------------------------------------------+
| Tunarr                                     |
|-------------------------------------------|
| local media / other videos                 |
| channel scheduling                         |
| M3U / XMLTV / HDHomeRun exposure           |
+----------------------+--------------------+
                       |
                       v
+-------------------------------------------+
| Guest Room TV / IPTV Client                |
|-------------------------------------------|
| sees welcome and info channels             |
| sees normal house channels                 |
+-------------------------------------------+
```

---

## 7. Recommended Logical Components

### 7.1 Admin UI
A browser-based interface for the host to:
- create new pages from templates
- edit text, photos, QR codes, colors, branding, and guest details
- preview exact TV layouts
- trigger render and publish jobs
- organize output into room/channel groups

### 7.2 Template Engine
Provides reusable layouts and components:
- Hero welcome page
- Split-panel info page
- Scenic slideshow page
- House rules / house info page
- Recommendations list page
- “How to use this room / TV” page

Templates should be parameterized and support variables such as:
- guest name
- check-in / check-out dates
- Wi-Fi SSID and password
- local recommendations
- quiet hours
- QR links
- property or room name
- hero image / background video / logo

### 7.3 Content Model Layer
Stores structured data separately from visual templates. Pages should be instances of templates with data bindings, not one-off HTML blobs only.

### 7.4 Preview Runtime
A browser runtime that renders pages in:
- **edit mode** for authoring
- **preview mode** for host validation
- **render mode** for deterministic capture

Render mode should freeze volatile data and eliminate layout shifts.

### 7.5 Render Service
Responsible for:
- launching headless Chromium
- loading a page at exactly 1920x1080
- waiting for fonts and assets
- starting the animation timeline
- capturing a fixed-duration video
- transcoding to a standardized output
- optionally generating poster images or thumbnails

### 7.6 Publish Service
Responsible for:
- copying final assets into export paths
- generating metadata files if needed
- updating publish history
- supporting publish profiles such as “main lineup” vs “guest lineup”

### 7.7 Optional Channel Manifest Layer
A small metadata abstraction for channel-targeted output:
- channel number
- channel title
- description
- page asset association
- target lineup
- schedule hints
- poster / guide art
- room visibility rules

This layer is useful even if Tunarr mapping is still manual at first.

---

## 8. Architecture Principles

1. **Website-first authoring, video-first delivery**
   - The source of truth is a webpage-like composition system.
   - The IPTV-compatible deliverable is a rendered video asset.

2. **Deterministic rendering**
   - Rendering must be reproducible.
   - Time, randomization, animation, and remote content must be controllable.

3. **Template-driven over freeform chaos**
   - Users should be able to create attractive screens quickly with sensible defaults.
   - Avoid making the MVP a full visual design suite.

4. **Composable outputs**
   - A single page can be exported to one or more channels.
   - A room profile can publish a full channel bundle.

5. **Homelab-friendly deployment**
   - Docker first.
   - Local file paths and network shares should be first-class citizens.

6. **Future live rendering compatibility**
   - The data model and template model should not assume that MP4 is the only long-term output.
   - Future live HTML-to-video or signage outputs should still be possible.

---

## 9. User Roles

### Host / Admin
The homeowner managing the guest room experience. Can create and publish all content.

### Optional Editor
Trusted family member or partner who can edit content but not necessarily change system settings.

### Guest / Viewer
Consumes the result on the TV. Does not log into the platform.

---

## 10. Primary User Stories

1. As a host, I want to create a personalized welcome screen for a guest by entering their name and arrival dates.
2. As a host, I want to reuse branded templates so the screens look polished without design work every time.
3. As a host, I want to preview exactly what the guest will see on a 1080p TV.
4. As a host, I want to generate a loopable video from the page with one action.
5. As a host, I want the output to land in a place Tunarr can consume.
6. As a host, I want to assign output assets to a guest-room channel set.
7. As a host, I want to create channels like Welcome, Tahoe Recs, House Guide, Slideshow, and TV Instructions.
8. As a host, I want content to expire or archive after the guest leaves.
9. As a host, I want to swap one guest’s content for another without editing raw files.
10. As a guest, I want the TV to feel welcoming and easy to understand when I turn it on.

---

## 11. Functional Requirements

### 11.1 Template and Page Authoring
- Create page from template
- Duplicate page
- Edit content fields
- Upload/select hero background image
- Set typography and color theme within constraints
- Add QR code blocks
- Add logo/branding block
- Add list-based recommendations
- Add instructions cards
- Add slideshow image sequence

### 11.2 Data Binding
- Support variables and structured fields
- Example:
  - `guest.name`
  - `guest.arrivalDate`
  - `room.name`
  - `network.ssid`
  - `network.password`
  - `property.checkoutTime`

### 11.3 Preview
- Exact 1920x1080 canvas
- Safe margins overlay toggle
- Loop duration preview
- Animation restart button
- Render-mode preview toggle

### 11.4 Rendering
- Capture exact resolution
- Configurable duration, default 20 or 30 seconds
- Configurable frame rate, default 30 fps
- Export standardized MP4
- Optional poster frame image
- Optional NFO or sidecar metadata for media ingestion

### 11.5 Publishing
- Publish page to a configured export target
- Publish all room channels as a bundle
- Track publish history and version metadata
- Support re-publish on content changes

### 11.6 Asset Management
- Upload photos, logos, and backgrounds
- Organize by tags
- Support scenic photo packs and room-specific galleries
- Preserve original and generated derivatives

### 11.7 Room and Guest Profiles
- Store room records
- Store guest records
- Support linking guests to rooms and stay windows
- Support room presets for default channel lineup

### 11.8 Channel Mapping
- Associate page assets with conceptual channels
- Example:
  - 950 Welcome
  - 951 House Guide
  - 952 Local Recommendations
  - 953 Scenic Slideshow
  - 954 TV / Plex / IPTV Instructions

---

## 12. Non-Functional Requirements

### Performance
- Most renders should complete fast enough for casual use on a homelab machine.
- Preview should feel instant or close to it for simple pages.

### Reliability
- Failed renders should not overwrite the last known good published asset.
- Publish operations should be atomic where possible.

### Maintainability
- Strong separation between data, templates, rendering, and publishing.
- Avoid baking file paths and room names all over the codebase.

### Portability
- Docker Compose deployment should be straightforward.
- Support local volumes and SMB/NFS-mounted media paths.

### Security
- Local-auth only is acceptable for MVP.
- No public exposure required.
- Secrets should be stored via env vars or mounted secrets.

### Observability
- Job history for renders and publishes
- Structured logs
- Clear error reporting for missing assets, font failures, and render crashes

---

## 13. Recommended Technical Approach

### Frontend / App Runtime
Preferred:
- Next.js or similar React-based framework
- Server-side routes for management screens
- Client-side live preview for visual editing

Alternative:
- SvelteKit or another full-stack web framework

### Styling / Layout
- CSS variables for branding and themes
- Strong component system
- Fixed 16:9 scene container
- TV-safe spacing rules

### Data Storage
Preferred:
- PostgreSQL for long-term flexibility

Acceptable MVP:
- SQLite if simplicity is more important at first

### Assets
- Local filesystem storage first
- Optional S3-compatible storage later

### Rendering
Preferred:
- Playwright + Chromium for page loading and browser-level capture
- FFmpeg for normalization, trimming, and output polishing

### Background Jobs
- Lightweight queue worker
- Jobs: render, publish, thumbnail generation, cleanup

### Auth
- Minimal local auth for MVP
- Optional role separation later

---

## 14. Why Playwright + FFmpeg for MVP

This project wants webpage-authored visuals without requiring a fully broadcast-grade playout engine. Playwright + Chromium is the most direct path to:
- loading real HTML/CSS layouts
- controlling viewport size precisely
- freezing render mode behavior
- capturing deterministic visual output

FFmpeg is then used to:
- standardize frame rate
- ensure 1080p output
- normalize pixel format
- trim or pad to exact duration
- produce final MP4 assets suitable for media ingestion

This is lower complexity than building on live playout frameworks and more flexible than designing static images only.

---

## 15. Render Pipeline Design

### Pipeline Stages
1. Resolve page and data bindings
2. Generate render URL
3. Open headless browser at 1920x1080
4. Wait for page hydration, fonts, images, and asset readiness
5. Trigger animation start event
6. Capture a fixed-duration video
7. Transcode and normalize output
8. Generate poster frame / thumbnail
9. Store output and publish if requested

### Render Mode Rules
Render mode should:
- disable live clocks unless explicitly baked
- freeze random slideshow order
- disable unstable remote data
- preload all images/fonts
- hide editor chrome
- use a deterministic animation timeline

### Loopability Rules
- Design loops intentionally
- Prefer seamless closed loops or hidden seams
- Avoid abrupt animation discontinuities
- Keep most motion ambient and subtle
- Use dark backgrounds when possible to hide compression artifacts

---

## 16. Publishing Model

### Option A: Single Tunarr Instance
The published outputs are added to the same media location used by the main Tunarr instance. Guest-specific channels are simply part of the broader house lineup.

**Pros**
- simplest
- one lineup
- least operational overhead

**Cons**
- guest channels appear to everyone unless hidden by client behavior

### Option B: Dedicated Guest Tunarr Instance
A second Tunarr instance consumes only the guest-room media plus selected normal channels.

**Pros**
- cleaner room-specific lineup
- easier to curate a guest-only experience

**Cons**
- additional operational complexity
- duplicated channel management unless tooling is added

### Option C: Future Aggregation Layer
Use a lineup aggregator or IPTV management layer later to curate multiple outputs per room or user.

**Recommendation**
Build the guest-page platform so it can publish to one or more export profiles without caring whether the downstream target is one Tunarr instance or several.

---

## 17. Content Model Proposal

### Core Entities

#### Template
- id
- slug
- name
- description
- category
- schema
- preview image
- version
- status

#### Page
- id
- templateId
- slug
- title
- roomId
- guestId
- themeId
- dataJson
- animationProfile
- defaultDurationSec
- status
- createdAt
- updatedAt

#### Room
- id
- name
- slug
- defaultChannelProfileId
- defaultThemeId
- notes

#### Guest
- id
- firstName
- lastName
- displayName
- arrivalDate
- departureDate
- notes

#### Asset
- id
- type
- originalPath
- derivedPath
- width
- height
- duration
- tags
- checksum

#### PublishProfile
- id
- name
- exportPath
- outputFormat
- lineupType
- roomScope
- fileNamingPattern

#### PublishedArtifact
- id
- pageId
- publishProfileId
- outputPath
- posterPath
- durationSec
- renderVersion
- status
- publishedAt

#### ChannelDefinition
- id
- channelNumber
- channelName
- pageId or artifactId
- description
- posterAssetId
- enabled

---

## 18. Example Page Types

### Welcome Page
Fields:
- guest name
- stay dates
- hero background
- welcome message
- Wi-Fi info
- QR code to house info or contact page

### House Guide Page
Fields:
- Wi-Fi info
- thermostat basics
- quiet hours
- parking info
- kitchen / coffee / towels notes

### Local Recommendations Page
Fields:
- 3 to 8 recommendation cards
- titles, subtitles, category labels
- optional QR codes
- photo or icon per recommendation

### Scenic Slideshow Page
Fields:
- image list
- caption style
- transition profile
- optional background music for future use, but muted/no-audio by default for MVP

### TV Instructions Page
Fields:
- how to switch inputs
- how to use Plex / IPTV
- what channels exist
- simple QR code for full instructions on phone

---

## 19. Suggested UX Model

### Main Navigation
- Dashboard
- Pages
- Templates
- Rooms
- Guests
- Assets
- Publish
- Settings

### Page Editor Layout
- left: content fields
- center: live TV preview canvas
- right: template layers / sections / animation options
- top actions: Save, Preview, Render, Publish

### Publish Screen
- choose page or room bundle
- choose target profile
- preview file names and channel mapping
- run publish
- show last good artifact and job history

---

## 20. Suggested Project Structure

```text
/apps
  /web                # admin UI + preview app
  /worker             # render/publish job worker

/packages
  /ui                 # shared components
  /templates          # page templates and schema
  /render-core        # render URL generation and capture orchestration
  /content-model      # zod/types/schema/domain logic
  /storage            # asset and filesystem abstraction
  /publish            # export profile and publish logic
  /common             # utilities and shared config

/infrastructure
  /docker
  /scripts
  /sample-data

/docs
  architecture.md
  product-requirements.md
  template-authoring.md
```

---

## 21. API / Service Boundaries

### Web App API
- CRUD for templates
- CRUD for pages
- CRUD for rooms, guests, assets
- preview endpoint
- publish endpoints
- render job status endpoints

### Worker API / Queue
- enqueue render job
- enqueue publish job
- retry failed job
- cleanup expired temp artifacts

### Storage Abstraction
Should hide whether assets live in:
- local disk
- mounted NAS path
- S3-compatible storage in the future

### Publish Abstraction
Should hide whether output goes to:
- one watched folder
- multiple room-specific folders
- one or more downstream lineups

---

## 22. Important Technical Guardrails

1. Do not make the editor depend on freeform drag-and-drop for MVP.
2. Do not tie templates too tightly to one room or one guest.
3. Do not let render mode depend on live internet calls unless cached or mocked.
4. Do not overwrite published assets until the new artifact is successfully generated.
5. Do not assume that every IPTV client handles guide art or metadata identically.
6. Do not let tiny typography creep in; TV readability matters more than density.
7. Do not treat preview and render as separate design systems; they should share the same page components.

---

## 23. Risks and Mitigations

### Risk: Browser capture is flaky
Mitigation:
- deterministic render mode
- preload assets
- job retries
- capture health checks

### Risk: Loops look awkward
Mitigation:
- constrain template animation patterns
- provide standard loop profiles
- design for ambient motion

### Risk: Tunarr ingestion is manual or fiddly
Mitigation:
- export a clear manifest
- use predictable naming
- target local “other videos” conventions
- keep publishing profile configurable

### Risk: Too much design freedom creates ugly screens
Mitigation:
- opinionated templates
- strong defaults
- tokenized branding system
- safe typography and spacing constraints

### Risk: Per-room lineups become messy
Mitigation:
- abstract publish targets
- keep channel definitions separate from pages
- support multiple profiles from day one

---

## 24. MVP Milestones

### Phase 1: Foundation
- auth
- DB schema
- assets
- rooms and guests
- page CRUD
- template registry

### Phase 2: Preview
- 1920x1080 preview canvas
- render mode toggle
- safe areas
- template variables

### Phase 3: Render
- Playwright capture
- FFmpeg normalization
- artifact storage
- job history

### Phase 4: Publish
- export profiles
- watched folder output
- channel manifest
- publish UI

### Phase 5: Polish
- better templates
- thumbnail/poster generation
- archive / expiration logic
- sample content packs

---

## 25. Acceptance Criteria for MVP

A successful MVP should allow the host to:
1. Create a welcome page for a guest without editing code.
2. Preview it at exact TV dimensions.
3. Render a loopable 1080p video.
4. Publish that video to a configured export target.
5. Create at least four practical page/channel types.
6. Re-render updated content without breaking existing published assets.
7. Manage room- and guest-specific data cleanly.
8. Run the whole system self-hosted in Docker.

---

## 26. Nice-to-Have Enhancements After MVP

- CSV import of local recommendations
- weather widget with cache and graceful fallback
- QR code generator with branded styles
- theme presets
- scheduling / expiry automation
- multi-page bundles rendered in one publish action
- poster art generator for guide views
- optional vertical companion web pages for phones
- integration hooks for Home Assistant
- auto-switch “current guest” by stay dates
- room-specific playlists / lineups
- live HLS or browser-based live channel generation later

---

## 27. Implementation Notes for AI Coding Agents

When generating code for this project:

- Favor simple, strongly typed domain models.
- Keep templates declarative and versioned.
- Separate editor-facing data from render-only runtime data.
- Build a reliable render pipeline before building fancy editor interactions.
- Prefer configuration and schema over hardcoded page assumptions.
- Treat 1920x1080 composition as a first-class invariant.
- Keep the publish pipeline idempotent and failure-safe.
- Make filesystem paths configurable.
- Add sample seed data and at least a few polished starter templates.

---

## 28. Suggested First Deliverables

1. Architecture skeleton with monorepo layout
2. DB schema and migrations
3. Template registry with 3 starter templates
4. Page editor form + preview
5. Render worker prototype using Playwright
6. FFmpeg finalization step
7. Publish profile abstraction
8. Docker Compose for local development
9. Seed data for one room and one guest
10. Example exported artifact bundle

---

## 29. Final Recommendation

The project should be built as a **website-authored guest TV publishing platform** with **deterministic browser rendering to loopable video assets** and **Tunarr-compatible publishing outputs**.

That architecture gives the most flexibility, fits the existing IPTV setup, avoids over-engineering, and keeps the user experience focused on what actually matters:

- fast customization
- polished guest-facing screens
- clean self-hosted operation
- reuse with future rooms or lineups

This is not a hotel PMS system. It is a home-scale, design-friendly, homelab-native “guest TV pages” platform that happens to publish to IPTV.

---

## 30. Short Build Brief

Build a self-hosted app that lets a host create guest-room TV pages like websites, preview them at 1920x1080, render them into loopable MP4 videos using a deterministic browser capture pipeline, and publish those videos into Tunarr-compatible media locations so they can appear as dedicated IPTV channels in a guest room. The system should support templates, guests, rooms, assets, publish profiles, and future expansion to multiple room-specific lineups.