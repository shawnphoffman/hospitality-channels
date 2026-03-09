"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

interface TemplateField {
  key: string;
  label: string;
  type: string;
  default: unknown;
  required?: boolean;
}

interface TemplateOption {
  slug: string;
  name: string;
  description: string;
  category: string;
  id: string;
  fields: TemplateField[];
}

interface CreatePageFormProps {
  templates: TemplateOption[];
  rooms: Array<{ id: string; name: string; slug: string }>;
  guests: Array<{ id: string; name: string }>;
  preselectedTemplate: string | null;
}

export function CreatePageForm({
  templates,
  rooms,
  guests,
  preselectedTemplate,
}: CreatePageFormProps) {
  const router = useRouter();

  const [selectedSlug, setSelectedSlug] = useState(
    preselectedTemplate ?? templates[0]?.slug ?? ""
  );
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [roomId, setRoomId] = useState("");
  const [guestId, setGuestId] = useState("");
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedTemplate = templates.find((t) => t.slug === selectedSlug);

  const handleTemplateChange = useCallback(
    (slug: string) => {
      setSelectedSlug(slug);
      const tmpl = templates.find((t) => t.slug === slug);
      if (tmpl) {
        const defaults: Record<string, string> = {};
        for (const f of tmpl.fields) {
          defaults[f.key] =
            f.default != null ? String(f.default) : "";
        }
        setFieldValues(defaults);
      }
    },
    [templates]
  );

  const handleTitleChange = useCallback((val: string) => {
    setTitle(val);
    setSlug(
      val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
    );
  }, []);

  const handleFieldChange = useCallback((key: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate) return;
    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: selectedTemplate.id,
          slug: slug || title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          title,
          roomId: roomId || null,
          guestId: guestId || null,
          dataJson: fieldValues,
          defaultDurationSec: 30,
          status: "draft",
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to create page (${res.status})`);
      }

      router.push("/pages");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  // Initialize defaults on first render if a template is preselected
  if (
    selectedTemplate &&
    Object.keys(fieldValues).length === 0 &&
    selectedTemplate.fields.length > 0
  ) {
    const defaults: Record<string, string> = {};
    for (const f of selectedTemplate.fields) {
      defaults[f.key] = f.default != null ? String(f.default) : "";
    }
    // Use setTimeout to avoid setState during render
    setTimeout(() => setFieldValues(defaults), 0);
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-8">
      {error && (
        <div className="rounded-lg border border-red-800 bg-red-950 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Template Selection */}
      <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">Template</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {templates.map((t) => (
            <button
              key={t.slug}
              type="button"
              onClick={() => handleTemplateChange(t.slug)}
              className={`rounded-lg border p-4 text-left transition-colors ${
                selectedSlug === t.slug
                  ? "border-blue-500 bg-blue-950/50"
                  : "border-slate-700 bg-slate-800 hover:border-slate-600"
              }`}
            >
              <p className="font-medium text-white">{t.name}</p>
              <p className="mt-1 text-xs text-slate-400">{t.description}</p>
            </button>
          ))}
        </div>
      </section>

      {/* Page Info */}
      <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">Page Info</h3>
        <div className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm text-slate-400">
              Title <span className="text-red-400">*</span>
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="e.g. Welcome - Alex Johnson"
              required
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="slug" className="block text-sm text-slate-400">
              Slug
            </label>
            <input
              id="slug"
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="auto-generated from title"
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="room" className="block text-sm text-slate-400">
                Room
              </label>
              <select
                id="room"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="">None</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="guest" className="block text-sm text-slate-400">
                Guest
              </label>
              <select
                id="guest"
                value={guestId}
                onChange={(e) => setGuestId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="">None</option>
                {guests.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Template Content Fields */}
      {selectedTemplate && selectedTemplate.fields.length > 0 && (
        <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h3 className="mb-4 text-lg font-semibold text-white">
            {selectedTemplate.name} Content
          </h3>
          <div className="space-y-4">
            {selectedTemplate.fields.map((field) => {
              if (field.type === "asset") return null;
              return (
                <div key={field.key}>
                  <label
                    htmlFor={field.key}
                    className="block text-sm text-slate-400"
                  >
                    {field.label}
                    {field.required && (
                      <span className="text-red-400"> *</span>
                    )}
                  </label>
                  <input
                    id={field.key}
                    type="text"
                    value={fieldValues[field.key] ?? ""}
                    onChange={(e) =>
                      handleFieldChange(field.key, e.target.value)
                    }
                    placeholder={
                      field.default != null ? String(field.default) : ""
                    }
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Submit */}
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
        >
          {saving ? "Creating..." : "Create Page"}
        </button>
        <a
          href="/pages"
          className="text-sm text-slate-400 hover:text-slate-300"
        >
          Cancel
        </a>
      </div>
    </form>
  );
}
