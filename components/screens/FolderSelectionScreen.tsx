import { GoogleAuth, DriveFolder, Package, PackageGroup, ManualPackage, ManualTemplate, Photo } from '../../types';
import HeaderNavigation from '../HeaderNavigation';
import { useState, useEffect, useCallback, useReducer } from 'react';
import { manualPackageService } from '../../services/manualPackageService';
import { packageGroupService } from '../../services/packageGroupService';
import { googleDriveService } from '../../services/googleDriveService';
import AnimatedTemplateReveal from '../animations/AnimatedTemplateReveal';
import PackageTemplatePreview from '../PackageTemplatePreview';

// Template state management types with session storage
interface TemplateState {
  // Base templates loaded from database (read-only, admin-configured)
  basePackageTemplates: Record<string, ManualTemplate[]>;
  
  // Session-specific template modifications (client customizations)
  sessionOverrides: Record<string, {
    replacements: Record<number, ManualTemplate>; // position -> replacement template
    additions: ManualTemplate[]; // additional templates added to package
  }>;
  
  expandedPackageId: string | null;
  loadingPackageId: string | null;
  templateError: string | null;
}

type TemplateAction = 
  // Base template management (read-only database templates)
  | { type: 'SET_BASE_TEMPLATES'; packageId: string; templates: ManualTemplate[] }
  | { type: 'INVALIDATE_BASE_TEMPLATES'; packageId: string }
  
  // Session-based template customizations (client modifications)
  | { type: 'REPLACE_TEMPLATE_IN_SESSION'; packageId: string; templateIndex: number; newTemplate: ManualTemplate }
  | { type: 'ADD_TEMPLATE_TO_SESSION'; packageId: string; template: ManualTemplate }
  | { type: 'DELETE_TEMPLATE_FROM_SESSION'; packageId: string; templateIndex: number }
  | { type: 'CLEAR_SESSION_OVERRIDES'; packageId?: string }
  
  // UI state management
  | { type: 'SET_EXPANDED_PACKAGE'; packageId: string | null }
  | { type: 'SET_LOADING'; packageId: string | null }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'CLEAR_ALL_TEMPLATES' };

// Session-aware template reducer with base templates + session overrides
function templateReducer(state: TemplateState, action: TemplateAction): TemplateState {
  switch (action.type) {
    // Base template management (read-only from database)
    case 'SET_BASE_TEMPLATES':
      return {
        ...state,
        basePackageTemplates: {
          ...state.basePackageTemplates,
          [action.packageId]: action.templates
        }
      };
    
    case 'INVALIDATE_BASE_TEMPLATES':
      const { [action.packageId]: removed, ...remainingBase } = state.basePackageTemplates;
      console.log('🗑️ INVALIDATING BASE TEMPLATE CACHE for package:', {
        packageId: action.packageId,
        removedTemplatesCount: removed?.length || 0,
        remainingPackages: Object.keys(remainingBase)
      });
      return { 
        ...state, 
        basePackageTemplates: remainingBase 
      };
    
    // Session-based template modifications (client customizations)
    case 'REPLACE_TEMPLATE_IN_SESSION':
      const baseTemplates = state.basePackageTemplates[action.packageId] || [];
      
      // Validate template index against base templates
      if (action.templateIndex < 0 || action.templateIndex >= baseTemplates.length) {
        console.error('❌ INVALID TEMPLATE INDEX for session replacement:', {
          packageId: action.packageId,
          templateIndex: action.templateIndex,
          baseTemplatesCount: baseTemplates.length,
          newTemplateName: action.newTemplate.name
        });
        return state;
      }
      
      const currentOverrides = state.sessionOverrides[action.packageId] || { replacements: {}, additions: [] };
      
      console.log('🔄 SESSION-BASED TEMPLATE REPLACEMENT:', {
        packageId: action.packageId,
        templateIndex: action.templateIndex,
        oldTemplate: {
          id: baseTemplates[action.templateIndex]?.id,
          name: baseTemplates[action.templateIndex]?.name
        },
        newTemplate: {
          id: action.newTemplate.id,
          name: action.newTemplate.name
        }
      });
      
      return {
        ...state,
        sessionOverrides: {
          ...state.sessionOverrides,
          [action.packageId]: {
            ...currentOverrides,
            replacements: {
              ...currentOverrides.replacements,
              [action.templateIndex]: action.newTemplate
            }
          }
        }
      };
    
    case 'ADD_TEMPLATE_TO_SESSION':
      const currentSessionOverrides = state.sessionOverrides[action.packageId] || { replacements: {}, additions: [] };
      
      console.log('➕ SESSION-BASED TEMPLATE ADDITION:', {
        packageId: action.packageId,
        newTemplate: {
          id: action.template.id,
          name: action.template.name
        },
        currentAdditions: currentSessionOverrides.additions.length
      });
      
      return {
        ...state,
        sessionOverrides: {
          ...state.sessionOverrides,
          [action.packageId]: {
            ...currentSessionOverrides,
            additions: [...currentSessionOverrides.additions, action.template]
          }
        }
      };
    
    case 'DELETE_TEMPLATE_FROM_SESSION':
      const deleteOverrides = state.sessionOverrides[action.packageId];
      if (!deleteOverrides || !deleteOverrides.additions) {
        return state;
      }
      
      // Calculate the actual index in additions array
      // We need to account for base templates when determining which addition to delete
      const baseTemplateCount = state.basePackageTemplates[action.packageId]?.length || 0;
      const additionIndex = action.templateIndex - baseTemplateCount;
      
      if (additionIndex < 0 || additionIndex >= deleteOverrides.additions.length) {
        console.warn('⚠️ Invalid template index for deletion:', {
          templateIndex: action.templateIndex,
          baseTemplateCount,
          additionIndex,
          totalAdditions: deleteOverrides.additions.length
        });
        return state;
      }
      
      console.log('🗑️ SESSION-BASED TEMPLATE DELETION:', {
        packageId: action.packageId,
        templateIndex: action.templateIndex,
        additionIndex,
        deletedTemplate: deleteOverrides.additions[additionIndex]?.name
      });
      
      return {
        ...state,
        sessionOverrides: {
          ...state.sessionOverrides,
          [action.packageId]: {
            ...deleteOverrides,
            additions: deleteOverrides.additions.filter((_, index) => index !== additionIndex)
          }
        }
      };
    
    case 'CLEAR_SESSION_OVERRIDES':
      if (action.packageId) {
        // Clear overrides for specific package
        const { [action.packageId]: clearedPackage, ...remainingOverrides } = state.sessionOverrides;
        return {
          ...state,
          sessionOverrides: remainingOverrides
        };
      } else {
        // Clear all session overrides
        return {
          ...state,
          sessionOverrides: {}
        };
      }
    
    // UI state management
    case 'SET_EXPANDED_PACKAGE':
      return { ...state, expandedPackageId: action.packageId };
    
    case 'SET_LOADING':
      return { ...state, loadingPackageId: action.packageId };
    
    case 'SET_ERROR':
      return { ...state, templateError: action.error };
    
    case 'CLEAR_ALL_TEMPLATES':
      return { 
        ...state, 
        basePackageTemplates: {},
        sessionOverrides: {}
      };
    
    default:
      return state;
  }
}

const initialTemplateState: TemplateState = {
  basePackageTemplates: {},
  sessionOverrides: {},
  expandedPackageId: null,
  loadingPackageId: null,
  templateError: null
};

// Helper function to merge base templates with session overrides
function getEffectiveTemplates(
  baseTemplates: ManualTemplate[], 
  sessionOverrides?: { replacements: Record<number, ManualTemplate>; additions: ManualTemplate[] }
): ManualTemplate[] {
  if (!sessionOverrides) {
    return baseTemplates;
  }
  
  // Start with base templates (mark them as NOT additional)
  let effectiveTemplates = baseTemplates.map(template => ({
    ...template,
    _isFromAddition: false // Internal marker to track source
  }));
  
  // Apply session replacements (replacements are still part of base package)
  Object.entries(sessionOverrides.replacements).forEach(([indexStr, replacementTemplate]) => {
    const index = parseInt(indexStr);
    if (index >= 0 && index < effectiveTemplates.length) {
      effectiveTemplates[index] = {
        ...replacementTemplate,
        _isFromAddition: false // Replacements are not additions
      };
    }
  });
  
  // Add session additions (mark them as additional)
  const markedAdditions = sessionOverrides.additions.map(template => ({
    ...template,
    _isFromAddition: true // Mark as addition for later processing
  }));
  effectiveTemplates = [...effectiveTemplates, ...markedAdditions];
  
  return effectiveTemplates;
}

interface FolderSelectionScreenProps {
  googleAuth: GoogleAuth;
  selectedMainFolder: DriveFolder | null;
  clientFolders: DriveFolder[];
  handleClientFolderSelect: (folder: DriveFolder) => void;
  mainSessionsFolder: { id: string; name: string } | null;
  onSignOut: () => void;
  onChangeMainFolder: () => void;
  // New props for package selection
  selectedPackage: Package | null;
  setSelectedPackage: (pkg: Package | null) => void;
  handleContinue: (effectiveTemplates?: ManualTemplate[]) => void;
  // New prop for template management
  onManageTemplates: () => void;
  // New prop for package management
  onManagePackages?: () => void;
}

// Transform Google Drive URLs to working image URLs
const transformGoogleDriveImageUrl = (photo: any, size: string = 's100'): string => {
  // Try to use the Google Drive file ID to create a working URL
  if (photo.googleDriveId || photo.id) {
    const fileId = photo.googleDriveId || photo.id;
    const transformedUrl = `https://lh3.googleusercontent.com/d/${fileId}=${size}`;
    console.log(`🔄 Transformed URL for ${photo.name}: ${transformedUrl}`);
    return transformedUrl;
  }
  
  // Fallback to thumbnail URL with size adjustment
  if (photo.thumbnailUrl) {
    const fallbackUrl = photo.thumbnailUrl.replace('=s220', `=${size}`);
    console.log(`📷 Fallback URL for ${photo.name}: ${fallbackUrl}`);
    return fallbackUrl;
  }
  
  // Last resort: use regular URL
  console.log(`⚠️ Using regular URL for ${photo.name}: ${photo.url}`);
  return photo.url || '';
};

// Simple folder card component with thumbnail
function FolderCard({ folder, onSelect }: { folder: DriveFolder; onSelect: () => void }) {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFolderImages = async () => {
      try {
        console.log(`📁 Fetching images for folder: ${folder.name}`);
        const photos = await googleDriveService.getPhotosFromFolder(folder.id);
        console.log(`📸 Found ${photos.length} photos in ${folder.name}`);
        
        if (photos.length > 0) {
          // Get first photo for main thumbnail
          const firstPhoto = photos[0];
          const smallThumbnail = transformGoogleDriveImageUrl(firstPhoto, 's80');
          setThumbnailUrl(smallThumbnail);

          // Get first 3 photos for preview strip
          const previewPhotos = photos.slice(0, 3).map(photo => 
            transformGoogleDriveImageUrl(photo, 's100')
          );
          console.log(`🖼️ Preview URLs for ${folder.name}:`, previewPhotos);
          setPreviewImages(previewPhotos);
        }
      } catch (error) {
        console.error('Failed to fetch folder images:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFolderImages();
  }, [folder.id]);

  return (
    <div
      onClick={onSelect}
      className="bg-gray-50 rounded-lg p-4 cursor-pointer hover:bg-blue-50 hover:border-blue-300 border-2 border-transparent transition-all duration-200 w-full"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          {/* Thumbnail or fallback icon */}
          <div className="w-10 h-10 mr-4 rounded-full overflow-hidden flex-shrink-0">
            {isLoading ? (
              <div className="w-full h-full bg-gray-300 animate-pulse rounded-full" />
            ) : thumbnailUrl ? (
              <img
                src={thumbnailUrl}
                alt={`Preview of ${folder.name}`}
                className="w-full h-full object-cover"
                onError={() => setThumbnailUrl(null)}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white text-sm">
                📁
              </div>
            )}
          </div>
          
          <div>
            <p className="font-semibold text-gray-800 text-lg">{folder.name}</p>
            <p className="text-sm text-gray-500">
              {new Date(folder.createdTime).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Photo Preview Strip */}
          {previewImages.length > 0 && (
            <div className="flex space-x-2">
              {previewImages.map((imageUrl, index) => (
                <div key={index} className="w-12 h-12 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                  <img
                    src={imageUrl}
                    alt={`Photo ${index + 1} from ${folder.name}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              ))}
            </div>
          )}
          
          {/* Arrow indicator */}
          <div className="text-blue-500 opacity-60 hover:opacity-100 transition-opacity flex-shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FolderSelectionScreen({
  googleAuth,
  selectedMainFolder,
  clientFolders,
  handleClientFolderSelect,
  mainSessionsFolder,
  onSignOut,
  onChangeMainFolder,
  selectedPackage,
  setSelectedPackage,
  handleContinue,
  onManageTemplates,
  onManagePackages,
}: FolderSelectionScreenProps) {
  const [selectedFolder, setSelectedFolder] = useState<DriveFolder | null>(null);
  const [showPackageSelection, setShowPackageSelection] = useState(false);
  const [groups, setGroups] = useState<PackageGroup[]>([]);
  const [groupedPackages, setGroupedPackages] = useState<{ [groupId: string]: ManualPackage[] }>({});
  const [ungroupedPackages, setUngroupedPackages] = useState<ManualPackage[]>([]);
  const [isLoadingPackages, setIsLoadingPackages] = useState(false);
  const [packageError, setPackageError] = useState<string | null>(null);
  
  // Template state managed by reducer (replaces scattered useState)
  const [templateState, dispatchTemplate] = useReducer(templateReducer, initialTemplateState);
  
  // Individual template selection state
  const [selectedTemplates, setSelectedTemplates] = useState<ManualTemplate[]>([]);
  const [availablePhotos, setAvailablePhotos] = useState<Photo[]>([]);

  // Database-first template replacement (eliminates race conditions)
  const handleTemplateReplace = useCallback((packageId: string, packageName: string, templateIndex: number, newTemplate: ManualTemplate) => {
    console.log('🔄 SESSION-BASED TEMPLATE REPLACEMENT:', {
      packageId,
      packageName,
      templateIndex,
      newTemplateId: newTemplate.id,
      newTemplateName: newTemplate.name
    });
    
    // Clear any previous errors
    dispatchTemplate({ type: 'SET_ERROR', error: null });

    try {
      console.log('💾 Storing template replacement in session (no database modification)');
      
      // Store replacement in session overrides (does not modify database)
      dispatchTemplate({
        type: 'REPLACE_TEMPLATE_IN_SESSION',
        packageId,
        templateIndex,
        newTemplate
      });
      
      console.log('✅ Template replacement stored in session successfully');
      console.log('📝 Admin-configured base package remains unchanged in database');
    } catch (error) {
      console.error('❌ Template replacement failed:', error);
      
      dispatchTemplate({ 
        type: 'SET_ERROR', 
        error: `Failed to change template: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    }
  }, []);

  // Add template to session (does not modify database)
  const handleTemplateAdd = useCallback((packageId: string, newTemplate: ManualTemplate) => {
    console.log('➕ Adding template to session:', {
      packageId,
      newTemplateId: newTemplate.id,
      newTemplateName: newTemplate.name
    });

    try {
      console.log('💾 Storing template addition in session (no database modification)');
      
      // Add template to session overrides (does not modify database)
      dispatchTemplate({
        type: 'ADD_TEMPLATE_TO_SESSION',
        packageId,
        template: newTemplate
      });
      
      console.log('✅ Template added to session successfully');
      console.log('📝 Admin-configured base package remains unchanged in database');
    } catch (error) {
      console.error('❌ Failed to add template to session:', error);
      dispatchTemplate({ 
        type: 'SET_ERROR', 
        error: `Failed to add template: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    }
  }, []);
  
  // Delete template from session (only for additions)
  const handleTemplateDelete = useCallback((packageId: string, templateIndex: number) => {
    console.log('🗑️ Deleting template from session:', {
      packageId,
      templateIndex
    });
    
    try {
      // Delete template from session overrides
      dispatchTemplate({
        type: 'DELETE_TEMPLATE_FROM_SESSION',
        packageId,
        templateIndex
      });
      
      console.log('✅ Template deleted from session successfully');
    } catch (error) {
      console.error('❌ Failed to delete template from session:', error);
      dispatchTemplate({ 
        type: 'SET_ERROR', 
        error: `Failed to delete template: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    }
  }, []);

  // Utility function to transform Google Drive URLs to direct image URLs
  const transformGoogleDriveUrl = (url: string): string => {
    if (!url) return url;
    
    // Check if it's a Google Drive share URL
    const driveMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (driveMatch) {
      const fileId = driveMatch[1];
      return `https://lh3.googleusercontent.com/d/${fileId}`;
    }
    
    return url;
  };

  // Get thumbnail URL for package
  const getPackageThumbnailUrl = (pkg: ManualPackage): string | null => {
    if (!pkg.thumbnail_url) return null;
    return transformGoogleDriveUrl(pkg.thumbnail_url);
  };

  // Package Icon Component
  const PackageIcon = ({ pkg, size = "w-16 h-16", isUngrouped = false }: { 
    pkg: ManualPackage; 
    size?: string; 
    isUngrouped?: boolean; 
  }) => {
    const thumbnailUrl = getPackageThumbnailUrl(pkg);
    const [imageError, setImageError] = useState(false);

    if (thumbnailUrl && !imageError) {
      return (
        <div className={`${size} rounded-full overflow-hidden border-2 border-white shadow-sm mr-4 flex-shrink-0`}>
          <img
            src={thumbnailUrl}
            alt={`${pkg.name} thumbnail`}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        </div>
      );
    }

    // Fallback to icon
    const iconColors = isUngrouped 
      ? "from-gray-400 to-gray-600" 
      : "from-blue-400 to-blue-600";

    return (
      <div className={`${size} bg-gradient-to-br ${iconColors} rounded-full flex items-center justify-center mr-4 flex-shrink-0`}>
        <span className="text-white font-bold">📦</span>
      </div>
    );
  };

  // Load dynamic packages from manual package service
  const loadPackages = async () => {
    setIsLoadingPackages(true);
    setPackageError(null);
    try {
      // Load groups and packages separately
      const allGroups = await packageGroupService.getActiveGroups();
      const allPackages = await manualPackageService.getActivePackages();
      
      setGroups(allGroups);
      
      // Organize packages by group
      const grouped: { [groupId: string]: ManualPackage[] } = {};
      const ungrouped: ManualPackage[] = [];

      allPackages.forEach(pkg => {
        if (pkg.group_id) {
          if (!grouped[pkg.group_id]) {
            grouped[pkg.group_id] = [];
          }
          grouped[pkg.group_id].push(pkg);
        } else {
          ungrouped.push(pkg);
        }
      });

      // Sort packages within each group by sort_order
      Object.keys(grouped).forEach(groupId => {
        grouped[groupId].sort((a, b) => a.sort_order - b.sort_order);
      });
      
      ungrouped.sort((a, b) => a.sort_order - b.sort_order);

      setGroupedPackages(grouped);
      setUngroupedPackages(ungrouped);
      
      console.log('✅ Loaded', allPackages.length, 'packages from manual package service');
    } catch (error: any) {
      console.error('❌ Error loading packages:', error);
      setPackageError(error.message || 'Failed to load packages');
      // Fallback to empty arrays
      setGroups([]);
      setGroupedPackages({});
      setUngroupedPackages([]);
    } finally {
      setIsLoadingPackages(false);
    }
  };

  // Load photos from selected folder for template auto-fill
  const loadAvailablePhotos = async (folder: DriveFolder) => {
    try {
      console.log(`📸 Loading photos from folder for template auto-fill: ${folder.name}`);
      const photos = await googleDriveService.getPhotosFromFolder(folder.id);
      console.log(`📸 Loaded ${photos.length} photos for template auto-fill`);
      
      // Use more photos for better variety in template auto-fill (limit to 50 for performance)
      const photosForTemplates = photos.slice(0, 50);
      setAvailablePhotos(photosForTemplates);
      
      console.log(`📸 Using ${photosForTemplates.length} photos for template preview auto-fill`);
    } catch (error) {
      console.error('❌ Error loading photos for template auto-fill:', error);
      setAvailablePhotos([]); // Fallback to empty array
    }
  };

  // Handle individual template selection
  const handleTemplateSelect = (template: ManualTemplate) => {
    console.log('🎯 Individual template selected:', template.name);
    
    // Add to selected templates if not already selected
    setSelectedTemplates(prev => {
      const isAlreadySelected = prev.some(t => t.id === template.id);
      if (isAlreadySelected) {
        return prev.filter(t => t.id !== template.id); // Remove if already selected
      } else {
        return [...prev, template]; // Add to selection
      }
    });
  };

  // Load templates for the selected package with debugging
  const loadPackageTemplates = async (packageId: string, packageName: string) => {
    console.log('📋 Loading base templates for package:', {
      packageId,
      packageName,
      packageIdType: typeof packageId
    });
    
    // Check if we already have base templates for this package
    if (templateState.basePackageTemplates[packageId]) {
      console.log('📋 Using cached base templates for package:', packageId);
      dispatchTemplate({ type: 'SET_EXPANDED_PACKAGE', packageId });
      return;
    }
    
    dispatchTemplate({ type: 'SET_LOADING', packageId });
    dispatchTemplate({ type: 'SET_ERROR', error: null });
    
    try {
      console.log('🔄 Loading base templates from database (admin-configured, read-only)...');
      const packageWithTemplates = await manualPackageService.getPackageWithTemplates(packageId);
      
      console.log('📦 Base templates loaded:', {
        response: packageWithTemplates,
        hasResponse: !!packageWithTemplates,
        templates: packageWithTemplates?.templates,
        templatesCount: packageWithTemplates?.templates?.length || 0,
        templatesArray: Array.isArray(packageWithTemplates?.templates)
      });
      
      if (packageWithTemplates && packageWithTemplates.templates) {
        console.log('✅ Base templates found:', packageWithTemplates.templates.length);
        console.log('📋 Base template details:', packageWithTemplates.templates.map(t => ({
          id: t.id,
          name: t.name,
          type: t.template_type,
          printSize: t.print_size,
          hasHoles: !!t.holes_data,
          holesCount: t.holes_data?.length || 0
        })));
        
        // Store base templates (admin-configured, read-only)
        dispatchTemplate({
          type: 'SET_BASE_TEMPLATES',
          packageId,
          templates: packageWithTemplates.templates || []
        });
        dispatchTemplate({ type: 'SET_EXPANDED_PACKAGE', packageId });
        
        console.log('📝 Base templates preserved - client changes will be session-only');
      } else {
        console.log('⚠️ No base templates found or invalid response structure');
        // Store empty array for this package so we don't keep trying to load
        dispatchTemplate({
          type: 'SET_BASE_TEMPLATES',
          packageId,
          templates: []
        });
        dispatchTemplate({ type: 'SET_EXPANDED_PACKAGE', packageId });
      }
    } catch (error: any) {
      console.error('❌ Error loading base templates:', {
        error,
        message: error.message,
        stack: error.stack,
        packageId,
        packageName
      });
      dispatchTemplate({ type: 'SET_ERROR', error: error.message || 'Failed to load templates' });
      // Store empty array on error so we don't keep retrying
      dispatchTemplate({
        type: 'SET_BASE_TEMPLATES',
        packageId,
        templates: []
      });
      dispatchTemplate({ type: 'SET_EXPANDED_PACKAGE', packageId });
    } finally {
      dispatchTemplate({ type: 'SET_LOADING', packageId: null });
    }
  };

  // Load packages when component mounts or when showing package selection
  useEffect(() => {
    if (showPackageSelection) {
      setSelectedPackage(null); // Reset selected package when entering package selection
      dispatchTemplate({ type: 'SET_EXPANDED_PACKAGE', packageId: null }); // Reset expanded package
      dispatchTemplate({ type: 'CLEAR_ALL_TEMPLATES' }); // Clear cached templates
      loadPackages();
    }
  }, [showPackageSelection]);

  const handleFolderSelect = (folder: DriveFolder) => {
    setSelectedFolder(folder);
    handleClientFolderSelect(folder); // Still call the original handler for data loading
    loadAvailablePhotos(folder); // Load photos for sample generation
    setShowPackageSelection(true); // Show package selection step
  };

  const handleBackToFolders = () => {
    setShowPackageSelection(false);
    setSelectedFolder(null);
    setSelectedPackage(null);
    dispatchTemplate({ type: 'SET_EXPANDED_PACKAGE', packageId: null });
    dispatchTemplate({ type: 'CLEAR_ALL_TEMPLATES' });
  };

  const handlePackageContinue = () => {
    if (selectedFolder && selectedPackage) {
      // Get the effective templates (base + session overrides) to pass to photo screen
      const baseTemplates = templateState.basePackageTemplates[selectedPackage.id.toString()] || [];
      const sessionOverrides = templateState.sessionOverrides[selectedPackage.id.toString()];
      const effectiveTemplates = getEffectiveTemplates(baseTemplates, sessionOverrides);
      
      console.log('📋 Passing effective templates to photo screen:', {
        baseTemplatesCount: baseTemplates.length,
        sessionReplacements: Object.keys(sessionOverrides?.replacements || {}).length,
        sessionAdditions: sessionOverrides?.additions?.length || 0,
        effectiveTemplatesCount: effectiveTemplates.length,
        effectiveTemplates: effectiveTemplates.map(t => ({ id: t.id, name: t.name }))
      });
      
      handleContinue(effectiveTemplates); // Pass effective templates to photo screen
    }
  };

  const handleChangePackage = () => {
    setSelectedPackage(null);
    dispatchTemplate({ type: 'SET_EXPANDED_PACKAGE', packageId: null });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* DEV-DEBUG-OVERLAY: Screen identifier - REMOVE BEFORE PRODUCTION */}
      <div className="fixed bottom-2 left-2 z-50 bg-red-600 text-white px-2 py-1 text-xs font-mono rounded shadow-lg pointer-events-none">
        FolderSelectionScreen.tsx
      </div>
      <HeaderNavigation
        googleAuth={googleAuth}
        mainSessionsFolder={mainSessionsFolder}
        onSignOut={onSignOut}
        onChangeMainFolder={onChangeMainFolder}
        showMainFolder={true}
        onManageTemplates={onManageTemplates}
        onManagePackages={onManagePackages}
      />
      
      <div className="p-4">
        <div className="max-w-4xl mx-auto">
          
          {/* Step 1: Folder Selection */}
          {!showPackageSelection && (
            <>
              <div className="text-center mb-8">
                <h1 className="text-4xl font-bold text-gray-800 mb-2">
                  Select Client Folder
                </h1>
                <p className="text-gray-600 text-lg">
                  Choose the client's photo session folder
                </p>
                <div className="mt-2 text-sm text-blue-600">
                  Main folder: {selectedMainFolder?.name}
                </div>
                
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="space-y-3 max-h-[70vh] overflow-y-auto">
                  {clientFolders
                    .sort((a, b) => new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime())
                    .map((folder) => (
                    <FolderCard 
                      key={folder.id}
                      folder={folder}
                      onSelect={() => handleFolderSelect(folder)}
                    />
                  ))}
                </div>

                {clientFolders.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No client folders found in this directory
                  </div>
                )}
              </div>
            </>
          )}

          {/* Step 2: Package Selection */}
          {showPackageSelection && (
            <>
              <div className="text-center mb-8">
                <h1 className="text-4xl font-bold text-gray-800 mb-2">
                  Select Package
                </h1>
                <p className="text-gray-600 text-lg">
                  Choose your photo package for <span className="font-semibold text-blue-600">{selectedFolder?.name}</span>
                </p>
                
                <button
                  onClick={handleBackToFolders}
                  className="mt-4 text-blue-600 hover:text-blue-800 text-sm underline"
                >
                  ← Change Client Folder
                </button>
              </div>

              {/* Loading State */}
              {isLoadingPackages && (
                <div className="text-center py-12">
                  <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-gray-600">Loading packages...</p>
                </div>
              )}

              {/* Error State */}
              {packageError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6 text-center">
                  <p className="text-red-600 font-medium mb-2">Failed to load packages</p>
                  <p className="text-red-500 text-sm mb-4">{packageError}</p>
                  <button
                    onClick={loadPackages}
                    className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Grouped Packages Display */}
              {!isLoadingPackages && !packageError && (
                <>
                  {(groups.length > 0 || ungroupedPackages.length > 0) ? (
                    <div className="space-y-8">
                      {/* Display Groups */}
                      {groups.map((group) => (
                        <div key={group.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                          {/* Group Header */}
                          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-800">{group.name}</h3>
                            {group.description && (
                              <p className="text-sm text-gray-600 mt-1">{group.description}</p>
                            )}
                            <div className="text-xs text-gray-500 mt-1">
                              {groupedPackages[group.id]?.length || 0} package{(groupedPackages[group.id]?.length || 0) === 1 ? '' : 's'}
                            </div>
                          </div>

                          {/* Packages in Group */}
                          <div className="p-4">
                            {groupedPackages[group.id]?.length > 0 ? (
                              <div className="space-y-3">
                                {groupedPackages[group.id].map((pkg) => (
                                  <div key={pkg.id} className="space-y-0">
                                    <div
                                      onClick={() => {
                                        const packageData = {
                                          id: pkg.id,
                                          name: pkg.name,
                                          templateCount: pkg.template_count || 1,
                                          price: pkg.price || 0,
                                          description: pkg.description || `${pkg.template_count || 1} template${(pkg.template_count || 1) === 1 ? '' : 's'}`
                                        };
                                        
                                        // If this package is already expanded, collapse it
                                        if (templateState.expandedPackageId === pkg.id.toString()) {
                                          dispatchTemplate({ type: 'SET_EXPANDED_PACKAGE', packageId: null });
                                          setSelectedPackage(null);
                                        } else {
                                          // Expand this package and load templates
                                          setSelectedPackage(packageData);
                                          loadPackageTemplates(pkg.id.toString(), pkg.name);
                                        }
                                      }}
                                      className={`flex items-center p-4 rounded-lg cursor-pointer transition-all duration-200 border ${
                                        selectedPackage?.id === pkg.id
                                          ? 'ring-2 ring-blue-500 bg-blue-50 border-blue-200'
                                          : 'hover:bg-gray-50 border-gray-200 bg-white'
                                      }`}
                                    >
                                      {/* Package Icon */}
                                      <PackageIcon pkg={pkg} />
                                      
                                      {/* Package Info */}
                                      <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                          <div>
                                            <h4 className="text-lg font-bold text-gray-800">{pkg.name}</h4>
                                            <p className="text-sm text-gray-600 mt-1">
                                              {pkg.description || `${pkg.template_count} template${pkg.template_count === 1 ? '' : 's'}`}
                                            </p>
                                          </div>
                                          
                                          {/* Package Details */}
                                          <div className="text-right flex-shrink-0 ml-4">
                                            {pkg.price && (
                                              <div className="text-xl font-bold text-green-600">
                                                ₱{pkg.price.toLocaleString()}
                                              </div>
                                            )}
                                            <div className="text-sm text-blue-600 font-medium">
                                              {pkg.template_count} Print{pkg.template_count > 1 ? 's' : ''}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                              {pkg.is_unlimited_photos ? 'Unlimited photos' : `${pkg.photo_limit} photos`}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                      
                                      {/* Continue Arrow - only show when selected */}
                                      {selectedPackage?.id === pkg.id && (
                                        <div className="ml-3 flex items-center text-blue-500 text-xl font-medium">
                                          ⟩
                                        </div>
                                      )}
                                    </div>

                                    {/* Template Preview - Show directly below this package when expanded */}
                                    <AnimatedTemplateReveal show={templateState.expandedPackageId === pkg.id.toString()}>
                                      {templateState.expandedPackageId === pkg.id.toString() && (
                                        <PackageTemplatePreview
                                          templates={getEffectiveTemplates(
                                            templateState.basePackageTemplates[pkg.id.toString()] || [],
                                            templateState.sessionOverrides[pkg.id.toString()]
                                          )}
                                          packageName={pkg.name}
                                          packageId={pkg.id.toString()}
                                          onContinue={handlePackageContinue}
                                          onChangePackage={handleChangePackage}
                                          onTemplateSelect={handleTemplateSelect}
                                          availablePhotos={availablePhotos}
                                          loading={templateState.loadingPackageId === pkg.id.toString()}
                                          onTemplateReplace={(packageId, templateIndex, newTemplate) => 
                                            handleTemplateReplace(packageId, pkg.name, templateIndex, newTemplate)
                                          }
                                          onTemplateAdd={(newTemplate) => 
                                            handleTemplateAdd(pkg.id.toString(), newTemplate)
                                          }
                                          onTemplateDelete={(templateIndex) =>
                                            handleTemplateDelete(pkg.id.toString(), templateIndex)
                                          }
                                        />
                                      )}
                                    </AnimatedTemplateReveal>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-8 text-gray-500">
                                <div className="text-4xl mb-2">📦</div>
                                <p className="text-sm">No packages in this group</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}

                      {/* Ungrouped Packages */}
                      {ungroupedPackages.length > 0 && (
                        <div className="bg-white rounded-lg border border-dashed border-gray-300 overflow-hidden">
                          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-600">Other Packages</h3>
                            <p className="text-sm text-gray-500 mt-1">Additional package options</p>
                            <div className="text-xs text-gray-500 mt-1">
                              {ungroupedPackages.length} package{ungroupedPackages.length === 1 ? '' : 's'}
                            </div>
                          </div>
                          
                          <div className="p-4">
                            <div className="space-y-3">
                              {ungroupedPackages.map((pkg) => (
                                <div key={pkg.id} className="space-y-0">
                                  <div
                                    onClick={() => {
                                      const packageData = {
                                        id: pkg.id,
                                        name: pkg.name,
                                        templateCount: pkg.template_count || 1,
                                        price: pkg.price || 0,
                                        description: pkg.description || `${pkg.template_count || 1} template${(pkg.template_count || 1) === 1 ? '' : 's'}`
                                      };
                                      
                                      // If this package is already expanded, collapse it
                                      if (templateState.expandedPackageId === pkg.id.toString()) {
                                        dispatchTemplate({ type: 'SET_EXPANDED_PACKAGE', packageId: null });
                                        setSelectedPackage(null);
                                      } else {
                                        // Expand this package and load templates
                                        setSelectedPackage(packageData);
                                        loadPackageTemplates(pkg.id.toString(), pkg.name);
                                      }
                                    }}
                                    className={`flex items-center p-4 rounded-lg cursor-pointer transition-all duration-200 border ${
                                      selectedPackage?.id === pkg.id
                                        ? 'ring-2 ring-blue-500 bg-blue-50 border-blue-200'
                                        : 'hover:bg-gray-50 border-gray-200 bg-white'
                                    }`}
                                  >
                                    {/* Package Icon */}
                                    <PackageIcon pkg={pkg} isUngrouped={true} />
                                    
                                    {/* Package Info */}
                                    <div className="flex-1">
                                      <div className="flex items-center justify-between">
                                        <div>
                                          <h4 className="text-lg font-bold text-gray-800">{pkg.name}</h4>
                                          <p className="text-sm text-gray-600 mt-1">
                                            {pkg.description || `${pkg.template_count} template${pkg.template_count === 1 ? '' : 's'}`}
                                          </p>
                                        </div>
                                        
                                        {/* Package Details */}
                                        <div className="text-right flex-shrink-0 ml-4">
                                          {pkg.price && (
                                            <div className="text-xl font-bold text-green-600">
                                              ₱{pkg.price.toLocaleString()}
                                            </div>
                                          )}
                                          <div className="text-sm text-blue-600 font-medium">
                                            {pkg.template_count} Print{pkg.template_count > 1 ? 's' : ''}
                                          </div>
                                          <div className="text-xs text-gray-500">
                                            {pkg.is_unlimited_photos ? 'Unlimited photos' : `${pkg.photo_limit} photos`}
                                          </div>
                                        </div>
                                      </div>
                                      
                                      {/* Continue Arrow - only show when selected */}
                                      {selectedPackage?.id === pkg.id && (
                                        <div className="ml-3 flex items-center text-blue-500 text-xl font-medium">
                                          ⟩
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Template Preview - Show directly below this package when expanded */}
                                  <AnimatedTemplateReveal show={templateState.expandedPackageId === pkg.id.toString()}>
                                    {templateState.expandedPackageId === pkg.id.toString() && (
                                      <PackageTemplatePreview
                                        templates={getEffectiveTemplates(
                                          templateState.basePackageTemplates[pkg.id.toString()] || [],
                                          templateState.sessionOverrides[pkg.id.toString()]
                                        )}
                                        packageName={pkg.name}
                                        packageId={pkg.id.toString()}
                                        onContinue={handlePackageContinue}
                                        onChangePackage={handleChangePackage}
                                        onTemplateSelect={handleTemplateSelect}
                                        availablePhotos={availablePhotos}
                                        loading={templateState.loadingPackageId === pkg.id.toString()}
                                        onTemplateReplace={(packageId, templateIndex, newTemplate) => 
                                          handleTemplateReplace(packageId, pkg.name, templateIndex, newTemplate)
                                        }
                                        onTemplateAdd={(newTemplate) => 
                                          handleTemplateAdd(pkg.id.toString(), newTemplate)
                                        }
                                        onTemplateDelete={(templateIndex) =>
                                          handleTemplateDelete(pkg.id.toString(), templateIndex)
                                        }
                                      />
                                    )}
                                  </AnimatedTemplateReveal>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="text-gray-400 text-4xl mb-4">📦</div>
                      <p className="text-gray-600 font-medium mb-2">No packages found</p>
                      <p className="text-gray-500 text-sm mb-4">Create packages in the Package Manager to get started</p>
                      {onManagePackages && (
                        <button
                          onClick={onManagePackages}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                        >
                          Manage Packages
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}

            </>
          )}
        </div>
      </div>
    </div>
  );
} 