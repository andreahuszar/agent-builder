import { TemplateConfig, FieldConfig } from '@/types/invoice-display';

/**
 * Check if a field should be visible based on template configuration
 *
 * @param fieldKey - The field identifier (e.g., 'po_number', 'vehicle_registration_no')
 * @param templateConfig - The template configuration object
 * @returns true if the field should be visible, false otherwise
 */
export function isFieldVisible(fieldKey: string, templateConfig?: TemplateConfig): boolean {
  if (!templateConfig) return true; // Default to visible if no config

  // Check customizations.hideFields
  const hideFields = templateConfig.customizations?.hideFields || [];
  if (hideFields.includes(fieldKey)) return false;

  // Check customizations.showFields (these override hideFields)
  const showFields = templateConfig.customizations?.showFields || [];
  if (showFields.includes(fieldKey)) return true;

  // Check fields array for explicit visibility setting
  if (templateConfig.fields) {
    const fieldConfig = templateConfig.fields.find(f => f.key === fieldKey);
    if (fieldConfig && fieldConfig.visible !== undefined) {
      return fieldConfig.visible;
    }
  }

  // Default to visible
  return true;
}

/**
 * Check if a section should be visible based on template configuration
 *
 * @param sectionId - The section identifier (e.g., 'header', 'billTo', 'lineItems')
 * @param templateConfig - The template configuration object
 * @returns true if the section should be visible, false otherwise
 */
export function isSectionVisible(sectionId: string, templateConfig?: TemplateConfig): boolean {
  if (!templateConfig?.sections) return true; // Default to visible if no config

  const sectionConfig = templateConfig.sections.find(s => s.id === sectionId);
  if (sectionConfig && sectionConfig.visible !== undefined) {
    return sectionConfig.visible;
  }

  // Default to visible
  return true;
}

/**
 * Get the display order of sections based on template configuration
 *
 * @param templateConfig - The template configuration object
 * @returns Array of section IDs in display order
 */
export function getSectionOrder(templateConfig?: TemplateConfig): string[] {
  if (!templateConfig?.sections) {
    // Default order
    return ['header', 'billTo', 'lineItems', 'totals', 'paymentTerms'];
  }

  // Sort sections by order property
  const sortedSections = [...templateConfig.sections]
    .filter(s => s.visible !== false)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  return sortedSections.map(s => s.id);
}

/**
 * Get field configuration for a specific field
 *
 * @param fieldKey - The field identifier
 * @param templateConfig - The template configuration object
 * @returns FieldConfig object or undefined
 */
export function getFieldConfig(fieldKey: string, templateConfig?: TemplateConfig): FieldConfig | undefined {
  if (!templateConfig?.fields) return undefined;
  return templateConfig.fields.find(f => f.key === fieldKey);
}
