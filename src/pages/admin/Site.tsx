import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  Save, RotateCcw, ExternalLink, Plus, Trash2, ArrowUp, ArrowDown, Loader2,
  Home, CreditCard, BadgeCheck, Workflow, PanelsTopLeft, Building2,
  Braces, Download, Upload, CheckCircle2, AlertCircle, Eye, LayoutTemplate,
} from 'lucide-react';
import { useSiteContent } from '../../context/SiteContentContext';
import {
  cloneSiteContent, defaultSiteContent, mergeSiteContent,
  type Plan, type PortalKey, type SiteContent,
} from '../../content/siteDefaults';
import { ICON_KEYS, getIcon } from '../../content/icons';
import { portalBackground } from '../../utils/portal';

type Tab = 'home' | 'pricing' | 'companies' | 'process' | 'portals' | 'brand' | 'advanced';

const TABS: { id: Tab; label: string; icon: typeof Home }[] = [
  { id: 'home', label: 'Home page', icon: Home },
  { id: 'pricing', label: 'Pricing', icon: CreditCard },
  { id: 'companies', label: 'Verified companies', icon: BadgeCheck },
  { id: 'process', label: 'Process', icon: Workflow },
  { id: 'portals', label: 'Portal control', icon: PanelsTopLeft },
  { id: 'brand', label: 'Brand & contact', icon: Building2 },
  { id: 'advanced', label: 'Advanced JSON', icon: Braces },
];

export default function AdminSiteControl() {
  const { content, save, saving, error, savedAt, refresh } = useSiteContent();
  const [draft, setDraft] = useState<SiteContent>(() => cloneSiteContent(content));
  const [tab, setTab] = useState<Tab>('home');
  const [portalKey, setPortalKey] = useState<PortalKey>('lawyer');
  const [flash, setFlash] = useState('');
  const [jsonText, setJsonText] = useState('');
  const [jsonError, setJsonError] = useState('');

  useEffect(() => { setDraft(cloneSiteContent(content)); }, [content]);

  useEffect(() => {
    if (tab === 'advanced') {
      setJsonText(JSON.stringify(draft, null, 2));
      setJsonError('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(content), [draft, content]);

  function update(mutator: (next: SiteContent) => void) {
    setDraft((prev) => {
      const next = cloneSiteContent(prev);
      mutator(next);
      return next;
    });
  }

  async function handleSave() {
    setFlash('');
    const ok = await save(draft);
    setFlash(ok ? 'All changes published.' : '');
  }

  function resetDefaults() {
    if (!confirm('Reset every editable section back to the built-in defaults? You still need to click Save to publish.')) return;
    setDraft(cloneSiteContent(defaultSiteContent));
    setFlash('Defaults loaded into the editor. Click Save to publish.');
  }

  function applyJson() {
    try {
      const parsed = JSON.parse(jsonText);
      setDraft(mergeSiteContent(parsed));
      setJsonError('');
      setFlash('JSON applied to the editor. Click Save to publish.');
      setTab('home');
    } catch (err) {
      setJsonError(err instanceof Error ? err.message : 'Invalid JSON');
    }
  }

  function downloadJson() {
    const blob = new Blob([JSON.stringify(draft, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jinnah-site-content-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <LayoutTemplate className="text-emerald-600" /> Site Control
          </h1>
          <p className="text-slate-500">Change the public website, pricing, verified firms, and both portals — live.</p>
          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs">
            {dirty && <span className="px-2 py-1 rounded-lg bg-amber-50 text-amber-700 font-medium">Unsaved changes</span>}
            {savedAt && !dirty && <span className="text-slate-400">Last published {new Date(savedAt).toLocaleString()}</span>}
            {flash && <span className="text-emerald-600 font-medium flex items-center gap-1"><CheckCircle2 size={13} /> {flash}</span>}
            {error && <span className="text-red-600 font-medium flex items-center gap-1"><AlertCircle size={13} /> {error}</span>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/" target="_blank" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50">
            <ExternalLink size={16} /> View site
          </Link>
          <button onClick={() => void refresh()} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50">
            <RotateCcw size={16} /> Refresh
          </button>
          <button
            onClick={() => void handleSave()}
            disabled={saving || !dirty}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? 'Publishing…' : 'Save & publish'}
          </button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`inline-flex items-center gap-2 whitespace-nowrap px-3.5 py-2 rounded-xl text-sm font-medium transition ${
              tab === id ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      <div className="grid xl:grid-cols-[minmax(0,1fr)_350px] gap-6 items-start">
        <div className="space-y-6 min-w-0">
          {tab === 'home' && (
            <HomeEditor draft={draft} update={update} />
          )}
          {tab === 'pricing' && (
            <PricingEditor draft={draft} update={update} />
          )}
          {tab === 'companies' && (
            <CompaniesEditor draft={draft} update={update} />
          )}
          {tab === 'process' && (
            <ProcessEditor draft={draft} update={update} />
          )}
          {tab === 'portals' && (
            <PortalEditor draft={draft} update={update} portalKey={portalKey} setPortalKey={setPortalKey} />
          )}
          {tab === 'brand' && (
            <BrandEditor draft={draft} update={update} />
          )}
          {tab === 'advanced' && (
            <Panel
              title="Raw content JSON"
              desc="The whole site model in one place. Paste exported JSON, tweak any field, then apply and publish."
              actions={
                <div className="flex flex-wrap gap-2">
                  <SmallBtn onClick={applyJson}><Upload size={14} /> Apply JSON</SmallBtn>
                  <SmallBtn onClick={downloadJson}><Download size={14} /> Download</SmallBtn>
                  <SmallBtn onClick={() => { setJsonText(JSON.stringify(draft, null, 2)); setJsonError(''); }}>
                    <Braces size={14} /> Reload from editor
                  </SmallBtn>
                </div>
              }
            >
              {jsonError && <p className="mb-2 text-sm text-red-600">{jsonError}</p>}
              <textarea
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                spellCheck={false}
                rows={26}
                className="w-full rounded-xl border border-slate-200 bg-slate-950 text-emerald-200 font-mono text-xs p-4 outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={resetDefaults} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 text-red-700 text-sm font-semibold hover:bg-red-100">
                  <RotateCcw size={15} /> Reset everything to defaults
                </button>
              </div>
            </Panel>
          )}
        </div>

        <div className="xl:sticky xl:top-6 space-y-4">
          <PreviewCard tab={tab} draft={draft} portalKey={portalKey} />
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-500 leading-relaxed">
            <p className="font-semibold text-slate-700 mb-1 flex items-center gap-1"><Eye size={13} /> What this controls</p>
            <p>Public home page, animated verified-firm taglines, pricing and process steps, brand/contact details, and the sidebar, labels, order, banner, density and accent of the lawyer &amp; client portals.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------- Home --------------------------------- */

function HomeEditor({ draft, update }: EditorProps) {
  const h = draft.home;
  return (
    <>
      <Panel title="Hero section" desc="The first thing every visitor sees.">
        <Field label="Badge" value={h.badge} onChange={(v) => update((d) => { d.home.badge = v; })} />
        <Grid>
          <Field label="Headline (start)" value={h.heroTitle} onChange={(v) => update((d) => { d.home.heroTitle = v; })} />
          <Field label="Headline (highlighted)" value={h.heroHighlight} onChange={(v) => update((d) => { d.home.heroHighlight = v; })} />
        </Grid>
        <Area label="Subtitle" value={h.heroSubtitle} onChange={(v) => update((d) => { d.home.heroSubtitle = v; })} />
        <Grid>
          <Field label="Primary button label" value={h.primaryCta.label} onChange={(v) => update((d) => { d.home.primaryCta.label = v; })} />
          <Field label="Primary button link" value={h.primaryCta.to} onChange={(v) => update((d) => { d.home.primaryCta.to = v; })} />
          <Field label="Secondary button label" value={h.secondaryCta.label} onChange={(v) => update((d) => { d.home.secondaryCta.label = v; })} />
          <Field label="Secondary button link" value={h.secondaryCta.href} onChange={(v) => update((d) => { d.home.secondaryCta.href = v; })} />
        </Grid>
      </Panel>

      <Panel
        title="Headline stats"
        desc="Four short proof points under the hero buttons."
        actions={<SmallBtn onClick={() => update((d) => { d.home.stats.push({ value: 'New', label: 'Stat label' }); })}><Plus size={14} /> Add stat</SmallBtn>}
      >
        <div className="space-y-3">
          {h.stats.map((stat, i) => (
            <RowCard key={i} index={i} total={h.stats.length} onUp={() => move(h.stats, i, -1, update, (d) => d.home.stats)} onDown={() => move(h.stats, i, 1, update, (d) => d.home.stats)} onRemove={() => update((d) => { d.home.stats.splice(i, 1); })}>
              <Grid>
                <Field label="Value" value={stat.value} onChange={(v) => update((d) => { d.home.stats[i].value = v; })} />
                <Field label="Label" value={stat.label} onChange={(v) => update((d) => { d.home.stats[i].label = v; })} />
              </Grid>
            </RowCard>
          ))}
        </div>
      </Panel>

      <Panel title="Portal cards" desc="The three portal cards on the dark section.">
        <Grid>
          <Field label="Section heading" value={h.portalsTitle} onChange={(v) => update((d) => { d.home.portalsTitle = v; })} />
          <Field label="Section subtitle" value={h.portalsSubtitle} onChange={(v) => update((d) => { d.home.portalsSubtitle = v; })} />
        </Grid>
        <div className="space-y-3 mt-3">
          {h.portals.map((portal, i) => (
            <RowCard key={i} index={i} total={h.portals.length} onUp={() => move(h.portals, i, -1, update, (d) => d.home.portals)} onDown={() => move(h.portals, i, 1, update, (d) => d.home.portals)} onRemove={() => update((d) => { d.home.portals.splice(i, 1); })}>
              <Grid>
                <Field label="Title" value={portal.title} onChange={(v) => update((d) => { d.home.portals[i].title = v; })} />
                <IconSelect label="Icon" value={portal.icon} onChange={(v) => update((d) => { d.home.portals[i].icon = v; })} />
              </Grid>
              <Area label="Description" rows={2} value={portal.desc} onChange={(v) => update((d) => { d.home.portals[i].desc = v; })} />
              <Field label="Link" value={portal.link} onChange={(v) => update((d) => { d.home.portals[i].link = v; })} />
            </RowCard>
          ))}
          <SmallBtn onClick={() => update((d) => { d.home.portals.push({ title: 'New portal', desc: '', icon: 'Sparkles', link: '/register' }); })}><Plus size={14} /> Add portal card</SmallBtn>
        </div>
      </Panel>

      <Panel title="Feature grid" desc="The feature cards below the portals.">
        <Grid>
          <Field label="Section heading" value={h.featuresTitle} onChange={(v) => update((d) => { d.home.featuresTitle = v; })} />
          <Field label="Section subtitle" value={h.featuresSubtitle} onChange={(v) => update((d) => { d.home.featuresSubtitle = v; })} />
        </Grid>
        <div className="space-y-3 mt-3">
          {h.features.map((feature, i) => (
            <RowCard key={i} index={i} total={h.features.length} onUp={() => move(h.features, i, -1, update, (d) => d.home.features)} onDown={() => move(h.features, i, 1, update, (d) => d.home.features)} onRemove={() => update((d) => { d.home.features.splice(i, 1); })}>
              <Grid>
                <Field label="Title" value={feature.title} onChange={(v) => update((d) => { d.home.features[i].title = v; })} />
                <IconSelect label="Icon" value={feature.icon} onChange={(v) => update((d) => { d.home.features[i].icon = v; })} />
              </Grid>
              <Area label="Description" rows={2} value={feature.desc} onChange={(v) => update((d) => { d.home.features[i].desc = v; })} />
            </RowCard>
          ))}
          <SmallBtn onClick={() => update((d) => { d.home.features.push({ title: 'New feature', desc: '', icon: 'Sparkles' }); })}><Plus size={14} /> Add feature</SmallBtn>
        </div>
      </Panel>

      <Panel title="Closing call-to-action & footer" desc="The final conversion block and footer note.">
        <Grid>
          <Field label="CTA heading" value={h.ctaTitle} onChange={(v) => update((d) => { d.home.ctaTitle = v; })} />
          <Field label="CTA subtitle" value={h.ctaSubtitle} onChange={(v) => update((d) => { d.home.ctaSubtitle = v; })} />
          <Field label="Button label" value={h.ctaLabel} onChange={(v) => update((d) => { d.home.ctaLabel = v; })} />
          <Field label="Button link" value={h.ctaTo} onChange={(v) => update((d) => { d.home.ctaTo = v; })} />
        </Grid>
        <Field label="Footer note" value={h.footerNote} onChange={(v) => update((d) => { d.home.footerNote = v; })} />
      </Panel>
    </>
  );
}

/* --------------------------------- Pricing -------------------------------- */

function PricingEditor({ draft, update }: EditorProps) {
  const h = draft.home;
  return (
    <>
      <Panel title="Pricing section" desc="Headlines and the note under the plan cards.">
        <Field label="Section heading" value={h.pricingTitle} onChange={(v) => update((d) => { d.home.pricingTitle = v; })} />
        <Field label="Section subtitle" value={h.pricingSubtitle} onChange={(v) => update((d) => { d.home.pricingSubtitle = v; })} />
        <Field label="Footnote" value={h.pricingNote} onChange={(v) => update((d) => { d.home.pricingNote = v; })} />
      </Panel>

      <Panel
        title="Plans & prices"
        desc="These plans power the marketing page, registration plan picker, and admin subscription counts."
        actions={<SmallBtn onClick={() => update((d) => { d.home.plans.push(blankPlan()); })}><Plus size={14} /> Add plan</SmallBtn>}
      >
        <div className="space-y-3">
          {h.plans.map((plan, i) => (
            <RowCard key={i} index={i} total={h.plans.length} onUp={() => move(h.plans, i, -1, update, (d) => d.home.plans)} onDown={() => move(h.plans, i, 1, update, (d) => d.home.plans)} onRemove={() => update((d) => { d.home.plans.splice(i, 1); })}>
              <Grid>
                <Field label="Display name" value={plan.name} onChange={(v) => update((d) => { d.home.plans[i].name = v; })} />
                <Field label="Plan value (backend key)" value={plan.value} onChange={(v) => update((d) => { d.home.plans[i].value = v; })} hint="student, starter, pro, firm, free…" />
                <Field label="Price" value={plan.price} onChange={(v) => update((d) => { d.home.plans[i].price = v; })} />
                <Field label="Period" value={plan.period} onChange={(v) => update((d) => { d.home.plans[i].period = v; })} />
                <SelectField label="Audience" value={plan.audience} onChange={(v) => update((d) => { d.home.plans[i].audience = v as Plan['audience']; })} options={[
                  { value: 'lawyer', label: 'Lawyers & firms' },
                  { value: 'client', label: 'Clients' },
                  { value: 'both', label: 'Everyone' },
                ]} />
                <Field label="Button label" value={plan.ctaLabel} onChange={(v) => update((d) => { d.home.plans[i].ctaLabel = v; })} />
                <Field label="Button link" value={plan.ctaTo} onChange={(v) => update((d) => { d.home.plans[i].ctaTo = v; })} />
              </Grid>
              <Area
                label="Features (one per line)"
                rows={3}
                value={plan.features.join('\n')}
                onChange={(v) => update((d) => { d.home.plans[i].features = v.split('\n').map((x) => x.trim()).filter(Boolean); })}
              />
              <Toggle title="Highlight as most popular" checked={plan.popular} onChange={(v) => update((d) => { d.home.plans[i].popular = v; })} />
            </RowCard>
          ))}
        </div>
      </Panel>
    </>
  );
}

/* ------------------------------- Companies -------------------------------- */

function CompaniesEditor({ draft, update }: EditorProps) {
  const c = draft.home.companies;
  return (
    <>
      <Panel title="Animated verified-firm taglines" desc="A seamless marquee on the home page. Add only firms you have verified.">
        <Grid>
          <Toggle title="Show the marquee" desc="Turn the whole animated strip on or off." checked={c.enabled} onChange={(v) => update((d) => { d.home.companies.enabled = v; })} />
          <Toggle title="Pause on hover" desc="Let visitors read a tagline without chasing it." checked={c.pauseOnHover} onChange={(v) => update((d) => { d.home.companies.pauseOnHover = v; })} />
        </Grid>
        <Grid>
          <Field label="Section title" value={c.title} onChange={(v) => update((d) => { d.home.companies.title = v; })} />
          <Field label="Section subtitle" value={c.subtitle} onChange={(v) => update((d) => { d.home.companies.subtitle = v; })} />
          <Field label="Loop duration (seconds)" type="number" value={String(c.speed)} onChange={(v) => update((d) => { d.home.companies.speed = Math.max(8, Number(v) || 34); })} hint="Lower = faster. 20–45 feels right." />
        </Grid>
      </Panel>

      <Panel
        title="Verified companies"
        desc="Name, tagline, optional website, and badge."
        actions={<SmallBtn onClick={() => update((d) => { d.home.companies.companies.push({ name: 'New verified firm', tagline: 'Practice focus', url: '', badge: 'Verified' }); })}><Plus size={14} /> Add company</SmallBtn>}
      >
        <div className="space-y-3">
          {c.companies.map((company, i) => (
            <RowCard key={i} index={i} total={c.companies.length} onUp={() => move(c.companies, i, -1, update, (d) => d.home.companies.companies)} onDown={() => move(c.companies, i, 1, update, (d) => d.home.companies.companies)} onRemove={() => update((d) => { d.home.companies.companies.splice(i, 1); })}>
              <Grid>
                <Field label="Company / firm" value={company.name} onChange={(v) => update((d) => { d.home.companies.companies[i].name = v; })} />
                <Field label="Badge" value={company.badge} onChange={(v) => update((d) => { d.home.companies.companies[i].badge = v; })} />
              </Grid>
              <Field label="Tagline" value={company.tagline} onChange={(v) => update((d) => { d.home.companies.companies[i].tagline = v; })} />
              <Field label="Website (optional)" value={company.url} onChange={(v) => update((d) => { d.home.companies.companies[i].url = v; })} placeholder="https://…" />
            </RowCard>
          ))}
        </div>
      </Panel>
    </>
  );
}

/* -------------------------------- Process --------------------------------- */

function ProcessEditor({ draft, update }: EditorProps) {
  const h = draft.home;
  return (
    <Panel
      title="Process steps"
      desc="The numbered journey on the home page."
      actions={<SmallBtn onClick={() => update((d) => { d.home.process.push({ title: 'New step', desc: '' }); })}><Plus size={14} /> Add step</SmallBtn>}
    >
      <Grid>
        <Field label="Section heading" value={h.processTitle} onChange={(v) => update((d) => { d.home.processTitle = v; })} />
        <Field label="Section subtitle" value={h.processSubtitle} onChange={(v) => update((d) => { d.home.processSubtitle = v; })} />
      </Grid>
      <div className="space-y-3 mt-3">
        {h.process.map((step, i) => (
          <RowCard key={i} index={i} total={h.process.length} onUp={() => move(h.process, i, -1, update, (d) => d.home.process)} onDown={() => move(h.process, i, 1, update, (d) => d.home.process)} onRemove={() => update((d) => { d.home.process.splice(i, 1); })}>
            <Field label={`Step ${i + 1} title`} value={step.title} onChange={(v) => update((d) => { d.home.process[i].title = v; })} />
            <Area label="Description" rows={2} value={step.desc} onChange={(v) => update((d) => { d.home.process[i].desc = v; })} />
          </RowCard>
        ))}
      </div>
    </Panel>
  );
}

/* -------------------------------- Portals --------------------------------- */

function PortalEditor({ draft, update, portalKey, setPortalKey }: EditorProps & {
  portalKey: PortalKey;
  setPortalKey: (key: PortalKey) => void;
}) {
  const portal = draft.portals[portalKey];
  const defaults = defaultSiteContent.portals[portalKey];
  return (
    <>
      <div className="flex gap-2">
        {(['lawyer', 'client'] as PortalKey[]).map((key) => (
          <button
            key={key}
            onClick={() => setPortalKey(key)}
            className={`flex-1 rounded-2xl border px-4 py-3 text-left transition ${
              portalKey === key ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white hover:bg-slate-50'
            }`}
          >
            <p className="font-bold text-slate-900 capitalize">{key} portal</p>
            <p className="text-xs text-slate-500">{draft.portals[key].name}</p>
          </button>
        ))}
      </div>

      <Panel title={`${portalKey === 'lawyer' ? 'Lawyer' : 'Client'} portal identity`} desc="Name, accent, and layout density used by that portal's shell.">
        <Grid>
          <Field label="Portal name" value={portal.name} onChange={(v) => update((d) => { d.portals[portalKey].name = v; })} />
          <Field label="Subtitle / user-card caption" value={portal.subtitle} onChange={(v) => update((d) => { d.portals[portalKey].subtitle = v; })} />
          <ColorField label="Accent colour" value={portal.accent} onChange={(v) => update((d) => { d.portals[portalKey].accent = v; })} />
          <SelectField label="Sidebar style" value={portal.sidebarStyle} onChange={(v) => update((d) => { d.portals[portalKey].sidebarStyle = v as typeof portal.sidebarStyle; })} options={[
            { value: 'gradient', label: 'Gradient (accent → dark)' },
            { value: 'solid', label: 'Solid accent' },
            { value: 'midnight', label: 'Midnight' },
          ]} />
          <SelectField label="Density" value={portal.density} onChange={(v) => update((d) => { d.portals[portalKey].density = v as typeof portal.density; })} options={[
            { value: 'comfortable', label: 'Comfortable' },
            { value: 'compact', label: 'Compact' },
          ]} />
        </Grid>
        <Toggle title="Show the user card in the sidebar" desc="Avatar, name, and plan/email block." checked={portal.showProfileCard} onChange={(v) => update((d) => { d.portals[portalKey].showProfileCard = v; })} />
      </Panel>

      <Panel title="Portal announcement banner" desc="A dismissible message at the top of every page in this portal.">
        <Toggle title="Enable banner" checked={portal.announcement.enabled} onChange={(v) => update((d) => { d.portals[portalKey].announcement.enabled = v; })} />
        <Area label="Banner text" rows={2} value={portal.announcement.text} onChange={(v) => update((d) => { d.portals[portalKey].announcement.text = v; })} />
        <Grid>
          <Field label="Link label" value={portal.announcement.linkLabel} onChange={(v) => update((d) => { d.portals[portalKey].announcement.linkLabel = v; })} />
          <Field label="Link target" value={portal.announcement.linkTo} onChange={(v) => update((d) => { d.portals[portalKey].announcement.linkTo = v; })} />
        </Grid>
      </Panel>

      <Panel
        title="Sidebar navigation"
        desc="Rename, reorder, or hide any item. Hidden pages stay reachable by URL."
        actions={
          <SmallBtn onClick={() => update((d) => { d.portals[portalKey].nav = cloneSiteContent({ ...d, portals: { ...d.portals, [portalKey]: defaults } }).portals[portalKey].nav; })}>
            <RotateCcw size={14} /> Reset labels & order
          </SmallBtn>
        }
      >
        <div className="space-y-2">
          {portal.nav.map((item, i) => (
            <div key={item.path} className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] font-mono text-slate-400 w-7">{i + 1}.</span>
                <ArrowBtn label="Move up" disabled={i === 0} onClick={() => move(portal.nav, i, -1, update, (d) => d.portals[portalKey].nav)}><ArrowUp size={14} /></ArrowBtn>
                <ArrowBtn label="Move down" disabled={i === portal.nav.length - 1} onClick={() => move(portal.nav, i, 1, update, (d) => d.portals[portalKey].nav)}><ArrowDown size={14} /></ArrowBtn>
              </div>
              <input
                value={item.label}
                onChange={(e) => update((d) => { d.portals[portalKey].nav[i].label = e.target.value; })}
                className="flex-1 min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-[10px] font-mono text-slate-400 truncate max-w-[130px]">{item.path}</span>
              <label className="flex items-center gap-2 text-xs text-slate-600 shrink-0">
                <input
                  type="checkbox"
                  checked={item.hidden}
                  onChange={(e) => update((d) => { d.portals[portalKey].nav[i].hidden = e.target.checked; })}
                  className="accent-emerald-600"
                />
                Hidden
              </label>
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}

/* ---------------------------------- Brand --------------------------------- */

function BrandEditor({ draft, update }: EditorProps) {
  const b = draft.brand;
  return (
    <Panel title="Brand, accent & contact" desc="Used across the public site, portal shells, and footer.">
      <Grid>
        <Field label="Brand name" value={b.name} onChange={(v) => update((d) => { d.brand.name = v; })} />
        <Field label="Tagline" value={b.tagline} onChange={(v) => update((d) => { d.brand.tagline = v; })} />
        <Field label="Logo URL" value={b.logoUrl} onChange={(v) => update((d) => { d.brand.logoUrl = v; })} />
        <ColorField label="Global accent" value={b.accent} onChange={(v) => update((d) => { d.brand.accent = v; })} />
        <Field label="Support email" value={b.supportEmail} onChange={(v) => update((d) => { d.brand.supportEmail = v; })} />
        <Field label="Support phone" value={b.supportPhone} onChange={(v) => update((d) => { d.brand.supportPhone = v; })} />
      </Grid>
      <Field label="Address" value={b.address} onChange={(v) => update((d) => { d.brand.address = v; })} />
      <div className="mt-4 rounded-xl bg-slate-50 border border-slate-200 p-4 flex items-center gap-3">
        <img src={b.logoUrl || '/logo192.png'} alt="" className="w-12 h-12 rounded-xl object-cover" />
        <div>
          <p className="font-serif font-bold text-slate-900">{b.name || 'Brand name'}</p>
          <p className="text-xs" style={{ color: b.accent }}>{b.tagline || 'Tagline'}</p>
        </div>
      </div>
    </Panel>
  );
}

/* -------------------------------- Preview --------------------------------- */

function PreviewCard({ tab, draft, portalKey }: { tab: Tab; draft: SiteContent; portalKey: PortalKey }) {
  if (tab === 'portals') {
    const portal = draft.portals[portalKey];
    const accent = portal.accent || draft.brand.accent;
    const visible = portal.nav.filter((n) => !n.hidden).slice(0, 9);
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold text-slate-500 mb-3 flex items-center gap-1"><Eye size={13} /> Live portal preview</p>
        <div className="rounded-xl overflow-hidden border border-slate-200">
          <div className="p-3 text-white" style={{ background: portalBackground(portal, draft.brand.accent) }}>
            <div className="flex items-center gap-2 mb-2">
              <img src={draft.brand.logoUrl || '/logo192.png'} alt="" className="w-7 h-7 rounded-lg object-cover" />
              <div>
                <p className="text-xs font-bold">{draft.brand.name}</p>
                <p className="text-[9px] opacity-70">{portal.name}</p>
              </div>
            </div>
            {portal.announcement.enabled && portal.announcement.text && (
              <div className="rounded-md px-2 py-1 text-[9px] mb-2" style={{ background: accent }}>
                {portal.announcement.text}
              </div>
            )}
            <div className={`space-y-0.5 ${portal.density === 'compact' ? 'text-[9px]' : 'text-[10px]'}`}>
              {visible.map((item) => (
                <div key={item.path} className={`flex items-center gap-1.5 rounded px-2 ${portal.density === 'compact' ? 'py-1' : 'py-1.5'} ${item.path === (portalKey === 'lawyer' ? '/lawyer' : '/client') ? 'bg-white/20' : 'opacity-80'}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-white/70" />
                  {item.label}
                </div>
              ))}
              {portal.nav.filter((n) => !n.hidden).length > 9 && <p className="opacity-60 px-2">+ more…</p>}
            </div>
          </div>
        </div>
        <p className="text-[10px] text-slate-400 mt-2">Density: {portal.density} · Style: {portal.sidebarStyle}</p>
      </div>
    );
  }

  const featured = draft.home.plans.find((p) => p.popular) || draft.home.plans[0];
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold text-slate-500 mb-3 flex items-center gap-1"><Eye size={13} /> Live home preview</p>
      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 bg-gradient-to-br from-slate-50 via-white to-emerald-50">
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold" style={{ background: `${draft.brand.accent}1a`, color: draft.brand.accent }}>
            <Home size={9} /> {draft.home.badge}
          </span>
          <h3 className="font-serif font-bold text-slate-900 text-lg leading-tight mt-2">
            {draft.home.heroTitle}{' '}
            <span style={{ color: draft.brand.accent }}>{draft.home.heroHighlight}</span>
          </h3>
          <p className="text-[10px] text-slate-500 mt-1 line-clamp-3">{draft.home.heroSubtitle}</p>
          <div className="flex gap-1.5 mt-3">
            <span className="rounded-md px-2 py-1 text-[9px] font-semibold text-white" style={{ background: draft.brand.accent }}>{draft.home.primaryCta.label}</span>
            <span className="rounded-md px-2 py-1 text-[9px] font-semibold text-slate-600 border border-slate-200 bg-white">{draft.home.secondaryCta.label}</span>
          </div>
        </div>
        {draft.home.companies.enabled && draft.home.companies.companies.length > 0 && (
          <div className="px-3 py-2 border-t border-slate-100">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1"><BadgeCheck size={10} /> {draft.home.companies.title}</p>
            <div className="flex gap-1 overflow-hidden">
              {draft.home.companies.companies.slice(0, 3).map((company, i) => (
                <span key={i} className="whitespace-nowrap rounded-md bg-slate-50 border border-slate-200 px-2 py-1 text-[9px] text-slate-600">{company.name}</span>
              ))}
            </div>
          </div>
        )}
        {featured && (
          <div className="px-3 py-2 border-t border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-[9px] uppercase tracking-wider text-slate-400">Plan</p>
              <p className="text-xs font-bold text-slate-900">{featured.name}</p>
            </div>
            <span className="text-sm font-bold" style={{ color: draft.brand.accent }}>{featured.price}</span>
          </div>
        )}
        {draft.home.process.length > 0 && (
          <div className="px-3 py-2 border-t border-slate-100">
            <p className="text-[9px] uppercase tracking-wider text-slate-400 mb-1">Process</p>
            <div className="flex items-center gap-1">
              {draft.home.process.slice(0, 4).map((_, i) => (
                <span key={i} className="w-4 h-4 rounded-full text-white text-[8px] flex items-center justify-center" style={{ background: draft.brand.accent }}>{i + 1}</span>
              ))}
            </div>
          </div>
        )}
      </div>
      <p className="text-[10px] text-slate-400 mt-2">{draft.home.stats.length} stats · {draft.home.features.length} features · {draft.home.plans.length} plans</p>
      <Link to="/" target="_blank" className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 hover:underline">
        <ExternalLink size={11} /> Open the real page
      </Link>
    </div>
  );
}

/* -------------------------------- Controls -------------------------------- */

interface EditorProps {
  draft: SiteContent;
  update: (mutator: (next: SiteContent) => void) => void;
}

function Panel({ title, desc, actions, children }: { title: string; desc?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
        <div>
          <h2 className="font-bold text-slate-900">{title}</h2>
          {desc && <p className="text-sm text-slate-500">{desc}</p>}
        </div>
        {actions}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Grid({ children }: { children: ReactNode }) {
  return <div className="grid sm:grid-cols-2 gap-3">{children}</div>;
}

function Field({ label, value, onChange, placeholder, hint, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; hint?: string; type?: string;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-600 mb-1">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
      />
      {hint && <span className="block text-[10px] text-slate-400 mt-1">{hint}</span>}
    </label>
  );
}

function Area({ label, value, onChange, rows = 3 }: { label: string; value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-600 mb-1">{label}</span>
      <textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white resize-y"
      />
    </label>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-600 mb-1">{label}</span>
      <div className="flex items-center gap-2">
        <input type="color" value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#059669'} onChange={(e) => onChange(e.target.value)} className="h-9 w-12 rounded-lg border border-slate-200 bg-white p-1" />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-mono text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
        />
      </div>
    </label>
  );
}

function SelectField({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-600 mb-1">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
      >
        {options.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
    </label>
  );
}

function IconSelect({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const Icon = getIcon(value);
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-600 mb-1">{label}</span>
      <div className="flex items-center gap-2">
        <span className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
          <Icon size={17} />
        </span>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
        >
          {ICON_KEYS.map((key) => <option key={key} value={key}>{key}</option>)}
        </select>
      </div>
    </label>
  );
}

function Toggle({ title, desc, checked, onChange }: { title: string; desc?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div>
        <p className="text-sm font-medium text-slate-800">{title}</p>
        {desc && <p className="text-[11px] text-slate-500">{desc}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        aria-pressed={checked}
        className={`w-11 h-6 rounded-full transition shrink-0 ${checked ? 'bg-emerald-500' : 'bg-slate-300'}`}
      >
        <span className={`block w-5 h-5 bg-white rounded-full shadow transform transition ${checked ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}

function SmallBtn({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
      {children}
    </button>
  );
}

function ArrowBtn({ children, onClick, disabled, label }: { children: ReactNode; onClick: () => void; disabled?: boolean; label: string }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} disabled={disabled} className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 disabled:opacity-30">
      {children}
    </button>
  );
}

function RowCard({ children, index, total, onUp, onDown, onRemove }: {
  children: ReactNode; index: number; total: number; onUp: () => void; onDown: () => void; onRemove: () => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Item {index + 1}</span>
        <div className="flex items-center gap-1">
          <ArrowBtn label="Move up" onClick={onUp} disabled={index === 0}><ArrowUp size={13} /></ArrowBtn>
          <ArrowBtn label="Move down" onClick={onDown} disabled={index === total - 1}><ArrowDown size={13} /></ArrowBtn>
          <button type="button" onClick={onRemove} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50" aria-label="Remove item"><Trash2 size={13} /></button>
        </div>
      </div>
      {children}
    </div>
  );
}

function move<T>(_arr: T[], index: number, direction: number, update: EditorProps['update'], pick: (d: SiteContent) => T[]) {
  update((d) => {
    const target = pick(d);
    const next = index + direction;
    if (next < 0 || next >= target.length) return;
    [target[index], target[next]] = [target[next], target[index]];
  });
}

function blankPlan(): Plan {
  return {
    value: 'starter', name: 'New plan', price: 'Rs 0', period: '/ month', audience: 'lawyer',
    features: ['Feature one'], popular: false, ctaLabel: 'Choose plan', ctaTo: '/register',
  };
}
