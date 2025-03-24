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
        // Fallback content in case file can't be loaded
        setMarkdownContent(`# Supplements\n\nNo supplement data available.`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMarkdown();
  }, []);

  // Parse markdown content into HTML
  const renderMarkdownContent = () => {
    // Basic markdown parser
    const lines = markdownContent.split('\n');
    let htmlContent = '';
    let tableHtml = '';
    let title = 'Supplements';
    
    // Find the first h1 title
    const titleLine = lines.find(line => line.trim().startsWith('# '));
    if (titleLine) {
      title = titleLine.substring(2).trim();
    }
    
    // Process line by line
    let i = 0;
    let inTable = false;
    let tableHeaders = [];
    let tableRows = [];
    
    while (i < lines.length) {
      const line = lines[i].trim();
      
      // Skip empty lines
      if (!line) {
        i++;
        continue;
      }
      
      // Detect table start - look for a line with multiple pipe characters
      if (!inTable && line.includes('|') && !line.startsWith('# ') && !line.startsWith('## ')) {
        inTable = true;
        
        // Extract headers
        tableHeaders = line.split('|')
          .map(cell => cell.trim())
          .filter(cell => cell);
        
        // Skip the separator line
        i += 2;
        continue;
      }
      
      // Process table rows
      if (inTable && line.includes('|')) {
        const cells = line.split('|')
          .map(cell => cell.trim())
          .filter(cell => cell);
        
        if (cells.length > 0) {
          tableRows.push(cells);
        }
        
        i++;
        continue;
      }
      
      // End of table detection
      if (inTable && !line.includes('|')) {
        inTable = false;
      }
      
      // Handle headers
      if (line.startsWith('# ') && !line.startsWith('## ') && line !== titleLine) {
        htmlContent += `<h1 class="text-2xl font-bold mt-6 mb-4">${line.substring(2)}</h1>`;
      } else if (line.startsWith('## ')) {
        htmlContent += `<h2 class="text-xl font-bold mt-5 mb-3">${line.substring(3)}</h2>`;
      } else if (line.startsWith('### ')) {
        htmlContent += `<h3 class="text-lg font-bold mt-4 mb-2">${line.substring(4)}</h3>`;
      } 
      // Handle paragraphs (not headers, not in table)
      else if (!line.startsWith('# ') && !inTable && !line.includes('|---')) {
        htmlContent += `<p class="mb-4">${line}</p>`;
      }
      
      i++;
    }
    
    // Generate table HTML if we have headers and rows
    if (tableHeaders.length > 0 && tableRows.length > 0) {
      tableHtml = `
        <table class="w-full border-collapse mt-4">
          <thead>
            <tr class="bg-gray-100 dark:bg-slate-700 border-b border-gray-200 dark:border-gray-700">
              ${tableHeaders.map(header => 
                `<th class="py-3 px-4 text-left font-medium">${header}</th>`
              ).join('')}
            </tr>
          </thead>
          <tbody>
            ${tableRows.map(row => `
              <tr class="border-b border-gray-200 dark:border-gray-700">
                ${row.map(cell => `<td class="py-3 px-4">${cell}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }
    
    return { title, content: htmlContent, table: tableHtml };
  };

  const { title, content, table } = isLoading 
    ? { title: 'Supplements', content: '', table: '' } 
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
            <div className="prose dark:prose-invert max-w-none">
              {content && <div dangerouslySetInnerHTML={{ __html: content }} />}
              {table && <div dangerouslySetInnerHTML={{ __html: table }} />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Supplements;