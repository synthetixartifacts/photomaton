import React from 'react';
import { PresetSelector } from './PresetSelector';
import { CaptureButton } from './CaptureButton';
import { PresetType } from '@photomaton/shared';

interface CaptureControlsProps {
  selectedPreset: PresetType;
  onPresetChange: (preset: PresetType) => void;
  onCapture: () => void;
  disabled: boolean;
  isCapturing: boolean;
  displayCountdown?: number | null;
}

export const CaptureControls: React.FC<CaptureControlsProps> = ({
  selectedPreset,
  onPresetChange,
  onCapture,
  disabled,
  isCapturing,
  displayCountdown,
}) => {
  return (
    <>
      <PresetSelector
        value={selectedPreset}
        onChange={onPresetChange}
        disabled={disabled}
      />

      <div className="flex justify-center">
        <CaptureButton
          onClick={onCapture}
          disabled={disabled}
          isCapturing={isCapturing}
          displayCountdown={displayCountdown}
        />
      </div>
    </>
  );
};