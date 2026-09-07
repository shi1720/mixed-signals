'use client';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ShieldCheck, FlaskConical, Heart, ExternalLink } from 'lucide-react';
import { CAMPAIGN } from '@/lib/campaign';
export function InfoDialog({
  section,
  onClose,
}: {
  section: 'privacy' | 'methodology' | 'about' | null;
  onClose: () => void;
}) {
  const privacy = section === 'privacy',
    method = section === 'methodology';
  return (
    <Dialog
      open={!!section}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="info-dialog">
        <span className="info-icon">
          {privacy ? <ShieldCheck /> : method ? <FlaskConical /> : <Heart />}
        </span>
        <DialogTitle className="survey-title">
          {privacy
            ? 'Privacy and your data.'
            : method
              ? 'What the scores mean.'
              : 'Why this survey exists.'}
        </DialogTitle>
        <DialogDescription className="survey-description">
          {privacy
            ? 'No names. No profiles. No exact locations. No advertising trackers.'
            : method
              ? 'This is a voluntary snapshot of contributors, not a representative study or a ranking of cities.'
              : 'Mixed Signals is an independent, open-source experiment about the places we date and the ways they make us feel.'}
        </DialogDescription>
        <div className="info-body">
          {privacy ? (
            <>
              <h3>What leaves your device</h3>
              <p>
                Your chosen city, eight optional 1–5 ratings, a category for
                where you meet people, consent confirmations, and an anonymous
                browser identifier. We never ask for gender, orientation, names,
                photos, email, or your current location.
              </p>
              <h3>Anonymous to everyone else</h3>
              <p>
                Individual reports are never public. A city needs at least{' '}
                {CAMPAIGN.minimumCitySample} reports to appear. Each metric also
                needs {CAMPAIGN.minimumMetricSample} complete responses. Small
                samples are hidden, and scores are rounded to the nearest five.
              </p>
              <p>
                This reduces disclosure risk, but is not a mathematical
                guarantee of anonymity. The hosting provider processes
                connection metadata. For abuse control, we temporarily store a
                keyed daily hash of the network address when the platform
                supplies it, not the raw address. We do not log survey answers.
              </p>
              <h3>Your private receipt</h3>
              <p>
                A random, private receipt lets you delete your report. We store
                a copy on your device, and you can download it. Anyone holding
                it can delete the report, so keep it out of screenshots and
                public links. Survey drafts stay in this tab until submission.
              </p>
              <h3>Deletion and the reveal</h3>
              <p>
                Before the reveal, deleting a report removes it from the future
                results. After the reveal, your raw report can still be deleted,
                but the frozen city summary stays the same. It cannot be traced
                back to individual receipts. Raw reports are removed
                automatically on the first site visit at least 30 days after the
                reveal. With no traffic, records remain until that next visit.
                This maintenance also removes expired abuse-control records.
              </p>
              <h3>No inbox required</h3>
              <p>
                We offer a calendar download instead of collecting email. Your
                calendar app controls reminder notifications. There are no
                marketing messages.
              </p>
            </>
          ) : method ? (
            <>
              <h3>One shared seven-day window</h3>
              <p>
                This survey collects from 5 September 2026 at 13:00 UTC to 12
                September 2026 at 13:00 UTC. The server closes submissions at
                that deadline. The countdown never restarts when you refresh.
                Results unlock automatically.
              </p>
              <h3>Three scores, no city leaderboard</h3>
              <ul>
                <li>
                  <b>Connection:</b> the average of finding a connection,
                  feeling like yourself, and recommending dating in your city.
                </li>
                <li>
                  <b>Mixed messages:</b> unclear intentions and conversations
                  disappearing.
                </li>
                <li>
                  <b>Date hassles:</b> plans falling through, affordability
                  barriers, and travel difficulties.
                </li>
              </ul>
              <p>
                Answers map from 1–5 to 0–100. We orient each component so a
                higher score means more of the named quality: more positive
                connection experiences, more confusion, or more practical
                barriers. These are scores, not percentages of people. We
                calculate each person's metric only when all its questions are
                answered, average those scores, then round to the nearest five.
                “Skip” is missing data, never a neutral answer.
              </p>
              <h3>Small samples stay private</h3>
              <p>
                A city needs 10 survey responses. Each score needs 10 complete
                answer groups. A meeting category appears only when at least 10
                contributors chose the most common option; ties follow
                alphabetical category order. Public results are frozen once
                after collection closes, so watching the map cannot reveal a new
                person's answers.
              </p>
              <h3>What these results can tell you</h3>
              <p>
                This is a self-selected, unrepresentative survey. One report per
                browser is an abuse deterrent, not proof of one person. Scores
                reflect contributors, not everyone in a city. Preview data is
                invented for exploring the interface and is never included in
                real results.
              </p>
            </>
          ) : (
            <>
              <h3>The question</h3>
              <p>
                What if “is dating like this for everyone here?” had more
                context than one group chat? Mixed Signals combines anonymous
                survey responses into city reports about connection, confusing
                communication, and practical barriers. A “signal” is simply one
                response. We describe contributors’ experiences, not everyone in
                a city, and we never name or rate individual people.
              </p>
              <h3>The inspiration</h3>
              <p>
                Inspired by Cami M.'s MIT student project mapping people's
                favorite and least favorite campus bathrooms. Her idea showed
                how an oddly specific survey can make collective experience
                visible. We are not affiliated with MIT.
              </p>
              <a
                className="inline-link"
                href="https://mitadmissions.org/blogs/entry/the-best-and-worst-places-to-%F0%9F%92%A9-on-campus/"
                target="_blank"
                rel="noreferrer"
              >
                Read the original MIT story <ExternalLink size={14} />
              </a>
              <h3>Built in the open</h3>
              <p>
                Made by Shivam Gupta. The questions, scoring rules and code are
                public, so you can see how the reports are made. Geography comes
                from Natural Earth.
              </p>
              <a
                className="inline-link"
                href="https://github.com/shi1720/mixed-signals"
                target="_blank"
                rel="noreferrer"
              >
                Explore the source on GitHub <ExternalLink size={14} />
              </a>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
