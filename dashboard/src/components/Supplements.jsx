// dashboard/src/components/Supplements.jsx
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Pill, ChevronDown, ChevronUp } from 'lucide-react';
import { useHealthData } from '../store/HealthDataContext';

const Supplements = ({ navigateTo }) => {
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
              
              {/* Categories */}
              <div className="space-y-8">
                {categories.map((category, categoryIndex) => (
                  <div key={categoryIndex} className="space-y-4">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      {category.emoji && <span className="text-2xl">{category.emoji}</span>}
                      {category.name}
                    </h2>
                    
                    {/* Supplements grid - responsive layout */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {category.supplements.map((supplement, supplementIndex) => {
                        const cardId = `${categoryIndex}-${supplementIndex}`;
                        const isExpanded = expandedCards[cardId] || false;
                        const dosage = supplement.properties.Dosage || '';
                        
                        return (
                          <div 
                            key={supplementIndex}
                            className={`bg-gray-50 dark:bg-slate-700 rounded-lg shadow-sm 
                                        transition-all duration-300 hover:shadow-md
                                        ${isExpanded ? 'scale-[1.02]' : ''}`}
                          >
                            <div 
                              className="p-4 cursor-pointer"
                              onClick={() => toggleCard(cardId)}
                            >
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                  {supplement.emoji && <span className="text-xl">{supplement.emoji}</span>}
                                  <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                                    {supplement.name}
                                  </h3>
                                </div>
                                <div className="text-gray-500 dark:text-gray-400">
                                  {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                </div>
                              </div>
                              
                              {/* Dosage shown directly on the card */}
                              {dosage && (
                                <div className="mt-1 text-gray-600 dark:text-gray-300 font-medium">
                                  {dosage}
                                </div>
                              )}
                            </div>
                            
                            <div className={`px-4 pb-4 ${isExpanded ? 'block' : 'hidden'}`}>
                              <div className="space-y-2 border-t border-gray-200 dark:border-gray-600 pt-3">
                                {/* Properties (excluding dosage) */}
                                {Object.entries(supplement.properties)
                                  .filter(([key]) => key !== 'Dosage')
                                  .map(([key, value], propIndex) => (
                                  <div key={propIndex} className="flex flex-col">
                                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                      {key}
                                    </span>
                                    <span className="mt-1">{value}</span>
                                  </div>
                                ))}
                                
                                {/* Details */}
                                {supplement.details && (
                                  <div className="mt-3 text-gray-700 dark:text-gray-300 text-sm">
                                    {supplement.details}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
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