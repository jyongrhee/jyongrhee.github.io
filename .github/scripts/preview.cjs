// Pull request previews: decides which previews go into the next Pages
// deploy (plan) and keeps one comment per pull request up to date (report).
// Runs only from the default branch's copy of this file (see ship.yml).
//
// State lives in that comment, written by github-actions[bot]:
//   <!-- jr-preview {"state":"live","sha":"…","created":"2026-10-24T09:00:00.000Z","at":"…"} -->
//   state   live | failed | expired | closed
//   sha     commit the preview was built from
//   created when the preview was (re)built; it is removed 6 hours later
//   at      when the comment was last written (an owner's /preview after this rebuilds)
// © 2026 Jaeyong Rhee. All rights reserved.

const TTL_HOURS = 6;
const MARK = /<!-- jr-preview (\{.*?\}) -->/;
const BOT = 'github-actions[bot]';
const DAILY = '17 18 * * *';

const siteBase = (owner) => `https://${owner}.github.io/`;
const kst = (iso) => new Date(iso).toLocaleString('sv-SE', { timeZone: 'Asia/Seoul', hour12: false }).slice(0, 16) + ' KST';

async function botComment(github, repo, number) {
  const comments = await github.paginate(github.rest.issues.listComments, { ...repo, issue_number: number, per_page: 100 });
  const own = comments.find((c) => c.user?.login === BOT && c.user?.type === 'Bot' && MARK.test(c.body || ''));
  let state = null;
  if (own) { try { state = JSON.parse(MARK.exec(own.body)[1]); } catch { state = null; } }
  const commands = comments.filter((c) => c.author_association === 'OWNER' && /^\/preview\b/.test((c.body || '').trim()));
  return { comment: own || null, state, lastCommand: commands.length ? commands.at(-1).created_at : null };
}

async function mainIsDeployed(github, repo, sha) {
  try {
    const { data: deps } = await github.rest.repos.listDeployments({ ...repo, environment: 'github-pages', per_page: 1 });
    if (!deps.length || deps[0].sha !== sha) return false;
    const { data: st } = await github.rest.repos.listDeploymentStatuses({ ...repo, deployment_id: deps[0].id, per_page: 1 });
    return st[0]?.state === 'success';
  } catch { return false; }
}

/* plan: outputs builds (JSON list of {number, sha, created, fresh}), changes (JSON list of {number, state}), deploy, daily */
async function plan({ github, context, core }) {
  const repo = context.repo;
  const full = `${repo.owner}/${repo.repo}`;
  const now = new Date();
  const builds = [];
  const changes = [];

  const open = await github.paginate(github.rest.pulls.list, { ...repo, state: 'open', per_page: 100 });
  for (const pr of open) {
    if (pr.head?.repo?.full_name !== full) { core.info(`#${pr.number}: from a fork, never previewed`); continue; }
    const { state: s, lastCommand } = await botComment(github, repo, pr.number);
    const sha = pr.head.sha;
    const asked = lastCommand && (!s?.at || new Date(lastCommand) > new Date(s.at));
    if (!s || s.sha !== sha || s.state === 'closed' || asked) {
      builds.push({ number: pr.number, sha, created: now.toISOString(), fresh: true });
      core.info(`#${pr.number}: build ${sha.slice(0, 7)} (${!s ? 'first preview' : asked ? 'owner asked with /preview' : s.sha !== sha ? 'new commit' : 'reopened'})`);
    } else if (s.state === 'live') {
      const age = (now - new Date(s.created)) / 3600e3;
      if (age < TTL_HOURS) { builds.push({ number: pr.number, sha: s.sha, created: s.created, fresh: false }); core.info(`#${pr.number}: keep (${age.toFixed(1)} h old)`); }
      else { changes.push({ number: pr.number, state: 'expired', sha: s.sha, created: s.created }); core.info(`#${pr.number}: expired (${age.toFixed(1)} h old)`); }
    } else core.info(`#${pr.number}: ${s.state}, nothing to do`);
  }

  const closed = (await github.rest.pulls.list({ ...repo, state: 'closed', sort: 'updated', direction: 'desc', per_page: 10 })).data;
  for (const pr of closed) {
    if (pr.head?.repo?.full_name !== full) continue;
    const { state: s } = await botComment(github, repo, pr.number);
    if (s?.state === 'live') { changes.push({ number: pr.number, state: 'closed', sha: s.sha, created: s.created }); core.info(`#${pr.number}: closed, remove`); }
  }

  const ev = context.eventName;
  const always = ev === 'push' || ev === 'workflow_dispatch' || (ev === 'schedule' && context.payload.schedule === DAILY);
  const stale = !(await mainIsDeployed(github, repo, context.sha));
  const deploy = always || stale || changes.length > 0 || builds.some((b) => b.fresh);
  core.info(`deploy: ${deploy}${always ? ' (always on this event)' : stale ? ' (live site is behind main)' : ''}`);

  core.setOutput('builds', JSON.stringify(deploy ? builds : []));
  core.setOutput('changes', JSON.stringify(changes));
  core.setOutput('deploy', String(deploy));
  core.setOutput('daily', String(ev === 'schedule' && context.payload.schedule === DAILY));
  await core.summary.addHeading('Pull request previews', 3)
    .addList([...builds.map((b) => `#${b.number}: ${b.fresh ? 'build' : 'keep'} ${b.sha.slice(0, 7)}`), ...changes.map((c) => `#${c.number}: ${c.state}`)].concat(builds.length + changes.length ? [] : ['none']))
    .addRaw(`Deploy: ${deploy}`).write();
}

function body(owner, number, s, extra = {}) {
  const url = `${siteBase(owner)}preview/pr-${number}/`;
  const short = s.sha.slice(0, 7);
  const ends = new Date(new Date(s.created).getTime() + TTL_HOURS * 3600e3).toISOString();
  const text = {
    live: [
      `🔍 **미리보기:** ${url}`,
      '',
      `- 커밋 \`${short}\` 기준, ${kst(s.created)}에 만들었습니다.`,
      `- **${kst(ends)}**에 자동으로 지워집니다(${TTL_HOURS}시간).`,
      '- 새 커밋을 올리면 다시 만들어지고 시간이 새로 시작됩니다.',
      `- 지워진 뒤 다시 보려면 저장소 주인이 이 PR에 \`/preview\` 댓글을 달면 됩니다.`,
    ],
    failed: [
      `⚠️ **미리보기를 만들지 못했습니다** (커밋 \`${short}\`).`,
      '',
      `- 로그: ${extra.log}`,
      '- 고친 커밋을 올리면 다시 시도합니다. 저장소 주인이 `/preview` 댓글을 달아도 다시 시도합니다.',
      '- 실제 사이트와 다른 PR의 미리보기는 영향을 받지 않았습니다.',
    ],
    expired: [
      `⌛ 미리보기가 ${TTL_HOURS}시간이 지나 지워졌습니다 (커밋 \`${short}\`).`,
      '',
      '- 다시 보려면 저장소 주인이 이 PR에 `/preview` 댓글을 달면 됩니다. 새 커밋을 올려도 다시 만들어집니다.',
    ],
    closed: ['🗑️ PR이 닫혀서 미리보기를 지웠습니다.'],
  }[s.state];
  return `<!-- jr-preview ${JSON.stringify(s)} -->\n${text.join('\n')}\n`;
}

async function write(github, repo, number, s, extra) {
  const { comment } = await botComment(github, repo, number);
  const text = body(repo.owner, number, s, extra);
  if (comment) await github.rest.issues.updateComment({ ...repo, comment_id: comment.id, body: text });
  else if (s.state !== 'closed') await github.rest.issues.createComment({ ...repo, issue_number: number, body: text });
}

/* report: env BUILDS, CHANGES, DEPLOYED (result of the deploy job). Which previews built is read from this run's jobs. */
async function report({ github, context, core }) {
  const repo = context.repo;
  const builds = JSON.parse(process.env.BUILDS || '[]');
  const changes = JSON.parse(process.env.CHANGES || '[]');
  const deployed = process.env.DEPLOYED === 'success';
  const at = new Date().toISOString();
  const runUrl = `${context.serverUrl}/${repo.owner}/${repo.repo}/actions/runs/${context.runId}`;

  const jobs = await github.paginate(github.rest.actions.listJobsForWorkflowRun, { ...repo, run_id: context.runId, filter: 'latest', per_page: 100 });
  const job = (n) => jobs.find((j) => j.name === `Preview PR #${n}`);
  const logOf = (n) => job(n)?.html_url || runUrl;

  for (const b of builds) {
    const ok = job(b.number)?.conclusion === 'success';
    if (!ok && (b.fresh || deployed)) {
      await write(github, repo, b.number, { state: 'failed', sha: b.sha, created: b.created, at }, { log: logOf(b.number) });
      core.warning(`#${b.number}: preview failed`);
    } else if (!deployed) {
      core.warning(`#${b.number}: the deploy did not succeed; the next run tries again`);
    } else if (b.fresh) {
      await write(github, repo, b.number, { state: 'live', sha: b.sha, created: b.created, at });
      core.info(`#${b.number}: live`);
    }
  }
  if (!deployed && changes.length) { core.warning('deploy did not succeed; expired or closed previews are removed on the next run'); return; }
  for (const c of changes) {
    await write(github, repo, c.number, { state: c.state, sha: c.sha, created: c.created, at });
    core.info(`#${c.number}: ${c.state}`);
  }
}

module.exports = { plan, report, body, TTL_HOURS };
