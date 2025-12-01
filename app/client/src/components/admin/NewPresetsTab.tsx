import React, { useState, useEffect } from 'react';
import { presetService, type PresetPrompt, type CreatePresetInput, type UpdatePresetInput } from '../../services/PresetService';
import { ImageUpload } from './ImageUpload';
import { useUIStore } from '../../stores/uiStore';

// Icons
const PlusIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
  </svg>
);

const EditIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const DeleteIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
  </svg>
);

const DragHandleIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
    <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z" />
  </svg>
);

interface PresetFormData {
  presetId: string;
  name: string;
  description: string;
  icon: string;
  imagePath?: string;
  prompt: string;
  enabled: boolean;
}

type FormMode = 'list' | 'create' | 'edit';

interface DeleteConfirmationProps {
  preset: PresetPrompt;
  onConfirm: () => void;
  onCancel: () => void;
}

const DeleteConfirmation: React.FC<DeleteConfirmationProps> = ({ preset, onConfirm, onCancel }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-zinc-800 rounded-lg p-6 max-w-md w-full mx-4">
      <h3 className="text-lg font-semibold text-white mb-4">Delete Preset</h3>
      <p className="text-zinc-300 mb-6">
        Are you sure you want to delete the preset "{preset.name}"? This action cannot be undone.
      </p>
      <div className="flex space-x-3">
        <button
          onClick={onConfirm}
          className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
        >
          Delete
        </button>
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
);

const emptyFormData: PresetFormData = {
  presetId: '',
  name: '',
  description: '',
  icon: '',
  imagePath: undefined,
  prompt: '',
  enabled: true,
};

export const NewPresetsTab: React.FC = () => {
  const { addNotification } = useUIStore();
  const [presets, setPresets] = useState<PresetPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<FormMode>('list');
  const [formData, setFormData] = useState<PresetFormData>(emptyFormData);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<PresetPrompt | null>(null);
  const [selectedPresets, setSelectedPresets] = useState<Set<string>>(new Set());
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    loadPresets();
  }, []);

  const loadPresets = async () => {
    try {
      setLoading(true);
      const presetsData = await presetService.getPresets(true);
      setPresets(presetsData);
    } catch (error) {
      addNotification('error', 'Failed to load presets');
      console.error('Failed to load presets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setFormData(emptyFormData);
    setEditingId(null);
    setMode('create');
  };

  const handleEdit = (preset: PresetPrompt) => {
    setFormData({
      presetId: preset.presetId,
      name: preset.name,
      description: preset.description || '',
      icon: preset.icon || '',
      imagePath: preset.imagePath,
      prompt: preset.prompt,
      enabled: preset.enabled,
    });
    setEditingId(preset.id);
    setMode('edit');
  };

  const handleSave = async () => {
    try {
      if (mode === 'create') {
        const createData: CreatePresetInput = {
          presetId: formData.presetId,
          name: formData.name,
          description: formData.description || undefined,
          icon: formData.icon || undefined,
          prompt: formData.prompt,
          enabled: formData.enabled,
        };

        await presetService.createPreset(createData);
        addNotification('success', 'Preset created successfully');
      } else if (mode === 'edit' && editingId) {
        const updateData: UpdatePresetInput = {
          name: formData.name,
          description: formData.description || undefined,
          icon: formData.icon || undefined,
          prompt: formData.prompt,
          enabled: formData.enabled,
        };

        await presetService.updatePreset(editingId, updateData);
        addNotification('success', 'Preset updated successfully');
      }

      setMode('list');
      await loadPresets();
    } catch (error: any) {
      const message = error?.message || 'Failed to save preset';
      addNotification('error', message);
      console.error('Failed to save preset:', error);
    }
  };

  const handleDelete = async (preset: PresetPrompt) => {
    setDeleteConfirmation(preset);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmation) return;

    try {
      await presetService.deletePreset(deleteConfirmation.id);
      addNotification('success', 'Preset deleted successfully');
      setDeleteConfirmation(null);
      await loadPresets();
    } catch (error) {
      addNotification('error', 'Failed to delete preset');
      console.error('Failed to delete preset:', error);
    }
  };

  const handleToggle = async (preset: PresetPrompt) => {
    try {
      await presetService.togglePreset(preset.id);
      addNotification('success', `Preset ${preset.enabled ? 'disabled' : 'enabled'} successfully`);
      await loadPresets();
    } catch (error) {
      addNotification('error', 'Failed to toggle preset');
      console.error('Failed to toggle preset:', error);
    }
  };

  const handleSelectPreset = (presetId: string, selected: boolean) => {
    const newSelected = new Set(selectedPresets);
    if (selected) {
      newSelected.add(presetId);
    } else {
      newSelected.delete(presetId);
    }
    setSelectedPresets(newSelected);
  };

  const handleBulkToggle = async (enabled: boolean) => {
    if (selectedPresets.size === 0) return;

    try {
      await presetService.bulkTogglePresets(Array.from(selectedPresets), enabled);
      addNotification('success', `${selectedPresets.size} presets ${enabled ? 'enabled' : 'disabled'} successfully`);
      setSelectedPresets(new Set());
      await loadPresets();
    } catch (error) {
      addNotification('error', 'Failed to bulk toggle presets');
      console.error('Failed to bulk toggle presets:', error);
    }
  };

  const handleImageUpload = async (file: File) => {
    if (!editingId) {
      throw new Error('Please save the preset first before uploading an image');
    }

    const updatedPreset = await presetService.uploadPresetImage(editingId, file);
    setFormData({ ...formData, imagePath: updatedPreset.imagePath });
    addNotification('success', 'Image uploaded successfully');

    // Reload presets to reflect the change
    await loadPresets();
  };

  const handleImageDelete = async () => {
    if (!editingId) return;

    await presetService.deletePresetImage(editingId);
    setFormData({ ...formData, imagePath: undefined });
    addNotification('success', 'Image deleted successfully');

    // Reload presets to reflect the change
    await loadPresets();
  };

  const validateForm = (): boolean => {
    if (!formData.presetId.trim()) return false;
    if (!formData.name.trim()) return false;
    if (!formData.prompt.trim()) return false;
    return true;
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();

    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }

    // Reorder presets array
    const newPresets = [...presets];
    const [draggedPreset] = newPresets.splice(draggedIndex, 1);
    newPresets.splice(dropIndex, 0, draggedPreset);

    // Update local state immediately for smooth UX
    setPresets(newPresets);
    setDraggedIndex(null);

    // Send reorder request to server
    try {
      const orderedIds = newPresets.map(p => p.id);
      await presetService.reorderPresets(orderedIds);
      addNotification('success', 'Presets reordered successfully');
    } catch (error) {
      addNotification('error', 'Failed to reorder presets');
      console.error('Failed to reorder presets:', error);
      // Reload presets to revert on error
      await loadPresets();
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-600"></div>
      </div>
    );
  }

  if (mode === 'create' || mode === 'edit') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">
            {mode === 'create' ? 'Create New Preset' : 'Edit Preset'}
          </h2>
          <button
            onClick={() => setMode('list')}
            className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors"
          >
            Back to List
          </button>
        </div>

        <div className="bg-zinc-800 rounded-lg p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Preset ID *
              </label>
              <input
                type="text"
                value={formData.presetId}
                onChange={(e) => setFormData({ ...formData, presetId: e.target.value })}
                disabled={mode === 'edit'}
                className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white focus:ring-2 focus:ring-zinc-500 focus:border-transparent disabled:opacity-50"
                placeholder="e.g., toon-yellow"
              />
              <p className="text-xs text-zinc-500 mt-1">
                Lowercase letters, numbers, hyphens, and underscores only
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Title *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white focus:ring-2 focus:ring-zinc-500 focus:border-transparent"
                placeholder="e.g., Yellow Toon"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Icon
              </label>
              <input
                type="text"
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white focus:ring-2 focus:ring-zinc-500 focus:border-transparent"
                placeholder="🎨"
              />
            </div>

          </div>

          {/* Image Upload Section */}
          {mode === 'edit' && editingId && (
            <div className="col-span-2">
              <ImageUpload
                currentImagePath={formData.imagePath}
                presetId={formData.presetId}
                onUpload={handleImageUpload}
                onDelete={handleImageDelete}
                disabled={false}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white focus:ring-2 focus:ring-zinc-500 focus:border-transparent"
              placeholder="Brief description of the preset effect"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Prompt *
            </label>
            <textarea
              value={formData.prompt}
              onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white focus:ring-2 focus:ring-zinc-500 focus:border-transparent"
              placeholder="Main transformation prompt..."
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="enabled"
              checked={formData.enabled}
              onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
              className="w-4 h-4 text-zinc-400 bg-zinc-700 border-zinc-600 rounded focus:ring-zinc-500"
            />
            <label htmlFor="enabled" className="text-sm text-zinc-300">
              Enabled
            </label>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={handleSave}
              disabled={!validateForm()}
              className="px-6 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {mode === 'create' ? 'Create Preset' : 'Update Preset'}
            </button>
            <button
              onClick={() => setMode('list')}
              className="px-6 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="bg-zinc-800 rounded-lg p-4 border border-zinc-700">
          <p className="text-sm text-zinc-300">
            <strong>Dynamic Presets:</strong> Manage your AI transformation presets with full CRUD capabilities. Create custom effects, edit existing ones, and organize your preset library.
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-semibold text-white">
              Presets ({presets.length})
            </h2>
            {selectedPresets.size > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-zinc-400">
                  {selectedPresets.size} selected
                </span>
                <button
                  onClick={() => handleBulkToggle(true)}
                  className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors"
                >
                  Enable
                </button>
                <button
                  onClick={() => handleBulkToggle(false)}
                  className="px-3 py-1 bg-zinc-600 hover:bg-zinc-700 text-white text-sm rounded transition-colors"
                >
                  Disable
                </button>
              </div>
            )}
          </div>
          <button
            onClick={handleCreate}
            className="flex items-center space-x-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors"
          >
            <PlusIcon />
            <span>Create Preset</span>
          </button>
        </div>

        {presets.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-zinc-400 mb-4">No presets found</p>
            <button
              onClick={handleCreate}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors"
            >
              <PlusIcon />
              <span>Create Your First Preset</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {presets.map((preset, index) => (
              <div
                key={preset.id}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={`bg-zinc-800 rounded-lg p-4 transition-all ${
                  draggedIndex === index ? 'opacity-50' : ''
                } cursor-move hover:bg-zinc-700`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="text-zinc-500 hover:text-zinc-400 cursor-grab active:cursor-grabbing">
                      <DragHandleIcon />
                    </div>
                    <input
                      type="checkbox"
                      checked={selectedPresets.has(preset.id)}
                      onChange={(e) => handleSelectPreset(preset.id, e.target.checked)}
                      className="w-4 h-4 text-zinc-400 bg-zinc-700 border-zinc-600 rounded focus:ring-zinc-500"
                    />
                    {preset.imagePath ? (
                      <img
                        src={preset.imagePath}
                        alt={preset.name}
                        className="w-12 h-12 object-cover rounded-lg"
                      />
                    ) : (
                      <span className="text-2xl">{preset.icon}</span>
                    )}
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="text-white font-semibold">{preset.name}</h4>
                        <span className="px-2 py-1 bg-zinc-700/20 text-zinc-300 text-xs rounded-full">
                          {preset.presetId}
                        </span>
                        {!preset.enabled && (
                          <span className="px-2 py-1 bg-zinc-600/20 text-zinc-400 text-xs rounded-full">
                            Disabled
                          </span>
                        )}
                      </div>
                      {preset.description && (
                        <p className="text-zinc-400 text-sm mt-1">{preset.description}</p>
                      )}
                      <div className="mt-2">
                        <p className="text-zinc-500 text-xs font-mono line-clamp-2">
                          {preset.prompt}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEdit(preset)}
                      className="p-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors"
                      title="Edit preset"
                    >
                      <EditIcon />
                    </button>
                    <button
                      onClick={() => handleToggle(preset)}
                      className={`px-3 py-2 rounded-lg transition-colors ${
                        preset.enabled
                          ? 'bg-green-600 hover:bg-green-700 text-white'
                          : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-400'
                      }`}
                    >
                      {preset.enabled ? (
                        <div className="flex items-center space-x-1">
                          <CheckIcon />
                          <span>Enabled</span>
                        </div>
                      ) : (
                        'Disabled'
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(preset)}
                      className="p-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 hover:text-red-300 rounded-lg transition-colors"
                      title="Delete preset"
                    >
                      <DeleteIcon />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {deleteConfirmation && (
        <DeleteConfirmation
          preset={deleteConfirmation}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteConfirmation(null)}
        />
      )}
    </>
  );
};