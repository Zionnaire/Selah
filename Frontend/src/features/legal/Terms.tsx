import { Link } from 'react-router-dom';
import { LEGAL } from './config';
import { Contact, LegalLayout } from './LegalLayout';

export function Terms() {
  return (
    <LegalLayout title="Terms of use">
      <p className="lede">
        These terms are the agreement between you and {LEGAL.operator || 'whoever runs SELAH'} ("we") about using SELAH. They are written to be read.
        Please read them with the <Link to="/privacy">Privacy notice</Link>.
      </p>

      <h2>Using SELAH</h2>
      <p>
        You can use SELAH as a guest without an account. Some things, such as backup, sync and suggestions, need an account. You must give true details
        when you register, keep your password private, and tell us if you think someone else has used your account.
      </p>

      <h2>Your work is yours</h2>
      <p>
        You keep ownership of everything you write in SELAH. We do not claim it. When you back up or sync your work, you give us permission to store and
        process it only so we can provide SELAH to you, as the Privacy notice describes. You are responsible for having the right to put in anything you
        did not write yourself.
      </p>

      <h2>Scripture and other content</h2>
      <p>
        SELAH includes public domain Scripture translations and reference data used under open licences, which are credited in the app. Those licences
        stay with that content. Please do not copy the data out in bulk and present it as your own.
      </p>

      <h2>Suggestions</h2>
      <p>
        Suggestions in Sermon Studio are made by an AI service and are in beta. They can be wrong, incomplete or one sided. They are a starting point
        for you to edit, never Scripture and never a replacement for your own study, your church's teaching, or pastoral wisdom. You decide what goes
        into a sermon and you are responsible for what you teach. Do not use suggestions for medical, legal or crisis advice. There is a daily limit
        for each account.
      </p>

      <h2>What you must not do</h2>
      <ul>
        <li>Use SELAH to break the law or to harm, harass or deceive anyone.</li>
        <li>Try to get into other people's accounts or data, or to disrupt or overload the service.</li>
        <li>Send content that is meant to attack the service, such as malicious files.</li>
        <li>Use automated means to create accounts or to use suggestions beyond the limit.</li>
      </ul>
      <p>If these are broken we may limit or close an account, and we will say why where we can.</p>

      <h2>Your account</h2>
      <p>
        You can delete your account at any time in Settings. We delete your account and backed up work as the Privacy notice describes.
      </p>

      <h2>The service</h2>
      <p>
        We work to keep SELAH available and your work safe, and SELAH is built to work without internet. We still cannot promise it will always be
        available or free of errors. Keep your own copy of anything you cannot afford to lose: you can export each sermon from the editor. SELAH is
        provided as it is, and where the law allows, we are not liable for loss that comes from using it, including lost data or something said from a
        pulpit. Nothing in these terms limits a right you have by law that cannot be limited.
      </p>

      <h2>Changes</h2>
      <p>
        We may update these terms as SELAH changes. If the change matters, we will tell you in the app before it applies, and the date at the top will
        change. If you keep using SELAH after that, you accept the new terms.
      </p>

      {LEGAL.governingLaw && (
        <>
          <h2>Governing law</h2>
          <p>These terms are governed by {LEGAL.governingLaw}.</p>
        </>
      )}

      <h2>Contact</h2>
      <p>
        Questions about these terms: <Contact />.
      </p>
    </LegalLayout>
  );
}
