# MorningContext Component

A contextual banner component that appears on the first visit of each day, showing tasks the user worked on yesterday to provide continuity and enable quick resumption of work.

## Features

- **Smart Visibility**: Only renders on first visit of the day when continuity tasks exist
- **Multi-Day Progress**: Displays progress tracking for tasks spanning multiple days
- **Quick Resume**: One-click buttons to start working on previous tasks
- **Dismissible**: Clean dismiss animation via button or ESC key
- **Accessible**: Full ARIA support and keyboard navigation
- **Terminal Aesthetic**: Pipboy-green theme matching MILO's design system

## Usage

```tsx
import { MorningContext } from '@/components/Dashboard/MorningContext'

function Dashboard() {
  return (
    <div className="p-4">
      {/* Place at top of dashboard for maximum visibility */}
      <MorningContext />

      {/* Other dashboard content */}
      <SignalQueue />
      <BacklogList />
    </div>
  )
}
```

## How It Works

The component integrates with two key systems:

1. **useContinuity Hook**: Manages detection of first daily visit and fetches yesterday's tasks
2. **useTasksStore**: Handles task state updates when resuming work

### State Flow

```
User opens MILO
  ↓
useContinuity checks localStorage for last visit date
  ↓
If new day → fetch tasks worked yesterday
  ↓
If continuity tasks exist → showMorningContext = true
  ↓
MorningContext renders
  ↓
User clicks "Continue" → startTask(id) → recordWork(id)
  ↓
Component dismisses after 500ms
```

## Props

None. The component is fully self-contained and manages its own state via hooks.

## Design Specs

### Layout

- **Container**: Full-width card with pipboy-green border and glow
- **Header**: Greeting + task count summary + dismiss button
- **Task Cards**: Individual cards for each continuity task
- **Footer**: Keyboard hint for ESC dismissal

### Colors

- **Primary**: `#00ff41` (pipboy-green)
- **Background**: `#0a0a0a` (pipboy-background)
- **Surface**: `#1a1a1a` (pipboy-surface)
- **Border**: `rgba(0, 255, 65, 0.3)` (green with opacity)

### Animations

- **Entrance**: Slide down + fade in (300ms)
- **Exit**: Slide up + fade out (300ms)
- **Task Cards**: Staggered entrance (100ms delay per card)
- **Progress Bar**: Smooth width transition (500ms)

### Typography

- **Font**: Share Tech Mono (monospace)
- **Heading**: 18px, semibold
- **Body**: 14px, regular
- **Caption**: 12px, regular

## Accessibility

### ARIA Support

- `role="region"` with `aria-label="Morning context"`
- `aria-live="polite"` for dynamic content
- `aria-label` on all interactive elements
- Descriptive button text for screen readers

### Keyboard Navigation

- **ESC**: Dismiss the banner
- **Tab**: Navigate through Continue buttons
- **Enter/Space**: Activate focused button
- **Shift+Tab**: Reverse tab order

### Focus Management

- Visible focus rings on all interactive elements
- Focus trapped within component when active
- Focus returns to body after dismissal

### Color Contrast

All text meets WCAG AA standards:
- Green text on dark background: 13.7:1 ratio
- Dim green for secondary text: 8.2:1 ratio

## Multi-Day Task Progress

Tasks with `estimatedDays > 1` display enhanced progress tracking:

```tsx
// Example multi-day task
const task = {
  title: 'Implement authentication system',
  estimatedDays: 5,
  daysWorked: 2,
  // ... other fields
}

// Renders as:
// "Day 3 of 5" (33% complete)
// [Progress bar at 40%]
```

### Progress Calculation

```typescript
const progress = getTaskProgress(task)
// {
//   isMultiDay: true,
//   daysWorked: 2,
//   estimatedDays: 5,
//   percentComplete: 40,
//   progressLabel: "Day 3 of 5"
// }
```

## Performance Optimizations

1. **Conditional Rendering**: Returns `null` immediately if not needed
2. **Lazy Dismissal**: Uses `setTimeout` to avoid blocking UI during animation
3. **CSS Transitions**: Hardware-accelerated animations instead of JS
4. **Stable Hook Refs**: No unnecessary re-renders
5. **Inline Critical CSS**: Keyframes embedded for instant animation start

## Testing

Run the test suite:

```bash
npm test MorningContext.test.tsx
```

### Test Coverage

- ✓ Visibility logic (shows/hides correctly)
- ✓ Greeting based on time of day
- ✓ Task display (single and multiple)
- ✓ Multi-day progress rendering
- ✓ Dismiss interactions (button + ESC)
- ✓ Resume task flow
- ✓ Loading states
- ✓ Accessibility features

## Edge Cases Handled

1. **No continuity tasks**: Component doesn't render
2. **Already dismissed today**: Component doesn't render
3. **Task without description**: Gracefully omits description section
4. **Task without rationale**: Shows progress bar instead (multi-day) or nothing (single-day)
5. **Rapid clicking**: Button disables during task start
6. **Network errors**: Handled by store layer, component shows error state

## Integration Example

Full integration with Dashboard:

```tsx
import { MorningContext } from '@/components/Dashboard/MorningContext'
import { SignalQueue } from '@/components/Dashboard/SignalQueue'
import { BacklogList } from '@/components/Dashboard/BacklogList'

export function DashboardV2() {
  return (
    <div className="min-h-screen bg-pipboy-background text-pipboy-green font-mono p-6">
      {/* Morning context appears only on first visit */}
      <MorningContext />

      {/* Main dashboard content always visible */}
      <div className="mt-6">
        <SignalQueue />
      </div>

      <div className="mt-8">
        <BacklogList />
      </div>
    </div>
  )
}
```

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

Requires:
- CSS Grid
- CSS Transitions
- JavaScript ES2020+
- LocalStorage API

## Related Components

- **SignalQueue**: Displays top-priority tasks for today
- **BacklogList**: Shows all other incomplete tasks
- **CommandInput**: Quick task creation interface

## Related Hooks

- **useContinuity**: Manages day-over-day continuity logic
- **useTasksStore**: Task state management

## Future Enhancements

- [ ] Swipe gestures for mobile dismissal
- [ ] Customizable greeting messages
- [ ] Task notes preview in cards
- [ ] Configurable animation speed
- [ ] Sound effects on resume (optional)
- [ ] Analytics tracking for resume rate
