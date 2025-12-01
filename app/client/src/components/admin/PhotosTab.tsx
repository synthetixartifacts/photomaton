import React, { useState, useEffect } from 'react';
import { photoService, type Photo } from '../../services/PhotoService';
import { useUIStore } from '../../stores/uiStore';

export const PhotosTab: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const { addNotification } = useUIStore();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [photoStats, photoList] = await Promise.all([
        photoService.getStats(),
        photoService.listPhotos()
      ]);
      setStats(photoStats);
      setPhotos(photoList.photos);
    } catch (error) {
      console.error('Failed to load photo data:', error);
      addNotification('error', 'Failed to load photo data');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePhoto = async (photo: Photo) => {
    const statusText = photo.status === 'processing' ? ' (currently processing)' : '';
    const confirmMessage = `Are you sure you want to delete photo "${photo.id}"${statusText}?\n\nThis action cannot be undone!`;
    if (!confirm(confirmMessage)) return;

    try {
      await photoService.deletePhoto(photo.id);
      addNotification('success', `Photo ${photo.id} deleted successfully`);
      // Reload data after deletion
      loadData();
    } catch (error) {
      addNotification('error', `Failed to delete photo ${photo.id}`);
      console.error('Delete photo failed:', error);
    }
  };

  const handleBulkDelete = async () => {
    const confirmMessage = 'Are you sure you want to delete ALL photos?\n\nThis action cannot be undone!';
    if (!confirm(confirmMessage)) return;

    // Double confirmation for safety
    const secondConfirm = prompt('Type "DELETE" to confirm deletion of all photos:');
    if (secondConfirm !== 'DELETE') {
      addNotification('info', 'Deletion cancelled');
      return;
    }

    try {
      const result = await photoService.deleteAllPhotos();
      addNotification('success', result.message);
      // Reload data after deletion
      loadData();
    } catch (error) {
      addNotification('error', 'Failed to delete photos');
      console.error('Delete all failed:', error);
    }
  };

  const handleExportPhotos = async () => {
    if (exporting) return;

    // Check if there are any completed photos
    if (!stats?.byStatus?.completed || stats.byStatus.completed === 0) {
      addNotification('warning', 'No completed photos available for export');
      return;
    }

    setExporting(true);

    try {
      // First, get an estimate of the export size
      const estimate = await photoService.estimateExportSize();

      if (estimate.photoCount === 0) {
        addNotification('warning', 'No processed photos available for export');
        setExporting(false);
        return;
      }

      // Confirm export with size information
      const confirmMessage = `Export ${estimate.photoCount} processed photo${estimate.photoCount > 1 ? 's' : ''}?\n\nEstimated size: ${estimate.estimatedSizeMB} MB`;
      if (!confirm(confirmMessage)) {
        setExporting(false);
        return;
      }

      addNotification('info', 'Generating ZIP file... This may take a moment for large exports.');

      // Start the export
      await photoService.exportPhotos();

      addNotification('success', `Successfully exported ${estimate.photoCount} photo${estimate.photoCount > 1 ? 's' : ''}`);
    } catch (error) {
      console.error('Export failed:', error);
      addNotification('error', `Failed to export photos: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setExporting(false);
    }
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-400';
      case 'processing': return 'text-yellow-400';
      case 'failed': return 'text-red-400';
      case 'pending': return 'text-zinc-300';
      default: return 'text-zinc-400';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-400">Loading photos...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-white mb-4">Photo Statistics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-zinc-800 rounded-lg p-4">
            <div className="text-zinc-400 text-sm">Total</div>
            <div className="text-white text-lg font-semibold">{stats?.total || 0}</div>
          </div>
          <div className="bg-zinc-800 rounded-lg p-4">
            <div className="text-zinc-400 text-sm">Pending</div>
            <div className="text-white text-lg font-semibold">{stats?.byStatus?.pending || 0}</div>
          </div>
          <div className="bg-zinc-800 rounded-lg p-4">
            <div className="text-zinc-400 text-sm">Completed</div>
            <div className="text-white text-lg font-semibold">{stats?.byStatus?.completed || 0}</div>
          </div>
          <div className="bg-zinc-800 rounded-lg p-4">
            <div className="text-zinc-400 text-sm">Failed</div>
            <div className="text-white text-lg font-semibold">{stats?.byStatus?.failed || 0}</div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-xl font-semibold text-white mb-4">Actions</h3>
        <div className="flex gap-4">
          <button
            onClick={handleExportPhotos}
            disabled={exporting || !stats?.byStatus?.completed}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
              exporting || !stats?.byStatus?.completed
                ? 'bg-zinc-600 text-zinc-400 cursor-not-allowed'
                : 'bg-zinc-700 hover:bg-zinc-600 text-white'
            }`}
          >
            {exporting ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Exporting...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
                Export Photos
              </>
            )}
          </button>
          <button
            onClick={handleBulkDelete}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete All Photos
          </button>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-white">Recent Photos</h3>
          <button
            onClick={loadData}
            className="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 text-white rounded transition-colors text-sm"
          >
            Refresh
          </button>
        </div>

        {photos.length === 0 ? (
          <div className="text-center text-zinc-400 py-8">
            No photos found
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="bg-zinc-800 rounded-lg p-4 flex items-center justify-between"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-mono text-sm text-zinc-300 truncate">
                      {photo.id}
                    </span>
                    <span className={`text-sm font-medium capitalize ${getStatusColor(photo.status)}`}>
                      {photo.status}
                    </span>
                    <span className="text-xs text-zinc-500 capitalize">
                      {photo.preset}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-400">
                    Created: {formatDate(photo.createdAt)}
                    {photo.processingTime && (
                      <span className="ml-4">
                        Processing time: {photo.processingTime}ms
                      </span>
                    )}
                    {photo.provider && (
                      <span className="ml-4">
                        Provider: {photo.provider}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  {photo.status === 'processing' && (
                    <div className="flex items-center gap-1 text-yellow-400">
                      <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span className="text-xs">Processing</span>
                    </div>
                  )}
                  <button
                    onClick={() => handleDeletePhoto(photo)}
                    className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
