import type { ClientConfig } from '../../services/ConfigService';

export type TabType = 'general' | 'limits' | 'timings' | 'ui' | 'camera' | 'providers' | 'presets' | 'photos' | 'config' | 'testing';

export interface AdminTabProps {
  config: ClientConfig;
  loading?: boolean;
  onSave?: (updates: Partial<ClientConfig>) => Promise<void>;
}

export interface GeneralTabProps extends AdminTabProps {
  stats: any;
  onReset: () => Promise<void>;
}

export interface TimingsTabProps {
  timings: ClientConfig['timings'];
  onSave: (timings: ClientConfig['timings']) => void;
}

export interface UITabProps {
  ui: ClientConfig['ui'];
  onSave: (ui: ClientConfig['ui']) => void;
}

export interface ProvidersTabProps {
  providers: ClientConfig['providers'];
  onSave: (providers: ClientConfig['providers']) => void;
}

export interface PresetsTabProps {
  presets: ClientConfig['presets'];
  onSave: (presets: ClientConfig['presets']) => void;
}

export interface CameraTabProps {
  camera: ClientConfig['camera'];
  onSave: (camera: ClientConfig['camera']) => void;
}

export interface ConfigTabProps {
  features: ClientConfig['features'];
  onSave: (features: ClientConfig['features']) => void;
}

export interface TestingTabProps {
  config: ClientConfig;
}

export interface LimitsTabProps {
  userLimits: ClientConfig['userLimits'];
  onSave: (userLimits: ClientConfig['userLimits']) => void;
}
