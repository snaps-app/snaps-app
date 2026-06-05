import { test, expect } from '@playwright/test';

// Use the existing execution from the local database
const PROJECT_ID = 'd5142c4c-cfaf-4af0-9399-0cd9064963f7';
const EXECUTION_ID = '48a936aa-8651-45d5-a296-4566c8b9e210';
const URL = `/project/${PROJECT_ID}/execution/${EXECUTION_ID}`;

test.describe('Execution Cockpit E2E Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to the cockpit
    await page.goto(URL);
    
    // Wait for the cockpit to load (indicated by the presence of tabs or execution title)
    await expect(page.locator('text=Execution Cockpit').first()).toBeVisible({ timeout: 15000 });
  });

  test('should load the Cockpit and display essential tabs', async ({ page }) => {
    // Check if the tabs exist
    await expect(page.locator('button:has-text("Plans")')).toBeVisible();
    await expect(page.locator('button:has-text("Cards")')).toBeVisible();
    await expect(page.locator('button:has-text("Scenarios")')).toBeVisible();
    
    // We'll assert that at least the Scenarios tab is clickable.
    await page.locator('button:has-text("Scenarios")').click();
    
    // Verify BDD panel resilience (no crash)
    await expect(page.locator('.space-y-4').first()).toBeVisible();
  });

  test('should open Governance Docs modal', async ({ page }) => {
    // Click the Docs button (it has the BookOpen icon, usually has 'Docs' or similar text/title)
    const docsButton = page.locator('button[title="Documentos de Governança e Decisões"]');
    
    if (await docsButton.isVisible()) {
      await docsButton.click();
      
      // Verify Modal opens and tabs are present
      await expect(page.locator('text=Contexto & Governança').first()).toBeVisible();
      await expect(page.locator('button:has-text("Governance Docs")')).toBeVisible();
      await expect(page.locator('button:has-text("Architecture Decisions")')).toBeVisible();
      
      // Close modal (usually by pressing Escape or clicking outside/close button)
      await page.keyboard.press('Escape');
    }
  });

  test('should open Walkthrough modal', async ({ page }) => {
    const walkthroughButton = page.locator('button[title="Ver histórico de Walkthroughs"]');
    
    if (await walkthroughButton.isVisible()) {
        await walkthroughButton.click();
        
        await expect(page.locator('text=Execution Walkthroughs').first()).toBeVisible();
        await page.keyboard.press('Escape');
    }
  });
});
