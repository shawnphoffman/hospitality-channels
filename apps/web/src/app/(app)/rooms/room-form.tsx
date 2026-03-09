"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface RoomData {
  id?: string;
  name: string;
  slug: string;
  notes: string;
}

interface RoomFormProps {
  room?: RoomData;
  mode: "create" | "edit";
}

export function RoomForm({ room, mode }: RoomFormProps) {
  const router = useRouter();

  const [name, setName] = useState(room?.name ?? "");
  const [slug, setSlug] = useState(room?.slug ?? "");
  const [notes, setNotes] = useState(room?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleNameChange = useCallback((val: string) => {
    setName(val);
    if (mode === "create") {
      setSlug(
        val
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "")
      );
    }
  }, [mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const url = mode === "edit" ? `/api/rooms/${room!.id}` : "/api/rooms";
      const method = mode === "edit" ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          notes: notes || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.error || `Failed to ${mode === "edit" ? "update" : "create"} room (${res.status})`
        );
      }

      if (mode === "create") {
        router.push("/rooms");
        router.refresh();
      } else {
        setSuccessMsg("Room updated successfully");
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!room?.id) return;
    if (!confirm("Are you sure you want to delete this room?")) return;

    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/rooms/${room.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete room");
      router.push("/rooms");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-8">
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

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">Room Details</h3>
        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm text-slate-400">
              Name <span className="text-red-400">*</span>
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Mountain View Suite"
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
              placeholder="auto-generated from name"
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="notes" className="block text-sm text-slate-400">
              Notes
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Optional notes about this room..."
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>
      </section>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
          >
            {saving
              ? mode === "edit"
                ? "Saving..."
                : "Creating..."
              : mode === "edit"
                ? "Save Changes"
                : "Create Room"}
          </button>
          <Link
            href="/rooms"
            className="text-sm text-slate-400 hover:text-slate-300"
          >
            {mode === "edit" ? "Back to Rooms" : "Cancel"}
          </Link>
        </div>
        {mode === "edit" && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={saving}
            className="rounded-lg border border-red-800 px-4 py-3 text-sm font-medium text-red-400 transition-colors hover:bg-red-950 hover:text-red-300 disabled:opacity-50"
          >
            Delete Room
          </button>
        )}
      </div>
    </form>
  );
}
