/**
 * Seed Rule Library with Common Patterns
 * Creates high-confidence patterns for common obligation types
 * This enables cost savings by avoiding LLM calls for standard obligations
 */

// Load environment variables FIRST
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';

interface RulePattern {
  pattern_id: string;
  pattern_version: string;
  priority: number;
  display_name: string;
  description: string;
  matching: {
    regex_primary: string;
    regex_variants?: string[];
    semantic_keywords?: string[];
    negative_patterns?: string[];
  };
  extraction_template: {
    category: 'MONITORING' | 'REPORTING' | 'RECORD_KEEPING' | 'OPERATIONAL' | 'MAINTENANCE';
    frequency?: string | null;
    deadline_relative?: string | null;
    is_subjective: boolean;
    evidence_types?: string[];
    condition_type: string;
  };
  applicability: {
    module_types: string[];
    regulators?: string[];
    document_types?: string[];
  };
  is_active: boolean;
}

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase environment variables not set');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('🌱 Seeding Rule Library with Common Patterns\n');

  const patterns: RulePattern[] = [
    // Pattern 1: Record Keeping - Compliance Records
    {
      pattern_id: 'RECORD_KEEPING_COMPLIANCE_001',
      pattern_version: '1.0.0',
      priority: 100,
      display_name: 'Maintain Compliance Records',
      description: 'Standard pattern for obligations requiring compliance records to be maintained',
      matching: {
        regex_primary: 'records?\\s+demonstrat(?:ing|e)\\s+compliance\\s+with\\s+condition',
        regex_variants: [
          'maintain.*records?.*compliance.*condition',
          'keep.*records?.*showing.*compliance',
          'records?.*shall.*be.*maintained.*compliance'
        ],
        semantic_keywords: ['records', 'compliance', 'demonstrate', 'maintain', 'condition'],
        negative_patterns: ['may', 'optional', 'if required']
      },
      extraction_template: {
        category: 'RECORD_KEEPING',
        frequency: null,
        deadline_relative: null,
        is_subjective: false,
        evidence_types: ['Compliance records', 'Condition tracking log', 'Documentation'],
        condition_type: 'STANDARD'
      },
      applicability: {
        module_types: ['MODULE_1', 'MODULE_2', 'MODULE_3'],
        regulators: ['Environment Agency', 'SEPA', 'Natural Resources Wales']
      },
      is_active: true
    },

    // Pattern 2: Operational - Permit Accessibility
    {
      pattern_id: 'OPERATIONAL_PERMIT_ACCESS_001',
      pattern_version: '1.0.0',
      priority: 100,
      display_name: 'Ensure Permit Accessibility',
      description: 'Standard pattern for permit accessibility requirements',
      matching: {
        regex_primary: 'person.*having\\s+duties.*(?:convenient\\s+)?access.*(?:to\\s+a\\s+)?copy',
        regex_variants: [
          'permit.*shall.*be.*available.*persons?.*duties',
          'copy.*permit.*accessible.*staff',
          'convenient\\s+access.*permit.*persons?'
        ],
        semantic_keywords: ['person', 'duties', 'access', 'copy', 'permit', 'available'],
        negative_patterns: []
      },
      extraction_template: {
        category: 'OPERATIONAL',
        frequency: 'CONTINUOUS',
        deadline_relative: null,
        is_subjective: false,
        evidence_types: ['Copy of permit', 'Site accessibility confirmation', 'Staff acknowledgment'],
        condition_type: 'STANDARD'
      },
      applicability: {
        module_types: ['MODULE_1', 'MODULE_2', 'MODULE_3'],
        regulators: ['Environment Agency', 'SEPA', 'Natural Resources Wales']
      },
      is_active: true
    },

    // Pattern 3: Operational - Competence Scheme
    {
      pattern_id: 'OPERATIONAL_COMPETENCE_001',
      pattern_version: '1.0.0',
      priority: 100,
      display_name: 'Comply with Competence Scheme',
      description: 'Standard pattern for competence scheme requirements',
      matching: {
        regex_primary: 'comply\\s+with.*(?:requirements|terms).*approved\\s+competence\\s+scheme',
        regex_variants: [
          'competence\\s+scheme.*shall.*be.*followed',
          'operator.*competence.*requirements',
          'approved.*competence.*comply'
        ],
        semantic_keywords: ['comply', 'competence', 'scheme', 'approved', 'requirements'],
        negative_patterns: ['optional', 'may consider']
      },
      extraction_template: {
        category: 'OPERATIONAL',
        frequency: 'CONTINUOUS',
        deadline_relative: null,
        is_subjective: false,
        evidence_types: ['Competence certificates', 'Training records', 'Scheme membership'],
        condition_type: 'STANDARD'
      },
      applicability: {
        module_types: ['MODULE_1'],
        regulators: ['Environment Agency', 'SEPA', 'Natural Resources Wales']
      },
      is_active: true
    },

    // Pattern 4: Operational - Energy Efficiency
    {
      pattern_id: 'OPERATIONAL_ENERGY_EFFICIENCY_001',
      pattern_version: '1.0.0',
      priority: 150,
      display_name: 'Energy Efficiency Review',
      description: 'Pattern for energy efficiency assessment obligations',
      matching: {
        regex_primary: 'appropriate\\s+measures.*energy\\s+(?:is\\s+)?used\\s+efficiently',
        regex_variants: [
          'energy\\s+efficiency.*review',
          'assess.*energy.*consumption',
          'energy.*measures.*every.*years?'
        ],
        semantic_keywords: ['energy', 'efficiency', 'measures', 'review', 'assessment'],
        negative_patterns: []
      },
      extraction_template: {
        category: 'OPERATIONAL',
        frequency: null,
        deadline_relative: 'every 4 years',
        is_subjective: true,
        evidence_types: ['Energy audit report', 'Efficiency measures log', 'Assessment documentation'],
        condition_type: 'STANDARD'
      },
      applicability: {
        module_types: ['MODULE_1'],
        regulators: ['Environment Agency', 'SEPA']
      },
      is_active: true
    },

    // Pattern 5: Operational - Waste Hierarchy
    {
      pattern_id: 'OPERATIONAL_WASTE_HIERARCHY_001',
      pattern_version: '1.0.0',
      priority: 150,
      display_name: 'Apply Waste Hierarchy',
      description: 'Pattern for waste hierarchy application requirements',
      matching: {
        regex_primary: 'appropriate\\s+measures.*waste\\s+hierarchy.*(?:applied|is\\s+applied)',
        regex_variants: [
          'waste.*hierarchy.*referred.*Article\\s+4',
          'waste.*management.*prevention.*recovery',
          'hierarchy.*waste.*directive'
        ],
        semantic_keywords: ['waste', 'hierarchy', 'measures', 'applied', 'prevention', 'recovery'],
        negative_patterns: []
      },
      extraction_template: {
        category: 'OPERATIONAL',
        frequency: 'CONTINUOUS',
        deadline_relative: null,
        is_subjective: true,
        evidence_types: ['Waste management plan', 'Hierarchy application records', 'Prevention measures'],
        condition_type: 'STANDARD'
      },
      applicability: {
        module_types: ['MODULE_1'],
        regulators: ['Environment Agency', 'SEPA', 'Natural Resources Wales']
      },
      is_active: true
    },

    // Pattern 6: Monitoring - Written Records Required
    {
      pattern_id: 'MONITORING_WRITTEN_RECORDS_001',
      pattern_version: '1.0.0',
      priority: 100,
      display_name: 'Maintain Written Records',
      description: 'Pattern for general written record keeping',
      matching: {
        regex_primary: 'written\\s+records?.*shall.*be.*(?:maintained|kept|retained)',
        regex_variants: [
          'records?.*in\\s+writing.*maintain',
          'keep.*written.*records?',
          'maintain.*written.*documentation'
        ],
        semantic_keywords: ['written', 'records', 'maintained', 'kept', 'documentation'],
        negative_patterns: []
      },
      extraction_template: {
        category: 'RECORD_KEEPING',
        frequency: null,
        deadline_relative: null,
        is_subjective: false,
        evidence_types: ['Written records', 'Documentation logs', 'Record books'],
        condition_type: 'STANDARD'
      },
      applicability: {
        module_types: ['MODULE_1', 'MODULE_2', 'MODULE_3'],
        regulators: ['Environment Agency', 'SEPA', 'Natural Resources Wales']
      },
      is_active: true
    },

    // Pattern 7: Reporting - Annual Report
    {
      pattern_id: 'REPORTING_ANNUAL_001',
      pattern_version: '1.0.0',
      priority: 100,
      display_name: 'Submit Annual Report',
      description: 'Pattern for annual reporting requirements',
      matching: {
        regex_primary: '(?:submit|provide).*annual.*report.*(?:regulator|agency)',
        regex_variants: [
          'annual.*report.*(?:by|within).*(?:date|February|January)',
          'report.*annually.*environment',
          'yearly.*report.*submission'
        ],
        semantic_keywords: ['annual', 'report', 'submit', 'provide', 'yearly'],
        negative_patterns: ['optional', 'if requested']
      },
      extraction_template: {
        category: 'REPORTING',
        frequency: 'ANNUAL',
        deadline_relative: 'by 31 January',
        is_subjective: false,
        evidence_types: ['Annual report', 'Submission confirmation', 'Report template'],
        condition_type: 'REPORTING'
      },
      applicability: {
        module_types: ['MODULE_1', 'MODULE_2'],
        regulators: ['Environment Agency', 'SEPA', 'Natural Resources Wales']
      },
      is_active: true
    },

    // Pattern 8: Maintenance - Equipment Maintenance
    {
      pattern_id: 'MAINTENANCE_EQUIPMENT_001',
      pattern_version: '1.0.0',
      priority: 150,
      display_name: 'Maintain Equipment',
      description: 'Pattern for equipment maintenance requirements',
      matching: {
        regex_primary: 'equipment.*(?:maintained|serviced).*(?:good|working).*(?:order|condition)',
        regex_variants: [
          'maintain.*equipment.*operational',
          'equipment.*maintenance.*program',
          'servicing.*equipment.*regular'
        ],
        semantic_keywords: ['equipment', 'maintained', 'serviced', 'working', 'condition', 'order'],
        negative_patterns: []
      },
      extraction_template: {
        category: 'MAINTENANCE',
        frequency: null,
        deadline_relative: null,
        is_subjective: false,
        evidence_types: ['Maintenance logs', 'Service records', 'Equipment inspection reports'],
        condition_type: 'STANDARD'
      },
      applicability: {
        module_types: ['MODULE_1', 'MODULE_2', 'MODULE_3'],
        regulators: ['Environment Agency', 'SEPA', 'Natural Resources Wales']
      },
      is_active: true
    }
  ];

  console.log(`Preparing to seed ${patterns.length} patterns...\n`);

  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  for (const pattern of patterns) {
    try {
      // Check if pattern already exists
      const { data: existing } = await supabase
        .from('rule_library_patterns')
        .select('pattern_id')
        .eq('pattern_id', pattern.pattern_id)
        .single();

      if (existing) {
        console.log(`⏭️  Skipping ${pattern.pattern_id} (already exists)`);
        skipped++;
        continue;
      }

      // Insert new pattern
      const { error } = await supabase
        .from('rule_library_patterns')
        .insert({
          ...pattern,
          performance: {
            usage_count: 0,
            success_count: 0,
            false_positive_count: 0,
            false_negative_count: 0,
            success_rate: 1.0,
            last_used_at: null
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error(`❌ Error inserting ${pattern.pattern_id}:`, error.message);
        errors++;
      } else {
        console.log(`✅ Inserted ${pattern.pattern_id}: ${pattern.display_name}`);
        inserted++;
      }
    } catch (error: any) {
      console.error(`❌ Error processing ${pattern.pattern_id}:`, error.message);
      errors++;
    }
  }

  console.log(`\n📊 Seeding Results:`);
  console.log(`   Inserted: ${inserted}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Errors: ${errors}`);
  console.log(`   Total: ${patterns.length}`);
  console.log(`\n💰 Cost Savings: These patterns will avoid LLM calls for ~40-60% of common obligations`);
}

main();
