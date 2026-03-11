"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface TemplateField {
  key: string;
  label: string;
  type: string;
  default: unknown;
  required?: boolean;
}

interface PageData {
  id: string;
  title: string;
  slug: string;
  templateId: string;
  roomId: string | null;
  dataJson: Record<string, string>;
  defaultDurationSec: number;
  status: string;
}

interface EditPageFormProps {
  page: PageData;
  templateName: string;
  templateSlug: string;
  fields: TemplateField[];
  rooms: Array<{ id: string; name: string }>;
}

export function EditPageForm({
  page,
  templateName,
  templateSlug,
  fields,
  rooms,
}: EditPageFormProps) {
  const router = useRouter();

  const [title, setTitle] = useState(page.title);
  const [slug, setSlug] = useState(page.slug);
  const [roomId, setRoomId] = useState(page.roomId ?? "");
  const [status, setStatus] = useState(page.status);
  const [durationSec, setDurationSec] = useState(page.defaultDurationSec);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>(
    page.dataJson
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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
    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/pages/${page.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          slug: slug || title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          roomId: roomId || null,
          dataJson: fieldValues,
          defaultDurationSec: durationSec,
          status,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to update page (${res.status})`);
      }

      setSuccessMsg("Page updated successfully");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this page?")) return;

    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/pages/${page.id}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error("Failed to delete page");
      }
      router.push("/pages");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-8">
      {error && (
        <div className="rounded-lg border border-red-800 bg-red-950 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="rounded-lg border border-green-800 bg-green-950 px-4 py-3 text-sm text-green-300">
          {successMsg}
        </div>
      )}

      {/* Template (read-only) */}
      <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h3 className="mb-3 text-lg font-semibold text-white">Template</h3>
        <div className="flex items-center gap-3">
          <span className="rounded-md bg-slate-800 px-3 py-1.5 text-sm font-medium text-white">
            {templateName}
          </span>
          <span className="text-xs text-slate-500">{templateSlug}</span>
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
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>
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
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="status" className="block text-sm text-slate-400">
                Status
              </label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="duration"
                className="block text-sm text-slate-400"
              >
                Duration (seconds)
              </label>
              <input
                id="duration"
                type="number"
                min={1}
                max={300}
                value={durationSec}
                onChange={(e) =>
                  setDurationSec(parseInt(e.target.value, 10) || 30)
                }
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Template Content Fields */}
      {fields.length > 0 && (
        <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h3 className="mb-4 text-lg font-semibold text-white">
            {templateName} Content
          </h3>
          <div className="space-y-4">
            {fields.map((field) => {
              if (field.type === "asset") return null;
              return (
                <div key={field.key}>
                  <label
                    htmlFor={`field-${field.key}`}
                    className="block text-sm text-slate-400"
                  >
                    {field.label}
                    {field.required && (
                      <span className="text-red-400"> *</span>
                    )}
                  </label>
                  {field.type === "textarea" ? (
                    <textarea
                      id={`field-${field.key}`}
                      rows={4}
                      value={fieldValues[field.key] ?? ""}
                      onChange={(e) =>
                        handleFieldChange(field.key, e.target.value)
                      }
                      placeholder={
                        field.default != null ? String(field.default) : ""
                      }
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                    />
                  ) : (
                    <input
                      id={`field-${field.key}`}
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
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
          <Link
            href={`/pages/${page.id}/preview`}
            className="rounded-lg border border-slate-700 px-4 py-3 text-sm font-medium text-slate-300 transition-colors hover:border-slate-600 hover:text-white"
          >
            Preview
          </Link>
          <Link
            href="/pages"
            className="text-sm text-slate-400 hover:text-slate-300"
          >
            Back to Pages
          </Link>
        </div>
        <button
          type="button"
          onClick={handleDelete}
          disabled={saving}
          className="rounded-lg border border-red-800 px-4 py-3 text-sm font-medium text-red-400 transition-colors hover:bg-red-950 hover:text-red-300 disabled:opacity-50"
        >
          Delete Page
        </button>
      </div>
    </form>
  );
}
