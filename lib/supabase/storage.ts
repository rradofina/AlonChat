import { createClient } from '@/lib/supabase/client'

export async function uploadImage(
  file: File,
  agentId: string,
  folder: string = 'qa'
): Promise<{ url: string; path: string } | null> {
  try {
    const supabase = createClient()

    // Generate unique filename
    const timestamp = Date.now()
    const fileExt = file.name.split('.').pop()
    const fileName = `${timestamp}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`
    const filePath = `${agentId}/${folder}/${fileName}`


    // Upload to Supabase storage
    const { data, error } = await supabase.storage
      .from('agent-sources')
      .upload(filePath, file, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('Upload error:', error)
      return null
    }


    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('agent-sources')
      .getPublicUrl(filePath)


    return {
      url: publicUrl,
      path: filePath
    }
  } catch (error) {
    console.error('Error uploading image:', error)
    return null
  }
}

export async function uploadMultipleImages(
  files: File[],
  agentId: string,
  folder: string = 'qa'
): Promise<{ url: string; path: string }[]> {
  const uploadPromises = files.map(file => uploadImage(file, agentId, folder))
  const results = await Promise.all(uploadPromises)
  return results.filter(result => result !== null) as { url: string; path: string }[]
}

export async function deleteImage(filePath: string): Promise<boolean> {
  try {
    const supabase = createClient()

    const { error } = await supabase.storage
      .from('agent-sources')
      .remove([filePath])

    if (error) {
      console.error('Delete error:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error deleting image:', error)
    return false
  }
}

export async function deleteMultipleImages(filePaths: string[]): Promise<boolean> {
  try {
    const supabase = createClient()

    const { error } = await supabase.storage
      .from('agent-sources')
      .remove(filePaths)

    if (error) {
      console.error('Delete error:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error deleting images:', error)
    return false
  }
}

export function isValidImageType(file: File): boolean {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
  return validTypes.includes(file.type)
}

export function getImageSizeInMB(file: File): number {
  return file.size / (1024 * 1024)
}

export function validateImageSize(file: File, maxSizeMB: number = 5): boolean {
  return getImageSizeInMB(file) <= maxSizeMB
}