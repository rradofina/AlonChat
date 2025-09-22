'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Globe, FileText, MessageSquare, Upload, Link2, X } from 'lucide-react'
import { toast } from 'sonner'

interface AddSourceModalProps {
  agentId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

type SourceType = 'website' | 'file' | 'fb_export'

export function AddSourceModal({ agentId, open, onOpenChange }: AddSourceModalProps) {
  const [sourceType, setSourceType] = useState<SourceType | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Form states
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [crawlDepth, setCrawlDepth] = useState(1)
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null)
  const [fbExportFile, setFbExportFile] = useState<File | null>(null)

  const handleWebsiteSubmit = async () => {
    if (!websiteUrl) {
      toast.error('Please enter a website URL')
      return
    }

    setIsLoading(true)
    try {
      const { error } = await supabase
        .from('sources')
        .insert({
          agent_id: agentId,
          type: 'website',
          name: new URL(websiteUrl).hostname,
          config: {
            url: websiteUrl,
            crawl_depth: crawlDepth,
          },
          status: 'pending',
        })

      if (error) throw error

      toast.success('Website added successfully. Crawling will begin shortly.')
      onOpenChange(false)
      router.refresh()
    } catch (error) {
      console.error('Error adding website:', error)
      toast.error('Failed to add website')
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileSubmit = async () => {
    if (!selectedFiles || selectedFiles.length === 0) {
      toast.error('Please select files to upload')
      return
    }

    setIsLoading(true)
    try {
      // In a real implementation, you would upload files to storage first
      // For now, we'll just create source records
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i]
        const { error } = await supabase
          .from('sources')
          .insert({
            agent_id: agentId,
            type: 'file',
            name: file.name,
            config: {
              file_name: file.name,
              file_size: file.size,
              file_type: file.type,
            },
            status: 'pending',
          })

        if (error) throw error
      }

      toast.success(`${selectedFiles.length} file(s) added successfully`)
      onOpenChange(false)
      router.refresh()
    } catch (error) {
      console.error('Error adding files:', error)
      toast.error('Failed to add files')
    } finally {
      setIsLoading(false)
    }
  }

  const handleFbExportSubmit = async () => {
    if (!fbExportFile) {
      toast.error('Please select a Facebook export file')
      return
    }

    setIsLoading(true)
    try {
      const { error } = await supabase
        .from('sources')
        .insert({
          agent_id: agentId,
          type: 'fb_export',
          name: 'Facebook Messages Export',
          config: {
            file_name: fbExportFile.name,
            file_size: fbExportFile.size,
          },
          status: 'pending',
        })

      if (error) throw error

      toast.success('Facebook export added successfully. Processing will begin shortly.')
      onOpenChange(false)
      router.refresh()
    } catch (error) {
      console.error('Error adding FB export:', error)
      toast.error('Failed to add Facebook export')
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setSourceType(null)
    setWebsiteUrl('')
    setCrawlDepth(1)
    setSelectedFiles(null)
    setFbExportFile(null)
  }

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) resetForm()
      onOpenChange(open)
    }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Knowledge Source</DialogTitle>
        </DialogHeader>

        {!sourceType ? (
          <div className="grid grid-cols-3 gap-4 py-4">
            <button
              onClick={() => setSourceType('website')}
              className="p-6 border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all text-center"
            >
              <Globe className="h-8 w-8 mx-auto mb-3 text-blue-600" />
              <h3 className="font-semibold mb-1">Website</h3>
              <p className="text-sm text-gray-600">Crawl and index website content</p>
            </button>

            <button
              onClick={() => setSourceType('file')}
              className="p-6 border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all text-center"
            >
              <FileText className="h-8 w-8 mx-auto mb-3 text-green-600" />
              <h3 className="font-semibold mb-1">Files</h3>
              <p className="text-sm text-gray-600">Upload PDF, DOC, TXT files</p>
            </button>

            <button
              onClick={() => setSourceType('fb_export')}
              className="p-6 border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all text-center"
            >
              <MessageSquare className="h-8 w-8 mx-auto mb-3 text-purple-600" />
              <h3 className="font-semibold mb-1">FB Export</h3>
              <p className="text-sm text-gray-600">Import Facebook messages</p>
            </button>
          </div>
        ) : (
          <div className="py-4">
            <button
              onClick={() => setSourceType(null)}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
            >
              ← Back to source types
            </button>

            {sourceType === 'website' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Website URL</label>
                  <div className="flex items-center gap-2">
                    <Link2 className="h-5 w-5 text-gray-400" />
                    <input
                      type="url"
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      placeholder="https://example.com"
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Crawl Depth
                    <span className="text-gray-500 font-normal ml-2">(How many levels deep to crawl)</span>
                  </label>
                  <select
                    value={crawlDepth}
                    onChange={(e) => setCrawlDepth(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={1}>1 level (main page only)</option>
                    <option value={2}>2 levels</option>
                    <option value={3}>3 levels</option>
                    <option value={5}>5 levels (deep crawl)</option>
                  </select>
                </div>

                <button
                  onClick={handleWebsiteSubmit}
                  disabled={isLoading || !websiteUrl}
                  className="w-full px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-900 disabled:opacity-50"
                >
                  {isLoading ? 'Adding Website...' : 'Add Website'}
                </button>
              </div>
            )}

            {sourceType === 'file' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Select Files</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <Upload className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.txt,.md"
                      onChange={(e) => setSelectedFiles(e.target.files)}
                      className="hidden"
                      id="file-upload"
                    />
                    <label
                      htmlFor="file-upload"
                      className="cursor-pointer text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Click to upload
                    </label>
                    <p className="text-sm text-gray-500 mt-1">or drag and drop</p>
                    <p className="text-xs text-gray-400 mt-2">PDF, DOC, TXT up to 10MB each</p>
                  </div>

                  {selectedFiles && selectedFiles.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {Array.from(selectedFiles).map((file, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm">
                          <FileText className="h-4 w-4 text-gray-400" />
                          <span>{file.name}</span>
                          <span className="text-gray-500">({(file.size / 1024).toFixed(1)} KB)</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={handleFileSubmit}
                  disabled={isLoading || !selectedFiles || selectedFiles.length === 0}
                  className="w-full px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-900 disabled:opacity-50"
                >
                  {isLoading ? 'Uploading Files...' : `Upload ${selectedFiles?.length || 0} File(s)`}
                </button>
              </div>
            )}

            {sourceType === 'fb_export' && (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">How to export Facebook messages:</h4>
                  <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                    <li>Go to Facebook Settings & Privacy → Settings</li>
                    <li>Click "Your Facebook Information"</li>
                    <li>Select "Download Your Information"</li>
                    <li>Choose "Messages" and select JSON format</li>
                    <li>Download and upload the ZIP file here</li>
                  </ol>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Upload Facebook Export</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                    <input
                      type="file"
                      accept=".zip,.json"
                      onChange={(e) => setFbExportFile(e.target.files?.[0] || null)}
                      className="hidden"
                      id="fb-upload"
                    />
                    <label
                      htmlFor="fb-upload"
                      className="cursor-pointer text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Choose Facebook export file
                    </label>
                    <p className="text-xs text-gray-400 mt-2">ZIP or JSON file from Facebook</p>
                  </div>

                  {fbExportFile && (
                    <div className="mt-3 flex items-center gap-2 text-sm">
                      <MessageSquare className="h-4 w-4 text-purple-600" />
                      <span>{fbExportFile.name}</span>
                      <span className="text-gray-500">({(fbExportFile.size / (1024 * 1024)).toFixed(1)} MB)</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleFbExportSubmit}
                  disabled={isLoading || !fbExportFile}
                  className="w-full px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-900 disabled:opacity-50"
                >
                  {isLoading ? 'Processing Export...' : 'Process Facebook Export'}
                </button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}