"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { GUIDES, type GuideSlug } from "@/content/guide-index";
import { parseReadingList, READING_LIST_KEY, toggleReadingList } from "@/lib/reading-list";

const CHANGE_EVENT = "cosmic-reading-list-change";
function subscribe(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === READING_LIST_KEY || event.key === null) onChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}
function snapshot(): string | null {
  try { return window.localStorage.getItem(READING_LIST_KEY); } catch { return null; }
}
function serverSnapshot() { return null; }
function useReadingList() {
  return parseReadingList(useSyncExternalStore(subscribe, snapshot, serverSnapshot));
}

export function SaveGuideButton({ slug }: { slug: GuideSlug }) {
  const saved = useReadingList();
  const isSaved = saved.includes(slug);
  const [error, setError] = useState<string | null>(null);
  function toggle() {
    try {
      // Read again to preserve changes made in another tab since the last render.
      const next = toggleReadingList(parseReadingList(window.localStorage.getItem(READING_LIST_KEY)), slug);
      window.localStorage.setItem(READING_LIST_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event(CHANGE_EVENT));
      setError(null);
    } catch {
      setError("Your browser could not save this guide. Bookmark this page to return to it.");
    }
  }
  const Icon = isSaved ? BookmarkCheck : Bookmark;
  return (
    <div className="mt-5">
      <button type="button" onClick={toggle} aria-pressed={isSaved} data-guide-event={isSaved ? "guide_remove" : "guide_save"} data-guide-slug={slug} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-primary/40 px-4 py-2 text-sm text-primary hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
        <Icon className="h-4 w-4" aria-hidden="true" />{isSaved ? "Saved to reading list" : "Save for later"}
      </button>
      <p className="mt-2 text-xs leading-6 text-muted-foreground">Saved only in this browser. Find your list in <Link href="/learn#reading-list" className="underline underline-offset-4">Field guides</Link>.</p>
      {error ? <p role="status" className="mt-2 text-sm text-muted-foreground">{error}</p> : null}
    </div>
  );
}

export function ReadingList() {
  const saved = useReadingList();
  const guides = GUIDES.filter((guide) => saved.includes(guide.slug));
  return (
    <section id="reading-list" aria-labelledby="reading-list-title" className="mb-8 scroll-mt-24 rounded-lg border border-border p-5 sm:p-6">
      <h2 id="reading-list-title" className="font-display text-lg">Your reading list</h2>
      {guides.length ? (
        <ul className="mt-3 space-y-3">{guides.map((guide) => <li key={guide.slug}><Link href={`/learn/${guide.slug}`} className="text-sm leading-7 text-primary underline underline-offset-4">{guide.title}</Link></li>)}</ul>
      ) : <p className="mt-3 text-sm leading-7 text-muted-foreground">Use Save for later on a guide to keep it here. No account needed. Your list stays in this browser until you remove the guides or clear site data.</p>}
    </section>
  );
}
