import { useEffect, useMemo, useState } from 'react';
import GlassCard from '../components/ui/GlassCard.jsx';
import OrbitSpinner from '../components/ui/OrbitSpinner.jsx';
import MoodPicker from '../components/journal/MoodPicker.jsx';
import { useJournalStore, moodMeta } from '../store/useJournalStore.js';
import { useReflectionPrompt } from '../hooks/useAI.js';
import { todayKey, shortLabel } from '../utils/dateHelpers.js';

export default function Journal() {
  const entries = useJournalStore((s) => s.entries);
  const moods = useJournalStore((s) => s.moods);
  const loaded = useJournalStore((s) => s.loaded);
  const loading = useJournalStore((s) => s.loading);
  const error = useJournalStore((s) => s.error);
  const load = useJournalStore((s) => s.load);
  const addEntry = useJournalStore((s) => s.addEntry);
  const deleteEntry = useJournalStore((s) => s.deleteEntry);
  const setMood = useJournalStore((s) => s.setMood);

  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (!loaded) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, load]);

  const today = todayKey();
  const todayMood = useMemo(
    () => moods.find((m) => m.date === today)?.mood || null,
    [moods, today]
  );

  const reflection = useReflectionPrompt({ recentMood: todayMood });

  // Latest-first
  const sortedEntries = useMemo(
    () => [...entries].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    [entries]
  );

  const save = async () => {
    if (!draft.trim()) return;
    await addEntry(draft);
    setDraft('');
  };

  return (
    <div>
      <div>
        <h1 className="font-display text-3xl tracking-wide text-glow sm:text-4xl">
          Journal
        </h1>
        <p className="mt-1 text-slate-400">
          Mood + reflection. The cheapest mental health intervention is consistency.
        </p>
      </div>

      {/* Mood check-in */}
      <GlassCard hover={false} className="mt-6">
        <div className="text-xs uppercase tracking-[0.25em] text-slate-400">
          How are you today?
        </div>
        <div className="mt-4">
          <MoodPicker
            value={todayMood}
            onChange={(m) => setMood(m)}
            size="lg"
          />
        </div>
      </GlassCard>

      {/* AI reflection prompt */}
      <GlassCard hover={false} className="mt-4 border-nebula-cyan/30">
        <div className="flex items-start gap-3">
          <span className="font-display text-xl text-nebula-cyan">✺</span>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-[0.3em] text-slate-400">
              Today's Prompt
            </div>
            <div className="mt-1 text-sm text-slate-200">
              {reflection.loading
                ? 'Generating…'
                : reflection.data ||
                  reflection.error ||
                  'What is one small thing you can do today that future-you will thank you for?'}
            </div>
          </div>
          {reflection.available && (
            <button
              onClick={() => reflection.run({ recentMood: todayMood })}
              disabled={reflection.loading}
              className="shrink-0 rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-[10px] uppercase tracking-widest text-slate-400 hover:text-nebula-cyan disabled:opacity-50"
            >
              ↻
            </button>
          )}
        </div>
      </GlassCard>

      {/* Editor */}
      <GlassCard hover={false} className="mt-4">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Write whatever's in your head…"
          rows={5}
          className="w-full resize-none rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-nebula-cyan/60"
        />
        <div className="mt-3 flex items-center justify-between">
          <div className="text-xs text-slate-500">{draft.length} chars</div>
          <button
            onClick={save}
            disabled={!draft.trim()}
            className="rounded-xl border border-nebula-violet/60 bg-nebula-violet/20 px-5 py-2 text-xs uppercase tracking-[0.25em] text-white shadow-glow disabled:opacity-50 hover:bg-nebula-violet/30"
          >
            Save entry
          </button>
        </div>
      </GlassCard>

      {/* Loading / error */}
      {loading && !loaded && (
        <div className="mt-12 flex justify-center">
          <OrbitSpinner size={56} />
        </div>
      )}
      {error && (
        <GlassCard hover={false} className="mt-6 border-nebula-red/40">
          <div className="text-sm text-nebula-red">
            <strong>Sync error:</strong> {error}
          </div>
          <button
            onClick={load}
            className="mt-3 rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-xs text-slate-300 hover:text-white"
          >
            Retry
          </button>
        </GlassCard>
      )}

      {/* Timeline */}
      {loaded && sortedEntries.length > 0 && (
        <div className="mt-8">
          <h2 className="font-display text-sm uppercase tracking-[0.3em] text-slate-400">
            Timeline
          </h2>
          <div className="mt-3 space-y-3">
            {sortedEntries.map((e) => {
              const mood = moods.find((m) => m.date === e.date);
              const m = mood ? moodMeta(mood.mood) : null;
              return (
                <GlassCard key={e.id} hover={false} className="!p-4">
                  <div className="flex items-start gap-3">
                    {m ? (
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg"
                        style={{
                          background: `${m.color}22`,
                          border: `1px solid ${m.color}55`,
                        }}
                        title={m.label}
                      >
                        {m.emoji}
                      </span>
                    ) : (
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/30 text-slate-500">
                        ·
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500">
                          {shortLabel(e.date)}
                        </div>
                        <button
                          onClick={() => {
                            if (confirm('Delete this entry?')) deleteEntry(e.id);
                          }}
                          className="text-[10px] uppercase tracking-widest text-slate-500 hover:text-nebula-red"
                        >
                          Delete
                        </button>
                      </div>
                      <div className="mt-1 whitespace-pre-wrap text-sm text-slate-200">
                        {e.body}
                      </div>
                    </div>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
