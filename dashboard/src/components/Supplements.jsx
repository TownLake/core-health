// dashboard/src/components/Supplements.jsx
import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useHealthData } from '../store/HealthDataContext';
import SocialLinks from './SocialLinks';

const SupplementCard = ({ supplement, cardId, isExpanded, toggleCard }) => {
  const dosage = supplement.properties.Dosage || '';
  const icon = supplement.emoji;
  
  return (
    <div 
      className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 cursor-pointer hover:shadow-xl transition-all duration-300 hover:scale-[1.02] flex flex-col h-full"
      onClick={() => toggleCard(cardId)}
    >
      <div className="flex items-center text-gray-500 dark:text-gray-400 mb-2">
        {icon && <span className="text-xl mr-2">{icon}</span>}
        <span className="text-sm">{supplement.name}</span>
      </div>
      
      <div className="flex justify-between items-end mt-auto">
        <div>
          <div className="text-4xl font-semibold text-gray-900 dark:text-white truncate max-w-[150px]">
            {dosage}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {supplement.properties.Source ? supplement.properties.Source.split(' ')[0] : ''}
          </div>
        </div>
        
        <div className="text-gray-500 dark:text-gray-400">
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </div>
      
      {/* Expanded details */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          {Object.entries(supplement.properties)
            .filter(([key]) => key !== 'Dosage' && key !== 'Source')
            .map(([key, value], propIndex) => (
              <div key={propIndex} className="mb-1 text-sm">
                <span className="font-medium text-gray-500 dark:text-gray-400">
                  {key}:
                </span>
                <span className="ml-1 text-gray-700 dark:text-gray-300">{value}</span>
              </div>
            ))}
          
          {supplement.details && (
            <div className="mt-1 text-gray-700 dark:text-gray-300 text-sm">
              {supplement.details}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const SupplementSection = ({ category, categoryIndex, expandedCards, toggleCard }) => {
  return (
    <div>
      <div className="flex items-center mb-4">
        {category.emoji && <span className="text-2xl mr-2">{category.emoji}</span>}
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{category.name}</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 auto-rows-fr">
        {category.supplements.map((supplement, supplementIndex) => {
          const cardId = `${categoryIndex}-${supplementIndex}`;
          const isExpanded = expandedCards[cardId] || false;
          
          return (
            <div key={supplementIndex} className={isExpanded ? 'row-span-2' : ''}>
              <SupplementCard
                supplement={supplement}
                cardId={cardId}
                isExpanded={isExpanded}
                toggleCard={toggleCard}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Supplements = () => {
  const { theme } = useHealthData();
  const [markdownContent, setMarkdownContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [expandedCards, setExpandedCards] = useState({});

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

  const toggleCard = (cardId) => {
    setExpandedCards(prev => ({
      ...prev,
      [cardId]: !prev[cardId]
    }));
  };

  // Parse markdown content into structured data
  const parseMarkdownContent = () => {
    // Same parsing logic as before
    const lines = markdownContent.split('\n');
    let mainTitle = 'My Supplement Routine';
    let introduction = '';
    let categories = [];
    
    let currentCategory = null;
    let currentSupplement = null;
    let currentSection = 'intro';
    
    // Process line by line
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines
      if (!line) {
        continue;
      }
      
      // Extract main title (first h1)
      if (line.startsWith('# ')) {
        mainTitle = line.substring(2).trim();
        continue;
      }
      
      // Detect category start (h2 headings)
      if (line.startsWith('## ')) {
        // Save previous category if exists
        if (currentCategory) {
          categories.push(currentCategory);
        }
        
        // Start new category and extract emoji if present
        const categoryName = line.substring(3).trim();
        const emojiMatch = categoryName.match(/^([\u{1F300}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}])\s+(.*)/u);
        
        currentCategory = {
          name: emojiMatch ? emojiMatch[2] : categoryName,
          emoji: emojiMatch ? emojiMatch[1] : '',
          supplements: []
        };
        
        currentSection = 'category';
        continue;
      }
      
      // Detect supplement start (h3 headings)
      if (line.startsWith('### ')) {
        // Save previous supplement if exists
        if (currentSupplement && currentCategory) {
          currentCategory.supplements.push(currentSupplement);
        }
        
        // Start new supplement and extract emoji if present
        const supplementName = line.substring(4).trim();
        const emojiMatch = supplementName.match(/^([\u{1F300}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}])\s+(.*)/u);
        
        currentSupplement = {
          name: emojiMatch ? emojiMatch[2] : supplementName,
          emoji: emojiMatch ? emojiMatch[1] : '',
          properties: {},
          details: ''
        };
        
        currentSection = 'supplement';
        continue;
      }
      
      // Process supplement properties (list items)
      if (currentSection === 'supplement' && line.startsWith('- ')) {
        const content = line.substring(2).trim();
        
        // Extract property and value from markdown formatting
        if (content.includes('**') && content.includes(':')) {
          const parts = content.split(':');
          if (parts.length >= 2) {
            const property = parts[0].replace(/\*\*/g, '').trim();
            const value = parts.slice(1).join(':').trim();
            
            currentSupplement.properties[property] = value;
          }
        } else if (content.includes('**Details**:')) {
          // Extract details after "Details:" prefix
          currentSupplement.details = content.replace('**Details**:', '').trim();
        }
        
        continue;
      }
      
      // Collect introduction text (paragraphs before any categories)
      if (currentSection === 'intro' && !line.startsWith('# ')) {
        introduction += `<p class="mb-4">${line}</p>`;
      }
    }
    
    // Add the last supplement if exists
    if (currentSupplement && currentCategory) {
      currentCategory.supplements.push(currentSupplement);
    }
    
    // Add the last category if exists
    if (currentCategory) {
      categories.push(currentCategory);
    }
    
    return { title: mainTitle, introduction, categories };
  };

  const { title, introduction, categories } = isLoading 
    ? { title: 'My Supplement Routine', introduction: '', categories: [] } 
    : parseMarkdownContent();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="p-6">
        {/* Title only (navigation is in main App component) */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
        </div>

        {/* Introduction section if any */}
        {introduction && (
          <div 
            className="prose dark:prose-invert max-w-none mb-8 bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6" 
            dangerouslySetInnerHTML={{ __html: introduction }} 
          />
        )}
        
        {/* Loading state */}
        {isLoading ? (
          <div className="flex justify-center items-center h-40 bg-white dark:bg-slate-800 rounded-xl shadow-lg">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8">
            {categories.map((category, categoryIndex) => (
              <SupplementSection
                key={categoryIndex}
                category={category}
                categoryIndex={categoryIndex}
                expandedCards={expandedCards}
                toggleCard={toggleCard}
              />
            ))}
          </div>
        )}

        <SocialLinks />
      </div>
    </div>
  );
};

export default Supplements;