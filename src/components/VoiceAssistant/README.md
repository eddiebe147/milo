# Voice Assistant Button Component

Floating voice assistant button for MILO that enables voice interactions with the AI.

## Features

- **Voice Input**: Uses Web Speech API for speech-to-text
- **Text-to-Speech**: AI responses are spoken back using Web Speech Synthesis API
- **Visual Feedback**: Animated waveform monitor shows current state
- **Multiple States**: Idle, Listening, Processing, Speaking
- **Error Handling**: Displays microphone permission errors and other issues
- **Transcript Preview**: Shows live transcript while listening

## Usage

```tsx
import { VoiceAssistantButton } from '@/components/VoiceAssistant'

// In your component
<VoiceAssistantButton />
```

The component is already integrated into the main App component and appears on the dashboard view.

## Component States

### 1. Idle
- Button is ready to listen
- Waveform monitor is inactive (breathing animation)
- Shows "Voice Assistant" label

### 2. Listening
- User is speaking
- Waveform monitor is active (animated bars)
- Shows "Listening" label with pulse ring
- Displays live transcript below button

### 3. Processing
- Sending voice command to AI
- Waiting for response
- Shows "Processing" label
- Button is disabled

### 4. Speaking
- MILO is speaking the AI response via TTS
- Waveform monitor is active
- Shows "Speaking" label
- Button is disabled

## Voice Flow

1. User clicks button → Start listening
2. User speaks → Transcript captured in real-time
3. Speech ends (final transcript) → Send to chat AI
4. AI generates response → Stored in chat messages
5. Response received → TTS speaks the response
6. TTS ends → Return to idle state

## Props

The component has no props - it uses global stores:

- `useChatStore`: For sending messages and receiving AI responses
- `useSettingsStore`: For voice settings (voiceId, voiceRate, voiceEnabled)
- `useVoiceInput`: Hook for speech recognition
- `useTextToSpeech`: Hook for speech synthesis

## Settings Integration

Voice settings can be configured in the Settings page:

- **Voice Enabled**: Toggle voice output on/off
- **Voice ID**: Select preferred voice from available system voices
- **Voice Rate**: Adjust speech speed (0.5 - 2.0)

## Browser Support

- **Voice Input**: Chrome, Edge, Safari (with webkit prefix)
- **Text-to-Speech**: All modern browsers
- **Electron**: Full support in Chromium-based Electron

## Accessibility

- Button is keyboard accessible
- Clear visual and text feedback for all states
- Error messages displayed for permission/hardware issues
- Disabled state when voice is not supported or unavailable

## Styling

Uses Tailwind CSS with custom theme colors:

- `--color-primary`: Primary theme color (default: pipboy-green)
- `--color-accent`: Accent theme color (default: pipboy-amber)
- `--color-danger`: Danger/error color (default: pipboy-red)

Animations:
- `animate-ping-slow`: Pulse ring when listening
- `animate-fade-in`: Smooth fade-in for transcript/errors
- WaveformMonitor: Built-in animations for active/idle states

## Component Structure

```
VoiceAssistant/
├── VoiceAssistantButton.tsx  # Main component
├── index.ts                   # Barrel export
└── README.md                  # This file
```

## Technical Notes

### Async Flow Handling

The component uses `useEffect` to watch for new AI messages and automatically speaks them when they arrive. This decouples the voice command sending from the response speaking.

### State Management

- Local state for processing flag
- Ref to track message count and detect new responses
- Store subscriptions for chat messages and settings

### Error Handling

- Microphone permission denied
- No speech detected
- Audio capture errors
- Network errors
- Shows user-friendly error messages

## Future Enhancements

- [ ] Push-to-talk mode (hold button to speak)
- [ ] Wake word detection ("Hey MILO")
- [ ] Voice activity detection (auto-stop when user stops speaking)
- [ ] Multiple language support
- [ ] Custom voice profiles
- [ ] Audio level visualization
- [ ] Voice command shortcuts
