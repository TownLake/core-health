// dashboard/src/components/Supplements.jsx
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Pill } from 'lucide-react';
import { useHealthData } from '../store/HealthDataContext';

const Supplements = ({ navigateTo }) => {
  const { theme } = useHealthData();
  const [markdownContent, setMarkdownContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMarkdown = async () => {
      try {
        const response = await fetch('/supplements.md');
        if (!response.ok) {
          throw new Error('Failed to load supplements data');
        }
        const text = await response.text();
        setMarkdownContent(text);
      } catch (error) {
        console.error('Error loading supplements data:', error);
        setMarkdownContent(`# My Supplement Routine\n\nNo supplement data available.`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMarkdown();
  }, []);

  // Parse markdown content into HTML
  const renderMarkdownContent = () => {
    const lines = markdownContent.split('\n');
    let mainTitle = 'My Supplement Routine';
    let introduction = '';
    let cards = [];
    
    let currentCard = null;
    let currentSection = 'intro';
    
    // Process line by line
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines
      if (!line) {
        continue;
      }
      
      // Extract main title (first h1)
      if (line.startsWith('# ') && !mainTitle) {
        mainTitle = line.substring(2).trim();
        continue;
      }
      
      // Detect card start (h2 headings)
      if (line.startsWith('## ')) {
        // Save previous card if exists
        if (currentCard) {
          cards.push(currentCard);
        }
        
        // Start new card
        currentCard = {
          name: line.substring(3).trim(),
          details: []
        };
        
        currentSection = 'card';
        continue;
      }
      
      // Process card content (list items)
      if (currentSection === 'card' && line.startsWith('- ')) {
        const content = line.substring(2).trim();
        
        // Extract property and value from markdown formatting
        if (content.includes('**') && content.includes(':')) {
          const parts = content.split(':');
          if (parts.length >= 2) {
            const property = parts[0].replace(/\*\*/g, '').trim();
            const value = parts.slice(1).join(':').trim();
            
            currentCard.details.push({ property, value });
          }
        } else {
          // For simple list items without property formatting
          currentCard.details.push({ 
            property: '', 
            value: content.replace(/\*\*/g, '')
          });
        }
        
        continue;
      }
      
      // Collect introduction text (paragraphs before any cards)
      if (currentSection === 'intro' && !line.startsWith('# ')) {
        introduction += `<p class="mb-4">${line}</p>`;
      }
    }
    
    // Add the last card if exists
    if (currentCard) {
      cards.push(currentCard);
    }
    
    return { title: mainTitle, introduction, cards };
  };

  const { title, introduction, cards } = isLoading 
    ? { title: 'My Supplement Routine', introduction: '', cards: [] } 
    : renderMarkdownContent();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigateTo('dashboard')}
            className="p-2 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Pill className="w-6 h-6" />
            {title}
          </h1>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div>
              {/* Introduction section */}
              {introduction && (
                <div 
                  className="prose dark:prose-invert max-w-none mb-8" 
                  dangerouslySetInnerHTML={{ __html: introduction }} 
                />
              )}
              
              {/* Cards grid - responsive 1 column on mobile, 2 columns on larger screens */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {cards.map((card, cardIndex) => (
                  <div 
                    key={cardIndex}
                    className="bg-gray-50 dark:bg-slate-700 rounded-lg p-5 shadow-sm"
                  >
                    <h3 className="font-bold text-lg mb-3 text-gray-900 dark:text-white">
                      {card.name}
                    </h3>
                    <div className="space-y-2">
                      {card.details.map((detail, detailIndex) => (
                        <div key={detailIndex} className="flex flex-col">
                          {detail.property && (
                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                              {detail.property}
                            </span>
                          )}
                          <span className={detail.property ? "mt-1" : ""}>
                            {detail.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Supplements;