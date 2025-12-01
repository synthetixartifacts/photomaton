import React, { useState } from 'react';
import type { LimitsTabProps } from './types';

export const LimitsTab: React.FC<LimitsTabProps> = ({ userLimits, onSave }) => {
  const [values, setValues] = useState(userLimits);

  const handleSave = () => {
    onSave(values);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-white mb-4">User Photo Limits</h3>
        <p className="text-zinc-400 text-sm mb-6">
          Configure the maximum number of photos users can take. Admins always have unlimited photos.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Era Employee Limit */}
        <div className="bg-zinc-800 rounded-lg p-4 border border-zinc-700">
          <label className="text-white font-medium block mb-2">
            Era Employee Limit
          </label>
          <p className="text-zinc-400 text-sm mb-3">
            For users with @group-era.com email addresses
          </p>
          <input
            type="number"
            min="0"
            max="10000"
            value={values.eraEmployeePhotoLimit}
            onChange={(e) => setValues({ ...values, eraEmployeePhotoLimit: parseInt(e.target.value) || 0 })}
            className="w-full bg-zinc-900 text-white rounded-lg px-3 py-2 border border-zinc-700 focus:border-zinc-500 focus:outline-none"
          />
        </div>

        {/* Default User Limit */}
        <div className="bg-zinc-800 rounded-lg p-4 border border-zinc-700">
          <label className="text-white font-medium block mb-2">
            Default User Limit
          </label>
          <p className="text-zinc-400 text-sm mb-3">
            For external users (non-Era email domains)
          </p>
          <input
            type="number"
            min="0"
            max="10000"
            value={values.defaultUserPhotoLimit}
            onChange={(e) => setValues({ ...values, defaultUserPhotoLimit: parseInt(e.target.value) || 0 })}
            className="w-full bg-zinc-900 text-white rounded-lg px-3 py-2 border border-zinc-700 focus:border-zinc-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Info box */}
      <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
        <h4 className="text-zinc-300 font-medium mb-2">How limits work</h4>
        <ul className="text-zinc-400 text-sm space-y-1">
          <li>- Users see their remaining photo count in the sidebar</li>
          <li>- When at limit, new captures are blocked (existing photos remain)</li>
          <li>- Admins have unlimited photos regardless of email domain</li>
          <li>- Changes apply immediately to all users</li>
        </ul>
      </div>

      <button
        onClick={handleSave}
        className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors shadow-lg hover:shadow-red-600/20"
      >
        Save Limits
      </button>
    </div>
  );
};
