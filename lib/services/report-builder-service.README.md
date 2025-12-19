# Report Builder Service

A comprehensive service for creating, managing, and exporting custom reports across various data types in the EcoComply system.

## Overview

The Report Builder Service enables users to:
- Create custom report configurations
- Save and reuse report templates
- Generate reports from multiple data sources
- Export reports in various formats (CSV, Excel, JSON)
- Apply filters, sorting, and date ranges

## Features

### 1. Report Configuration Management
- **Save Configurations**: Store report definitions for reuse
- **Load Saved Reports**: Quickly access previously created reports
- **Delete Configurations**: Remove unused report templates

### 2. Data Source Support
The service supports five primary data types:
- **Obligations**: Compliance obligations and requirements
- **Evidence**: Supporting documentation and files
- **Deadlines**: Due dates and compliance deadlines
- **Sites**: Facility locations and details
- **Compliance**: Compliance scores and metrics

### 3. Flexible Filtering
Support for multiple filter operators:
- `eq` - Equals
- `neq` - Not equals
- `gt` - Greater than
- `lt` - Less than
- `gte` - Greater than or equal
- `lte` - Less than or equal
- `contains` - Text contains (case-insensitive)
- `in` - Value in list

### 4. Export Formats
- **CSV**: Simple comma-separated values
- **Excel (XLSX)**: Rich spreadsheet format with the xlsx library
- **JSON**: Structured data format

## Usage

### Basic Example

```typescript
import { reportBuilderService } from '@/lib/services/report-builder-service';

// Create a report configuration
const config = {
  name: 'Monthly Obligations Report',
  description: 'All active obligations for the month',
  dataType: 'obligations',
  columns: ['obligation_title', 'status', 'deadline_date', 'assigned_to'],
  filters: [
    { field: 'status', operator: 'eq', value: 'ACTIVE' }
  ],
  dateRange: {
    start: '2025-01-01',
    end: '2025-01-31'
  },
  sortBy: {
    column: 'deadline_date',
    direction: 'asc'
  },
  companyId: 'company-uuid'
};

// Generate the report
const result = await reportBuilderService.generateReport(config);
console.log(`Generated ${result.totalRows} rows`);

// Export to Excel
const buffer = await reportBuilderService.exportReport(result, {
  format: 'xlsx',
  fileName: 'obligations_report',
  includeHeaders: true
});
```

### Save and Reuse Configurations

```typescript
// Save a configuration
const configId = await reportBuilderService.saveReportConfig({
  name: 'Weekly Evidence Summary',
  dataType: 'evidence',
  columns: ['file_name', 'validation_status', 'created_at'],
  filters: [
    { field: 'validation_status', operator: 'eq', value: 'APPROVED' }
  ],
  companyId: 'company-uuid',
  createdBy: 'user-uuid'
});

// Load saved configurations
const savedConfigs = await reportBuilderService.getReportConfigs('company-uuid');

// Delete a configuration
await reportBuilderService.deleteReportConfig(configId);
```

### Get Available Columns

```typescript
// Get columns for a data type
const columns = reportBuilderService.getAvailableColumns('obligations');
// Returns: ['id', 'obligation_title', 'status', 'deadline_date', ...]
```

## API Endpoints

### Get Available Columns
```
GET /api/v1/reports/columns?dataType=obligations
```

Response:
```json
{
  "columns": ["id", "obligation_title", "status", "deadline_date", ...]
}
```

### List Saved Configurations
```
GET /api/v1/reports/configs
```

Response:
```json
{
  "configs": [
    {
      "id": "config-uuid",
      "name": "Monthly Report",
      "dataType": "obligations",
      "columns": ["id", "obligation_title"],
      "filters": []
    }
  ]
}
```

### Save Configuration
```
POST /api/v1/reports/configs
Content-Type: application/json

{
  "name": "My Report",
  "dataType": "obligations",
  "columns": ["id", "obligation_title"],
  "filters": [
    { "field": "status", "operator": "eq", "value": "ACTIVE" }
  ]
}
```

### Delete Configuration
```
DELETE /api/v1/reports/configs/{configId}
```

### Generate Report
```
POST /api/v1/reports/generate
Content-Type: application/json

{
  "dataType": "obligations",
  "columns": ["id", "obligation_title", "status"],
  "filters": [
    { "field": "status", "operator": "eq", "value": "ACTIVE" }
  ],
  "dateRange": {
    "start": "2025-01-01",
    "end": "2025-01-31"
  }
}
```

Response:
```json
{
  "data": [
    { "id": "1", "obligation_title": "Title", "status": "ACTIVE" }
  ],
  "totalRows": 1,
  "columns": ["id", "obligation_title", "status"],
  "generatedAt": "2025-12-19T10:00:00Z"
}
```

### Export Report
```
POST /api/v1/reports/export
Content-Type: application/json

{
  "result": { ... report result ... },
  "format": "xlsx",
  "fileName": "my_report"
}
```

Returns: Binary file download

## Database Schema

### report_configs Table

```sql
CREATE TABLE report_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    name TEXT NOT NULL,
    description TEXT,
    data_type TEXT NOT NULL,
    columns TEXT[] NOT NULL DEFAULT '{}',
    filters JSONB NOT NULL DEFAULT '[]',
    date_range JSONB,
    group_by TEXT,
    sort_by JSONB,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## UI Components

The report builder includes a comprehensive UI at `/dashboard/reports`:

### Features:
1. **Data Type Selection**: Choose from obligations, evidence, deadlines, sites, or compliance
2. **Column Picker**: Select which columns to include in the report
3. **Filter Builder**: Add multiple filters with various operators
4. **Date Range Selector**: Filter by date ranges
5. **Report Preview**: See first 10 rows before exporting
6. **Export Buttons**: Export to CSV, Excel, or JSON
7. **Saved Reports Sidebar**: Quick access to saved configurations

### Navigation:
- Overview tab: Pre-built report templates
- Report Builder tab: Custom report creation
- User Activity tab: User activity reports
- Resource Forecast tab: Resource planning
- Cost Analysis tab: Cost breakdown

## Security

- **Row Level Security (RLS)**: All queries are automatically filtered by company_id
- **Authentication Required**: All endpoints require valid user authentication
- **Company Scoping**: Users can only access reports for their company
- **Permission Checks**: Delete and update operations verify ownership

## Performance Considerations

- **Pagination**: Large result sets should be handled with care
- **Column Selection**: Only select needed columns to reduce data transfer
- **Filter Optimization**: Use appropriate filters to reduce query scope
- **Export Limits**: Consider breaking large exports into smaller chunks

## Error Handling

The service includes comprehensive error handling:
- Invalid configurations return validation errors
- Database errors are caught and logged
- Export failures fall back to CSV when Excel generation fails

## Future Enhancements

Potential improvements:
1. Scheduled report generation
2. Email delivery of reports
3. Chart and visualization generation
4. Aggregation functions (SUM, AVG, COUNT)
5. Cross-table joins and relationships
6. Report sharing and collaboration
7. Custom calculated columns
8. PDF export with formatting

## Migration

To enable the report builder, run the migration:

```bash
npm run migrations:apply
```

This creates the `report_configs` table with appropriate indexes and RLS policies.

## Testing

```typescript
// Example test
import { reportBuilderService } from '@/lib/services/report-builder-service';

describe('ReportBuilderService', () => {
  it('should generate a report', async () => {
    const config = {
      dataType: 'obligations',
      columns: ['id', 'obligation_title'],
      filters: [],
      companyId: 'test-company'
    };

    const result = await reportBuilderService.generateReport(config);

    expect(result.data).toBeDefined();
    expect(result.columns).toEqual(['id', 'obligation_title']);
  });
});
```

## Support

For issues or questions:
1. Check the service logs for error details
2. Verify database connectivity and permissions
3. Ensure migration has been applied
4. Review RLS policies for data access
