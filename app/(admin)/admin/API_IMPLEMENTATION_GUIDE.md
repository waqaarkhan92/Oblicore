# API Implementation Guide for AI Insights

## Overview
This guide provides implementation details for the AI Insights backend API endpoint.

## Endpoint Details

**Route:** `GET /api/v1/admin/ai-insights`

**Authentication:** Requires OWNER role

**Location to create:** `/Users/waqaar/Documents/EcoComply/app/api/v1/admin/ai-insights/route.ts`

## Sample Implementation

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/middleware';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  return withAuth(request, async (userId, user) => {
    // Check OWNER role
    if (user.role !== 'OWNER') {
      return NextResponse.json(
        { error: 'Unauthorized - OWNER role required' },
        { status: 403 }
      );
    }

    const supabase = await createClient();

    // Fetch metrics from your database
    // This is example logic - adjust based on your schema

    // 1. Calculate Pattern Hit Rate
    const { data: patternStats } = await supabase
      .from('ai_extraction_logs')
      .select('pattern_matched, created_at')
      .gte('created_at', getFirstDayOfMonth())
      .lte('created_at', getLastDayOfMonth());

    const patternHitRate = calculateHitRate(patternStats);
    const patternHitRateTrend = await calculateTrend('pattern_hit_rate');

    // 2. Calculate Total AI Cost
    const { data: costData } = await supabase
      .from('ai_extraction_costs')
      .select('cost')
      .gte('created_at', getFirstDayOfMonth())
      .lte('created_at', getLastDayOfMonth());

    const totalAICost = costData?.reduce((sum, row) => sum + row.cost, 0) || 0;
    const totalAICostTrend = await calculateTrend('ai_cost');

    // 3. Active Patterns Count
    const { count: activePatternsCount } = await supabase
      .from('ai_patterns')
      .select('*', { count: 'exact', head: true })
      .eq('active', true);

    // 4. Average Confidence Score
    const { data: confidenceData } = await supabase
      .from('ai_extraction_logs')
      .select('confidence_score')
      .gte('created_at', getFirstDayOfMonth())
      .lte('created_at', getLastDayOfMonth());

    const avgConfidenceScore = calculateAverage(
      confidenceData?.map(d => d.confidence_score) || []
    );

    // 5. Cost Trend (last 30 days)
    const { data: costTrendData } = await supabase
      .from('ai_extraction_costs')
      .select('date, cost, request_count')
      .gte('date', getDaysAgo(30))
      .order('date', { ascending: true });

    // 6. Top Patterns
    const { data: topPatternsData } = await supabase
      .from('ai_patterns')
      .select(`
        id,
        name,
        usage_count,
        success_count,
        total_confidence
      `)
      .order('usage_count', { ascending: false })
      .limit(10);

    const topPatterns = topPatternsData?.map(p => ({
      id: p.id,
      name: p.name,
      usageCount: p.usage_count,
      successRate: (p.success_count / p.usage_count) * 100,
      avgConfidence: p.total_confidence / p.usage_count,
    })) || [];

    // 7. Cost by Regulator
    const { data: costByRegulatorData } = await supabase
      .from('ai_extraction_costs')
      .select('regulator, cost, request_count')
      .gte('created_at', getFirstDayOfMonth())
      .lte('created_at', getLastDayOfMonth());

    const costByRegulator = aggregateByRegulator(costByRegulatorData);

    return NextResponse.json({
      metrics: {
        patternHitRate,
        patternHitRateTrend,
        totalAICost,
        totalAICostTrend,
        activePatternsCount: activePatternsCount || 0,
        avgConfidenceScore,
      },
      costTrend: costTrendData || [],
      topPatterns,
      costByRegulator,
    });
  }, ['OWNER']);
}

// Helper functions
function getFirstDayOfMonth(): string {
  const date = new Date();
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

function getLastDayOfMonth(): string {
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  date.setDate(0);
  date.setHours(23, 59, 59, 999);
  return date.toISOString();
}

function getDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}

function calculateHitRate(data: any[]): number {
  if (!data || data.length === 0) return 0;
  const hits = data.filter(d => d.pattern_matched).length;
  return Math.round((hits / data.length) * 100 * 10) / 10;
}

function calculateAverage(numbers: number[]): number {
  if (!numbers || numbers.length === 0) return 0;
  const sum = numbers.reduce((acc, n) => acc + n, 0);
  return Math.round((sum / numbers.length) * 10) / 10;
}

async function calculateTrend(metric: string): Promise<number> {
  // Compare current month with previous month
  // Return percentage change
  // Example: if cost went from 100 to 120, return 20
  return 0; // Implement based on your data
}

function aggregateByRegulator(data: any[]): any[] {
  if (!data) return [];

  const grouped = data.reduce((acc, row) => {
    if (!acc[row.regulator]) {
      acc[row.regulator] = {
        regulator: row.regulator,
        totalCost: 0,
        requestCount: 0,
      };
    }
    acc[row.regulator].totalCost += row.cost;
    acc[row.regulator].requestCount += row.request_count;
    return acc;
  }, {});

  return Object.values(grouped).map((g: any) => ({
    ...g,
    avgCostPerRequest: g.totalCost / g.requestCount,
  }));
}
```

## Database Schema Requirements

You may need to create or ensure these tables exist:

### `ai_extraction_logs`
Logs each AI extraction attempt.

```sql
CREATE TABLE ai_extraction_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id),
  pattern_id UUID REFERENCES ai_patterns(id),
  pattern_matched BOOLEAN DEFAULT false,
  confidence_score DECIMAL(5,2),
  cost DECIMAL(10,4),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### `ai_patterns`
Stores AI extraction patterns.

```sql
CREATE TABLE ai_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  total_confidence DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### `ai_extraction_costs`
Daily aggregated cost data.

```sql
CREATE TABLE ai_extraction_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  regulator VARCHAR(255),
  cost DECIMAL(10,4) NOT NULL,
  request_count INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(date, regulator)
);
```

## Testing

Once implemented, you can test the endpoint with:

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/v1/admin/ai-insights
```

## Mock Data for Testing

If you want to test the UI before implementing the full backend, you can create a simple mock endpoint:

```typescript
export async function GET(request: NextRequest) {
  return NextResponse.json({
    metrics: {
      patternHitRate: 87.5,
      patternHitRateTrend: 5.2,
      totalAICost: 245.67,
      totalAICostTrend: -12.3,
      activePatternsCount: 42,
      avgConfidenceScore: 92.4,
    },
    costTrend: [
      { date: '2025-12-01', cost: 45.23, requests: 150 },
      { date: '2025-12-02', cost: 52.10, requests: 178 },
      { date: '2025-12-03', cost: 38.45, requests: 142 },
    ],
    topPatterns: [
      { id: '1', name: 'EPA Permit Dates', usageCount: 234, successRate: 94.5, avgConfidence: 91.2 },
      { id: '2', name: 'Monitoring Frequencies', usageCount: 198, successRate: 89.3, avgConfidence: 88.7 },
      { id: '3', name: 'Compliance Limits', usageCount: 167, successRate: 92.1, avgConfidence: 90.5 },
    ],
    costByRegulator: [
      { regulator: 'EPA', totalCost: 123.45, requestCount: 456, avgCostPerRequest: 0.2705 },
      { regulator: 'SEPA', totalCost: 89.12, requestCount: 321, avgCostPerRequest: 0.2776 },
      { regulator: 'EA', totalCost: 67.89, requestCount: 234, avgCostPerRequest: 0.2901 },
    ],
  });
}
```
