import React, { useState } from 'react';
import type { ProvidersTabProps } from './types';

export const ProvidersTab: React.FC<ProvidersTabProps> = ({ providers, onSave }) => {
  const [activeProvider, setActiveProvider] = useState(providers.activeProvider || 'mock');

  // Provider display names and descriptions
  const providerInfo: Record<string, { name: string; description: string; status: string }> = {
    'mock': {
      name: 'Mock (Local)',
      description: 'Fast local transformations using Sharp filters - no API required',
      status: 'ready'
    },
    'gemini-imagen': {
      name: 'Google Gemini',
      description: 'Google\'s advanced AI for image generation and transformation',
      status: providers.activeProvider === 'gemini-imagen' ? 'active' : 'available'
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-zinc-400 text-sm mb-2">Active Provider</label>
        <select
          value={activeProvider}
          onChange={(e) => setActiveProvider(e.target.value)}
          className="w-full px-3 py-2 bg-zinc-800 text-white rounded-lg border border-zinc-700 focus:border-zinc-500 focus:outline-none"
        >
          {(providers.availableProviders || ['mock']).map((provider) => (
            <option key={provider} value={provider}>
              {providerInfo[provider]?.name || provider}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        {(providers.availableProviders || ['mock']).map((provider) => {
          const info = providerInfo[provider];
          if (!info) return null;

          return (
            <div key={provider} className="bg-zinc-800 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-white font-semibold">{info.name}</h4>
                  <p className="text-zinc-400 text-sm mt-1">{info.description}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs ${
                  provider === activeProvider ? 'bg-green-600 text-white' :
                  info.status === 'coming-soon' ? 'bg-zinc-600 text-zinc-300' :
                  'bg-zinc-700 text-white'
                }`}>
                  {provider === activeProvider ? 'Active' :
                   info.status === 'coming-soon' ? 'Coming Soon' : 'Available'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={() => onSave({ ...providers, activeProvider })}
        className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors"
      >
        Save Provider
      </button>
    </div>
  );
};
