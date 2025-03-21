// dashboard/src/components/SocialLinks.jsx
import React from 'react';
import { Github, Twitter } from 'lucide-react';

const SocialLinks = () => (
  <div className="flex justify-center gap-4 py-6 mt-8 border-t border-gray-200 dark:border-gray-700">
    <a
      href="https://github.com/TownLake/core-health"
      target="_blank"
      rel="noopener noreferrer"
      className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-300"
      aria-label="GitHub Repository"
    >
      <Github className="w-6 h-6" />
    </a>
    <a
      href="https://x.com/LakeAustinBlvd"
      target="_blank"
      rel="noopener noreferrer"
      className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-300"
      aria-label="X (Twitter) Profile"
    >
      <Twitter className="w-6 h-6" />
    </a>
  </div>
);

export default SocialLinks;