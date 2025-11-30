/**
 * Help Modal Component
 * Displays contextual help articles
 * Reference: docs/specs/63_Frontend_Onboarding_Flow.md Section 16
 */

'use client';

import * as React from 'react';
import { X, ExternalLink } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { useContextualHelp } from '@/lib/providers/contextual-help-provider';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export function HelpModal() {
  const { currentArticle, isHelpVisible, hideHelp, getHelpArticle } = useContextualHelp();
  const router = useRouter();

  if (!isHelpVisible || !currentArticle) {
    return null;
  }

  const relatedArticles = currentArticle.relatedArticles
    ?.map((id) => getHelpArticle(id))
    .filter(Boolean) as typeof currentArticle[] | undefined;

  return (
    <Modal isOpen={isHelpVisible} onClose={hideHelp} title={currentArticle.title}>
      <div className="space-y-4">
        <div className="prose prose-sm max-w-none">
          <p className="text-text-secondary whitespace-pre-line">{currentArticle.content}</p>
        </div>

        {relatedArticles && relatedArticles.length > 0 && (
          <div className="border-t border-slate pt-4">
            <h4 className="text-sm font-semibold text-text-primary mb-2">Related Topics</h4>
            <ul className="space-y-2">
              {relatedArticles.map((article) => (
                <li key={article.id}>
                  <button
                    type="button"
                    onClick={() => {
                      // This would update the current article
                      // For now, just show the article
                    }}
                    className="text-sm text-primary hover:text-primary-dark underline"
                  >
                    {article.title}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-slate">
          <Button
            variant="outline"
            onClick={() => {
              hideHelp();
              router.push('/dashboard/help');
            }}
            icon={<ExternalLink className="h-4 w-4" />}
            iconPosition="right"
          >
            View Full Help
          </Button>
          <Button variant="primary" onClick={hideHelp}>
            Got it
          </Button>
        </div>
      </div>
    </Modal>
  );
}

