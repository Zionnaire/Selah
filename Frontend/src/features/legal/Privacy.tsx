import { LEGAL } from './config';
import { Contact, LegalLayout } from './LegalLayout';

/**
 * Written from what the app does, not from a template. If the app changes how it handles data,
 * this page changes in the same piece of work. Statements here that depend on a provider's own
 * terms say so instead of promising on its behalf.
 */
export function Privacy() {
  return (
    <LegalLayout title="Privacy notice">
      <p className="lede">
        SELAH holds sermon drafts, studies and notes. Some of that can be sensitive, so this page says plainly what stays on your device, what
        leaves it, and who handles it. {LEGAL.operator ? `${LEGAL.operator} runs SELAH.` : ''}
      </p>

      <h2>The short version</h2>
      <ul>
        <li>As a guest, your work stays on your device. It is not sent to us.</li>
        <li>With an account, the work you choose to back up is stored on our servers so you can reach it from other devices.</li>
        <li>We do not sell your data, show advertising, or use tracking or analytics tools.</li>
        <li>Suggestions in Sermon Studio send a small part of your sermon to an AI service, only when you ask for them.</li>
        <li>You can delete your account in Settings. That removes what we hold.</li>
      </ul>

      <h2>As a guest</h2>
      <p>
        Everything you write, highlight, bookmark or download is stored in your browser on your own device. We do not receive it. Downloading a
        Bible translation or study data fetches public files from our site, which does not identify you beyond what any website request does.
      </p>

      <h2>With an account</h2>
      <h3>What we collect</h3>
      <ul>
        <li><strong>Account details:</strong> your name, email address, and optionally your church or ministry and a profile picture.</li>
        <li><strong>Your password,</strong> stored only as a one way hash. We cannot read it.</li>
        <li><strong>Sessions:</strong> for each device you sign in on, an identifier, a device name made from your browser and system, and when it was last used. You see this list in Settings and can sign a device out.</li>
        <li>
          <strong>Your work,</strong> when you back it up: sermons, studies, notes, highlights and bookmarks. Each is kept with a version number so devices
          can stay in step. Replaced versions are kept for 30 days so a mistake can be undone. Deleted items are remembered for up to 90 days so other
          devices learn they are gone.
        </li>
        <li><strong>Suggestion use:</strong> a count of how many suggestions your account used each day, to apply the daily limit. Not what you asked or what came back.</li>
        <li>
          <strong>Server logs:</strong> the time, address, page requested and result of each request, kept to run and protect the service. We do not
          write what you typed or the content of your work to logs, and cookies and authorisation headers are removed from them.
        </li>
      </ul>

      <h3>How we use it</h3>
      <p>
        To sign you in, keep your work backed up, keep your devices in sync, send the emails described below, limit abuse, and fix problems. We do
        not use your sermons, studies or notes for anything else.
      </p>

      <h3>On your device</h3>
      <p>
        SELAH keeps a small cookie that keeps you signed in on a device. It is not readable by scripts and is only sent to our sign in address. It lasts
        up to 30 days, or until you close the browser if you chose not to stay signed in. SELAH also stores a few preferences in your browser, such as light
        or dark mode, which panels are open, and who is signed in so the right name shows when you are offline.
      </p>

      <h2>Suggestions in Sermon Studio</h2>
      <p>
        When you press Suggest, SELAH sends your topic, main passage, the Scripture in your sermon, and a short excerpt of each section to an AI service
        provided by Groq, so it can propose points and supporting passages. SELAH does not store the question or the answer. Nothing is sent unless you
        press the button, and you need an account to use it. What Groq does with data it receives is set by Groq's own terms. Do not include names or
        details that could identify someone you are caring for in the sections you send.
      </p>

      <h2>Email</h2>
      <p>
        We send an email when you ask to reset your password. The message and your address pass through our email provider, Resend, to be delivered.
        We do not send marketing email.
      </p>

      <h2>Who else handles data</h2>
      <p>These providers help us run SELAH. They handle data only to provide their service to us.</p>
      <ul>
        <li><strong>Render</strong> hosts the website and the server.</li>
        <li><strong>MongoDB Atlas</strong> stores account and backed up work.</li>
        <li><strong>Resend</strong> delivers email.</li>
        <li><strong>Groq</strong> answers suggestion requests, as described above.</li>
      </ul>
      <p>We do not share your data with anyone else, except where the law requires it.</p>

      <h2>How long we keep it</h2>
      <ul>
        <li>Account and backed up work: until you delete your account, or delete the item.</li>
        <li>Replaced versions: 30 days. Deleted item markers: up to 90 days.</li>
        <li>Password reset links: 30 minutes, and once only.</li>
        <li>Suggestion use counts: a few days.</li>
        <li>Server logs: for as long as needed to run and protect the service.</li>
      </ul>

      <h2>Your choices</h2>
      <ul>
        <li><strong>Use SELAH without an account.</strong> Everything works on your device.</li>
        <li><strong>Keep work off your account.</strong> When you sign in on a device that has guest work, you choose whether to add it or keep it on that device only.</li>
        <li><strong>Sign out.</strong> Your work stays on the device, hidden until you sign in again. You can choose to remove it from a shared device.</li>
        <li><strong>Edit your name, church and picture</strong> in Settings.</li>
        <li><strong>Delete your account</strong> in Settings. We then delete your account, your backed up work and your session records. Work already on your devices stays there as guest work.</li>
        <li><strong>Export.</strong> Each sermon can be exported from the editor. A single download of everything in your account is not available yet. Write to <Contact /> and we will help.</li>
      </ul>

      <h2>Scripture and reference data</h2>
      <p>
        SELAH includes public domain Bible translations. Cross-references come from OpenBible.info under CC BY. Original language data comes from
        STEPBible and OpenScriptures under CC BY 4.0. This data is about the text, not about you.
      </p>

      <h2>Children</h2>
      <p>SELAH is made for ministers, teachers and Bible students, and is not directed at children.</p>

      <h2>Changes</h2>
      <p>If this page changes in a way that matters, we will say so in the app and update the date at the top.</p>

      <h2>Contact</h2>
      <p>
        Questions about your data or this page: <Contact />.
      </p>
    </LegalLayout>
  );
}
