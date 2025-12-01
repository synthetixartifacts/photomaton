import React, { useState } from 'react';
import type { TimingsTabProps } from './types';

export const TimingsTab: React.FC<TimingsTabProps> = ({ timings, onSave }) => {
  const [values, setValues] = useState(timings);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-zinc-400 text-sm mb-2">
            Countdown Duration (seconds)
          </label>
          <input
            type="number"
            min="1"
            max="10"
            value={values.countdownSeconds}
            onChange={(e) =>
              setValues({ ...values, countdownSeconds: parseInt(e.target.value) })
            }
            className="w-full px-3 py-2 bg-zinc-800 text-white rounded-lg border border-zinc-700 focus:border-zinc-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-zinc-400 text-sm mb-2">
            Display Transformed Duration (seconds)
          </label>
          <input
            type="number"
            min="5"
            max="60"
            value={values.displayTransformedSeconds}
            onChange={(e) =>
              setValues({ ...values, displayTransformedSeconds: parseInt(e.target.value) })
            }
            className="w-full px-3 py-2 bg-zinc-800 text-white rounded-lg border border-zinc-700 focus:border-zinc-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-zinc-400 text-sm mb-2">
            Processing Check Interval (ms)
          </label>
          <input
            type="number"
            min="500"
            max="5000"
            step="100"
            value={values.processingCheckIntervalMs}
            onChange={(e) =>
              setValues({ ...values, processingCheckIntervalMs: parseInt(e.target.value) })
            }
            className="w-full px-3 py-2 bg-zinc-800 text-white rounded-lg border border-zinc-700 focus:border-zinc-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-zinc-400 text-sm mb-2">
            Max Processing Time (seconds)
          </label>
          <input
            type="number"
            min="10"
            max="120"
            value={values.maxProcessingTimeSeconds}
            onChange={(e) =>
              setValues({ ...values, maxProcessingTimeSeconds: parseInt(e.target.value) })
            }
            className="w-full px-3 py-2 bg-zinc-800 text-white rounded-lg border border-zinc-700 focus:border-zinc-500 focus:outline-none"
          />
        </div>
      </div>

      <button
        onClick={() => onSave(values)}
        className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors"
      >
        Save Timings
      </button>
    </div>
  );
};
