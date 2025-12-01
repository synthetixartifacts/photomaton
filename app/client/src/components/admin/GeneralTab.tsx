import React from 'react';
import type { GeneralTabProps } from './types';

export const GeneralTab: React.FC<GeneralTabProps> = ({
  config,
  stats,
  onReset,
}) => (
  <div className="space-y-6">
    <div>
      <h3 className="text-xl font-semibold text-white mb-4">System Overview</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-zinc-800 rounded-lg p-4">
          <div className="text-zinc-400 text-sm">Active Provider</div>
          <div className="text-white text-lg font-semibold">{config.providers.activeProvider}</div>
        </div>
        <div className="bg-zinc-800 rounded-lg p-4">
          <div className="text-zinc-400 text-sm">Total Photos</div>
          <div className="text-white text-lg font-semibold">{stats?.photos?.total || 0}</div>
        </div>
        <div className="bg-zinc-800 rounded-lg p-4">
          <div className="text-zinc-400 text-sm">Active Presets</div>
          <div className="text-white text-lg font-semibold">
            {stats?.config?.presetsEnabled || 0} / {stats?.config?.presetsTotal || 0}
          </div>
        </div>
      </div>
    </div>

    <div>
      <h3 className="text-xl font-semibold text-white mb-4">Actions</h3>
      <div className="flex space-x-4">
        <button
          onClick={onReset}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
        >
          Reset to Defaults
        </button>
      </div>
    </div>
  </div>
);
