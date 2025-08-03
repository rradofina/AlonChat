import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TemplateSlot, Photo, PhotoTransform, createPhotoTransform, createSmartPhotoTransformFromSlot, isPhotoTransform } from '../types';
import PhotoRenderer from './PhotoRenderer';
import { photoCacheService } from '../services/photoCacheService';
import { getHighResPhotoUrls } from '../utils/photoUrlUtils';

interface InlinePhotoEditorProps {
  slot: TemplateSlot;
  photo: Photo;
  photos: Photo[];
  onApply: (slotId: string, photoId: string, transform: PhotoTransform) => void;
  onCancel: () => void;
  className?: string;
}

export default function InlinePhotoEditor({
  slot,
  photo,
  photos,
  onApply,
  onCancel,
  className = ''
}: InlinePhotoEditorProps) {
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(null);
  const [currentTransform, setCurrentTransform] = useState<PhotoTransform>(() => {
    // Initial transform - will be updated by useEffect with proper async smart scaling
    return createPhotoTransform(1, 0.5, 0.5);
  });
  const [photoKey, setPhotoKey] = useState<string>('');
  const [componentKey, setComponentKey] = useState<string>('');
  
  // Ref to access PhotoRenderer's finalization method (unused but kept for PhotoRenderer compatibility)
  const finalizationRef = useRef<(() => Promise<PhotoTransform>) | null>(null);
  
  // Track interaction state for UI hiding
  const [isUserInteracting, setIsUserInteracting] = useState(false);
  
  // Safety: Reset interaction state when component mounts
  useEffect(() => {
    setIsUserInteracting(false);
  }, []);
  
  // Handle interaction change from PhotoRenderer
  const handleInteractionChange = (isInteracting: boolean) => {
    setIsUserInteracting(isInteracting);
  };

  // Initialize transform when slot or photo changes
  useEffect(() => {
    console.log('🔧 InlinePhotoEditor - Transform initialization:', {
      slotId: slot?.id,
      hasExistingTransform: !!slot?.transform,
      existingTransform: slot?.transform,
      photoId: photo?.id,
      hasOnApply: !!onApply,
      hasOnCancel: !!onCancel
    });
    
    // Force re-render with new keys to clear any cached state and ensure fresh component
    const timestamp = Date.now();
    setPhotoKey(`inline-${slot?.id}-${photo?.id}-${timestamp}`);
    setComponentKey(`component-${slot?.id}-${photo?.id}-${timestamp}`);
    
    // If the slot already has a transform and we're re-editing the same photo, use it
    if (slot?.transform && isPhotoTransform(slot.transform) && slot.photoId === photo?.id) {
      console.log('✅ InlinePhotoEditor - Using existing transform for same photo');
      setCurrentTransform(slot.transform);
    } else {
      console.log('🔄 InlinePhotoEditor - Using smart transform for new photo with slot data');
      if (photo && slot) {
        createSmartPhotoTransformFromSlot(photo, slot)
          .then(transform => setCurrentTransform(transform))
          .catch(error => {
            console.error('❌ InlinePhotoEditor - Smart scaling failed, using fallback:', error);
            setCurrentTransform(createPhotoTransform(1, 0.5, 0.5));
          });
      } else {
        setCurrentTransform(createPhotoTransform(1, 0.5, 0.5));
      }
    }
    
    // Validate that we have the required props
    if (!onApply || !onCancel) {
      console.error('🚨 InlinePhotoEditor - Missing required handlers:', {
        hasOnApply: !!onApply,
        hasOnCancel: !!onCancel
      });
    }
  }, [slot?.id, photo?.id, slot?.transform, slot?.photoId, onApply, onCancel]);

  // Load photo URL with instant display and cache optimization
  useEffect(() => {
    if (photo) {
      // Set immediate URL for instant display
      const immediateUrl = photoCacheService.getImmediateUrl(photo);
      setSelectedPhotoUrl(immediateUrl);
      
      console.log('🚀 InlinePhotoEditor - Instant display with immediate URL for', photo.name);
      
      // Load high-quality blob in background and update when ready
      const loadOptimalPhoto = async () => {
        try {
          console.log('🔄 InlinePhotoEditor - Loading optimal blob...');
          const blobUrl = await photoCacheService.getBlobUrl(photo);
          
          // Only update if this is still the current photo
          if (photo) {
            setSelectedPhotoUrl(blobUrl);
            console.log('✅ InlinePhotoEditor - Upgraded to optimal blob URL for', photo.name);
          }
        } catch (error) {
          console.error('❌ InlinePhotoEditor - Failed to load optimal photo:', error);
          // Keep the immediate URL that's already displayed
        }
      };
      
      // Start loading optimal version (don't await to avoid blocking)
      loadOptimalPhoto();
    } else {
      setSelectedPhotoUrl(null);
    }
  }, [photo?.id]);

  // Handle transform changes from PhotoRenderer
  const handleTransformChange = (newTransform: PhotoTransform) => {
    setCurrentTransform(newTransform);
    console.log('🔧 InlinePhotoEditor - Transform updated:', newTransform);
  };

  // Smart reset callback for intelligent photo repositioning
  const handleSmartReset = useCallback(async (): Promise<PhotoTransform> => {
    console.log('🎯 InlinePhotoEditor - Smart reset requested');
    if (!photo || !slot) {
      console.warn('⚠️ Smart reset failed: missing photo or slot data');
      return createPhotoTransform(1, 0.5, 0.5);
    }
    
    try {
      const smartTransform = await createSmartPhotoTransformFromSlot(photo, slot);
      console.log('✅ InlinePhotoEditor - Smart reset successful:', smartTransform);
      return smartTransform;
    } catch (error) {
      console.error('❌ InlinePhotoEditor - Smart reset failed:', error);
      return createPhotoTransform(1, 0.5, 0.5);
    }
  }, [photo, slot]);

  // Handle apply button click
  const handleApply = () => {
    console.log('🔧 InlinePhotoEditor - APPLY BUTTON CLICKED');
    
    try {
      if (!slot?.id || !photo?.id) {
        console.error('🚨 InlinePhotoEditor - Missing required IDs:', { slotId: slot?.id, photoId: photo?.id });
        return;
      }

      if (!onApply) {
        console.error('🚨 InlinePhotoEditor - onApply handler is missing!');
        return;
      }

      // Call finalization method to apply auto-snap gap detection
      console.log('🔧 InlinePhotoEditor - Calling finalization method for auto-snap...');
      
      if (finalizationRef.current) {
        console.log('✅ InlinePhotoEditor - Finalization ref available, calling...');
        finalizationRef.current()
          .then(finalTransform => {
            console.log('🔧 InlinePhotoEditor - Finalization complete, applying transform:', {
              transform: finalTransform,
              photoId: photo.id,
              slotId: slot.id,
              hasOnApplyHandler: !!onApply
            });
            
            onApply(slot.id, photo.id, finalTransform);
            console.log('✅ InlinePhotoEditor - onApply called successfully with finalized transform');
          })
          .catch(error => {
            console.error('❌ InlinePhotoEditor - Finalization failed:', error);
            // Fallback to current transform
            onApply(slot.id, photo.id, currentTransform);
            console.log('⚠️ InlinePhotoEditor - Used fallback transform due to finalization error');
          });
      } else {
        console.error('❌ InlinePhotoEditor - No finalization ref available, using current transform');
        onApply(slot.id, photo.id, currentTransform);
        console.log('⚠️ InlinePhotoEditor - Used current transform without finalization');
      }
    } catch (error) {
      console.error('🚨 InlinePhotoEditor - Error in handleApply:', error);
      // Fallback to smart transform if we have valid IDs
      if (slot?.id && photo?.id && onApply) {
        console.log('🔄 InlinePhotoEditor - Trying fallback with smart transform and slot data');
        createSmartPhotoTransformFromSlot(photo, slot)
          .then(fallbackTransform => {
            onApply(slot.id, photo.id, fallbackTransform);
          })
          .catch(fallbackError => {
            console.error('❌ InlinePhotoEditor - Fallback smart scaling also failed:', fallbackError);
            onApply(slot.id, photo.id, createPhotoTransform(1, 0.5, 0.5));
          });
      }
    }
  };

  // Handle cancel button click
  const handleCancel = () => {
    console.log('🔧 InlinePhotoEditor - CANCEL BUTTON CLICKED');
    
    if (!onCancel) {
      console.error('🚨 InlinePhotoEditor - onCancel handler is missing!');
      return;
    }

    console.log('🔧 InlinePhotoEditor - Calling onCancel handler');
    onCancel();
    console.log('✅ InlinePhotoEditor - onCancel called successfully');
  };

  if (!selectedPhotoUrl) {
    return (
      <div className={`w-full h-full bg-gray-200 border border-gray-300 border-dashed flex items-center justify-center ${className}`}>
        <span className="text-gray-500 text-xs">Loading...</span>
      </div>
    );
  }

  // Fallback: Reset interaction state when clicking outside photo
  const handleContainerClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setIsUserInteracting(false);
    }
  };

  return (
    <div 
      key={componentKey} 
      className={`relative w-full h-full z-50 ${className}`}
      onClick={handleContainerClick}
    >
      {/* Interactive PhotoRenderer */}
      <PhotoRenderer
        key={photoKey}
        photoUrl={selectedPhotoUrl}
        photoAlt={photo?.name || 'Selected photo'}
        transform={currentTransform}
        interactive={true}
        onTransformChange={handleTransformChange}
        className="w-full h-full"
        debug={true}  // Enable debug UI to test gap detection fix
        fallbackUrls={photo ? getHighResPhotoUrls(photo) : []}
        showClippingIndicators={true} // Enable clipping indicators
        finalizationRef={finalizationRef} // Pass ref for finalization method access
        onInteractionChange={handleInteractionChange} // Track interaction state
        onSmartReset={handleSmartReset} // Smart reset for intelligent photo repositioning
      />
      
      {/* Editing Controls Overlay - Hidden during interaction */}
      <div className={`absolute top-2 right-2 flex space-x-2 z-50 transition-opacity duration-75 ${
        isUserInteracting ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}>
        <button
          onClick={handleApply}
          className="bg-green-600 text-white px-3 py-1 rounded-md text-sm font-medium hover:bg-green-700 shadow-lg"
          title="Apply photo"
        >
          ✓
        </button>
        <button
          onClick={handleCancel}
          className="bg-red-600 text-white px-3 py-1 rounded-md text-sm font-medium hover:bg-red-700 shadow-lg"
          title="Cancel"
        >
          ✕
        </button>
      </div>
      
      {/* Instructions - Hidden during interaction */}
      <div className={`absolute bottom-2 left-2 right-2 bg-black bg-opacity-70 text-white px-3 py-2 rounded-md text-xs text-center z-50 transition-opacity duration-75 ${
        isUserInteracting ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}>
        Pinch to zoom • Drag to position
      </div>
    </div>
  );
}