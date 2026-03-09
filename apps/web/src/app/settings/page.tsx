export default function SettingsPage() {
  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold text-white">Settings</h2>
      <div className="max-w-2xl space-y-8">
        <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h3 className="mb-4 text-lg font-semibold text-white">General</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400">Property Name</label>
              <input
                type="text"
                defaultValue=""
                placeholder="Lake Tahoe Guest House"
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400">
                Asset Storage Path
              </label>
              <input
                type="text"
                defaultValue=""
                placeholder="/data/assets"
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400">
                Default Export Path
              </label>
              <input
                type="text"
                defaultValue=""
                placeholder="/media/tunarr/guest-pages"
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
