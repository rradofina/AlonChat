import React, { useState, useEffect } from 'react';
import { ManualTemplate, Photo, PrintSize } from '../types';
import { manualTemplateService } from '../services/manualTemplateService';
import { printSizeService } from '../services/printSizeService';
import PngTemplateVisual from './PngTemplateVisual';
import { getSamplePhotosForTemplate } from '../utils/samplePhotoUtils';
import { createPhotoTransform } from '../types';
import { PRINT_SIZE_ORDER } from '../utils/constants';
import { getPrintSizeDimensions } from '../utils/printSizeDimensions';

interface AddPrintsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTemplateAdd: (template: ManualTemplate) => void;
  availablePhotos?: Photo[];
}

interface GroupedTemplates {
  [printSize: string]: ManualTemplate[];
}

export default function AddPrintsModal({
  isOpen,
  onClose,
  onTemplateAdd,
  availablePhotos = []
}: AddPrintsModalProps) {
  const [loading, setLoading] = useState(true);
  const [groupedTemplates, setGroupedTemplates] = useState<GroupedTemplates>({});
  const [printSizes, setPrintSizes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<ManualTemplate | null>(null);

  // Load templates grouped by print size
  useEffect(() => {
    if (!isOpen) {
      // Reset selection when modal closes
      setSelectedTemplate(null);
      return;
    }

    const loadTemplates = async () => {
      try {
        setLoading(true);
        setError(null);
        setSelectedTemplate(null); // Reset selection when opening

        console.log('🔄 Loading templates for Add Prints modal...');

        // Get all available print sizes from database
        const printSizeConfigs = await printSizeService.getAvailablePrintSizes();
        const availablePrintSizes = printSizeConfigs.map(config => config.name);
        
        console.log('📏 Available print sizes:', availablePrintSizes);

        // Load templates for each print size
        const grouped: GroupedTemplates = {};
        
        for (const printSize of availablePrintSizes) {
          const templates = await manualTemplateService.getTemplatesByPrintSize(printSize);
          if (templates.length > 0) {
            grouped[printSize] = templates;
          }
        }

        console.log('📋 Grouped templates:', {
          printSizes: Object.keys(grouped),
          totalTemplates: Object.values(grouped).flat().length,
          templateCounts: Object.entries(grouped).reduce((acc, [size, templates]) => {
            acc[size] = templates.length;
            return acc;
          }, {} as Record<string, number>)
        });

        setGroupedTemplates(grouped);
        
        // Sort print sizes according to PRINT_SIZE_ORDER configuration
        const availableSizes = Object.keys(grouped);
        const sortedSizes = [
          ...PRINT_SIZE_ORDER.filter(size => availableSizes.includes(size)), // First: ordered sizes that exist
          ...availableSizes.filter(size => !(PRINT_SIZE_ORDER as readonly string[]).includes(size)).sort() // Then: any additional sizes alphabetically
        ];
        setPrintSizes(sortedSizes);
      } catch (error) {
        console.error('❌ Error loading templates for Add Prints modal:', error);
        setError('Failed to load available templates. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadTemplates();
  }, [isOpen]);

  const handleTemplateSelect = (template: ManualTemplate) => {
    console.log('✅ Template selected:', {
      templateId: template.id,
      templateName: template.name,
      printSize: template.print_size
    });
    
    setSelectedTemplate(template);
  };

  const handleConfirmAdd = () => {
    if (!selectedTemplate) {
      console.log('⚠️ No template selected for adding');
      return;
    }

    console.log('➕ Adding template to package:', {
      templateId: selectedTemplate.id,
      templateName: selectedTemplate.name,
      printSize: selectedTemplate.print_size
    });
    
    onTemplateAdd(selectedTemplate);
    setSelectedTemplate(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-900">Add More Prints</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors text-2xl font-light"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading available templates...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="text-red-600 mb-4">{error}</div>
              <button
                onClick={() => window.location.reload()}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : printSizes.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-500 mb-4">No additional templates available</div>
              <button
                onClick={onClose}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              {printSizes.map(printSize => {
                const templates = groupedTemplates[printSize] || [];
                
                return (
                  <div key={printSize} className="border border-gray-200 rounded-lg p-4">
                    {/* Print Size Header */}
                    <div className="mb-4">
                      <h3 className="text-lg font-medium text-gray-900 mb-1">
                        {printSize} Templates
                      </h3>
                      <div className="text-sm text-gray-600">
                        {templates.length} template{templates.length !== 1 ? 's' : ''} available
                      </div>
                    </div>

                    {/* Templates Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {templates.map(template => {
                        // Generate sample photos for preview
                        const samplePhotos = getSamplePhotosForTemplate(
                          availablePhotos,
                          template.holes_data?.length || 0,
                          template.id.toString()
                        );

                        // Create sample slots for preview
                        const sampleSlots = samplePhotos.map((photo, slotIndex) => ({
                          id: `add-prints-slot-${template.id}-${slotIndex}`,
                          templateId: template.id.toString(),
                          templateName: template.name,
                          templateType: template.template_type,
                          slotIndex,
                          photoId: photo.id,
                          transform: createPhotoTransform(1.0, 0.5, 0.5)
                        }));

                        // Create photo filename assignments for this template's holes
                        const holePhotoAssignments = (template.holes_data || []).map((hole, holeIndex) => {
                          const assignedPhoto = availablePhotos[holeIndex % availablePhotos.length];
                          return assignedPhoto?.name || `Photo ${holeIndex + 1}`;
                        });

                        const isSelected = selectedTemplate?.id === template.id;

                        return (
                          <div
                            key={template.id}
                            className={`rounded-lg p-3 border-2 transition-all cursor-pointer ${
                              isSelected 
                                ? 'bg-green-50 border-green-500 shadow-md' 
                                : 'bg-gray-50 border-gray-200 hover:shadow-md hover:border-green-300'
                            }`}
                            onClick={() => handleTemplateSelect(template)}
                          >
                            {/* Template Header */}
                            <div className="mb-2">
                              <h4 className="font-medium text-gray-900 text-sm truncate">
                                {template.name}
                              </h4>
                              <div className="text-xs text-gray-500">
                                {template.holes_data?.length || 0} photo slot{(template.holes_data?.length || 0) !== 1 ? 's' : ''}
                              </div>
                            </div>

                            {/* Template Preview */}
                            <div 
                              className="bg-white rounded border border-gray-200 overflow-hidden mb-2 flex items-center justify-center"
                              style={{
                                aspectRatio: template.dimensions 
                                  ? `${template.dimensions.width}/${template.dimensions.height}`
                                  : template.print_size === 'A4' ? '2480/3508'
                                  : template.print_size === '5R' ? '1500/2100'
                                  : '1200/1800', // Default to 4R
                                minHeight: '220px',
                                width: '100%'
                              }}
                            >
                              {template.drive_file_id ? (
                                <PngTemplateVisual
                                  pngTemplate={{
                                    id: template.id.toString(),
                                    name: template.name,
                                    templateType: template.template_type,
                                    driveFileId: template.drive_file_id,
                                    holes: template.holes_data || [],
                                    dimensions: template.dimensions || getPrintSizeDimensions(template.print_size),
                                    printSize: template.print_size,
                                    pngUrl: (() => {
                                      const fileId = template.drive_file_id?.match(/\/d\/([a-zA-Z0-9-_]+)/)?.[1] || template.drive_file_id;
                                      const cleanFileId = fileId?.replace(/[^a-zA-Z0-9-_]/g, '');
                                      return cleanFileId ? `https://lh3.googleusercontent.com/d/${cleanFileId}` : '';
                                    })(),
                                    hasInternalBranding: false,
                                    lastUpdated: new Date(),
                                    createdAt: new Date()
                                  }}
                                  templateSlots={sampleSlots}
                                  onSlotClick={() => {}}
                                  photos={samplePhotos}
                                  selectedSlot={null}
                                  isActiveTemplate={false}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                                  Preview unavailable
                                </div>
                              )}
                            </div>

                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Action Buttons - Always visible */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 bg-gray-50 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmAdd}
            disabled={!selectedTemplate || loading}
            className={`px-6 py-2.5 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${
              selectedTemplate && !loading
                ? 'text-white bg-green-600 hover:bg-green-700'
                : 'text-gray-500 bg-gray-300 cursor-not-allowed'
            }`}
          >
            Add Template
          </button>
        </div>
      </div>
    </div>
  );
}