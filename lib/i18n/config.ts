/**
 * i18n Configuration
 * Internationalization support
 * Reference: docs/specs/61_Frontend_Routes_Components.md Section 21
 */

export type Locale = 'en' | 'es' | 'fr' | 'de';

export const defaultLocale: Locale = 'en';
export const supportedLocales: Locale[] = ['en', 'es', 'fr', 'de'];

export interface Translations {
  [key: string]: string | Translations;
}

// English translations (default)
export const translations: Record<Locale, Translations> = {
  en: {
    common: {
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      close: 'Close',
      confirm: 'Confirm',
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',
    },
    navigation: {
      dashboard: 'Dashboard',
      documents: 'Documents',
      obligations: 'Obligations',
      evidence: 'Evidence',
      settings: 'Settings',
    },
    onboarding: {
      welcome: 'Welcome to EcoComply',
      uploadDocument: 'Upload Document',
      reviewExtraction: 'Review Extraction',
      captureEvidence: 'Capture Evidence',
    },
  },
  es: {
    common: {
      save: 'Guardar',
      cancel: 'Cancelar',
      delete: 'Eliminar',
      edit: 'Editar',
      close: 'Cerrar',
      confirm: 'Confirmar',
      loading: 'Cargando...',
      error: 'Error',
      success: 'Éxito',
    },
    navigation: {
      dashboard: 'Panel',
      documents: 'Documentos',
      obligations: 'Obligaciones',
      evidence: 'Evidencia',
      settings: 'Configuración',
    },
    onboarding: {
      welcome: 'Bienvenido a EcoComply',
      uploadDocument: 'Subir Documento',
      reviewExtraction: 'Revisar Extracción',
      captureEvidence: 'Capturar Evidencia',
    },
  },
  fr: {
    common: {
      save: 'Enregistrer',
      cancel: 'Annuler',
      delete: 'Supprimer',
      edit: 'Modifier',
      close: 'Fermer',
      confirm: 'Confirmer',
      loading: 'Chargement...',
      error: 'Erreur',
      success: 'Succès',
    },
    navigation: {
      dashboard: 'Tableau de bord',
      documents: 'Documents',
      obligations: 'Obligations',
      evidence: 'Preuves',
      settings: 'Paramètres',
    },
    onboarding: {
      welcome: 'Bienvenue sur EcoComply',
      uploadDocument: 'Télécharger un document',
      reviewExtraction: 'Examiner l\'extraction',
      captureEvidence: 'Capturer des preuves',
    },
  },
  de: {
    common: {
      save: 'Speichern',
      cancel: 'Abbrechen',
      delete: 'Löschen',
      edit: 'Bearbeiten',
      close: 'Schließen',
      confirm: 'Bestätigen',
      loading: 'Laden...',
      error: 'Fehler',
      success: 'Erfolg',
    },
    navigation: {
      dashboard: 'Dashboard',
      documents: 'Dokumente',
      obligations: 'Verpflichtungen',
      evidence: 'Beweise',
      settings: 'Einstellungen',
    },
    onboarding: {
      welcome: 'Willkommen bei EcoComply',
      uploadDocument: 'Dokument hochladen',
      reviewExtraction: 'Extraktion überprüfen',
      captureEvidence: 'Beweise erfassen',
    },
  },
};

/**
 * Get nested translation value
 */
export function getTranslation(
  key: string,
  locale: Locale = defaultLocale
): string {
  const keys = key.split('.');
  let value: any = translations[locale];

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      // Fallback to English
      value = translations[defaultLocale];
      for (const fallbackKey of keys) {
        if (value && typeof value === 'object' && fallbackKey in value) {
          value = value[fallbackKey];
        } else {
          return key; // Return key if translation not found
        }
      }
      break;
    }
  }

  return typeof value === 'string' ? value : key;
}

