# Component Library

This document provides a comprehensive guide to all UI components in the Amala Discovery Platform.

## Table of Contents

- [Core Components](#core-components)
- [Map Components](#map-components)
- [Form Components](#form-components)
- [Dashboard Components](#dashboard-components)
- [UI Components](#ui-components)
- [Layout Components](#layout-components)
- [Usage Examples](#usage-examples)

## Core Components

### Header
Main navigation header with search and user actions.

**Location:** `src/components/header.tsx`

**Props:**
```typescript
interface HeaderProps {
  onAddLocation: () => void;
  onSearch?: (query: string) => void;
  searchResults?: SearchResult[];
  onSearchResultSelect?: (locationId: string) => void;
}
```

**Usage:**
```tsx
<Header
  onAddLocation={() => setShowDialog(true)}
  onSearch={handleSearch}
  searchResults={results}
  onSearchResultSelect={handleSelect}
/>
```

### LocationSubmissionDialog
Modal dialog for submitting new locations with AI assistant and manual form options.

**Location:** `src/components/location-submission-dialog.tsx`

**Props:**
```typescript
interface LocationSubmissionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (locations: LocationResult[]) => Promise<void>;
}
```

## Map Components

### MapContainer
Main interactive map component using Google Maps.

**Location:** `src/components/map-container.tsx`

**Props:**
```typescript
interface MapContainerProps {
  locations: AmalaLocation[];
  selectedLocation: AmalaLocation | null;
  onLocationSelect: (location: AmalaLocation) => void;
  filters: LocationFilter;
}
```

### GoogleMapsLocationDetail
Detailed location information panel.

**Location:** `src/components/google-maps-location-detail.tsx`

**Props:**
```typescript
interface GoogleMapsLocationDetailProps {
  location: AmalaLocation;
  variant: 'compact' | 'full';
  onClose: () => void;
  onDirections: () => void;
  onShare: () => void;
  onSave: () => void;
}
```

### MapControls
Map control buttons (zoom, recenter, etc.).

**Location:** `src/components/map-controls.tsx`

## Form Components

### ManualLocationForm
Form for manually entering location details.

**Location:** `src/components/manual-location-form.tsx`

**Props:**
```typescript
interface ManualLocationFormProps {
  onSubmit: (location: LocationResult) => Promise<void>;
  onCancel: () => void;
}
```

### LocationAssistant
AI-powered location submission assistant.

**Location:** `src/components/location-assistant.tsx`

**Props:**
```typescript
interface LocationAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (locations: LocationResult[]) => Promise<void>;
  isEmbedded?: boolean;
}
```

### ReviewSubmission
Component for submitting location reviews.

**Location:** `src/components/review-submission.tsx`

**Props:**
```typescript
interface ReviewSubmissionProps {
  locationId: string;
  onSubmit: (review: ReviewData) => Promise<void>;
  onCancel: () => void;
}
```

## Dashboard Components

### AdminDashboard
Main admin dashboard with analytics and management tools.

**Location:** `src/app/admin/page.tsx`

### ModeratorDashboard
Moderation interface for reviewing content.

**Location:** `src/app/moderator/page.tsx`

### ScoutDashboard
Scout dashboard with submission tracking.

**Location:** `src/components/scout/scout-dashboard.tsx`

### MetricsDashboard
Analytics dashboard with charts and metrics.

**Location:** `src/components/admin/metrics-dashboard.tsx`

**Props:**
```typescript
interface MetricsDashboardProps {
  timeRange?: number;
  autoRefresh?: boolean;
}
```

### DiscoveryPanel
Autonomous discovery management panel.

**Location:** `src/components/discovery/discovery-panel.tsx`

**Props:**
```typescript
interface DiscoveryPanelProps {
  onDiscoveryComplete: (result: DiscoveryResult) => void;
}
```

## UI Components

### Button
Reusable button component with variants.

**Location:** `src/components/ui/button.tsx`

**Props:**
```typescript
interface ButtonProps {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}
```

**Usage:**
```tsx
<Button variant="outline" size="sm" onClick={handleClick}>
  Click me
</Button>
```

### Input
Form input component with validation.

**Location:** `src/components/ui/input.tsx`

**Props:**
```typescript
interface InputProps {
  type?: string;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  disabled?: boolean;
}
```

### Card
Container component for content sections.

**Location:** `src/components/ui/card.tsx`

**Components:**
- `Card`: Main container
- `CardHeader`: Header section
- `CardTitle`: Title component
- `CardDescription`: Description text
- `CardContent`: Main content area
- `CardFooter`: Footer section

**Usage:**
```tsx
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>
    Content goes here
  </CardContent>
</Card>
```

### Dialog
Modal dialog component.

**Location:** `src/components/ui/dialog.tsx`

**Components:**
- `Dialog`: Main dialog container
- `DialogContent`: Content wrapper
- `DialogHeader`: Header section
- `DialogTitle`: Dialog title
- `DialogDescription`: Description text

### Select
Dropdown select component.

**Location:** `src/components/ui/select.tsx`

**Components:**
- `Select`: Main select container
- `SelectTrigger`: Trigger button
- `SelectValue`: Selected value display
- `SelectContent`: Dropdown content
- `SelectItem`: Individual option

### Toast
Notification toast system.

**Location:** `src/components/toast/ToastContainer.tsx`

**Context:** `src/contexts/ToastContext.tsx`

**Usage:**
```tsx
const { success, error, warning, info } = useToast();

success("Operation completed!", "Success");
error("Something went wrong", "Error");
```

### BrandLogo
Amala brand logo component.

**Location:** `src/components/ui/brand-logo.tsx`

**Props:**
```typescript
interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'full' | 'icon';
  className?: string;
}
```

## Layout Components

### MobileBottomSheet
Mobile-optimized bottom sheet for location details.

**Location:** `src/components/mobile-bottom-sheet.tsx`

**Props:**
```typescript
interface MobileBottomSheetProps {
  locations: AmalaLocation[];
  selectedLocation: AmalaLocation | null;
  onLocationSelect: (location: AmalaLocation) => void;
  onClose: () => void;
}
```

### CentralFilters
Floating filter controls for the map.

**Location:** `src/components/central-filters.tsx`

**Props:**
```typescript
interface CentralFiltersProps {
  filters: LocationFilter;
  onFilterChange: (filters: Partial<LocationFilter>) => void;
}
```

### LocationList
List view of locations with search and filtering.

**Location:** `src/components/location-list.tsx`

**Props:**
```typescript
interface LocationListProps {
  locations: AmalaLocation[];
  onLocationSelect: (location: AmalaLocation) => void;
  loading?: boolean;
}
```

## Skeleton Components

Loading skeleton components for better UX.

**Location:** `src/components/skeletons/`

### Available Skeletons
- `AdminOverviewSkeleton`
- `UserManagementSkeleton`
- `DiscoverySkeleton`
- `PerformanceSkeleton`
- `SystemHealthSkeleton`
- `EnrichmentSkeleton`
- `AnalyticsSkeleton`
- `ScoutDashboardSkeleton`
- `ModeratorDashboardSkeleton`
- `MapSkeleton`
- `LocationListSkeleton`
- `CardSkeleton`
- `TableSkeleton`
- `ChartSkeleton`

**Usage:**
```tsx
{loading ? (
  <LocationListSkeleton count={5} />
) : (
  <LocationList locations={locations} />
)}
```

## Usage Examples

### Basic Location Display
```tsx
import { LocationList, MapContainer } from '@/components';

function LocationView() {
  const [locations, setLocations] = useState([]);
  const [selected, setSelected] = useState(null);

  return (
    <div className="flex">
      <LocationList 
        locations={locations}
        onLocationSelect={setSelected}
      />
      <MapContainer
        locations={locations}
        selectedLocation={selected}
        onLocationSelect={setSelected}
      />
    </div>
  );
}
```

### Form with Validation
```tsx
import { Input, Button, Card } from '@/components/ui';
import { useToast } from '@/contexts/ToastContext';

function LocationForm() {
  const { success, error } = useToast();
  const [formData, setFormData] = useState({});

  const handleSubmit = async () => {
    try {
      await submitLocation(formData);
      success("Location submitted successfully!");
    } catch (err) {
      error("Failed to submit location");
    }
  };

  return (
    <Card>
      <CardContent>
        <Input
          placeholder="Restaurant name"
          value={formData.name}
          onChange={(e) => setFormData({...formData, name: e.target.value})}
        />
        <Button onClick={handleSubmit}>
          Submit
        </Button>
      </CardContent>
    </Card>
  );
}
```

### Dashboard with Analytics
```tsx
import { MetricsDashboard, DiscoveryPanel } from '@/components';

function AdminDashboard() {
  return (
    <div className="space-y-6">
      <MetricsDashboard timeRange={30} autoRefresh />
      <DiscoveryPanel 
        onDiscoveryComplete={(result) => {
          console.log('Discovery completed:', result);
        }}
      />
    </div>
  );
}
```

## Styling Guidelines

### Tailwind CSS Classes
The project uses Tailwind CSS for styling. Common patterns:

**Colors:**
- Primary: `bg-orange-600`, `text-orange-600`
- Success: `bg-green-600`, `text-green-600`
- Error: `bg-red-600`, `text-red-600`
- Warning: `bg-yellow-600`, `text-yellow-600`

**Spacing:**
- Small: `p-2`, `m-2`, `gap-2`
- Medium: `p-4`, `m-4`, `gap-4`
- Large: `p-6`, `m-6`, `gap-6`

**Typography:**
- Headings: `text-lg font-semibold`, `text-xl font-bold`
- Body: `text-sm`, `text-base`
- Muted: `text-gray-600`, `text-gray-500`

### Responsive Design
All components are mobile-first responsive:

```css
/* Mobile first */
.component {
  @apply p-4;
}

/* Tablet and up */
@screen md {
  .component {
    @apply p-6;
  }
}

/* Desktop and up */
@screen lg {
  .component {
    @apply p-8;
  }
}
```

## Accessibility

All components follow WCAG 2.1 AA guidelines:

- **Keyboard Navigation**: All interactive elements are keyboard accessible
- **Screen Readers**: Proper ARIA labels and semantic HTML
- **Color Contrast**: Minimum 4.5:1 contrast ratio
- **Focus Management**: Visible focus indicators

### Accessibility Features
- `aria-label` attributes on buttons and inputs
- `role` attributes for custom components
- `tabIndex` management for complex interactions
- High contrast mode support

## Testing

### Component Testing
```bash
npm run test:components
```

### Storybook
Interactive component documentation:
```bash
npm run storybook
```

### Visual Regression Testing
```bash
npm run test:visual
```

---

For more information, see the [API Documentation](./api.md) or [main documentation](../README.md).
