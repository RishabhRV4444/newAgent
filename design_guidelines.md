# AREVEI Cloud - Design Guidelines

## Design Approach
**System-Based Approach**: Drawing inspiration from productivity tools like Notion and Google Drive with a focus on minimal, fast, and elegant interface design for file management workflows.

## Core Design Principles
- Clean, functional interface prioritizing file operations efficiency
- Minimal visual clutter with purposeful whitespace
- Fast, responsive interactions with smooth animations
- Clear visual hierarchy for file browsing and management

## Typography
**Font Family**: Inter or Poppins from Google Fonts
- Headings: Poppins/Inter 600-700 weight
- Body text: Inter 400-500 weight
- File metadata: Inter 400 weight, smaller sizes
- Sidebar navigation: Inter 500 weight

**Hierarchy**:
- Dashboard title: Large, bold
- Section headers: Medium weight, generous spacing
- File names: Regular weight, readable size
- Metadata (size, date): Smaller, muted treatment

## Color Palette
**Primary Accent**: #4F46E5 (AREVEI Blue)
- Use for: Active navigation items, primary buttons, upload button, progress bars, hover states
- Background: Pure white (#FFFFFF)
- Borders: Subtle gray (#E5E7EB)
- Text: Dark gray for primary (#1F2937), light gray for secondary (#6B7280)
- Success/Delete actions: Use standard green/red with proper contrast

## Layout System
**Spacing Units**: Tailwind scale - use 2, 4, 6, 8, 12, 16, 20 units consistently
- Component padding: p-4 to p-6
- Section spacing: space-y-6 to space-y-8
- Card gaps: gap-4 to gap-6

**Grid Structure**:
- Sidebar: Fixed width 240-280px
- Main content area: Fluid with max-width constraints
- File grid: 3-4 columns on desktop, 2 on tablet, 1 on mobile
- List view: Full-width rows with defined columns

## Component Library

### Sidebar Navigation
- Fixed left panel with AREVEI Cloud branding at top
- Navigation items: Dashboard, Files, Storage Usage, Settings
- Active state: AREVEI Blue background with white text
- Hover state: Light gray background transition

### Topbar
- Horizontal bar spanning main content area
- Search bar: Prominent, centered or left-aligned with icon
- User profile icon: Right-aligned, circular avatar placeholder
- Height: 64px with proper vertical alignment

### File/Folder Cards (Grid View)
- Clean card design with subtle border
- File type icon (large, prominent)
- File name below icon
- Metadata: Size and date in smaller, muted text
- Hover: Slight elevation shadow, border color change
- Actions: Rename, delete icons appear on hover

### File List (List View)
- Table-like structure with columns: Name, Type, Size, Modified
- Row hover: Light background highlight
- Checkbox for bulk selection (left)
- Action buttons aligned right

### Upload Zone
- Prominent upload button with AREVEI Blue
- Drag-and-drop area with dashed border when dragging
- File type icons during upload progress
- Progress indicators for multiple uploads

### Buttons
- Primary: AREVEI Blue background, white text, rounded corners
- Secondary: White background, gray border, dark text
- Upload button: Large, prominent with upload icon
- Create folder: Secondary style with folder icon

### Modals
- File preview: Centered modal with image/PDF viewer
- Rename: Simple input field with confirm/cancel
- Delete confirmation: Warning style with clear actions
- Semi-transparent backdrop overlay

### Storage Indicator
- Visual progress bar using AREVEI Blue
- Text showing "X GB of Y GB used"
- Percentage display
- Place in sidebar or dedicated storage section

## Interactions & Animations
**Framer Motion Integration**:
- File card entry: Stagger animation when loading grid
- Upload: Fade-in with slide-up motion
- Delete: Fade-out with scale-down
- Modal: Scale and fade transitions
- Keep animations subtle (200-300ms duration)

**Micro-interactions**:
- Button hover: Slight scale or color shift
- File hover: Elevation shadow
- Drag-and-drop: Visual feedback (border highlight)
- Loading states: Skeleton screens or spinners

## View Modes
**Grid View**: 
- Card-based layout with file icons
- 3-4 cards per row (responsive)
- Larger visual targets for clicking

**List View**:
- Dense, table-like rows
- More files visible at once
- Quick scanning of metadata

**Toggle**: Icon-based toggle in toolbar (grid/list icons)

## Responsive Behavior
- Desktop (>1024px): Full sidebar + multi-column grid
- Tablet (768-1023px): Collapsible sidebar + 2-column grid
- Mobile (<768px): Hidden sidebar (hamburger menu) + single column list

## File Type Icons
- Use icon library (Heroicons or Font Awesome)
- Distinct icons for: Folders, Images, PDFs, Documents, Videos, Archives
- Consistent sizing across views

## Search & Filter
- Search bar: Full-width in topbar, real-time filtering
- Filter options: File type, date range, size
- Sort options: Name, date, size (ascending/descending)
- Clear visual indicators for active filters

## Branding
- Logo: Simple text "AREVEI Cloud" in sidebar header
- Consistent use of AREVEI Blue throughout interface
- Clean, professional aesthetic avoiding playful elements
