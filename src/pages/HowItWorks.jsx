import { AlertTriangle, ArrowRight, AudioLines, CheckCheck, CircleHelp, Eye, FileCheck2, Image, ScanLine, ShieldAlert, Sparkles } from 'lucide-react'

const steps = [
  { number: '01', title: 'Witness description', copy: 'Record a witness account in their words. Keep the original statement alongside every later interpretation.', icon: AudioLines, status: 'SOURCE' },
  { number: '02', title: 'Input validation', copy: 'Check the account is present and readable. Avoid personal identifiers and unsupported assumptions.', icon: FileCheck2, status: 'QUALITY CHECK' },
  { number: '03', title: 'Structured analysis', copy: 'When an analysis service is connected, organize its response into objects, people, observations, and unknowns.', icon: Sparkles, status: 'SERVICE REQUIRED' },
  { number: '04', title: 'Scene layout', copy: 'Review a top-down schematic. Explicitly stated positions stay distinct from manual and illustrative placements.', icon: ScanLine, status: 'INTERACTIVE' },
  { number: '05', title: 'Illustrative image', copy: 'An image-generation provider is not configured in this prototype. The preview stays unavailable instead of pretending to be generated.', icon: Image, status: 'NOT CONFIGURED' },
  { number: '06', title: 'Human review', copy: 'A qualified person must verify observations and context. Visualization cannot establish what occurred.', icon: Eye, status: 'REQUIRED' },
]

export default function HowItWorks({ onStart }) {
  return <div className="how-page page-enter"><header className="page-header-block"><div><div className="eyebrow"><span className="eyebrow-pip" /> A TRANSPARENT WORKFLOW</div><h1>How it works</h1><p>Every step preserves the line between what was reported and what is only illustrative.</p></div><button className="button button-lime" onClick={onStart}>Try a sample <ArrowRight size={15} /></button></header>
    <div className="pipeline-list">{steps.map(({ number, title, copy, icon: Icon, status }) => <article className="pipeline-step" key={number}><div className="pipeline-number">{number}</div><span className="pipeline-icon"><Icon size={18} /></span><div className="pipeline-copy"><h2>{title}</h2><p>{copy}</p></div><span className="pipeline-status">{status}</span><ArrowRight size={15} className="pipeline-arrow" /></article>)}</div>
    <section className="scope-banner"><div className="scope-icon"><AlertTriangle size={18} /></div><div><span className="mini-label">IMPORTANT LIMITATION</span><h2>Context is not proof.</h2><p>TRACE AI is intended to assist with visualization and information organization. It does not identify suspects, determine guilt, establish facts, or replace professional forensic work. Do not treat generated or illustrative content as verified evidence.</p></div><div className="scope-stamp"><ShieldAlert size={16} /><span>HUMAN<br />REVIEW</span></div></section>
    <div className="how-bottom-note"><CheckCheck size={15} /><span>Source text remains attached to observations wherever a source quote is available.</span><span className="how-bottom-tail"><CircleHelp size={13} /> Prototype capabilities vary by configuration.</span></div>
  </div>
}