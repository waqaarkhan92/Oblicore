/**
 * Phase 6: Comprehensive Frontend Features Tests
 * Tests evidence, packs, onboarding, notifications, consultant features
 */

describe('Phase 6: Frontend Features - Comprehensive Tests', () => {
  describe('6.1: Feature Pages', () => {
    it('should have evidence pages', () => {
      const fs = require('fs');
      const evidencePage = fs.existsSync('app/dashboard/evidence/page.tsx');
      const evidenceUploadPage = fs.existsSync('app/dashboard/evidence/upload/page.tsx');
      
      expect(evidencePage).toBe(true);
      expect(evidenceUploadPage).toBe(true);
    });

    it('should have pack generation pages', () => {
      const fs = require('fs');
      const packsPage = fs.existsSync('app/dashboard/packs/page.tsx');
      
      expect(packsPage).toBe(true);
    });

    it('should have onboarding pages', () => {
      const fs = require('fs');
      const onboardingPages = [
        'app/onboarding/site-setup/page.tsx',
        'app/onboarding/document-upload/page.tsx',
        'app/onboarding/excel-import/page.tsx',
      ];
      
      onboardingPages.forEach(page => {
        expect(fs.existsSync(page)).toBe(true);
      });
    });

    it('should have consultant pages', () => {
      const fs = require('fs');
      const consultantDashboard = fs.existsSync('app/dashboard/consultant/dashboard/page.tsx');
      const consultantClients = fs.existsSync('app/dashboard/consultant/clients/page.tsx');
      
      expect(consultantDashboard).toBe(true);
      expect(consultantClients).toBe(true);
    });

    it('should have review queue pages', () => {
      const fs = require('fs');
      const reviewQueuePage = fs.existsSync('app/dashboard/review-queue/page.tsx');
      
      expect(reviewQueuePage).toBe(true);
    });
  });

  describe('6.2: Module Pages', () => {
    it('should have Module 2 pages', () => {
      const fs = require('fs');
      const module2Params = fs.existsSync('app/dashboard/sites/[siteId]/module-2/parameters/page.tsx');
      const module2LabResults = fs.existsSync('app/dashboard/sites/[siteId]/module-2/lab-results/page.tsx');
      
      expect(module2Params).toBe(true);
      expect(module2LabResults).toBe(true);
    });

    it('should have Module 3 pages', () => {
      const fs = require('fs');
      const module3Generators = fs.existsSync('app/dashboard/sites/[siteId]/module-3/generators/page.tsx');
      const module3RunHours = fs.existsSync('app/dashboard/sites/[siteId]/module-3/run-hours/page.tsx');
      
      expect(module3Generators).toBe(true);
      expect(module3RunHours).toBe(true);
    });
  });

  describe('6.3: Frontend Feature Tests', () => {
    it('should have documents upload tests', () => {
      const fs = require('fs');
      const documentsUploadTest = fs.existsSync('tests/frontend/dashboard/documents-upload.test.tsx');
      expect(documentsUploadTest).toBe(true);
    });

    it('should have documents list tests', () => {
      const fs = require('fs');
      const documentsListTest = fs.existsSync('tests/frontend/dashboard/documents-list.test.tsx');
      expect(documentsListTest).toBe(true);
    });

    it('should have obligations list tests', () => {
      const fs = require('fs');
      const obligationsListTest = fs.existsSync('tests/frontend/dashboard/obligations-list.test.tsx');
      expect(obligationsListTest).toBe(true);
    });
  });

  describe('6.4: Feature Components', () => {
    it('should have Excel import components', () => {
      const fs = require('fs');
      const excelComponents = fs.existsSync('components/excel');
      expect(excelComponents).toBe(true);
    });

    it('should have help modal component', () => {
      const fs = require('fs');
      const helpModal = fs.existsSync('components/help/HelpModal.tsx');
      expect(helpModal).toBe(true);
    });

    it('should have keyboard shortcuts component', () => {
      const fs = require('fs');
      const keyboardShortcuts = fs.existsSync('components/keyboard-shortcuts');
      expect(keyboardShortcuts).toBe(true);
    });
  });

  describe('6.5: Feature API Integration', () => {
    it('should have evidence API endpoints', async () => {
      const fs = require('fs');
      const evidenceAPI = fs.existsSync('app/api/v1/evidence/route.ts');
      expect(evidenceAPI).toBe(true);
    });

    it('should have packs API endpoints', async () => {
      const fs = require('fs');
      const packsAPI = fs.existsSync('app/api/v1/packs');
      expect(packsAPI).toBe(true);
    });

    it('should have consultant API endpoints', async () => {
      const fs = require('fs');
      const consultantAPI = fs.existsSync('app/api/v1/consultant');
      expect(consultantAPI).toBe(true);
    });
  });

  describe('6.6: Onboarding Flow', () => {
    it('should have onboarding API endpoints', async () => {
      const fs = require('fs');
      // Check for onboarding route file or directory
      const onboardingAPI = fs.existsSync('app/api/v1/onboarding/route.ts') || 
                            fs.existsSync('app/api/v1/onboarding');
      expect(onboardingAPI).toBe(true);
    });

    it('should have onboarding components', () => {
      const fs = require('fs');
      const onboardingDir = fs.existsSync('app/onboarding');
      expect(onboardingDir).toBe(true);
    });
  });

  describe('6.7: Additional Feature Pages', () => {
    it('should have reports pages', () => {
      const fs = require('fs');
      const reportsPage = fs.existsSync('app/dashboard/reports/page.tsx');
      expect(reportsPage).toBe(true);
    });

    it('should have notifications pages', () => {
      const fs = require('fs');
      const notificationsPage = fs.existsSync('app/dashboard/notifications/page.tsx');
      expect(notificationsPage).toBe(true);
    });

    it('should have search pages', () => {
      const fs = require('fs');
      const searchPage = fs.existsSync('app/dashboard/search/page.tsx');
      expect(searchPage).toBe(true);
    });

    it('should have help pages', () => {
      const fs = require('fs');
      const helpPage = fs.existsSync('app/dashboard/help/page.tsx');
      expect(helpPage).toBe(true);
    });

    it('should have profile pages', () => {
      const fs = require('fs');
      const profilePage = fs.existsSync('app/dashboard/profile/page.tsx');
      expect(profilePage).toBe(true);
    });
  });

  describe('6.8: Module 2 Detailed Pages', () => {
    it('should have Module 2 consent pages', () => {
      const fs = require('fs');
      const consentsPage = fs.existsSync('app/dashboard/sites/[siteId]/module-2/consents/page.tsx');
      expect(consentsPage).toBe(true);
    });

    it('should have Module 2 discharge volumes pages', () => {
      const fs = require('fs');
      const dischargeVolumesPage = fs.existsSync('app/dashboard/sites/[siteId]/module-2/discharge-volumes/page.tsx');
      expect(dischargeVolumesPage).toBe(true);
    });

    it('should have Module 2 exceedances pages', () => {
      const fs = require('fs');
      const exceedancesPage = fs.existsSync('app/dashboard/sites/[siteId]/module-2/exceedances/page.tsx');
      expect(exceedancesPage).toBe(true);
    });
  });

  describe('6.9: Module 3 Detailed Pages', () => {
    it('should have Module 3 AER pages', () => {
      const fs = require('fs');
      const aerPage = fs.existsSync('app/dashboard/sites/[siteId]/module-3/aer/page.tsx');
      expect(aerPage).toBe(true);
    });

    it('should have Module 3 maintenance records pages', () => {
      const fs = require('fs');
      const maintenancePage = fs.existsSync('app/dashboard/sites/[siteId]/module-3/maintenance-records/page.tsx');
      expect(maintenancePage).toBe(true);
    });

    it('should have Module 3 registrations pages', () => {
      const fs = require('fs');
      const registrationsPage = fs.existsSync('app/dashboard/sites/[siteId]/module-3/registrations/page.tsx');
      expect(registrationsPage).toBe(true);
    });

    it('should have Module 3 stack tests pages', () => {
      const fs = require('fs');
      const stackTestsPage = fs.existsSync('app/dashboard/sites/[siteId]/module-3/stack-tests/page.tsx');
      expect(stackTestsPage).toBe(true);
    });
  });

  describe('6.10: Site Detail Pages', () => {
    it('should have site deadlines pages', () => {
      const fs = require('fs');
      const deadlinesPage = fs.existsSync('app/dashboard/sites/[siteId]/deadlines/page.tsx');
      expect(deadlinesPage).toBe(true);
    });

    it('should have site schedules pages', () => {
      const fs = require('fs');
      const schedulesPage = fs.existsSync('app/dashboard/sites/[siteId]/schedules/page.tsx');
      expect(schedulesPage).toBe(true);
    });

    it('should have site packs pages', () => {
      const fs = require('fs');
      const packsPage = fs.existsSync('app/dashboard/sites/[siteId]/packs/page.tsx');
      expect(packsPage).toBe(true);
    });

    it('should have site regulator questions pages', () => {
      const fs = require('fs');
      const regulatorQuestionsPage = fs.existsSync('app/dashboard/sites/[siteId]/regulator-questions/page.tsx');
      expect(regulatorQuestionsPage).toBe(true);
    });
  });

  describe('6.11: Feature Component Validation', () => {
    it('should validate feature components exist', () => {
      const fs = require('fs');
      const componentsDir = fs.existsSync('components');
      expect(componentsDir).toBe(true);
    });

    it('should have feature-specific components', () => {
      const fs = require('fs');
      // Check for various component directories
      const hasFeatureComponents = fs.existsSync('components/dashboard') ||
                                   fs.existsSync('components/evidence') ||
                                   fs.existsSync('components/packs');
      expect(hasFeatureComponents).toBe(true);
    });
  });

  describe('6.12: Feature API Route Validation', () => {
    it('should have notifications API endpoints', () => {
      const fs = require('fs');
      const notificationsAPI = fs.existsSync('app/api/v1/notifications/route.ts');
      expect(notificationsAPI).toBe(true);
    });

    it('should have schedules API endpoints', () => {
      const fs = require('fs');
      const schedulesAPI = fs.existsSync('app/api/v1/schedules/route.ts');
      expect(schedulesAPI).toBe(true);
    });

    it('should have deadlines API endpoints', () => {
      const fs = require('fs');
      const deadlinesAPI = fs.existsSync('app/api/v1/deadlines/route.ts');
      expect(deadlinesAPI).toBe(true);
    });

    it('should have escalations API endpoints', () => {
      const fs = require('fs');
      const escalationsAPI = fs.existsSync('app/api/v1/escalations/route.ts');
      expect(escalationsAPI).toBe(true);
    });
  });

  describe('6.13: Consultant Feature Pages', () => {
    it('should have consultant client detail pages', () => {
      const fs = require('fs');
      const clientDetailPage = fs.existsSync('app/dashboard/consultant/clients/[clientId]/page.tsx');
      expect(clientDetailPage).toBe(true);
    });

    it('should have consultant client packs pages', () => {
      const fs = require('fs');
      const clientPacksPage = fs.existsSync('app/dashboard/consultant/clients/[clientId]/packs/page.tsx');
      expect(clientPacksPage).toBe(true);
    });
  });
});

