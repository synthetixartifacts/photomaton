import React, { useState, useEffect } from 'react';
import { configService } from '../services/ConfigService';
import { photoService } from '../services/PhotoService';
import { useUIStore } from '../stores/uiStore';
import { useConfig } from '../contexts/ConfigContext';
import { X } from 'lucide-react';
import {
  GeneralTab,
  LimitsTab,
  TimingsTab,
  UITab,
  CameraTab,
  ProvidersTab,
  PresetsTab,
  PhotosTab,
  ConfigTab,
  TestingTab,
  type TabType
} from './admin';
import type { ClientConfig } from '../services/ConfigService';

export const AdminPanel: React.FC = () => {
  const { showAdminPanel, toggleAdminPanel, addNotification, notifications, removeNotification } = useUIStore();
  const { refreshConfig } = useConfig();
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [config, setConfig] = useState<ClientConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    if (showAdminPanel) {
      loadConfig();
      loadStats();
    }
  }, [showAdminPanel]);

  // ESC key handler
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showAdminPanel) {
        toggleAdminPanel();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [showAdminPanel, toggleAdminPanel]);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const cfg = await configService.getConfig(true);
      setConfig(cfg);
    } catch (error) {
      addNotification('error', 'Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const [configStats, photoStats] = await Promise.all([
        configService.getStats(),
        photoService.getStats(),
      ]);
      setStats({ config: configStats, photos: photoStats });
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleSave = async (updates: Partial<ClientConfig>) => {
    try {
      setLoading(true);
      const updatedConfig = await configService.updateConfig(updates);
      setConfig(updatedConfig);
      await refreshConfig();
      addNotification('success', 'Configuration saved successfully');
    } catch (error) {
      addNotification('error', 'Failed to save configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Reset all settings to defaults?')) return;

    try {
      setLoading(true);
      const resetConfig = await configService.resetConfig();
      setConfig(resetConfig);
      addNotification('success', 'Configuration reset to defaults');
    } catch (error) {
      addNotification('error', 'Failed to reset configuration');
    } finally {
      setLoading(false);
    }
  };

  if (!showAdminPanel || !config) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 rounded-xl shadow-xl w-full max-w-6xl h-screen overflow-hidden flex flex-col border border-zinc-800">
        {/* Notifications */}
        {notifications.length > 0 && (
          <div className="absolute top-4 right-4 z-10 space-y-2">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-3 rounded-lg shadow-lg flex items-center gap-2 min-w-80 ${
                  notification.type === 'success' ? 'bg-green-600 text-white' :
                  notification.type === 'error' ? 'bg-red-600 text-white' :
                  notification.type === 'warning' ? 'bg-amber-600 text-white' :
                  'bg-zinc-700 text-white'
                }`}
              >
                <div className="flex-1 text-sm font-medium">{notification.message}</div>
                <button
                  onClick={() => removeNotification(notification.id)}
                  className="text-white/80 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Header */}
        <div className="bg-zinc-900 px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Admin Configuration</h2>
          <button
            onClick={() => toggleAdminPanel(false)}
            className="p-2 text-zinc-500 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="bg-zinc-900 px-6 border-b border-zinc-800">
          <div className="flex space-x-1 overflow-x-auto">
            {(['general', 'limits', 'timings', 'ui', 'camera', 'providers', 'presets', 'photos', 'config', 'testing'] as TabType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 capitalize text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab
                    ? 'text-white border-b-2 border-white'
                    : 'text-zinc-500 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-zinc-950">
          {loading && (
            <div className="text-center text-zinc-500">Loading...</div>
          )}

          {!loading && activeTab === 'general' && (
            <GeneralTab config={config} stats={stats} onReset={handleReset} />
          )}

          {!loading && activeTab === 'limits' && (
            <LimitsTab
              userLimits={config.userLimits}
              onSave={(userLimits) => handleSave({ userLimits })}
            />
          )}

          {!loading && activeTab === 'timings' && (
            <TimingsTab
              timings={config.timings}
              onSave={(timings) => handleSave({ timings })}
            />
          )}

          {!loading && activeTab === 'ui' && (
            <UITab
              ui={config.ui}
              onSave={(ui) => handleSave({ ui })}
            />
          )}

          {!loading && activeTab === 'camera' && (
            <CameraTab
              camera={config.camera}
              onSave={(camera) => handleSave({ camera })}
            />
          )}

          {!loading && activeTab === 'providers' && (
            <ProvidersTab
              providers={config.providers}
              onSave={(providers) => handleSave({ providers })}
            />
          )}

          {!loading && activeTab === 'presets' && (
            <PresetsTab />
          )}

          {!loading && activeTab === 'photos' && (
            <PhotosTab />
          )}

          {!loading && activeTab === 'config' && (
            <ConfigTab
              features={config.features}
              onSave={(features) => handleSave({ features })}
            />
          )}

          {!loading && activeTab === 'testing' && (
            <TestingTab config={config} />
          )}
        </div>
      </div>
    </div>
  );
};
