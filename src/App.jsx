import React, { useEffect, useMemo, useState } from 'react';
import { Braces, Palette, Regex, Link2, Clock3, FileText, Database, Search, Copy, Download, Check, ChevronRight, Code2, Sparkles, ShieldCheck, Zap, Menu, X, RotateCcw, ArrowLeftRight, WandSparkles, Github, ExternalLink, ChevronDown } from 'lucide-react';
import Papa from 'papaparse';
import yaml from 'js-yaml';
import { diffWords } from 'diff';

const groups = [
  { name: 'JSON', icon: Braces, tools: ['JSON Formatter','JSON Minifier','JSON Validator','JSON → CSV','JSON → TypeScript'] },
  { name: 'CSS', icon: Palette, tools: ['CSS Formatter','CSS Minifier','CSS Runner','Gradient Generator','Shadow Generator'] },
  { name: 'Regex', icon: Regex, tools: ['Regex Tester','Regex Explainer','Regex Generator'] },
  { name: 'URLs', icon: Link2, tools: ['URL Encoder','URL Decoder','URL Parser'] },
  { name: 'Time', icon: Clock3, tools: ['Unix Timestamp','Timestamp → Date','Timezone Converter'] },
  { name: 'Text', icon: FileText, tools: ['Text Diff','Case Converter','Word Counter','Character Counter'] },
  { name: 'Data', icon: Database, tools: ['CSV Viewer','CSV ↔ JSON','YAML ↔ JSON'] },
  { name: 'Encoding & Security', icon: Code2, tools: ['Base64 Encode','Base64 Decode','JWT Decoder','HTML Escape','HTML Unescape','UUID Generator'] },
];
const descriptions = {
  'JSON Formatter':'Beautify JSON with consistent indentation and readable structure.',
  'JSON Minifier':'Remove unnecessary whitespace from JSON payloads.',
  'JSON Validator':'Validate JSON syntax and surface parse errors.',
  'JSON → CSV':'Turn an array of JSON objects into a downloadable CSV.',
  'JSON → TypeScript':'Infer a TypeScript type from JSON data.',
  'CSS Formatter':'Expand compressed CSS into readable, consistently indented code.',
  'CSS Minifier':'Compact CSS by removing comments and unnecessary whitespace.',
  'CSS Runner':'Run CSS against editable sample HTML in a sandboxed live preview.',
  'Base64 Encode':'Encode text as UTF-8-safe Base64.',
  'Base64 Decode':'Decode Base64 text back into readable UTF-8.',
  'JWT Decoder':'Inspect a JWT header and payload locally without verifying its signature.',
  'HTML Escape':'Escape HTML-sensitive characters for safe text output.',
  'HTML Unescape':'Decode common HTML entities back into text.',
  'UUID Generator':'Generate a cryptographically random UUID v4 in your browser.',
  'Gradient Generator':'Design a gradient visually and copy production-ready CSS.',
  'Shadow Generator':'Tune a box shadow visually and copy the CSS.',
  'Regex Tester':'Test a regular expression against sample text and inspect matches.',
  'Regex Explainer':'Get a practical breakdown of common regex tokens.',
  'Regex Generator':'Build a starter expression from a common matching goal.',
  'URL Encoder':'Safely encode text for use in a URL component.',
  'URL Decoder':'Decode percent-encoded URL text.',
  'URL Parser':'Inspect the parts of a URL, including query parameters.',
  'Unix Timestamp':'Get the current Unix timestamp in seconds and milliseconds.',
  'Timestamp → Date':'Convert a Unix timestamp to a local and UTC date.',
  'Timezone Converter':'View a date and time in another IANA time zone.',
  'Text Diff':'Compare two text blocks and see changed words.',
  'Case Converter':'Convert text between common casing styles.',
  'Word Counter':'Count words, lines, sentences and reading time.',
  'Character Counter':'Count characters with and without spaces.',
  'CSV Viewer':'Parse CSV data and inspect it in a table.',
  'CSV ↔ JSON':'Convert between CSV and JSON arrays.',
  'YAML ↔ JSON':'Convert YAML to JSON or JSON to YAML.',
};
const starterJson = '{\n  "name": "FreeDev",\n  "free": true,\n  "tools": ["JSON", "CSS", "Regex"]\n}';
const timezoneOffsets = Array.from({length: 53}, (_, i) => { const minutes=-720+i*30; const sign=minutes<0?'-':'+'; const absolute=Math.abs(minutes); return {value:minutes,label:`GMT ${sign}${String(Math.floor(absolute/60)).padStart(2,'0')}:${String(absolute%60).padStart(2,'0')}`}; });
const countriesByOffset = {'-720':'Baker Island (US, uninhabited)','-660':'American Samoa, Niue','-600':'Hawaii (US), Cook Islands','-540':'Alaska (US), French Polynesia','-480':'Pacific regions of the United States and Canada','-420':'Mountain regions of the United States and Canada, parts of Mexico','-360':'Central regions of the United States and Canada, parts of Central America','-300':'Eastern regions of the United States and Canada, Colombia, Peru, Ecuador','-240':'Bolivia, Venezuela, Guyana, parts of the Caribbean','-210':'Newfoundland (Canada; seasonal offset can vary)','-180':'Argentina, Uruguay, Suriname','-120':'South Georgia and the South Sandwich Islands','-60':'Cabo Verde, parts of Greenland','0':'United Kingdom, Ireland, Portugal, Iceland, Ghana (seasonal differences apply)','60':'France, Germany, Italy, Spain, Nigeria, Algeria (seasonal differences apply)','120':'Finland, Greece, Egypt, South Africa, Saudi Arabia (seasonal differences apply)','180':'Türkiye, Kenya, Ethiopia, Iraq, Qatar, Kuwait','210':'Iran','240':'United Arab Emirates, Oman, Armenia, Georgia, Azerbaijan','270':'Afghanistan','300':'Pakistan, Maldives, Uzbekistan','330':'India, Sri Lanka','345':'Nepal','360':'Bangladesh, Bhutan, Kyrgyzstan','390':'Myanmar','420':'Thailand, Vietnam, Cambodia, Laos, western Indonesia','480':'China, Singapore, Malaysia, Philippines, Western Australia','525':'Eucla area (Australia)','540':'Japan, South Korea, Timor-Leste','570':'Central Australia (Australia)','600':'Eastern Australia, Papua New Guinea, Guam (seasonal differences apply)','630':'Lord Howe Island (Australia)','660':'Solomon Islands, Vanuatu, New Caledonia','720':'New Zealand, Fiji, Tuvalu (seasonal differences apply)','780':'Tonga, Samoa (seasonal differences apply)','840':'Line Islands (Kiribati)'};
const cx = (...a) => a.filter(Boolean).join(' ');
function safeJson(s) { return JSON.parse(s); }
function jsonToTs(value, name='Root') {
  const typeOf = v => {
    if (v === null) return 'null';
    if (Array.isArray(v)) return v.length ? [...new Set(v.map(x=>typeOf(x)))].join(' | ') + '[]' : 'unknown[]';
    if (typeof v === 'object') return 'object';
    return typeof v;
  };
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const props = Object.entries(value).map(([k,v]) => `  ${/^[$A-Z_a-z][$\w]*$/.test(k) ? k : JSON.stringify(k)}: ${v && typeof v==='object' ? typeOf(v) : typeOf(v)};`).join('\n');
    const nested = Object.entries(value).filter(([,v])=>v && typeof v==='object' && !Array.isArray(v)).map(([k,v])=>jsonToTs(v,k)).join('\n\n');
    return `interface ${name} {\n${props}\n}${nested?'\n\n'+nested:''}`;
  }
  return `type ${name} = ${typeOf(value)};`;
}
function processTool(tool, input, extra={}) {
  try {
    if (tool === 'JSON Formatter') return JSON.stringify(safeJson(input), null, 2);
    if (tool === 'JSON Minifier') return JSON.stringify(safeJson(input));
    if (tool === 'JSON Validator') { safeJson(input); return '✓ Valid JSON\n\nThe input parses successfully.'; }
    if (tool === 'JSON → CSV') { const d=safeJson(input); if(!Array.isArray(d)) throw Error('Expected an array of objects.'); return Papa.unparse(d); }
    if (tool === 'JSON → TypeScript') return jsonToTs(safeJson(input));
    if (tool === 'CSS Formatter') return input.replace(/\s*([{}:;,])\s*/g,'$1 ').replace(/\s*\{/g,' {\n  ').replace(/;\s*/g,';\n  ').replace(/}\s*/g,'}\n\n').trim().replace(/  }/g,'}');
    if (tool === 'CSS Minifier') return input.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\s+/g,' ').replace(/\s*([{}:;,])\s*/g,'$1').replace(/;}/g,'}').trim();
    if (tool === 'Base64 Encode') return btoa(unescape(encodeURIComponent(input)));
    if (tool === 'Base64 Decode') return decodeURIComponent(escape(atob(input.trim())));
    if (tool === 'JWT Decoder') { const parts=input.trim().split('.'); if(parts.length!==3) throw Error('A JWT must contain three dot-separated parts.'); const decodePart=part=>JSON.parse(decodeURIComponent(escape(atob(part.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(part.length/4)*4,'='))))); return JSON.stringify({header:decodePart(parts[0]),payload:decodePart(parts[1]),signaturePresent:!!parts[2],note:'Decoded locally only. This does not verify the token signature.'},null,2); }
    if (tool === 'HTML Escape') return input.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;').replace(/'/g,'&#39;');
    if (tool === 'HTML Unescape') return input.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'\"').replace(/&#39;|&apos;/g,"'").replace(/&amp;/g,'&');
    if (tool === 'UUID Generator') return crypto.randomUUID();
    if (tool === 'URL Encoder') return encodeURIComponent(input);
    if (tool === 'URL Decoder') return decodeURIComponent(input.replace(/\+/g,' '));
    if (tool === 'URL Parser') { const u=new URL(input); return JSON.stringify({href:u.href,origin:u.origin,protocol:u.protocol,host:u.host,hostname:u.hostname,port:u.port,pathname:u.pathname,search:u.search,hash:u.hash,query:Object.fromEntries(u.searchParams.entries())},null,2); }
    if (tool === 'Regex Tester') { const {pattern='\\w+', flags='g', sample=''}=extra; const re=new RegExp(pattern, flags.includes('g')?flags:flags+'g'); return JSON.stringify([...sample.matchAll(re)].map(m=>({match:m[0],index:m.index,captures:m.slice(1)})),null,2); }
    if (tool === 'Regex Explainer') return input.split('').map((c,i)=>({'.':'Any character except newline','\\d':'Digit (0–9)','\\w':'Word character','\\s':'Whitespace','+':'One or more of the previous token','*':'Zero or more of the previous token','?':'Optional / zero or one','^':'Start of input','$':'End of input','[':'Starts a character class',']':'Ends a character class','(':'Starts a capture group',')':'Ends a group','|':'Alternation (OR)','{':'Starts a repetition quantifier','}':'Ends a repetition quantifier'}[c] ? `${c} — ${({'.':'Any character except newline','\\d':'Digit (0–9)','\\w':'Word character','\\s':'Whitespace','+':'One or more of the previous token','*':'Zero or more of the previous token','?':'Optional / zero or one','^':'Start of input','$':'End of input','[':'Starts a character class',']':'Ends a character class','(':'Starts a capture group',')':'Ends a group','|':'Alternation (OR)','{':'Starts a repetition quantifier','}':'Ends a repetition quantifier'}[c])}` : '').trim()).filter(Boolean).join('\n') || 'Enter a pattern to see token hints.';
    if (tool === 'Regex Generator') { const templates={'Email address':'[\\w.+-]+@[\\w-]+\\.[\\w.-]+','URL':'https?:\\/\\/[^\\s]+','Digits only':'^\\d+$','Letters only':'^[A-Za-z]+$','US phone number':'^\\+?1?[-. ]?\\(?\\d{3}\\)?[-. ]?\\d{3}[-. ]?\\d{4}$','Date (YYYY-MM-DD)':'^\\d{4}-\\d{2}-\\d{2}$','Hex color':'^#(?:[0-9a-fA-F]{3}){1,2}$'}; return templates[extra.goal] || templates['Email address']; }
    if (tool === 'Timestamp → Date') { const n=Number(input.trim()); if(!Number.isFinite(n)) throw Error('Enter a numeric Unix timestamp.'); const d=new Date(Math.abs(n)<1e12?n*1000:n); if(Number.isNaN(d.getTime())) throw Error('Timestamp is outside the supported date range.'); return JSON.stringify({local:d.toString(),utc:d.toISOString(),unixSeconds:Math.floor(d.getTime()/1000),unixMilliseconds:d.getTime()},null,2); }
    if (tool === 'Timezone Converter') return extra.timezoneResult || 'Choose source and target offsets, then convert.';
    if (tool === 'Case Converter') { const s=input.trim(); return ({'UPPERCASE':input.toUpperCase(),'lowercase':input.toLowerCase(),'Title Case':input.toLowerCase().replace(/\b\w/g,c=>c.toUpperCase()),'Sentence case':input.toLowerCase().replace(/(^\s*\w|[.!?]\s+\w)/g,c=>c.toUpperCase()),'camelCase':s.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g,(_,c)=>c.toUpperCase()),'snake_case':s.replace(/([a-z0-9])([A-Z])/g,'$1_$2').replace(/[^a-zA-Z0-9]+/g,'_').toLowerCase(),'kebab-case':s.replace(/([a-z0-9])([A-Z])/g,'$1-$2').replace(/[^a-zA-Z0-9]+/g,'-').toLowerCase()})[extra.case||'Title Case']; }
    if (tool === 'Word Counter') { const words=input.trim()?input.trim().split(/\s+/).length:0; return JSON.stringify({words,characters:input.length,charactersWithoutSpaces:input.replace(/\s/g,'').length,lines:input?input.split(/\r\n|\r|\n/).length:0,sentences:input.trim()?input.split(/[.!?]+/).filter(s=>s.trim()).length:0,estimatedReadingMinutes:Math.max(1,Math.ceil(words/200))},null,2); }
    if (tool === 'Character Counter') return JSON.stringify({characters:input.length,charactersWithoutWhitespace:input.replace(/\s/g,'').length,letters:(input.match(/\p{L}/gu)||[]).length,digits:(input.match(/\d/g)||[]).length,spaces:(input.match(/ /g)||[]).length,lines:input?input.split(/\r\n|\r|\n/).length:0},null,2);
    if (tool === 'CSV ↔ JSON' || tool === 'CSV Viewer') { const parsed=Papa.parse(input.trim(),{header:true,skipEmptyLines:true}); if(parsed.errors.length) throw Error(parsed.errors[0].message); return JSON.stringify(parsed.data,null,2); }
    if (tool === 'YAML ↔ JSON') { if(extra.direction==='JSON → YAML') return yaml.dump(safeJson(input)); return JSON.stringify(yaml.load(input),null,2); }
    if (tool === 'Text Diff') return diffWords(extra.left||'',extra.right||'').map(p=>(p.added?'+ ':p.removed?'- ':'  ')+p.value).join('');
    return input;
  } catch(e) { return 'Error: ' + (e?.message || 'Unable to process this input.'); }
}
function downloadText(text, name='freedev-output.txt') { const blob=new Blob([text],{type:'text/plain;charset=utf-8'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=name; a.click(); URL.revokeObjectURL(url); }
function ToolWorkspace({tool,onBack}) {
  const [input,setInput]=useState(tool==='JSON Formatter'||tool==='JSON Minifier'||tool==='JSON Validator'||tool==='JSON → CSV'||tool==='JSON → TypeScript'?starterJson:tool==='URL Parser'?'https://example.com/docs?tool=freedev&free=true':tool==='CSS Formatter'||tool==='CSS Minifier'||tool==='CSS Runner'?' .card { color: #d9f5e5; background: #10251b; box-shadow: 0 10px 30px #000; }':tool==='HTML Escape'?' <h1>Hello, FreeDev!</h1>':'');
  const [output,setOutput]=useState(''); const [copied,setCopied]=useState(false);
  const [pattern,setPattern]=useState('\\bfree\\w*'); const [flags,setFlags]=useState('gi'); const [sample,setSample]=useState('FreeDev is free. Build with FreeDev.'); const [goal,setGoal]=useState('Email address'); const [caseType,setCaseType]=useState('Title Case'); const [direction,setDirection]=useState('YAML → JSON');
  const [colorA,setColorA]=useState('#1c9a60'); const [colorB,setColorB]=useState('#081b12'); const [angle,setAngle]=useState(135); const [shadowBlur,setShadowBlur]=useState(28); const [shadowY,setShadowY]=useState(12);
  const [left,setLeft]=useState('const name = "FreeDev";'); const [right,setRight]=useState('const name = "FreeDev";\nconst free = true;');
  const [sampleHtml,setSampleHtml]=useState('<main class="card"><h1>Hello, developer.</h1><p>Edit the CSS and run it to preview your styles.</p><button>Try me</button></main>');
  const [cssPreview,setCssPreview]=useState('');
  const [date,setDate]=useState(new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16));
  const localOffsetMinutes=-new Date().getTimezoneOffset();
  const [sourceOffset,setSourceOffset]=useState(localOffsetMinutes);
  const [targetOffset,setTargetOffset]=useState(330);
  const [utcInput,setUtcInput]=useState(localOffsetMinutes===0);
  const offsetLabel=minutes=>{const sign=minutes<0?'-':'+';const absolute=Math.abs(minutes);return `GMT ${sign}${String(Math.floor(absolute/60)).padStart(2,'0')}:${String(absolute%60).padStart(2,'0')}`;};
  const timezoneCountries=countriesByOffset[String(targetOffset)]||'Country and region use can vary; check local daylight-saving rules.';
  const convertTimezone=()=>{const m=date.match(/^(\\d{4})-(\\d{2})-(\\d{2})T(\\d{2}):(\\d{2})$/);if(!m)return 'Error: Choose a valid date and time.';const y=Number(m[1]),mo=Number(m[2]),d=Number(m[3]),h=Number(m[4]),mi=Number(m[5]);const instant=Date.UTC(y,mo-1,d,h,mi)-sourceOffset*60000;const out=new Date(instant+targetOffset*60000);const pad=n=>String(n).padStart(2,'0');return `Source: ${date.replace('T',' ')} (${offsetLabel(sourceOffset)})\nTarget: ${out.getUTCFullYear()}-${pad(out.getUTCMonth()+1)}-${pad(out.getUTCDate())} ${pad(out.getUTCHours())}:${pad(out.getUTCMinutes())} (${offsetLabel(targetOffset)})\n\nCountries / regions commonly using ${offsetLabel(targetOffset)}:\n${timezoneCountries}\n\nNote: These are fixed GMT offsets. Some locations change offsets seasonally.`;};
  const run=()=>{ const extra={pattern,flags,sample,goal,case:caseType,direction,left,right,date,timezoneResult:convertTimezone()}; if(tool==='Timezone Converter') setOutput(convertTimezone()); else if(tool==='Gradient Generator') setOutput(`background: linear-gradient(${angle}deg, ${colorA}, ${colorB});`); else if(tool==='Shadow Generator') setOutput(`box-shadow: 0 ${shadowY}px ${shadowBlur}px rgba(0, 0, 0, 0.35);`); else if(tool==='Unix Timestamp') setOutput(`Seconds: ${Math.floor(Date.now()/1000)}\nMilliseconds: ${Date.now()}`); else if(tool==='CSS Runner') { setCssPreview(input); setOutput('CSS applied to the sandboxed preview.'); } else setOutput(processTool(tool,input,extra)); };
  const isRegex=tool==='Regex Tester'; const isDiff=tool==='Text Diff'; const isColor=tool==='Gradient Generator'||tool==='Shadow Generator'; const isCssRunner=tool==='CSS Runner'; const isCase=tool==='Case Converter'; const isRegexGen=tool==='Regex Generator'; const isTime=tool==='Timezone Converter'; const isCsv=tool==='CSV Viewer'||tool==='CSV ↔ JSON'; const isYaml=tool==='YAML ↔ JSON';
  const placeholder=tool.startsWith('JSON')?'Paste JSON here…':tool.startsWith('CSS')?'Paste CSS here…':tool.includes('URL')?'Paste a URL or encoded value…':tool.includes('Timestamp')?'Enter Unix timestamp (seconds or milliseconds)…':tool.includes('CSV')?'Paste CSV data here…':tool.includes('YAML')?'Paste YAML or JSON here…':tool==='JWT Decoder'?'Paste a JWT (header.payload.signature)…':tool==='Base64 Decode'?'Paste Base64 text…':'Enter text here…';
  return <div className="workspace">
    <button className="back-link" onClick={onBack}>← All tools</button>
    <div className="tool-heading"><div className="eyebrow"><span className="pulse"/> DEVELOPER TOOL / {groups.find(g=>g.tools.includes(tool))?.name.toUpperCase()}</div><h1>{tool}</h1><p>{descriptions[tool]}</p></div>
    <div className="workbench">
      <div className="editor-card">
        <div className="panel-top"><span><span className="traffic red"/><span className="traffic yellow"/><span className="traffic green"/></span><span className="panel-label">INPUT</span><button className="icon-button" title="Clear input" onClick={()=>setInput('')}><RotateCcw size={15}/></button></div>
        {isRegex&&<div className="field-row"><label>Pattern<input value={pattern} onChange={e=>setPattern(e.target.value)} /></label><label>Flags<input value={flags} onChange={e=>setFlags(e.target.value)} /></label></div>}
        {isRegex&&<label className="full-field">Test string<textarea value={sample} onChange={e=>setSample(e.target.value)} rows={3}/></label>}
        {isDiff&&<><label className="full-field">Original<textarea value={left} onChange={e=>setLeft(e.target.value)} rows={6}/></label><label className="full-field">Modified<textarea value={right} onChange={e=>setRight(e.target.value)} rows={6}/></label></>}
        {isRegexGen&&<label className="full-field">I need to match<select value={goal} onChange={e=>setGoal(e.target.value)}>{['Email address','URL','Digits only','Letters only','US phone number','Date (YYYY-MM-DD)','Hex color'].map(x=><option key={x}>{x}</option>)}</select></label>}
        {isCssRunner&&<label className="full-field">Sample HTML<textarea value={sampleHtml} onChange={e=>setSampleHtml(e.target.value)} rows={7} spellCheck="false"/></label>}
        {isCase&&<label className="full-field">Output style<select value={caseType} onChange={e=>setCaseType(e.target.value)}>{['UPPERCASE','lowercase','Title Case','Sentence case','camelCase','snake_case','kebab-case'].map(x=><option key={x}>{x}</option>)}</select></label>}
        {isYaml&&<label className="full-field">Conversion direction<select value={direction} onChange={e=>setDirection(e.target.value)}><option>YAML → JSON</option><option>JSON → YAML</option></select></label>}
        {isTime&&<>
<label className="full-field">Date and time<input type="datetime-local" value={date} onChange={e=>setDate(e.target.value)}/></label>
<label className="full-field">Source timezone<select value={sourceOffset} onChange={e=>{setSourceOffset(Number(e.target.value));setUtcInput(Number(e.target.value)===0)}}>{timezoneOffsets.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></label>
<label className="full-field">Target timezone<select value={targetOffset} onChange={e=>setTargetOffset(Number(e.target.value))}>{timezoneOffsets.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></label>
<div className="timezone-actions"><button type="button" className={cx('timezone-toggle',utcInput&&'is-on')} onClick={()=>{const next=!utcInput;setUtcInput(next);setSourceOffset(next?0:localOffsetMinutes)}}>{utcInput?'UTC input enabled':'Use GMT / UTC input'}</button><button type="button" className="timezone-toggle" onClick={()=>{setSourceOffset(targetOffset);setTargetOffset(sourceOffset);setUtcInput(false)}}><ArrowLeftRight size={14}/> Vice versa</button></div>
<div className="timezone-countries"><span>COUNTRIES / REGIONS FOR {offsetLabel(targetOffset)}</span><p>{timezoneCountries}</p></div>
</>}
{isColor && (
          <div className="visual-controls">
            {tool === 'Gradient Generator' ? (
              <>
                <label>
                  Start colour
                  <input type="color" value={colorA} onChange={e => setColorA(e.target.value)} />
                </label>
                <label>
                  End colour
                  <input type="color" value={colorB} onChange={e => setColorB(e.target.value)} />
                </label>
              </>
            ) : (
              <>
                <label>
                  Blur <b>{shadowBlur}px</b>
                  <input type="range" min="0" max="80" value={shadowBlur} onChange={e => setShadowBlur(+e.target.value)} />
                </label>
                <label>
                  Vertical offset <b>{shadowY}px</b>
                  <input type="range" min="-30" max="50" value={shadowY} onChange={e => setShadowY(+e.target.value)} />
                </label>
              </>
            )}
          </div>
        )}
        {!isRegex&&!isDiff&&!isRegexGen&&!isTime&&!isColor&&tool!=='Unix Timestamp'&&<textarea className="code-input" value={input} onChange={e=>setInput(e.target.value)} placeholder={placeholder} spellCheck="false"/>}
        {isColor&&<div className={cx('preview-tile',tool==='Shadow Generator'&&'shadow-preview')} style={tool==='Gradient Generator'?{background:`linear-gradient(${angle}deg, ${colorA}, ${colorB})`}:{boxShadow:`0 ${shadowY}px ${shadowBlur}px rgba(0,0,0,.82), 0 ${Math.max(2,shadowBlur/5)}px ${Math.max(8,shadowBlur/2)}px rgba(0,0,0,.45)`}}>{tool==='Gradient Generator'?'Gradient preview':'Shadow preview'}</div>}
        {tool==='Gradient Generator'&&<label className="range-label">Angle <b>{angle}°</b><input type="range" min="0" max="360" value={angle} onChange={e=>setAngle(+e.target.value)}/></label>}
        <div className="editor-actions"><button className="button-primary" onClick={run}><WandSparkles size={16}/> Run tool <ChevronRight size={16}/></button><span className="privacy-note"><ShieldCheck size={14}/> Processed in your browser</span></div>
      </div>
      <div className="editor-card output-card">
        <div className="panel-top"><span className="output-dot"/> <span className="panel-label">OUTPUT</span><div className="spacer"/><button className="icon-button" title="Copy output" onClick={()=>{if(output){navigator.clipboard?.writeText(output);setCopied(true);setTimeout(()=>setCopied(false),1400)}}}>{copied?<Check size={15}/>:<Copy size={15}/>}</button><button className="icon-button" title="Download output" onClick={()=>downloadText(output||'',tool.toLowerCase().replace(/[^a-z0-9]+/g,'-')+'.txt')}><Download size={15}/></button></div>
        {isCssRunner&&cssPreview&&<div className="css-preview-wrap"><div className="preview-caption">LIVE PREVIEW · SANDBOXED</div><iframe className="css-runner-frame" title="CSS Runner preview" sandbox="" srcDoc={`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:24px;font:15px system-ui;background:#f5f7f6;color:#1c2c22}button{padding:8px 12px;border:1px solid #aaa;border-radius:6px;cursor:pointer} ${cssPreview.replace(/<\/style/gi,'')}</style></head><body>${sampleHtml.replace(/<script[\s\S]*?<\/script>/gi,'')}</body></html>`}/></div>}
        {output?<pre className={cx('output-content',output.startsWith('Error:')&&'error-output')}>{output}</pre>:<div className="empty-output"><div className="empty-icon"><Code2 size={26}/></div><strong>Your output will appear here</strong><p>Run the tool to transform your input.</p><span>⌘ / Ctrl + Enter</span></div>}
        {output&&!output.startsWith('Error:')&&<div className="output-footer"><span><Check size={13}/> Ready</span><span>{output.length.toLocaleString()} characters</span></div>}
      </div>
    </div>
  </div>;
}
const slugForTool = tool => tool.toLowerCase().replace(/→/g, '-to-').replace(/↔/g, '-').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const toolFromPath = path => {
  const slug = path.replace(/^\/+|\/+$/g, '');
  if (!slug) return '';
  return groups.flatMap(group => group.tools).find(tool => slugForTool(tool) === slug) || '';
};
export default function App() {
  const [active,setActive]=useState(()=>toolFromPath(window.location.pathname));
  const [query,setQuery]=useState('');
  const [mobileOpen,setMobileOpen]=useState(false);
  const [installPrompt,setInstallPrompt]=useState(null);
  const filtered=useMemo(()=>groups.map(g=>({...g,tools:g.tools.filter(t=>t.toLowerCase().includes(query.toLowerCase())||g.name.toLowerCase().includes(query.toLowerCase()))})).filter(g=>g.tools.length),[query]);
  useEffect(()=>{
    const syncRoute=()=>{setActive(toolFromPath(window.location.pathname));setMobileOpen(false);};
    window.addEventListener('popstate',syncRoute);
    return ()=>window.removeEventListener('popstate',syncRoute);
  },[]);
  useEffect(()=>{
    document.title = active ? `${active} — FreeDev` : 'FreeDev — Developer Toolbox';
  },[active]);
  useEffect(()=>{const captureInstall=e=>{e.preventDefault();setInstallPrompt(e);};window.addEventListener('beforeinstallprompt',captureInstall);return()=>window.removeEventListener('beforeinstallprompt',captureInstall);},[]);
  const installApp=async()=>{if(installPrompt){installPrompt.prompt();await installPrompt.userChoice;setInstallPrompt(null);return;}alert('To install FreeDev, open your browser menu and choose “Install app” or “Add to Home screen” if available.');};
  const goHome=()=>{
    window.history.pushState({},'', '/');
    setActive('');
    setQuery('');
    setMobileOpen(false);
    window.scrollTo({top:0,behavior:'smooth'});
  };
  const selectTool=t=>{
    window.history.pushState({},'', `/${slugForTool(t)}`);
    setActive(t);
    setMobileOpen(false);
    window.scrollTo({top:0,behavior:'smooth'});
  };
  const allTools=groups.flatMap(group=>group.tools.map(tool=>({tool,group})));
  return <div className="app-shell">
    <aside className={cx('sidebar',mobileOpen&&'sidebar-open')}>
      <a className="brand" href="/" onClick={e=>{e.preventDefault();goHome()}}><span className="brand-mark"><Code2 size={24}/></span><span><strong>Free<span>Dev</span></strong><small>DEVELOPER TOOLBOX</small></span></a>
      <div className="sidebar-search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Find a tool…"/><kbd>/</kbd></div>
      <button className={cx('nav-home',!active&&'selected')} onClick={goHome}><span className="nav-symbol"><Sparkles size={17}/></span> Home <span className="nav-count">32 tools</span></button>
      <div className="nav-label">TOOLKIT</div>
      <nav>{filtered.map(group=><div className="nav-group" key={group.name}><div className="nav-group-title"><group.icon size={15}/><span>{group.name}</span><span className="nav-count">{group.tools.length}</span></div>{group.tools.map(t=><button key={t} className={cx('nav-tool',active===t&&'active')} onClick={()=>selectTool(t)}>{t}<ChevronRight size={13}/></button>)}</div>)}</nav>
      <div className="sidebar-bottom"><div className="local-badge"><span className="pulse"/><span><b>Browser-native</b><small>No uploads. No accounts.</small></span></div><a href="https://github.com/avada-kedavra62442/FreeDev" target="_blank" rel="noreferrer" className="github-link"><Github size={16}/> View on GitHub <ExternalLink size={13}/></a></div>
    </aside>
    {mobileOpen&&<button className="mobile-scrim" onClick={()=>setMobileOpen(false)} aria-label="Close menu"/>}
    <main className="main-area">
      <header className="topbar"><button className="mobile-menu" onClick={()=>setMobileOpen(!mobileOpen)} aria-label="Toggle menu">{mobileOpen?<X/>:<Menu/>}</button><div className="breadcrumbs"><a href="/" onClick={e=>{e.preventDefault();goHome()}}>FreeDev</a><ChevronRight size={14}/><b>{active||'Home'}</b></div><div className="topbar-right"><span className="status-pill"><span className="pulse"/> All systems local</span><button className="install-top" onClick={installApp}><Download size={14}/><span>Install</span></button><a className="github-top" href="https://github.com/avada-kedavra62442/FreeDev" target="_blank" rel="noreferrer"><Github size={16}/><span>GitHub</span></a></div></header>
      {active?<><ToolWorkspace key={active} tool={active} onBack={goHome}/><footer className="site-footer workspace-footer"><a className="brand footer-brand" href="/" onClick={e=>{e.preventDefault();goHome()}}><span className="brand-mark"><Code2 size={21}/></span><span><strong>Free<span>Dev</span></strong><small>Useful tools. No nonsense.</small></span></a><p>Free developer utilities, built for the people who build things.</p><div className="footer-links"><a href="https://github.com/avada-kedavra62442/FreeDev" target="_blank" rel="noreferrer">GitHub <ExternalLink size={12}/></a><a href="mailto:aarav.krish62442@gmail.com">Developer contact</a><span>Free forever · No account required</span></div><div className="copyright">© {new Date().getFullYear()} FreeDev. Built to be useful.</div></footer></>:<div className="home-view">
        <section className="hero"><div className="hero-glow"/><div className="hero-content"><div className="eyebrow"><span className="pulse"/> THE TOOLKIT BUILT FOR BUILDERS</div><h1>Less busywork.<br/><span>More building.</span></h1><p>A focused collection of everyday developer utilities. Fast, thoughtfully designed, and free — no accounts, no paywalls, no nonsense.</p><div className="hero-actions"><button className="button-primary" onClick={()=>document.getElementById('all-tools')?.scrollIntoView({behavior:'smooth'})}><Braces size={17}/> Explore all 32 tools <ChevronRight size={16}/></button><span className="hero-note"><ShieldCheck size={15}/> Your data stays in your browser</span></div></div><div className="hero-art"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="glass-code"><div className="code-head"><span/><span/><span/><small>freedev.config</small></div><div className="code-lines"><span><i>01</i><b>const</b> toolkit = {'{'}</span><span><i>02</i>&nbsp; free: <em>true</em>,</span><span><i>03</i>&nbsp; friction: <em>null</em>,</span><span><i>04</i>&nbsp; tools: <u>32</u></span><span><i>05</i>{'}'};</span><span><i>06</i><strong>buildSomething();</strong></span></div><div className="code-foot"><span className="pulse"/> READY TO SHIP <span>UTF-8</span></div></div><div className="floating-chip chip-top"><Braces size={15}/> JSON <span>↗</span></div><div className="floating-chip chip-bottom"><Zap size={15}/> Instant tools</div></div><div className="hero-bottom"><span>BUILT FOR THE DAILY WORKFLOW</span><div><span><Check size={14}/> 100% free</span><span><Check size={14}/> No sign-up</span><span><Check size={14}/> Private by design</span></div></div></section>
        <section className="section tools-section"><div className="section-heading"><div><div className="eyebrow">YOUR DAILY TOOLBELT</div><h2>Tools for every<br/><span>part of the workflow.</span></h2></div><p>Browse by category or jump straight into one of the focused utilities below.</p></div><div className="category-grid">{groups.map(g=><button key={g.name} className="category-card" onClick={()=>document.getElementById(`tool-group-${slugForTool(g.name)}`)?.scrollIntoView({behavior:'smooth',block:'start'})}><div className="category-top"><span className="category-icon"><g.icon size={21}/></span><span className="card-arrow"><ArrowLeftRight size={16}/></span></div><h3>{g.name}</h3><p>{g.tools.length} focused utilities</p><div className="category-tools">{g.tools.slice(0,4).map(t=><span key={t}>{t}</span>)}{g.tools.length>4&&<span>+ more</span>}</div><div className="category-bottom"><span>Browse tools</span><ChevronRight size={16}/></div></button>)}</div></section>
        <section className="section all-tools-section" id="all-tools"><div className="section-heading"><div><div className="eyebrow">32 TOOLS · 8 CATEGORIES</div><h2>Pick a tool.<br/><span>Get straight to work.</span></h2></div><p>Every card opens its own dedicated page and shareable URL. No buried workspaces.</p></div>
          {groups.map(group=><section className="tool-group-section" id={`tool-group-${slugForTool(group.name)}`} key={group.name}><div className="tool-group-heading"><span className="category-icon"><group.icon size={19}/></span><div><h3>{group.name}</h3><p>{group.tools.length} tools</p></div></div><div className="tool-card-grid">{group.tools.map((tool,index)=><button key={tool} className="tool-card" onClick={()=>selectTool(tool)}><div className="tool-card-top"><span className="tool-card-icon"><Code2 size={17}/></span><span className="tool-card-index">{String(index+1).padStart(2,'0')}</span></div><h4>{tool}</h4><p>{descriptions[tool]}</p><span className="tool-card-link">Open tool <ChevronRight size={15}/></span></button>)}</div></section>)}
        </section>
        <section className="section feature-strip"><div className="feature-intro"><div className="eyebrow">THE FREEDEV PROMISE</div><h2>Developer tools.<br/><span>Without the baggage.</span></h2><p>Utilities should save you time, not create another workflow to manage.</p></div><div className="feature-list"><div><span className="feature-icon"><Zap size={19}/></span><section><b>Instant by design</b><p>Results run right in your browser. No waiting on a server round-trip for simple transformations.</p></section></div><div><span className="feature-icon"><ShieldCheck size={19}/></span><section><b>Private by default</b><p>Your pasted code and data stay on your device in these client-side tools.</p></section></div><div><span className="feature-icon"><Sparkles size={19}/></span><section><b>Focused, not bloated</b><p>Clear controls, useful output and no feature walls getting between you and the task.</p></section></div></div></section>
        <section className="cta-band"><div className="cta-orb"/><div><div className="eyebrow">READY WHEN YOU ARE</div><h2>Get back to building.</h2><p>Pick a tool. Paste your input. Get your result. That's the whole workflow.</p></div><button className="button-primary" onClick={()=>selectTool('JSON Formatter')}>Open JSON Formatter <ChevronRight size={16}/></button></section>
        <footer className="site-footer"><a className="brand footer-brand" href="/" onClick={e=>{e.preventDefault();goHome()}}><span className="brand-mark"><Code2 size={21}/></span><span><strong>Free<span>Dev</span></strong><small>Useful tools. No nonsense.</small></span></a><p>Free developer utilities, built for the people who build things.</p><div className="footer-links"><a href="https://github.com/avada-kedavra62442/FreeDev" target="_blank" rel="noreferrer">GitHub <ExternalLink size={12}/></a><span>Free forever · No account required</span></div><div className="copyright">© {new Date().getFullYear()} FreeDev. Built to be useful.</div></footer>
      </div>}
    </main>
  </div>;
}
