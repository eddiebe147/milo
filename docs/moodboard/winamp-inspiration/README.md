# MILO Voice Assistant - Winamp Skin Inspiration Moodboard

## Concept: Swiss Army Knife Slide-Out Voice Panel

The voice assistant should feel like a **modular Winamp component** - hidden until needed, then sliding out with purpose. Think of the EQ drawer, playlist editor, or visualization window that docks and undocks.

---

## Key Winamp Design Principles

### 1. **Dockable Modular Panels**
- Components slide in/out from edges
- Snap to parent window at specific pixel distances
- WindowShade mode: collapsed compact view
- Drawer system with tabs

### 2. **Industrial Material Aesthetic**
Skins that match MILO's submarine cockpit vibe:

| Skin | Materials | Vibe |
|------|-----------|------|
| **Steel-This-Amp** | Brushed steel, cassette player | Industrial, sturdy |
| **Nemish** | LCD, industrial gray plastic, satin metal, red LEDs | Tactical, military |
| **Gothic Metal v2.0** | Dark base, red accents, redesigned buttons | Elegant dark |
| **Black Metal Wood** | Metal + wood hybrid | Vintage audio |
| **Metrix Metal Dream** | QNX Photon style | Clean industrial |

### 3. **LCD/LED Display Style**
- Segmented displays for status
- Scrolling text marquees
- Spectrum analyzers and visualizers
- Glowing indicators (green, amber, red)

### 4. **Compact Information Density**
- Every pixel serves a purpose
- Tiny buttons with clear iconography
- Status indicators packed tightly
- No wasted space

---

## Reference Resources

### Museums & Archives
- [Winamp Skin Museum](https://skins.webamp.org/) - 100k+ skins, infinite scroll
- [Internet Archive Winamp Skins](https://archive.org/details/winampskins) - Downloadable collection
- [WinampHeritage.com](https://winampheritage.com/skins) - Categorized skins

### Sci-Fi Themed Skins
- [House of Themes Sci-Fi](https://houseofthemes.com/winampskins-sci-fi.html)
  - 2001: A Space Odyssey (HAL interface)
  - Metropolis (1927 dystopia)
  - Alien (mining vessel aesthetic)
  - Dune 2000 (desert tech)

### Industrial/Metal Skins
- [Steel-This-Amp](https://archive.org/details/winampskin_Steel_This_Amp) - ZDNet Top 10
- [Gothic Metal v2.0](https://winampheritage.com/skin/gothic-metal-v2-0/222074) - Dark + red
- [Brushed Steel v2](https://www.deviantart.com/butters4life/art/Brushed-Steel-WinAMP-3-skin-v2-3345199)

---

## MILO Voice Panel Design Direction

### Slide-Out Behavior
```
HIDDEN STATE:
┌─────────────────────────────────┐
│         Chat Panel              │
│                                 │
│  [Message input...] [🎤]        │  <- Mic button triggers slide
└─────────────────────────────────┘

ACTIVE STATE (slides from right):
┌─────────────────────────────────┬──────────┐
│         Chat Panel              │ ╭──────╮ │
│                                 │ │      │ │
│                                 │ │ 🌊   │ │  <- Waveform responds
│                                 │ │      │ │     to user's voice
│  [Message input...]             │ ╰──────╯ │
└─────────────────────────────────┴──────────┘
                                    ↑
                              Voice Module
                              (Swiss Army style)
```

### Visual Elements to Include
1. **Industrial frame** - Rivets, brushed metal border
2. **LCD status display** - "LISTENING...", "PROCESSING...", "SPEAKING..."
3. **Waveform visualizer** - Responds to voice amplitude
4. **Minimal controls** - Just what's needed
5. **Glow effects** - Green primary, amber processing, red errors

### Animation Concepts
- **Slide in**: 300ms ease-out from right edge
- **Slide out**: 200ms ease-in when done
- **Waveform**: Real-time audio amplitude visualization
- **Status LED**: Pulsing glow during states

### Positioning Options

**Option A: Side Drawer (Winamp EQ style)**
- Slides out from right of chat panel
- Docks at edge like Winamp component
- Most authentic to Winamp

**Option B: Bottom Attachment**
- Extends below message input
- Like a keyboard drawer

**Option C: Corner Pop-up**
- Appears in corner, partially overlapping
- More modern, less authentic

**Recommendation**: Option A - true to Winamp heritage

---

## Mood Keywords
- Modular
- Dockable
- Industrial
- Tactical
- Submarine cockpit
- Brushed metal
- LCD displays
- LED indicators
- Compact
- Purposeful
- 90s software aesthetic
- Utilitarian beauty

---

## Next Steps
1. Design slide-out panel component
2. Add audio amplitude visualization
3. Implement slide animation
4. Add industrial frame styling
5. Status LCD display
