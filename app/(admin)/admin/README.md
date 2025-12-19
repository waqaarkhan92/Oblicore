# Admin Panel Documentation

## Overview
This admin panel provides system administration features restricted to users with the `OWNER` role.

## Routes

### `/admin/ai-insights`
AI Learning Dashboard that monitors AI extraction patterns, costs, and performance metrics.

**Features:**
- Pattern Hit Rate with trend indicators
- Total AI Cost tracking (monthly)
- Active Patterns count
- Average Confidence Score
- Cost trend visualization
- Top 10 pattern library status
- Cost breakdown by regulator

### `/admin/reviewer-metrics` (Coming Soon)
Reviewer performance metrics and analytics.

## Security

The admin layout (`layout.tsx`) implements role-based access control:
- Checks if user has `OWNER` role via the auth store
- Redirects non-OWNER users to `/dashboard`
- Shows loading state during permission checks

## API Endpoint Required

The AI Insights page expects a backend API endpoint at:

```
GET /api/v1/admin/ai-insights
```

### Expected Response Format

```typescript
interface AIInsightsData {
  metrics: {
    patternHitRate: number;          // e.g., 85.5
    patternHitRateTrend: number;     // e.g., 5.2 (percentage change)
    totalAICost: number;             // e.g., 245.67
    totalAICostTrend: number;        // e.g., -12.3 (percentage change)
    activePatternsCount: number;     // e.g., 42
    avgConfidenceScore: number;      // e.g., 92.4
  };
  costTrend: Array<{
    date: string;                    // e.g., "2025-12-01"
    cost: number;                    // e.g., 45.23
    requests: number;                // e.g., 150
  }>;
  topPatterns: Array<{
    id: string;
    name: string;                    // e.g., "EPA Permit Dates"
    usageCount: number;              // e.g., 234
    successRate: number;             // e.g., 94.5
    avgConfidence: number;           // e.g., 91.2
  }>;
  costByRegulator: Array<{
    regulator: string;               // e.g., "EPA"
    totalCost: number;               // e.g., 123.45
    requestCount: number;            // e.g., 456
    avgCostPerRequest: number;       // e.g., 0.2705
  }>;
}
```

## Styling

The admin panel follows the existing design system:
- Uses Tailwind CSS classes
- Follows the same color scheme (`bg-white`, `shadow-sm`, etc.)
- Responsive design with mobile support
- Consistent with the main dashboard styling

## Navigation

The sidebar includes:
- AI Insights link
- Reviewer Metrics link (placeholder)
- Back to Dashboard button

## Future Enhancements

1. Add Reviewer Metrics page
2. Implement real-time cost monitoring
3. Add pattern editing capabilities
4. Export functionality for reports
5. Add date range filters
6. Implement cost alerts and thresholds
