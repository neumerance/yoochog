<template>
  <div class="max-w-7xl mx-auto px-4 py-6 space-y-4">
    <div>
      <h1 class="text-xl font-semibold text-slate-900">Player</h1>
      <p class="text-sm text-slate-500 mt-1">
        Two-column playlist layout preview — placeholders only (no video, queue sync, or sign-in).
      </p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 lg:min-h-[70vh]">
      <section
        class="lg:col-span-8 rounded-lg border border-slate-200 bg-white shadow-sm min-h-[40vh] flex items-center justify-center p-6"
      >
        <div class="text-center text-slate-500 max-w-lg">
          <p class="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Primary area</p>
          <p class="text-lg font-medium text-slate-800">Video player placeholder</p>
          <p class="text-sm mt-2 text-slate-600">
            The main viewing experience will live here. This region is intentionally empty — no iframe or embed.
          </p>
        </div>
      </section>

      <aside
        class="lg:col-span-4 flex flex-col min-h-[50vh] lg:min-h-0 rounded-lg border border-slate-200 bg-slate-50 overflow-hidden"
      >
        <div class="flex-1 p-4 text-sm text-slate-500 border-b border-dashed border-slate-200 min-h-[6rem]">
          <p>Reserved for future side panels (metadata, notes, etc.).</p>
        </div>
        <div class="mt-auto p-4 bg-white border-t border-slate-200 space-y-3">
          <h2 class="text-xs font-semibold uppercase tracking-wide text-slate-500">Queue</h2>
          <ul class="list-disc list-inside space-y-1.5 text-sm text-slate-700">
            <li>Example: Building a desk — woodworking intro</li>
            <li>Example: Jazz lo-fi set (placeholder title)</li>
            <li>Example: City drone tour — night lights</li>
          </ul>
          <p class="text-sm text-slate-600 pt-2 border-t border-slate-100">
            <span class="font-medium text-slate-800">User:</span> Avery (placeholder)
          </p>
        </div>
      </aside>
    </div>
  </div>
</template>
