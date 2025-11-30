/**
 * Contextual Help Provider
 * Provides contextual help system throughout the app
 * Reference: docs/specs/63_Frontend_Onboarding_Flow.md Section 16
 */

'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { HelpCircle } from 'lucide-react';

interface HelpArticle {
  id: string;
  title: string;
  content: string;
  relatedArticles?: string[];
}

interface ContextualHelpContextType {
  showHelp: (articleId: string) => void;
  hideHelp: () => void;
  currentArticle: HelpArticle | null;
  isHelpVisible: boolean;
  registerHelpArticle: (article: HelpArticle) => void;
  getHelpArticle: (articleId: string) => HelpArticle | null;
}

const ContextualHelpContext = createContext<ContextualHelpContextType | null>(null);

const DEFAULT_HELP_ARTICLES: Record<string, HelpArticle> = {
  'upload-document': {
    id: 'upload-document',
    title: 'Uploading Documents',
    content: 'Upload PDF documents to extract compliance obligations. The system will automatically extract obligations using AI. You can review and edit extracted obligations after upload.',
    relatedArticles: ['extraction-review', 'evidence-capture'],
  },
  'extraction-review': {
    id: 'extraction-review',
    title: 'Reviewing Extractions',
    content: 'Review extracted obligations for accuracy. Edit any fields that need correction, mark irrelevant obligations as N/A, and confirm when ready.',
    relatedArticles: ['upload-document', 'evidence-capture'],
  },
  'evidence-capture': {
    id: 'evidence-capture',
    title: 'Capturing Evidence',
    content: 'Link evidence to obligations to demonstrate compliance. Upload files, photos, or link to existing documents. Evidence helps prove you\'ve met your compliance requirements.',
    relatedArticles: ['upload-document', 'obligation-completion'],
  },
  'obligation-completion': {
    id: 'obligation-completion',
    title: 'Completing Obligations',
    content: 'Mark obligations as complete when you\'ve fulfilled the requirement. Provide evidence and notes to document your compliance.',
    relatedArticles: ['evidence-capture'],
  },
};

export function useContextualHelp() {
  const context = useContext(ContextualHelpContext);
  if (!context) {
    throw new Error('useContextualHelp must be used within ContextualHelpProvider');
  }
  return context;
}

export function ContextualHelpProvider({ children }: { children: React.ReactNode }) {
  const [currentArticle, setCurrentArticle] = useState<HelpArticle | null>(null);
  const [isHelpVisible, setIsHelpVisible] = useState(false);
  const [articles, setArticles] = useState<Record<string, HelpArticle>>(DEFAULT_HELP_ARTICLES);

  const showHelp = useCallback((articleId: string) => {
    const article = articles[articleId] || null;
    setCurrentArticle(article);
    setIsHelpVisible(true);
  }, [articles]);

  const hideHelp = useCallback(() => {
    setIsHelpVisible(false);
    setCurrentArticle(null);
  }, []);

  const registerHelpArticle = useCallback((article: HelpArticle) => {
    setArticles((prev) => ({ ...prev, [article.id]: article }));
  }, []);

  const getHelpArticle = useCallback((articleId: string) => {
    return articles[articleId] || null;
  }, [articles]);

  return (
    <ContextualHelpContext.Provider
      value={{
        showHelp,
        hideHelp,
        currentArticle,
        isHelpVisible,
        registerHelpArticle,
        getHelpArticle,
      }}
    >
      {children}
    </ContextualHelpContext.Provider>
  );
}

/**
 * Contextual Help Button Component
 * Shows help icon that opens contextual help
 */
export function ContextualHelpButton({ articleId }: { articleId: string }) {
  const { showHelp } = useContextualHelp();

  return (
    <button
      type="button"
      onClick={() => showHelp(articleId)}
      className="inline-flex items-center justify-center w-5 h-5 text-text-tertiary hover:text-primary transition-colors"
      aria-label="Show help"
    >
      <HelpCircle className="h-4 w-4" />
    </button>
  );
}

