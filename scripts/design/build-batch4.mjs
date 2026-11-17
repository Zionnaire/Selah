// Generates the batch 4 design mockups (account, sync, notifications, feedback components).
//
//   node scripts/design/build-batch4.mjs
//
// Output: docs/design/source/30-*.html to 39-*.html. They share selah.css and selah-batch4.css and
// follow the conventions of the earlier mockups. Icons are the same Lucide set the app uses.
// The pages are visual references, not production code. Sample people and dates are made up.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = join(root, 'docs', 'design', 'source');
const ICONS = join(root, 'Frontend', 'node_modules', 'lucide-react', 'dist', 'esm', 'icons');

// ---------- icons ----------
const NAMES = [
  'mail', 'lock', 'eye', 'eye-off', 'triangle-alert', 'circle-check', 'check', 'cloud-upload', 'monitor-smartphone',
  'wifi-off', 'laptop', 'smartphone', 'tablet', 'refresh-cw', 'bell', 'shield-alert', 'download', 'x', 'info', 'undo-2',
  'arrow-left', 'git-merge', 'copy', 'cloud-off', 'hard-drive', 'log-out', 'file-text', 'pen-line', 'bookmark',
  'key-round', 'arrow-right', 'circle-alert', 'history', 'layers', 'circle-check-big', 'cloud', 'loader', 'trash-2', 'rotate-cw',
  'chevron-right', 'user-round', 'languages', 'search', 'send',
];
const iconNodes = new Map();
for (const name of NAMES) {
  let src;
  try {
    src = readFileSync(join(ICONS, `${name}.js`), 'utf8');
  } catch {
    continue;
  }
  src = src
    .replace(/import createLucideIcon[^\n]*\n/, 'const createLucideIcon = (n, node) => node;\n')
    .replace(/export \{ (\w+) as default \};/, 'export default $1;')
    .replace(/\/\/# sourceMappingURL.*/, '');
  const mod = await import(`data:text/javascript;base64,${Buffer.from(src).toString('base64')}`);
  iconNodes.set(name, mod.default);
}
const ic = (name, size = 18, cls = '') => {
  const node = iconNodes.get(name);
  if (!node) throw new Error(`Missing icon: ${name}`);
  const inner = node
    .map(([tag, attrs]) => `<${tag} ${Object.entries(attrs).filter(([k]) => k !== 'key').map(([k, v]) => `${k}="${v}"`).join(' ')}/>`)
    .join('');
  return `<svg class="i ${cls}" viewBox="0 0 24 24" width="${size}" height="${size}" stroke-width="1.7" aria-hidden="true">${inner}</svg>`;
};

// ---------- shared pieces ----------
const doc = (title, body, { bodyClass = '', style = '' } = {}) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>SELAH: ${title}</title>
<link rel="stylesheet" href="selah.css">
<link rel="stylesheet" href="selah-batch4.css">
${style ? `<style>${style}</style>` : ''}
</head>
<body class="${bodyClass}">
${body}
</body>
</html>
`;

const RAIL_NAV = `<a href="01-overview.html"><svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>Overview</a><a href="02-bible-reader.html"><svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5a2 2 0 0 1 2-2h13v15H6a2 2 0 0 0-2 2zM4 20a2 2 0 0 0 2 1h13M9 7h6"/></svg>Bible</a><a href="03-study-workspace.html"><svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4"/></svg>Study &amp; Research</a><a href="04-sermon-studio-home.html"><svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4"/></svg>Sermon Studio</a><a href="08-pulpit-prepare.html"><svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><path d="M5 8h14l-2 4H7zM12 12v8M8 20h8M12 4v4"/></svg>Pulpit</a><a href="23-library-dashboard.html"><svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h4v16H4zM10 4h4v16h-4zM15.5 5.2l3.4-.9 3.6 14.6-3.4.9z"/></svg>My Library</a>`;
const SETTINGS_LINK = (on) => `<a href="29-settings.html" class="${on ? 'on' : ''}"><svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h10M18 7h2M4 17h4M12 17h8M16 5v4M10 15v4"/></svg>Settings</a>`;

const rail = ({ settingsOn = false, sync = '<div class="sync"><span class="dot"></span>Synced 2 minutes ago</div>' } = {}) => `<aside class="rail" aria-label="Main navigation">
  <div class="brand"><img class="mark" src="../brand/selah-symbol-gold.svg" alt=""><img class="word" src="../brand/selah-wordmark-ivory.svg" alt="SELAH"></div>
  <nav>${RAIL_NAV}<div class="sep"></div>${SETTINGS_LINK(settingsOn)}</nav>
  <div class="foot">${sync}<div class="me"><span class="avatar">DA</span><div><div style="font-weight:600">Pastor Daniel A.</div><div class="small" style="color:#8C93A3">Grace Assembly, Abuja</div></div></div></div>
</aside>`;

const settingsNav = (active) => `<nav class="ln" style="border-right:1px solid var(--stone-200);padding:16px 12px">${['Profile', 'Security', 'Bible preferences', 'Reading', 'Appearance', 'AI preferences', 'Notifications', 'Offline storage', 'Sync', 'Privacy', 'About'].map((n) => `<a class="${n === active ? 'on' : ''}" href="#">${n}</a>`).join('')}</nav>`;

const brandSide = (content) => `<aside class="auth-side">
  <span class="ray" aria-hidden="true"></span>
  <div class="brand"><img class="mark" src="../brand/selah-symbol-gold.svg" alt=""><img class="word" src="../brand/selah-wordmark-ivory.svg" alt="SELAH"></div>
  <div class="copy">${content}</div>
  <div class="legal">Scripture is public domain. Cross-references: OpenBible.info, CC BY.</div>
</aside>`;

const pointsList = (items) => `<ul class="points">${items.map(([i, t, d]) => `<li><span class="ic">${ic(i, 18)}</span><div><b>${t}</b><span>${d}</span></div></li>`).join('')}</ul>`;

const field = (label, input, { hint = '', optional = false } = {}) =>
  `<div class="field"><label>${label}${optional ? ' <span class="opt">(optional)</span>' : ''}</label>${input}${hint ? `<div class="hint">${hint}</div>` : ''}</div>`;
const input = (value = '', ph = '', cls = '', type = 'text') => `<div class="input ${cls}" style="${value ? '' : 'color:var(--ink-3)'}">${value || ph}</div>`;
const pwInput = (dots = '••••••••••••', cls = '', shown = false) =>
  `<div class="pw"><div class="input ${cls}" style="letter-spacing:${shown ? '0' : '2px'}">${dots}</div><span class="eye">${ic(shown ? 'eye-off' : 'eye', 18)}</span></div>`;
const check = (ok, text) => `<li class="${ok ? 'ok' : ''}"><span class="tick">${ok ? ic('check', 11) : ''}</span>${text}</li>`;

const statusbar = '<div class="statusbar"><span>9:41</span><span style="font-weight:500;font-size:12px">5G &nbsp;100%</span></div>';
const phone = (inner, caption) => `<figure><div class="phone"><div class="screen">${statusbar}${inner}</div></div><figcaption>${caption}</figcaption></figure>`;

const pages = {};

// =============================================================== 30 login
pages['30-auth-login.html'] = doc(
  'Sign in',
  `<div class="auth">
  ${brandSide(`<h2>Your work stays with you.</h2>
    <p class="lede">Your Bible, studies and sermons are saved on this device first, so SELAH works without internet. An account adds a backup and the same work on every device.</p>
    ${pointsList([
      ['cloud-upload', 'Backed up for you', 'Changes are sent to your account whenever you are online.'],
      ['monitor-smartphone', 'The same work on every device', 'Start on a laptop, preach from a tablet.'],
      ['wifi-off', 'Offline never stops working', 'No signal at the pulpit is fine. Nothing waits on the internet.'],
    ])}`)}
  <main class="auth-main">
    <div class="auth-card">
      <h1>Sign in</h1>
      <p class="sub">Welcome back. Pick up where you left off.</p>
      <form class="form" onsubmit="return false">
        ${field('Email', input('daniel@gracechurch.example'))}
        ${field('Password', pwInput())}
        <div class="row2"><span class="check-row"><span class="box on">${ic('check', 12)}</span>Stay signed in on this device</span><a class="link" href="32-auth-recovery.html">Forgot password?</a></div>
        <button class="btn primary block" type="button">Sign in</button>
        <div class="divider">or</div>
        <div><button class="btn block" type="button">Continue without an account</button>
        <p class="alt-note">Everything works on this device. Create an account later and nothing is lost.</p></div>
      </form>
      <p style="margin:26px 0 0;font-size:14px;color:var(--ink-2)">New to SELAH? <a class="link" href="31-auth-register.html">Create an account</a></p>
      <div class="foot-links"><a href="#">Privacy notice</a><a href="#">Terms</a><a href="#">Help</a></div>
    </div>
  </main>
</div>`,
);

// =============================================================== 31 register
pages['31-auth-register.html'] = doc(
  'Create account',
  `<div class="auth">
  ${brandSide(`<h2>What an account adds.</h2>
    <p class="lede">Nothing you already use changes. An account adds safety and convenience on top of a SELAH that already works.</p>
    ${pointsList([
      ['cloud-upload', 'A backup', 'If a device is lost or cleared, your sermons and notes are not.'],
      ['monitor-smartphone', 'Every device, one library', 'Sign in on a tablet and your work is there.'],
      ['search', 'The SELAH assistant', 'Up to 25 questions a day. Your own study always comes first.'],
    ])}`)}
  <main class="auth-main">
    <div class="auth-card">
      <h1>Create your account</h1>
      <p class="sub">It takes a minute. If you already have work on this device, it comes with you.</p>
      <form class="form" onsubmit="return false">
        ${field('Your name', input('Daniel Adeyemi'))}
        ${field('Email', input('daniel@gracechurch.example'))}
        <div class="field"><label>Password</label>${pwInput('••••••••••••••', 'focus')}
          <ul class="checks">${check(true, 'At least 10 characters')}${check(true, 'Letters and a number')}</ul></div>
        ${field('Church or ministry', input('Grace Assembly, Abuja'), { optional: true, hint: 'Shown on your profile and on exported sermons.' })}
        <div class="check-row"><span class="box on">${ic('check', 12)}</span><span>I have read the <a class="link" href="#">Privacy notice</a> and agree to the <a class="link" href="#">Terms</a>.</span></div>
        <button class="btn primary block" type="button">Create account</button>
      </form>
      <p style="margin:24px 0 0;font-size:14px;color:var(--ink-2)">Already have an account? <a class="link" href="30-auth-login.html">Sign in</a></p>
      <div class="foot-links"><a href="#">Privacy notice</a><a href="#">Terms</a><a href="#">Help</a></div>
    </div>
  </main>
</div>`,
);

// =============================================================== 32 recovery flow
pages['32-auth-recovery.html'] = doc(
  'Password recovery',
  `<div class="page-canvas">
  <h1>Password recovery</h1>
  <p class="caption">Three steps. The wording never reveals whether an email has an account, and finishing signs the account out of every other device.</p>
  <div class="flow three">
    <div><div class="step"><b>1</b>Ask for a link</div>
      <div class="card4">
        <div class="icon-badge">${ic('key-round', 22)}</div>
        <h2>Reset your password</h2>
        <p class="sub">Enter the email you signed up with and we will send you a link.</p>
        <div class="form">${field('Email', input('daniel@gracechurch.example', '', 'focus'))}
        <button class="btn primary block" type="button">Send reset link</button>
        <a class="link" style="text-align:center;border:0" href="30-auth-login.html">${ic('arrow-left', 14)} Back to sign in</a></div>
      </div></div>
    <div><div class="step"><b>2</b>Check your email</div>
      <div class="card4 center">
        <div class="icon-badge ok" style="margin-inline:auto">${ic('mail', 22)}</div>
        <h2>Check your email</h2>
        <p class="sub">If an account exists for <b style="color:var(--ink)">daniel@gracechurch.example</b>, a link is on its way. It works for 30 minutes.</p>
        <div class="alert info" style="text-align:left;margin-bottom:18px">${ic('info', 16)}<span>Nothing arrived? Check your spam folder, and make sure the address is spelled correctly.</span></div>
        <button class="btn block dis" type="button">Send again in 0:42</button>
        <p class="alt-note"><a class="link" href="#">Use a different email</a></p>
      </div></div>
    <div><div class="step"><b>3</b>Choose a new password</div>
      <div class="card4">
        <div class="icon-badge">${ic('lock', 22)}</div>
        <h2>Choose a new password</h2>
        <p class="sub">Pick something you do not use anywhere else.</p>
        <div class="form">
          <div class="field"><label>New password</label>${pwInput('••••••••••••', 'focus')}
            <ul class="checks">${check(true, 'At least 10 characters')}${check(false, 'Letters and a number')}</ul></div>
          <div class="field"><label>Confirm new password</label>${pwInput('••••••••')}</div>
          <div class="alert warn">${ic('triangle-alert', 16)}<span>Saving signs you out of SELAH on every other device. Work saved on those devices is kept.</span></div>
          <button class="btn primary block" type="button">Save password</button>
        </div>
      </div></div>
  </div>
</div>`,
  { bodyClass: 'plain' },
);

// =============================================================== 33 guest to account
pages['33-account-flows.html'] = doc(
  'Guest to account',
  `<div class="page-canvas">
  <h1>From guest to account</h1>
  <p class="caption">Reached from Settings, Account, or the Guest line at the bottom of the rail. It never blocks anything. Neither choice deletes work on either side.</p>
  <div class="flow three">
    <div><div class="step"><b>1</b>Offer</div>
      <div class="stage dark"><div class="dialog">
        <div class="icon-badge" style="background:var(--stone-200)">${ic('cloud-upload', 22)}</div>
        <h3>Back up your work</h3>
        <p>You are using SELAH as a guest, so your work is saved on this device only. If it is lost or cleared, your work goes with it.</p>
        <ul class="sumlist">
          <li><span>Sermons</span><span class="n">12</span></li>
          <li><span>Notes</span><span class="n">31</span></li>
          <li><span>Studies</span><span class="n">6</span></li>
          <li><span>Highlights and bookmarks</span><span class="n">48</span></li>
        </ul>
        <p class="small muted" style="margin:10px 0 0">Downloaded Bibles and offline data are not uploaded. Each device keeps its own.</p>
        <div class="actions"><button class="btn ghost" type="button">Not now</button><button class="btn primary" type="button">Create account</button></div>
      </div></div></div>
    <div><div class="step"><b>2</b>Signing in to an existing account on a device with work</div>
      <div class="stage dark"><div class="dialog">
        <h3>This device has work that is not in this account yet</h3>
        <p>You are signing in as <b>daniel@gracechurch.example</b>. What should happen to the 12 sermons and 31 notes saved here?</p>
        <div class="choice on"><span class="radio"></span><div><b>Add it to your account <span class="tag">Recommended</span></b><span>It is added alongside what is already in the account. Nothing is replaced or removed.</span></div></div>
        <div class="choice"><span class="radio"></span><div><b>Keep it on this device only</b><span>It stays here and is not backed up. You can add it later in Settings, Sync.</span></div></div>
        <div class="actions"><button class="btn ghost" type="button">Cancel sign in</button><button class="btn primary" type="button">Continue</button></div>
      </div></div></div>
    <div><div class="step"><b>3</b>Backing up</div>
      <div class="stage dark"><div class="dialog">
        <div class="icon-badge ok">${ic('refresh-cw', 22)}</div>
        <h3>Backing up your work</h3>
        <p>You can keep using SELAH. If you close it, the backup pauses and carries on next time.</p>
        <div class="bar" style="margin:6px 0 10px"><i style="width:68%"></i></div>
        <div class="inline small" style="justify-content:space-between"><span>Sermons done, notes in progress</span><span class="muted">34 of 49 items</span></div>
        <div class="actions"><button class="btn" type="button">Hide</button></div>
      </div></div></div>
  </div>
</div>`,
  { bodyClass: 'plain' },
);

// =============================================================== 34 sync settings
pages['34-sync-settings.html'] = doc(
  'Settings: Sync',
  `<div class="shell">
${rail({ settingsOn: true })}
<main class="main">
<div class="topbar"><h1>Settings</h1><div class="spacer"></div></div>
<div style="display:grid;grid-template-columns:220px 1fr">
${settingsNav('Sync')}
<section style="padding:26px 40px;max-width:860px">
  <h2 class="page" style="font-size:32px">Sync</h2>
  <p class="lead" style="color:var(--ink-3);margin:6px 0 22px;max-width:70ch">Your work is saved on this device first. Sync keeps a backup in your account and brings the same work to your other devices.</p>

  <div class="status-hero">
    <span class="badge">${ic('circle-check-big', 24)}</span>
    <div style="flex:1"><div class="big">Everything is backed up</div><div class="small muted">Last synced 2 minutes ago. Nothing is waiting to send.</div></div>
    <button class="btn" type="button">${ic('refresh-cw', 15)} Sync now</button>
  </div>

  <h3 class="sect" style="font-size:20px">Your devices</h3>
  <div class="devices">
    <div class="dev"><span class="ico">${ic('laptop', 20)}</span><div><b>Windows laptop, Chrome <span class="chip ok" style="margin-left:6px">This device</span></b><small>Active now. Signed in 14 Nov.</small></div><button class="btn ghost sm" type="button">Rename</button></div>
    <div class="dev"><span class="ico">${ic('tablet', 20)}</span><div><b>iPad, Safari</b><small>Last synced yesterday at 18:20.</small></div><span class="inline"><button class="btn ghost sm" type="button">Rename</button><button class="btn sm" type="button">Sign out</button></span></div>
    <div class="dev"><span class="ico">${ic('smartphone', 20)}</span><div><b>Pixel phone, Chrome</b><small>Last synced 9 Nov at 07:45.</small></div><span class="inline"><button class="btn ghost sm" type="button">Rename</button><button class="btn sm" type="button">Sign out</button></span></div>
  </div>

  <h3 class="sect" style="font-size:20px">What syncs</h3>
  <div class="devices"><table class="kinds"><tbody>
    <tr><td>${ic('pen-line', 16)} &nbsp;Sermons</td><td>12</td></tr>
    <tr><td>${ic('file-text', 16)} &nbsp;Notes</td><td>31</td></tr>
    <tr><td>${ic('search', 16)} &nbsp;Studies</td><td>6</td></tr>
    <tr><td>${ic('bookmark', 16)} &nbsp;Highlights and bookmarks</td><td>48</td></tr>
  </tbody></table></div>
  <p class="small muted" style="margin:10px 0 0">Bibles, cross-references, word study and the dictionary never sync. Each device downloads its own.</p>

  <h3 class="sect" style="font-size:20px">Preferences</h3>
  <div class="sr"><div><b>Sync automatically</b><div class="small muted">Sends changes a few seconds after you stop writing, when you are online. Turn it off to sync only when you choose Sync now.</div></div><span class="tgl on"></span></div>
  <div class="sr" style="border-bottom:0"><div><b>Sign out of this device</b><div class="small muted">Your work stays on this device. It stops syncing until you sign in again.</div></div><button class="btn" type="button">${ic('log-out', 15)} Sign out</button></div>
</section></div>
</main></div>`,
);

// =============================================================== 35 conflict
const chg = (t) => `<span class="chg">${t}</span>`;
pages['35-sync-conflict.html'] = doc(
  'Resolve differences',
  `<div>
<div class="topbar" style="background:var(--stone-100)">
  <a href="04-sermon-studio-home.html" style="display:flex;align-items:center;gap:6px;text-decoration:none;color:var(--ink-3);font-size:14px">${ic('arrow-left', 16)} Sermon Studio</a>
  <h1 style="font:600 20px var(--font-display);color:var(--navy);margin-left:8px">The Power of a Transformed Mind</h1>
  <span class="chip warn">1 needs your choice</span>
  <div class="spacer"></div>
  <span class="small muted">Both versions are kept for 30 days, whatever you choose.</span>
</div>
<div class="cx">
  <aside class="cx-list">
    <h3>Sections</h3>
    ${['Introduction', '1. A living sacrifice'].map((s) => `<div class="cx-item"><span class="st">${ic('circle-check', 18)}</span><div>${s}<small>Merged automatically</small></div></div>`).join('')}
    <div class="cx-item on need"><span class="st">${ic('circle-alert', 18)}</span><div><b>2. Rejecting conformity</b><small>Changed on both devices</small></div></div>
    ${['3. Renewing the mind', 'Conclusion', 'Response and prayer'].map((s) => `<div class="cx-item"><span class="st">${ic('circle-check', 18)}</span><div>${s}<small>Merged automatically</small></div></div>`).join('')}
    <div class="alert info" style="margin:18px 6px 0">${ic('info', 16)}<span>Sections you changed on only one device merged without asking.</span></div>
  </aside>
  <section class="cx-main">
    <h2>2. Rejecting conformity</h2>
    <p class="muted" style="margin:0;max-width:70ch">You changed this section on both your Windows laptop and your iPad. Choose which to keep, or keep both. Highlighted words are the differences.</p>
    <div class="cmp">
      <div class="ver on">
        <div class="hd"><span class="ico">${ic('laptop', 18)}</span><div><b>This device, Windows laptop</b><small>Edited today at 09:14</small></div></div>
        <div class="txt">
          <p>The world presses its shape onto us every day. ${chg('It does not announce itself.')} Conformity is quiet. It happens by default.</p>
          <p>&ldquo;Be not conformed&rdquo; is a command, not a suggestion. ${chg('Hold up the clay and let them see it take the mould.')}</p>
        </div>
        <div class="pick"><span class="radio"></span>Keep this version</div>
      </div>
      <div class="ver">
        <div class="hd"><span class="ico">${ic('tablet', 18)}</span><div><b>Your iPad</b><small>Edited today at 08:51</small></div></div>
        <div class="txt">
          <p>The world presses its shape onto us every day. Conformity is quiet. It happens by default. ${chg('Nobody decides to drift.')}</p>
          <p>&ldquo;Be not conformed&rdquo; is a command, not a suggestion. ${chg('Ask the room what shape they are in.')}</p>
        </div>
        <div class="pick"><span class="radio"></span>Keep the iPad version</div>
      </div>
    </div>
    <div class="both"><span class="radio"></span><div><b>Keep both</b><div class="small muted">The iPad version is added after this section as &ldquo;2. Rejecting conformity (iPad)&rdquo; so you can combine them yourself.</div></div></div>
  </section>
</div>
<div class="cx-foot"><button class="btn ghost" type="button">Decide later</button><span class="small muted">Until you decide, this device's version stays in use and this sermon waits to sync. Everything else keeps syncing.</span><span class="spacer"></span><button class="btn primary" type="button">Save choice</button></div>
</div>`,
);

// =============================================================== 36 notifications
const notifItem = ({ icon, kind = '', title, body, when, unread = false, acts = '' }) =>
  `<div class="nitem ${unread ? 'unread' : ''}"><span class="ico ${kind}">${ic(icon, 18)}</span><div><b>${title}</b><p>${body}</p><div class="when">${when}</div>${acts ? `<div class="acts">${acts}</div>` : ''}</div></div>`;
pages['36-notifications.html'] = doc(
  'Notifications',
  `<div class="shell">
${rail({ sync: '<div class="sync"><span class="dot pending"></span>1 sermon needs your choice</div>' })}
<main class="main" style="position:relative">
<div class="topbar"><h1>Overview</h1><div class="spacer"></div><span class="bell on">${ic('bell', 19)}<span class="n">2</span></span></div>
<div class="dim" style="padding:34px 40px">
  <div style="font:600 40px var(--font-display);color:var(--navy)">Sunday is four days away.</div>
  <div class="grid3" style="margin-top:26px">
    <div class="cardx" style="height:170px"></div><div class="cardx" style="height:170px"></div><div class="cardx" style="height:170px"></div>
  </div>
</div>
<div class="notif" role="dialog" aria-label="Notifications">
  <header><b>Notifications</b><span class="spacer"></span><a href="#">Mark all as read</a></header>
  <div class="group">Needs you</div>
  ${notifItem({ icon: 'git-merge', kind: 'warn', title: 'A sermon changed on two devices', body: 'The Power of a Transformed Mind. Most of it merged. One section needs your choice.', when: 'Today, 09:20', unread: true, acts: '<button class="btn primary sm" type="button">Review</button><button class="btn sm" type="button">Later</button>' })}
  ${notifItem({ icon: 'shield-alert', kind: 'sec', title: 'New sign in to your account', body: 'Chrome on Windows, today at 09:02. If this was not you, secure your account.', when: 'Today, 09:02', unread: true, acts: '<button class="btn sm" type="button">That was me</button><button class="btn sm danger" type="button">Secure account</button>' })}
  <div class="group">Earlier</div>
  ${notifItem({ icon: 'circle-check', kind: 'ok', title: 'Berean Standard Bible is ready offline', body: 'Downloaded and stored on this device.', when: 'Yesterday, 18:20' })}
  ${notifItem({ icon: 'refresh-cw', kind: 'info', title: 'A new version of SELAH is ready', body: 'Reload when it suits you. Your work is saved.', when: '12 Nov', acts: '<button class="btn sm" type="button">Reload</button>' })}
  ${notifItem({ icon: 'undo-2', title: 'A note came back', body: 'You edited &ldquo;Mercy first&rdquo; on your iPad after deleting it here, so it was restored.', when: '9 Nov' })}
  <footer><a class="link" href="29-settings.html">Notification settings</a></footer>
</div>
</main></div>`,
);

// =============================================================== 37 components
const toast = (kind, icon, title, sub = '', extra = '') =>
  `<div class="toast ${kind}">${ic(icon, 18, 'lead')}<div class="t">${title}${sub ? `<small>${sub}</small>` : ''}</div>${extra}</div>`;
const railState = (dot, text, small = '') =>
  `<div class="syncstate"><span class="dot ${dot}"></span><div>${text}${small ? `<span class="sm">${small}</span>` : ''}</div></div>`;
pages['37-feedback-components.html'] = doc(
  'Feedback components',
  `<div class="page-canvas">
  <h1>Feedback components</h1>
  <p class="caption">Toasts, banners, dialogs and sync states. Calm, specific wording: say what happened and what to do. Never claim &ldquo;synced&rdquo; when work is only on the device.</p>
  <div class="spec">
    <div class="specgrid">
      <section><h3>Toasts</h3><div class="stack">
        ${toast('ok', 'circle-check', 'Sermon exported', 'Saved to your downloads.', '<button class="x" aria-label="Dismiss">' + ic('x', 16) + '</button>')}
        ${toast('info', 'refresh-cw', 'Syncing 3 changes', '', '')}
        ${toast('warn', 'wifi-off', 'You are offline', 'Changes are saved on this device and will sync later.', '')}
        ${toast('err', 'triangle-alert', 'Could not save', 'Keep this tab open and try again.', '<button class="act">Try again</button>')}
        ${toast('ok', 'trash-2', 'Moved to Recently deleted', '', '<button class="act">Undo</button>')}
      </div></section>
      <section><h3>Banners</h3><div class="stack">
        <div class="banner warn">${ic('wifi-off', 18)}<span><b>Offline.</b> Everything you need is on this device. SELAH assistant needs internet.</span></div>
        <div class="banner warn">${ic('hard-drive', 18)}<span><b>This browser is not keeping data.</b> Close other SELAH tabs, or your work will be lost when you close this one.</span><span class="spacer"></span><button class="btn" type="button">How to fix</button></div>
        <div class="banner info">${ic('rotate-cw', 18)}<span>A new version of SELAH is ready.</span><span class="spacer"></span><button class="btn" type="button">Reload</button></div>
        <div class="banner err">${ic('triangle-alert', 18)}<span><b>Your session ended.</b> Your work is safe on this device. Sign in to keep syncing.</span><span class="spacer"></span><button class="btn" type="button">Sign in</button></div>
      </div>
      <h3 style="margin-top:24px">Sync states (rail footer)</h3>
      <div class="stack" style="background:var(--navy);padding:14px;border-radius:12px">
        ${railState('ok', 'Synced 2 minutes ago')}
        ${railState('busy', 'Syncing', '3 changes')}
        ${railState('wait', 'Waiting to sync', '5 changes on this device')}
        ${railState('off', 'Offline', 'Saved on this device')}
        ${railState('bad', '1 sermon needs your choice')}
        ${railState('off', 'Signed out', 'Working on this device')}
      </div></section>
    </div>

    <section><h3>Dialogs</h3>
      <div class="flow three">
        <div class="stage dark"><div class="dialog"><h3>Delete this sermon?</h3><p>It moves to Recently deleted for 30 days, where you can restore it.</p><div class="actions"><button class="btn" type="button">Cancel</button><button class="btn danger" type="button">Delete</button></div></div></div>
        <div class="stage dark"><div class="dialog"><h3>Sign out with unsynced work?</h3><p>5 changes on this device have not been backed up. They stay here, and sync the next time you sign in on this device.</p><div class="actions"><button class="btn" type="button">Stay signed in</button><button class="btn primary" type="button">Sign out</button></div></div></div>
        <div class="stage dark"><div class="dialog"><h3>Your session ended</h3><p>For your security you were signed out. Your work is safe on this device. Sign in to start syncing again.</p><div class="actions"><button class="btn" type="button">Not now</button><button class="btn primary" type="button">Sign in</button></div></div></div>
      </div></section>

    <div class="specgrid">
      <section><h3>Buttons</h3><div class="inline">
        <button class="btn primary" type="button">Primary</button><button class="btn" type="button">Secondary</button>
        <button class="btn gilt" type="button">Gold, once per screen</button><button class="btn ghost" type="button">Ghost</button>
        <button class="btn danger" type="button">Destructive</button><button class="btn primary load" type="button"><span class="spin"></span> Signing in</button><button class="btn primary dis" type="button">Disabled</button>
      </div></section>
      <section><h3>Fields</h3><div class="form" style="max-width:380px">
        ${field('Default', input('', 'Placeholder text'))}
        ${field('Focused', input('daniel@gracechurch', '', 'focus'))}
        <div class="field"><label>Error</label>${input('daniel@gracechurch', '', 'err')}<div class="err-msg">${ic('circle-alert', 15)} Enter a full email address, for example name@example.org.</div></div>
        ${field('Disabled', input('Locked while signing in', '', 'dis'))}
      </div></section>
    </div>
  </div>
</div>`,
  { bodyClass: 'plain' },
);

// =============================================================== 38 auth mobile
pages['38-auth-mobile.html'] = doc(
  'Account on mobile',
  `<div class="phones">
${phone(`<div class="m-auth">
  <div class="m-brand"><img class="mark" src="../brand/selah-symbol-navy.svg" alt=""><img class="word" src="../brand/selah-wordmark-navy.svg" alt="SELAH"></div>
  <h1>Sign in</h1><p class="sub">Welcome back. Pick up where you left off.</p>
  <div class="form">${field('Email', input('daniel@gracechurch.example'))}${field('Password', pwInput())}
  <div class="row2"><span></span><a class="link" href="#">Forgot password?</a></div>
  <button class="btn primary block" type="button">Sign in</button><div class="divider">or</div>
  <button class="btn block" type="button">Continue without an account</button></div>
  <p style="margin-top:auto;font-size:14px;color:var(--ink-2);text-align:center">New to SELAH? <a class="link" href="#">Create an account</a></p>
</div>`, 'Sign in')}
${phone(`<div class="m-auth">
  <div class="m-brand"><img class="mark" src="../brand/selah-symbol-navy.svg" alt=""><img class="word" src="../brand/selah-wordmark-navy.svg" alt="SELAH"></div>
  <h1>Create your account</h1><p class="sub">If you have work on this device, it comes with you.</p>
  <div class="form">${field('Your name', input('Daniel Adeyemi'))}${field('Email', input('daniel@gracechurch.example'))}
  <div class="field"><label>Password</label>${pwInput('••••••••••••', 'focus')}<ul class="checks">${check(true, 'At least 10 characters')}${check(true, 'Letters and a number')}</ul></div>
  <div class="check-row"><span class="box on">${ic('check', 12)}</span><span style="font-size:13px">I agree to the <a class="link" href="#">Terms</a> and <a class="link" href="#">Privacy notice</a>.</span></div>
  <button class="btn primary block" type="button">Create account</button></div>
</div>`, 'Create account')}
${phone(`<div class="m-auth" style="text-align:center;align-items:center">
  <div class="m-brand" style="align-self:flex-start"><img class="mark" src="../brand/selah-symbol-navy.svg" alt=""><img class="word" src="../brand/selah-wordmark-navy.svg" alt="SELAH"></div>
  <div class="icon-badge ok" style="margin-top:60px">${ic('mail', 22)}</div>
  <h1>Check your email</h1><p class="sub">If an account exists for <b style="color:var(--ink)">daniel@gracechurch.example</b>, a link is on its way. It works for 30 minutes.</p>
  <div class="alert info" style="text-align:left;width:100%;margin-bottom:16px">${ic('info', 16)}<span>Nothing arrived? Check spam, and the spelling of the address.</span></div>
  <button class="btn block dis" type="button">Send again in 0:42</button>
  <p class="alt-note"><a class="link" href="#">Use a different email</a></p>
</div>`, 'Check your email')}
</div>`,
  { bodyClass: 'plain' },
);

// =============================================================== 39 sync mobile
const mItem = (o) => notifItem(o);
pages['39-sync-mobile.html'] = doc(
  'Sync on mobile',
  `<div class="phones">
${phone(`<div class="m-top">${ic('arrow-left', 20)}<h2>Resolve differences</h2><span class="chip warn">1</span></div>
<div style="padding:16px 18px">
  <b style="font:600 24px var(--font-display);color:var(--navy);display:block">2. Rejecting conformity</b>
  <p class="small muted" style="margin:6px 0 0">Changed on this phone and your iPad. Highlighted words are the differences.</p>
  <div class="tabs2"><span class="on">This phone</span><span>iPad</span></div>
  <div class="ver on" style="padding:14px 16px"><div class="hd"><span class="ico">${ic('smartphone', 16)}</span><div><b>This phone</b><small>Edited today at 09:14</small></div></div>
  <div class="txt" style="font-size:15.5px"><p>The world presses its shape onto us every day. ${chg('It does not announce itself.')} Conformity is quiet.</p><p>&ldquo;Be not conformed&rdquo; is a command. ${chg('Hold up the clay.')}</p></div>
  <div class="pick"><span class="radio"></span>Keep this version</div></div>
  <div class="both" style="font-size:13.5px"><span class="radio"></span><div><b>Keep both</b><div class="small muted">Adds the iPad version as a copy.</div></div></div>
</div>
<div style="position:absolute;left:0;right:0;bottom:0;padding:12px 18px 28px;background:var(--stone-100);border-top:1px solid var(--stone-200);display:flex;gap:10px"><button class="btn" style="flex:1;justify-content:center" type="button">Decide later</button><button class="btn primary" style="flex:1;justify-content:center" type="button">Save choice</button></div>`, 'Conflict, one section at a time')}
${phone(`<div class="m-top"><h2>Notifications</h2><span style="font-size:13px;font-weight:600;color:var(--ink-2)">Mark all read</span></div>
<div class="group" style="padding:12px 18px 2px;font:600 12px var(--font-ui);color:var(--ink-3);text-transform:uppercase;letter-spacing:.04em">Needs you</div>
${mItem({ icon: 'git-merge', kind: 'warn', title: 'A sermon changed on two devices', body: 'One section needs your choice.', when: 'Today, 09:20', unread: true, acts: '<button class="btn primary sm" type="button">Review</button>' })}
${mItem({ icon: 'shield-alert', kind: 'sec', title: 'New sign in to your account', body: 'Chrome on Windows, 09:02.', when: 'Today, 09:02', unread: true, acts: '<button class="btn sm" type="button">That was me</button><button class="btn sm danger" type="button">Secure</button>' })}
<div class="group" style="padding:12px 18px 2px;font:600 12px var(--font-ui);color:var(--ink-3);text-transform:uppercase;letter-spacing:.04em">Earlier</div>
${mItem({ icon: 'circle-check', kind: 'ok', title: 'Berean Standard Bible is ready offline', body: 'Stored on this device.', when: 'Yesterday' })}
${mItem({ icon: 'refresh-cw', kind: 'info', title: 'A new version is ready', body: 'Reload when it suits you.', when: '12 Nov' })}`, 'Notification centre')}
${phone(`<div class="m-top"><h2>Settings</h2></div><div style="padding:16px 18px;opacity:.5"><div class="cardx" style="height:90px;margin-bottom:12px"></div><div class="cardx" style="height:90px"></div></div>
<div class="scrim"></div>
<div class="sheet-bottom"><div class="grab"></div>
  <div class="status-hero" style="padding:14px;margin-bottom:14px"><span class="badge" style="width:40px;height:40px">${ic('circle-check-big', 20)}</span><div style="flex:1"><div class="big" style="font-size:19px">Everything is backed up</div><div class="small muted">Synced 2 minutes ago</div></div></div>
  <button class="btn block" type="button" style="margin-bottom:12px">${ic('refresh-cw', 15)} Sync now</button>
  <div class="devices"><div class="dev"><span class="ico">${ic('smartphone', 18)}</span><div><b>This phone</b><small>Active now</small></div><span></span></div><div class="dev"><span class="ico">${ic('laptop', 18)}</span><div><b>Windows laptop</b><small>Synced 2 minutes ago</small></div><span></span></div></div>
  <p class="small muted" style="margin:12px 0 0">Offline, your work is saved on this phone and sends when you are back online.</p>
</div>`, 'Sync status sheet')}
</div>`,
  { bodyClass: 'plain' },
);

for (const [name, html] of Object.entries(pages)) {
  writeFileSync(join(OUT, name), html);
  console.log('wrote', name);
}
