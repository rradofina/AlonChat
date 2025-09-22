export default function UsagePage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Usage</h1>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Monthly Usage</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border rounded-lg p-4">
            <div className="text-sm text-gray-500 mb-1">Messages</div>
            <div className="text-2xl font-bold">0</div>
            <div className="text-xs text-gray-400">of 1,000</div>
          </div>

          <div className="border rounded-lg p-4">
            <div className="text-sm text-gray-500 mb-1">Agents</div>
            <div className="text-2xl font-bold">1</div>
            <div className="text-xs text-gray-400">of 5</div>
          </div>

          <div className="border rounded-lg p-4">
            <div className="text-sm text-gray-500 mb-1">Storage</div>
            <div className="text-2xl font-bold">0 MB</div>
            <div className="text-xs text-gray-400">of 100 MB</div>
          </div>
        </div>
      </div>
    </div>
  )
}