'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FlaskConical, ArrowLeft, Loader2 } from 'lucide-react';
import { adminAPI } from '@/lib/admin-api';

const FEATURES = [
  { value: 'exchange', label: 'Exchange System', desc: 'Test custody exchanges, GPS check-in, QR codes' },
  { value: 'messaging', label: 'Messaging', desc: 'Test parent messaging, ARIA interventions' },
  { value: 'agreement', label: 'Agreements', desc: 'Test SharedCare Agreement builder, approval flow' },
  { value: 'custody_tracking', label: 'Custody Tracking', desc: 'Test calendar, custody day records, MyTime' },
  { value: 'clearfund', label: 'ClearFund', desc: 'Test expense tracking, obligations, payments' },
  { value: 'professional', label: 'Professional Portal', desc: 'Seed a firm + attorney and send a case to them to test the pro portal' },
  { value: 'general', label: 'General / Full Test', desc: 'Create complete families + a firm/attorney with a case sent to them' },
];

export default function NewBugHuntPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetFeature, setTargetFeature] = useState('general');
  const [familyCount, setFamilyCount] = useState(3);
  const [testInstructions, setTestInstructions] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setCreating(true);
      setError(null);
      const cohort = await adminAPI.createBugHunt({
        name: name.trim(),
        description: description.trim() || undefined,
        target_feature: targetFeature,
        family_count: familyCount,
        test_instructions: testInstructions.trim() || undefined,
      });
      router.push(`/superadmin/bug-hunts/${cohort.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/superadmin/bug-hunts')}
          className="p-2 rounded-lg hover:bg-[#2D6A8F]/20 transition-colors text-[#8AACBC]"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <FlaskConical className="w-7 h-7 text-[#3DAA8A]" />
            New Bug Hunt
          </h1>
          <p className="text-sm text-[#6B8A9A] mt-1">Set up a new organized testing session</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-[#D0E4EC] mb-1.5">Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g., Exchange System Verification Q1"
            className="w-full px-3 py-2 bg-[#1E3A4A] border border-[#2D6A8F]/30 rounded-lg text-white placeholder-[#4A6E7F] focus:outline-none focus:border-[#3DAA8A]/50 text-sm"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-[#D0E4EC] mb-1.5">Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="What are we testing and why?"
            rows={2}
            className="w-full px-3 py-2 bg-[#1E3A4A] border border-[#2D6A8F]/30 rounded-lg text-white placeholder-[#4A6E7F] focus:outline-none focus:border-[#3DAA8A]/50 text-sm resize-none"
          />
        </div>

        {/* Target Feature */}
        <div>
          <label className="block text-sm font-medium text-[#D0E4EC] mb-1.5">Target Feature</label>
          <div className="grid grid-cols-2 gap-2">
            {FEATURES.map(f => (
              <button
                type="button"
                key={f.value}
                onClick={() => setTargetFeature(f.value)}
                className={`text-left p-3 rounded-lg border transition-all ${
                  targetFeature === f.value
                    ? 'bg-[#3DAA8A]/10 border-[#3DAA8A]/40 text-white'
                    : 'bg-[#1E3A4A]/50 border-[#2D6A8F]/20 text-[#8AACBC] hover:border-[#2D6A8F]/40'
                }`}
              >
                <div className="text-sm font-medium">{f.label}</div>
                <div className="text-xs text-[#6B8A9A] mt-0.5">{f.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Family Count */}
        <div>
          <label className="block text-sm font-medium text-[#D0E4EC] mb-1.5">
            Number of Test Families
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={1}
              max={20}
              value={familyCount}
              onChange={e => setFamilyCount(Number(e.target.value))}
              className="flex-1 accent-[#3DAA8A]"
            />
            <span className="text-white font-mono text-lg w-8 text-center">{familyCount}</span>
          </div>
          <p className="text-xs text-[#6B8A9A] mt-1">
            Each family gets 2 parent accounts + 1-2 children with test credentials
          </p>
          <div className="mt-2 p-2.5 bg-[#2D6A8F]/10 border border-[#2D6A8F]/20 rounded-lg">
            <p className="text-xs text-[#8AACBC]">
              Families auto-rotate through agreement types and subscription tiers:
            </p>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400">Good Faith</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400">Co-operative</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-400">Comprehensive</span>
              <span className="text-[10px] text-[#6B8A9A] self-center mx-1">&times;</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-600/30 text-zinc-400">Web Starter</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400">Plus</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-400">Complete</span>
            </div>
          </div>
        </div>

        {/* Test Instructions */}
        <div>
          <label className="block text-sm font-medium text-[#D0E4EC] mb-1.5">
            Test Instructions <span className="text-[#6B8A9A] font-normal">(optional)</span>
          </label>
          <textarea
            value={testInstructions}
            onChange={e => setTestInstructions(e.target.value)}
            placeholder="Step-by-step instructions for testers..."
            rows={4}
            className="w-full px-3 py-2 bg-[#1E3A4A] border border-[#2D6A8F]/30 rounded-lg text-white placeholder-[#4A6E7F] focus:outline-none focus:border-[#3DAA8A]/50 text-sm resize-none font-mono"
          />
        </div>

        {/* Submit */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={creating || !name.trim()}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#3DAA8A] text-white rounded-lg hover:bg-[#3DAA8A]/80 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <FlaskConical className="w-4 h-4" />
                Create Bug Hunt
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => router.push('/superadmin/bug-hunts')}
            className="px-4 py-2.5 text-[#8AACBC] hover:text-white transition-colors text-sm"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
