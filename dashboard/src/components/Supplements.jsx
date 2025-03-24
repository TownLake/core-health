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
        setMarkdownContent(`# Supplements

| Supplement | Dosage | Timing |
|------------|--------|--------|
| Vitamin D3 | 5000 IU | Morning with breakfast |
| Magnesium | 400mg | Evening with dinner |
| Omega-3 | 1000mg | Morning with breakfast |`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMarkdown();
  }, []);

  // Parse markdown table into HTML
  const renderMarkdownTable = () => {
    // Basic markdown table parser
    const lines = markdownContent.split('\n').filter(line => line.trim());
    
    // Extract title
    const title = lines[0].startsWith('# ') ? lines[0].substring(2) : 'Supplements';
    
    // Find table lines
    const tableStartIndex = lines.findIndex(line => line.includes('|---'));
    if (tableStartIndex === -1) return { title, table: '<p>No table data found</p>' };
    
    const headerRow = lines[tableStartIndex - 1];
    const headerCells = headerRow.split('|').filter(cell => cell.trim()).map(cell => cell.trim());
    
    const tableRows = lines.slice(tableStartIndex + 1)
      .filter(line => line.includes('|'))
      .map(line => {
        const cells = line.split('|').filter(cell => cell.trim()).map(cell => cell.trim());
        return `
          <tr class="border-b border-gray-200 dark:border-gray-700">
            ${cells.map(cell => `<td class="py-3 px-4">${cell}</td>`).join('')}
          </tr>
        `;
      }).join('');
    
    const table = `
      <table class="w-full border-collapse">
        <thead>
          <tr class="bg-gray-100 dark:bg-slate-700 border-b border-gray-200 dark:border-gray-700">
            ${headerCells.map(cell => `<th class="py-3 px-4 text-left">${cell}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    `;
    
    return { title, table };
  };

  const { title, table } = isLoading ? { title: 'Supplements', table: '' } : renderMarkdownTable();

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
              <div dangerouslySetInnerHTML={{ __html: table }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Supplements;