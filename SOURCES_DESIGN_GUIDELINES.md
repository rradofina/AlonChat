# Sources Pages Design Guidelines

## Overview
This document outlines the design principles and standards established for all Sources pages (Files, Text, Website, Q&A, Notion) based on the Files page redesign. These guidelines ensure consistency and a clean, modern user experience across all source management interfaces.

## Core Design Principles

### 1. Ultra-Minimal Aesthetic
- **No unnecessary containers or borders** - Content flows naturally without boxed sections
- **Clean white backgrounds** for main content areas
- **Subtle gray accents** only where functionally needed
- **No excessive shadows or decorative elements**

### 2. Color Scheme
- **Primary Background**: White (`bg-white`)
- **Secondary Background**: Light Gray (`bg-gray-50`) for:
  - Upload/drop zones
  - Sidebars (Sources panel, Details panel)
  - Content viewer background
- **Borders**: Minimal use, light gray (`border-gray-200`) only where needed
- **Text**: Dark gray hierarchy (`text-gray-900` for primary, `text-gray-600` for secondary)

### 3. Layout Structure

#### Main List View
```
Page Title & Description
───────────────────────────────────────────────
[Drop Zone / Input Area] - Gray background (bg-gray-50)
───────────────────────────────────────────────

Controls Bar:
☐ Select all [count]          [Search] [Sort by: ▼]

Item List (no container, flows naturally):
☐ Item 1                                    [Status]
─────────────────────────────────────────────────────
☐ Item 2                                    [Status]
─────────────────────────────────────────────────────
[Rows per page: ▼]        [Page navigation]
```

#### Detail/Viewer Layout
```
[← Back to list]
Item Title                              [⋮ Actions]
───────────────────────────────────────────────────
Content Area (bg-gray-50)      │  Details Panel
  ┌─────────────────┐          │  (bg-gray-50)
  │ White content   │          │
  │ with border &   │          │  Created: ...
  │ rounded corners │          │  Updated: ...
  └─────────────────┘          │  Size: ...
```

## Component Standards

### 4. Controls & Inputs

#### Checkboxes
- Consistent alignment across all instances
- "Select all" checkbox aligns with item checkboxes
- No extra wrappers or containers

#### Dropdowns (CustomSelect)
- **Always use CustomSelect component** - Never native HTML select
- **Compact mode** for small value sets (rows per page)
- **Drop-up behavior** when near bottom of viewport
- **Minimal width** - Fits content, not fixed width

#### Search & Sort
- Position in top-right of controls bar
- Search input with light border (`border-gray-300`)
- Sort dropdown using CustomSelect

### 5. Spacing & Padding

#### Page-level Padding
- Main content area: `px-8 pt-8 pb-4`
- Minimal bottom padding to reduce gaps
- Full height usage: `min-h-full`

#### Content Sections
- Between sections: `mb-6` to `mb-8`
- Within sections: `gap-3` or `gap-4`
- List items: `py-3` for comfortable click targets

#### Detail View
- Content container: `p-8` padding from viewport edges
- Inner content box: `p-8` padding inside white container
- Sidebar: `px-6 py-6`

### 6. Typography

#### Hierarchy
- Page title: `text-2xl font-semibold text-gray-900`
- Section headers: `text-lg font-semibold text-gray-900`
- Body text: `text-sm text-gray-600`
- Labels: `text-sm text-gray-700`
- Metadata: `text-xs text-gray-500`

### 7. Status Indicators

#### Badge Styling
```css
Ready:      bg-green-100 text-green-800
Processing: bg-blue-100 text-blue-800
Failed:     bg-red-100 text-red-800
New:        bg-blue-100 text-blue-700
```

### 8. Interactive Elements

#### Hover States
- List items: `hover:bg-gray-50`
- Buttons: `hover:bg-gray-100`
- Subtle transitions: `transition-colors`

#### Click Areas
- Entire row is clickable for selection
- Separate action buttons (view, edit, delete)

### 9. Responsive Behavior

#### Pagination Controls
- Stacks on mobile: `flex-col md:flex-row`
- Maintains functionality at all sizes

#### Search/Sort Controls
- Wraps gracefully: `flex-wrap`
- Maintains minimum touch target sizes

### 10. Special Components

#### Upload/Input Areas
- Dashed border: `border-2 border-dashed`
- Gray background: `bg-gray-50`
- Clear drag states: Different background on drag

#### Floating Action Bar
- Appears when items selected
- Fixed position at bottom
- Clear action buttons

#### Modals & Overlays
- Clean white backgrounds
- Minimal borders
- Clear close/cancel options

## Implementation Checklist

When implementing or updating a Sources page:

- [ ] Remove all unnecessary container borders
- [ ] Set main background to white
- [ ] Use gray backgrounds only for specific elements (dropzones, sidebars)
- [ ] Replace all native selects with CustomSelect
- [ ] Add Search and Sort controls (if applicable)
- [ ] Ensure checkbox alignment consistency
- [ ] Implement proper spacing (reduce excessive gaps)
- [ ] Use consistent status badge colors
- [ ] Add proper hover states
- [ ] Ensure full-width content usage (no unnecessary max-width)
- [ ] Test dropdown direction (up when near bottom)
- [ ] Verify mobile responsiveness

## File-Specific Considerations

### Files Page
- File drop zone with drag-and-drop
- File viewer with Details sidebar
- Upload status indicators

### Text Page
- Text input area instead of drop zone
- In-line editing capabilities
- Character/word count displays

### Website Page
- URL input field
- Crawl status indicators
- Preview capabilities

### Q&A Page
- Question/Answer pair inputs
- Expandable answer fields
- Image upload support

### Notion Page
- Connection status display
- Sync indicators
- Page selection interface

## Notes

- **Consistency is key** - All Sources pages should feel like part of the same system
- **Performance matters** - Minimize re-renders, use proper state management
- **Accessibility** - Maintain proper ARIA labels, keyboard navigation
- **User feedback** - Clear loading states, error messages, success confirmations

---

*Last Updated: When making changes to Sources pages*
*Reference Implementation: `/app/dashboard/agents/[id]/sources/files/page.tsx`*