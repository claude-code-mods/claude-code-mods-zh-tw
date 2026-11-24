import { calculateProgress, formatPercent, validateBoard, validateFeedback, feedbackStates } from './progress-math.mjs';

const $ = (id) => document.getElementById(id);
const form = $('feedback-form');
const updateForm = $('update-form');
const gateNames = { automated: '自動檢查', browser: '瀏覽器操作', 'real-host': '真實宿主', driver: '駕駛員驗收' };
const gateStates = { pending: '待核對', passed: '已透過', failed: '未透過', 'not-applicable': '本輪不適用' };
const typeNames = { idea: '想法', bug: 'Bug', review: '稽核' };
const stateNames = { new: '新記錄', discussing: '討論中', adopted: '已採納', parked: '暫存', rejected: '不採納', confirmed: '已確認', fixing: '修復中', retest: '待複測', closed: '已關閉', 'wont-fix': '本輪不修復', recorded: '已記錄' };
let snapshot = null;
let draftBinding = null;
let updateBinding = null;
let activeFeedbackId = null;
let draftRestored = false;
function draftKey() { return 'tw-board-draft:' + snapshot.board.project.id; }
function rememberDraft() {
  if (!snapshot || !draftExists()) return;
  try { sessionStorage.setItem(draftKey(), JSON.stringify(addPayload())); }
  catch { message('save-message', '瀏覽器無法暫存草稿；當前輸入仍保留，離開前可匯出。', 'draft'); }
}
function forgetDraft() { try { sessionStorage.removeItem(draftKey()); } catch { /* Project file save is independent of browser draft storage. */ } }
function restoreDraft() {
  if (draftRestored || !snapshot) return;
  draftRestored = true;
  try {
    const draft = JSON.parse(sessionStorage.getItem(draftKey()) || 'null');
    if (!draft || draftExists()) return;
    if (draft.itemId && ![...form.elements.itemId.options].some((o) => o.value === draft.itemId)) form.elements.itemId.add(new Option(draft.itemId + '（已不在當前範圍）', draft.itemId));
    for (const name of ['type', 'priority', 'title', 'text', 'itemId']) if (typeof draft[name] === 'string') form.elements[name].value = draft[name];
    form.elements.blocking.checked = draft.blocking === true;
    $('blocking-label').hidden = draft.type !== 'bug';
    draftBinding = { expectedRevision: draft.expectedRevision, context: draft.context };
    message('save-message', '已恢復此標籤頁的待提交草稿；瀏覽器暫存不等於專案檔案已儲存。', 'draft');
  } catch { message('save-message', '瀏覽器暫存草稿無法恢復；請使用此前匯出的草稿檔案。', 'draft'); }
}
function node(tag, text, className = '') {
  const result = document.createElement(tag);
  if (text !== undefined && text !== null) result.textContent = text;
  if (className) result.className = className;
  return result;
}
function tag(text, type = '') { return node('span', text, 'tag ' + type); }
function message(id, text, type = '') { const target = $(id); target.textContent = text; target.className = type; }
function round(value) { return Number(value.toFixed(3)); }
function binding() { return { expectedRevision: snapshot.feedback.revision, context: structuredClone(snapshot.context) }; }
function draftExists() { return !!(form.elements.title.value.trim() || form.elements.text.value.trim()); }
function setMeter(target, rate) {
  target.firstElementChild.style.width = (rate === null ? 0 : Math.min(100, Math.max(0, rate * 100))) + '%';
  target.setAttribute('aria-valuemin', '0'); target.setAttribute('aria-valuemax', '100');
  target.setAttribute('aria-valuetext', formatPercent(rate));
  if (rate === null) target.removeAttribute('aria-valuenow');
  else target.setAttribute('aria-valuenow', String(Math.floor(rate * 1000) / 10));
}
function miniRow(label, rate, sand = false) {
  const row = node('div', null, 'mini-row'); row.append(node('span', label));
  const meter = node('div', null, 'meter' + (sand ? ' sand' : '')); meter.append(node('span'));
  setMeter(meter, rate); row.append(meter, node('b', formatPercent(rate))); return row;
}
function itemRate(result, kind) { return snapshot.board.baseline.confirmed && !snapshot.evidenceError && !snapshot.authorityError ? result[kind] : null; }
function fillOptions(select, entries, emptyText) {
  const old = select.value;
  select.replaceChildren(new Option(emptyText, ''));
  for (const [value, text] of entries) select.add(new Option(text, value));
  if (old && !entries.some(([value]) => value === old)) select.add(new Option(old + '（已不在當前範圍）', old));
  select.value = old;
}
function render() {
  const { board, feedback, progress } = snapshot;
  document.title = board.project.title + ' · 專案進度畫板';
  $('project-title').textContent = board.project.title;
  $('project-meta').textContent = board.project.version + ' · ' + board.baseline.label + ' · 畫板 v' + board.revision + ' / 反饋 v' + feedback.revision;
  $('connection').textContent = snapshot.writable ? '本地檔案 · 可儲存' : '靜態記錄 · 只讀';
  $('connection').className = 'pill' + (snapshot.writable && !snapshot.stale && !snapshot.evidenceError && !snapshot.authorityError ? ' good' : '');
  const warnings = [];
  if (snapshot.stale) warnings.push(snapshot.authorityError ? '來原始檔已變化，請核對同步差異。' : '來原始檔已變化。當前百分比是上次核對的記錄，請審查改動後同步畫板。');
  if (snapshot.evidenceError) warnings.push('證據檔案檢查失敗，暫停顯示有效百分比：' + snapshot.evidenceError);
  if (snapshot.authorityError) warnings.push('專案文件同步待處理，暫停顯示有效百分比：' + snapshot.authorityError);
  if (!snapshot.writable) warnings.push('當前是靜態記錄，檔案存在與雜湊尚未由本地服務核對；下列為記錄值。填寫內容只作為草稿，匯出不等於儲存到專案。');
  $('source-warning').hidden = !warnings.length; $('source-warning').textContent = warnings.join(' ');
  $('handoff').hidden = !board.authority;
  if (board.authority) {
    const { handoff, designRevision, nextRevision } = board.authority;
    const suffix = snapshot.stale || snapshot.authorityError ? '（上次同步記錄）' : '';
    $('current-step').textContent = '當前步驟：' + handoff.currentStep + suffix;
    $('next-gate').textContent = '下一道門：' + handoff.nextGate + suffix;
    $('open-risks').replaceChildren(...(handoff.openRisks.length ? handoff.openRisks.map((risk) => node('li', risk)) : [node('li', 'NEXT 未記錄開放風險')]));
    $('feedback-refs').textContent = 'NEXT 已關聯反饋：' + (handoff.feedbackRefs.map((id) => { const r = feedback.records.find((x) => x.id === id); return r ? r.title + '（' + stateNames[r.state] + '）' : id + '（記錄缺失）'; }).join('；') || '無');
    $('authority-versions').textContent = '總設計案 v' + designRevision + ' · NEXT 狀態 v' + nextRevision + ' · 修改專案文件後，由 Agent 核對同步差異並更新畫板。';
  }
  $('implemented-value').textContent = formatPercent(progress.implemented);
  $('accepted-value').textContent = formatPercent(progress.accepted);
  setMeter($('implemented-bar'), progress.implemented); setMeter($('accepted-bar'), progress.accepted);
  const basis = board.baseline.confirmed ? (progress.count ? '本輪 ' + progress.count + ' 項 · 等值權重 ' : '暫無當前範圍事項 · 等值權重 ') : '目標範圍待確認 · 等值權重 ';
  $('implemented-detail').textContent = basis + round(progress.implementedWeight) + ' / ' + round(progress.denominator) + (snapshot.stale ? ' · 舊記錄' : '');
  $('accepted-detail').textContent = '透過權重 ' + round(progress.acceptedWeight) + ' / ' + round(progress.denominator) + ' · ' + progress.blockers.length + ' 條已確認阻斷 Bug' + (snapshot.stale ? ' · 舊記錄' : '');
  renderCalculation();
  $('modules').replaceChildren();
  for (const module of progress.modules) {
    const card = node('article', null, 'module-card');
    const title = node('div', null, 'module-title'); title.append(node('span', module.name), node('span', module.count + ' 項', 'muted'));
    card.append(title, miniRow('實現', module.implemented), miniRow('驗收', module.accepted, true)); $('modules').append(card);
  }
  if (!progress.modules.length) $('modules').append(node('p', '尚無已納入範圍的模組。', 'empty'));
  $('gates').replaceChildren();
  for (const gate of progress.gates) $('gates').append(tag(gateNames[gate.kind] + ' · ' + gate.passed + '/' + gate.total + (gate.failed ? ' · ' + gate.failed + ' 項未透過' : '') + (gate.total ? '' : '（未宣告）'), gate.failed ? 'bad' : ''));
  $('gates').append(node('span', '門數為已記錄結果；阻斷 Bug 的複測缺口計入驗收進度。', 'muted'));
  fillOptions($('module-filter'), [...new Set(board.items.map((i) => i.module))].map((name) => [name, name]), '全部模組');
  fillOptions($('related-item'), board.items.map((i) => [i.id, i.title + (i.scope === 'parked' ? '（暫存）' : '')]), '專案整體');
  $('feedback-meta').textContent = feedback.records.length + ' 條記錄 · 儲存位置 progress/feedback.json';
  $('write-mode').textContent = snapshot.writable ? '儲存後會寫入專案檔案並回讀。新想法不自動進入計劃，稽核記錄不自動更改驗收門。' : '只讀預覽：可填寫並匯出待提交草稿。啟動專案的本地畫板服務後才能落盤。';
  $('save-feedback').disabled = !snapshot.writable;
  $('update-save').disabled = !snapshot.writable;
  renderItems(); renderFeedback();
}
function renderCalculation() {
  const { board, progress } = snapshot;
  const body = $('calculation-body'); body.replaceChildren();
  body.append(node('p', '當前基線：' + board.baseline.id + ' · ' + (board.baseline.confirmed ? '已確認' : '待確認') + '；依據：' + (board.baseline.reference || '尚未提供')));
  body.append(node('p', '權重預設 1，用於描述工作量；P0/P1/P2 只決定處理順序。暫存 ' + progress.parked + ' 項及未採納想法不進入分母。'));
  body.append(node('p', '事項比例 = 已完成檢查點權重 ÷ 該項全部檢查點權重；總體比例 = Σ（事項權重 × 事項比例）÷ 本輪事項總權重。模組使用相同演算法。', 'formula'));
  const list = node('ul');
  for (const item of snapshot.board.items.filter((i) => i.scope === 'current')) {
    const result = progress.items.find((r) => r.id === item.id);
    list.append(node('li', item.title + '：事項權重 ' + item.weight + '，實現檢查點 ' + round(result.implementedWeight) + '/' + round(result.checkpointWeight) + '，驗收檢查點 ' + round(result.acceptedWeight) + '/' + round(result.checkpointWeight)));
  }
  body.append(list, node('p', '來原始檔（最後核對：' + (board.updatedAt || '未記載') + '）'));
  for (const source of board.sources) {
    const stale = snapshot.staleSources?.find((s) => s.id === source.id);
    body.append(node('p', source.id + ' · ' + source.path + ' · SHA-256 ' + source.sha256 + (stale ? ' · 已變化' + (stale.error ? '：' + stale.error : '') : ''), 'source-path'));
  }
  body.append(node('p', '變更分母需要登記新基線並保留歷史。100% 只描述這裡列出的範圍；沒有宣告的真實宿主或駕駛員門仍需按專案流程核對。'));
}
function itemColumn(item, result) {
  if (item.scope === 'parked') return 'parked';
  if (result.implemented === 1 && (snapshot.evidenceError || snapshot.authorityError || snapshot.stale || !snapshot.writable)) return 'verify';
  if (result.implemented === 1) return result.accepted === 1 ? 'implemented' : 'verify';
  return 'todo';
}
function renderItems() {
  if (!snapshot) return;
  const query = $('search').value.trim().toLocaleLowerCase(); const module = $('module-filter').value;
  const items = snapshot.board.items.filter((i) => (!module || i.module === module) && (!query || (i.title + i.summary + i.module).toLocaleLowerCase().includes(query)));
  const columns = $('columns'); columns.replaceChildren();
  for (const [key, name] of [['implemented', '已實現 · 門已透過'], ['verify', '已實現 · 待實測'], ['todo', '待完成'], ['parked', '暫存']]) {
    const values = items.filter((i) => itemColumn(i, snapshot.progress.items.find((r) => r.id === i.id)) === key);
    const column = node('div', null, 'column'); const header = node('div', null, 'column-heading'); header.append(node('span', name), node('span', values.length, 'column-count')); column.append(header);
    for (const item of values) {
      const result = snapshot.progress.items.find((r) => r.id === item.id);
      const card = node('button', null, 'item-card'); card.type = 'button'; card.dataset.itemId = item.id;
      const top = node('div', null, 'card-top'); top.append(tag(item.module));
      if (item.activity === 'doing' && result.implemented < 1) top.append(tag('進行中', 'good'));
      if (item.activity === 'blocked' || result.blockers.length) top.append(tag('有阻斷', 'bad'));
      if (key === 'implemented') top.append(tag('門已透過', 'good'));
      card.append(top, node('h3', item.title), node('p', item.summary));
      card.append(miniRow('實現', itemRate(result, 'implemented')), miniRow('驗收', itemRate(result, 'accepted'), true), node('div', '權重 ' + item.weight + ' · ' + item.checkpoints.length + ' 個檢查點 · 檢視詳情', 'card-meta'));
      card.addEventListener('click', () => showItem(item, result)); column.append(card);
    }
    if (!values.length) column.append(node('p', '暫無事項', 'empty'));
    columns.append(column);
  }
}
function showItem(item, result) {
  $('item-dialog-title').textContent = item.title;
  const body = $('item-dialog-body'); body.replaceChildren(node('p', item.summary), node('p', '模組 ' + item.module + ' · 範圍 ' + (item.scope === 'current' ? '本輪' : '暫存') + ' · 事項權重 ' + item.weight, 'muted'));
  if (result.blockers.length) body.append(node('p', '待複測的阻斷 Bug：' + result.blockers.join('、'), 'error'));
  for (const point of item.checkpoints) {
    const section = node('article', null, 'checkpoint'); section.append(node('h3', point.title), tag(point.implemented ? '已實現' : '待實現', point.implemented ? 'good' : ''), tag('權重 ' + point.weight));
    section.append(node('p', '實現證據：' + (point.evidence.join('、') || '尚未提供'), 'source-path'));
    for (const gate of point.gates) {
      section.append(tag(gateNames[gate.kind] + ' · ' + gateStates[gate.status], gate.status === 'failed' ? 'bad' : gate.status === 'passed' ? 'good' : ''));
      if (gate.evidence.length) section.append(node('p', '對應證據：' + gate.evidence.join('、'), 'source-path'));
      if (gate.reason) section.append(node('p', '原因：' + gate.reason));
      if (gate.confirmationRef) section.append(node('p', '確認依據：' + gate.confirmationRef));
    }
    if (!point.gates.length) section.append(node('p', '本檢查點未宣告適用驗收門；只有基線記載明確免除依據時才計入驗收。'));
    body.append(section);
  }
  $('item-dialog').showModal();
}
function renderFeedback() {
  if (!snapshot) return;
  const filter = $('feedback-filter').value; const target = $('feedback-list'); target.replaceChildren();
  const records = snapshot.feedback.records.filter((r) => !filter || r.type === filter).toReversed();
  for (const record of records) {
    const isBlocker = snapshot.progress.blockers.some((r) => r.id === record.id);
    const card = node('article', null, 'feedback-card' + (isBlocker ? ' blocker' : ''));
    const top = node('div', null, 'card-top'); top.append(tag(typeNames[record.type]), tag(stateNames[record.state]), tag(record.priority));
    if (isBlocker) top.append(tag('阻斷驗收 · 待複測', 'bad'));
    else if (record.type === 'bug' && record.blocking && record.state === 'new') top.append(tag('建議阻斷 · 待確認', 'warn'));
    const item = snapshot.board.items.find((i) => i.id === record.itemId);
    card.append(top, node('h3', record.title), node('p', record.text), node('div', '關聯：' + (item?.title || record.itemId || '專案整體') + ' · ' + new Date(record.updatedAt).toLocaleString('zh-CN'), 'card-meta'));
    const button = node('button', '檢視 / 處理', 'secondary'); button.type = 'button'; button.addEventListener('click', () => showFeedback(record)); card.append(button); target.append(card);
  }
  if (!records.length) target.append(node('p', '暫無記錄。隨手記下的想法會保留在這裡，採納後再納入專案範圍。', 'empty'));
}
function showFeedback(record) {
  activeFeedbackId = record.id; updateBinding = binding(); updateForm.reset();
  $('feedback-dialog-title').textContent = record.title;
  $('feedback-original').textContent = '當前記錄：\n' + record.text + '\n\n提交時：畫板 v' + record.context.boardRevision + ' · 基線 ' + record.context.baselineId;
  updateForm.elements.state.replaceChildren(...feedbackStates[record.type].map((state) => new Option(stateNames[state], state)));
  updateForm.elements.state.value = record.state;
  updateForm.elements.blocking.checked = record.blocking;
  updateForm.elements.resolution.value = record.resolution || '';
  updateForm.elements.verification.value = record.verification || '';
  updateForm.elements.verificationEvidence.value = (record.verificationEvidence || []).join('\n');
  $('update-blocking-label').hidden = record.type !== 'bug'; $('bug-resolution-fields').hidden = record.type !== 'bug';
  $('feedback-history').textContent = JSON.stringify(record.history, null, 2);
  message('update-message', '記錄處理意見不會自動更新計劃或驗收門。'); $('rebase-update').hidden = true;
  try {
    const draft = JSON.parse(sessionStorage.getItem(draftKey() + ':' + record.id) || 'null');
    if (draft) {
      updateForm.elements.state.value = draft.state;
      updateForm.elements.reason.value = draft.reason;
      for (const name of ['resolution', 'verification']) updateForm.elements[name].value = draft.patch?.[name] || '';
      updateForm.elements.blocking.checked = draft.patch?.blocking === true;
      updateForm.elements.verificationEvidence.value = (draft.patch?.verificationEvidence || []).join('\n');
      updateBinding = { expectedRevision: draft.expectedRevision, context: draft.context };
      $('rebase-update').hidden = JSON.stringify(updateBinding) === JSON.stringify(binding());
      message('update-message', '已恢復待提交的處理草稿；瀏覽器暫存尚未寫入專案。版本有變化時，先比較當前記錄再提交。', 'draft');
    }
  } catch { message('update-message', '處理草稿無法恢復；可使用此前匯出的草稿。', 'draft'); }
  $('feedback-dialog').showModal();
}
async function readSnapshot() {
  let apiError = null;
  try {
    const response = await fetch('./api/board', { cache: 'no-store' });
    if (response.ok && response.headers.get('content-type')?.includes('application/json')) return await response.json();
    if (response.headers.get('content-type')?.includes('application/json')) apiError = new Error((await response.json()).error || '本地服務無法核對畫板');
  } catch { /* A static preview can still read exported files; it cannot claim file verification. */ }
  if (apiError) throw apiError;
  const [boardResponse, feedbackResponse] = await Promise.all([fetch('./progress.json', { cache: 'no-store' }), fetch('./feedback.json', { cache: 'no-store' })]);
  if (!boardResponse.ok || !feedbackResponse.ok) throw new Error('無法讀取專案畫板檔案。');
  const board = await boardResponse.json(); const feedback = await feedbackResponse.json();
  const errors = [...validateBoard(board), ...validateFeedback(feedback)];
  if (errors.length) throw new Error(errors.join('；'));
  return { board, feedback, context: { boardRevision: board.revision, baselineId: board.baseline.id, sourceHashes: Object.fromEntries(board.sources.map((s) => [s.id, s.sha256])) }, progress: calculateProgress(board, feedback), stale: false, staleSources: [], evidenceError: null, writable: false };
}
async function load() {
  $('reload').disabled = true;
  try {
    snapshot = await readSnapshot(); render(); restoreDraft();
    if (draftExists() && draftBinding && JSON.stringify(draftBinding) !== JSON.stringify(binding())) {
      message('save-message', '草稿保留；當前為反饋 v' + snapshot.feedback.revision + ' / 畫板 v' + snapshot.board.revision + '。請比較新記錄與當前範圍，再選擇使用當前版本。', 'draft'); $('rebase-draft').hidden = false;
    }
    if (activeFeedbackId && $('feedback-dialog').open && updateBinding && JSON.stringify(updateBinding) !== JSON.stringify(binding())) {
      const current = snapshot.feedback.records.find((r) => r.id === activeFeedbackId);
      $('feedback-original').textContent = '重讀後的當前記錄：\n' + (current?.text || '記錄已不在當前檔案') + '\n狀態：' + (stateNames[current?.state] || '未知');
      message('update-message', '處理草稿保留；請比較重讀後的記錄，再選擇使用當前版本。', 'draft'); $('rebase-update').hidden = false;
    }
    message('load-message', '已讀取 · ' + new Date().toLocaleTimeString('zh-CN') + (snapshot.stale ? ' · 來源待重新核對' : ''));
    return true;
  } catch (error) {
    snapshot = null;
    for (const id of ['implemented-value', 'accepted-value']) $(id).textContent = '—';
    setMeter($('implemented-bar'), null); setMeter($('accepted-bar'), null);
    for (const id of ['modules', 'gates', 'columns', 'feedback-list', 'calculation-body']) $(id).replaceChildren();
    $('save-feedback').disabled = true; $('update-save').disabled = true;
    $('connection').textContent = '讀取失敗'; $('connection').className = 'pill';
    message('load-message', error.message + '；請檢查服務和檔案。尚未提交的輸入保留在當前頁面。', 'error');
    return false;
  } finally { $('reload').disabled = false; }
}
function download(name, data, type = 'application/json') {
  const blob = new Blob([typeof data === 'string' ? data : JSON.stringify(data, null, 2) + '\n'], { type });
  const url = URL.createObjectURL(blob); const anchor = node('a'); anchor.href = url; anchor.download = name; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function addPayload() {
  if (!snapshot) throw new Error('尚未讀取當前專案');
  draftBinding ||= binding();
  return { operation: 'add', ...draftBinding, type: form.elements.type.value, priority: form.elements.priority.value, title: form.elements.title.value.trim(), text: form.elements.text.value, itemId: form.elements.itemId.value || null, blocking: form.elements.type.value === 'bug' && form.elements.blocking.checked };
}
function updatePayload() {
  const record = snapshot?.feedback.records.find((r) => r.id === activeFeedbackId);
  if (!record || !updateBinding) throw new Error('請先讀取需要處理的記錄');
  const patch = record.type === 'bug' ? { blocking: updateForm.elements.blocking.checked, resolution: updateForm.elements.resolution.value, verification: updateForm.elements.verification.value, verificationEvidence: updateForm.elements.verificationEvidence.value.split(/\r?\n/u).map((s) => s.trim()).filter(Boolean) } : {};
  return { operation: 'update', ...updateBinding, id: activeFeedbackId, state: updateForm.elements.state.value, reason: updateForm.elements.reason.value, patch };
}
async function save(payload, messageId) {
  if (!snapshot?.writable) throw new Error('當前沒有寫入通道；請匯出待提交草稿');
  const response = await fetch('./api/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-TW-Board': 'feedback-v1' }, body: JSON.stringify(payload) });
  const result = await response.json();
  if (!response.ok || result.saved !== true) {
    if (response.status === 409) await load();
    throw new Error(result.error || '儲存失敗；草稿保留');
  }
  message(messageId, '已寫入並回讀 progress/feedback.json · 反饋 v' + result.revision + ' · ' + result.id, 'success');
  return result;
}
form.addEventListener('input', () => { if (snapshot && !draftBinding) draftBinding = binding(); rememberDraft(); });
form.addEventListener('change', rememberDraft);
form.elements.type.addEventListener('change', () => { $('blocking-label').hidden = form.elements.type.value !== 'bug'; });
form.addEventListener('submit', async (event) => {
  event.preventDefault(); $('save-feedback').disabled = true;
  try {
    const receipt = await save(addPayload(), 'save-message'); forgetDraft(); form.reset(); $('blocking-label').hidden = true; draftBinding = null; $('rebase-draft').hidden = true;
    const loaded = await load();
    if (!loaded) message('save-message', '反饋 v' + receipt.revision + ' 已寫入並回讀。隨後重新整理失敗，請重新讀取；無需重複提交這一條。', 'draft');
  }
  catch (error) { message('save-message', error.message + '；草稿保留。', 'error'); }
  finally { $('save-feedback').disabled = !snapshot?.writable; }
});
updateForm.addEventListener('submit', async (event) => {
  event.preventDefault(); $('update-save').disabled = true;
  try {
    const receipt = await save(updatePayload(), 'update-message');
    try { sessionStorage.removeItem(draftKey() + ':' + activeFeedbackId); } catch { /* Readback remains the authoritative save receipt. */ }
    updateBinding = null; activeFeedbackId = null;
    const loaded = await load();
    if (loaded) { $('feedback-dialog').close(); message('load-message', '處理記錄已寫入並回讀 · 反饋 v' + receipt.revision + ' · ' + receipt.id, 'success'); }
    else message('update-message', '處理記錄 v' + receipt.revision + ' 已寫入並回讀，但重新整理失敗。請重新讀取；無需重複提交。', 'draft');
  }
  catch (error) { message('update-message', error.message + '；處理草稿保留。', 'error'); }
  finally { $('update-save').disabled = !snapshot?.writable; }
});
function rememberUpdateDraft() {
  if (!snapshot || !activeFeedbackId) return;
  try { sessionStorage.setItem(draftKey() + ':' + activeFeedbackId, JSON.stringify(updatePayload())); }
  catch { message('update-message', '瀏覽器無法暫存處理草稿；當前輸入仍保留，離開前可匯出。', 'draft'); }
}
updateForm.addEventListener('input', rememberUpdateDraft);
updateForm.addEventListener('change', rememberUpdateDraft);
$('rebase-draft').addEventListener('click', () => { if (snapshot) { draftBinding = binding(); rememberDraft(); $('rebase-draft').hidden = true; message('save-message', '草稿現綁定當前範圍與反饋 v' + snapshot.feedback.revision + '，再次儲存時仍會檢查衝突。', 'draft'); } });
$('rebase-update').addEventListener('click', () => { if (snapshot) { updateBinding = binding(); rememberUpdateDraft(); $('rebase-update').hidden = true; message('update-message', '處理草稿現綁定當前版本，請儲存以提交。', 'draft'); } });
$('export-draft').addEventListener('click', () => { try { download('feedback-draft.json', addPayload()); message('save-message', '已發起草稿下載，請核對瀏覽器下載檔案；專案反饋檔案沒有因此改變。', 'draft'); } catch (error) { message('save-message', error.message, 'error'); } });
$('export-update-draft').addEventListener('click', () => { try { download('feedback-update-draft.json', updatePayload()); message('update-message', '已發起處理草稿下載，請核對瀏覽器下載檔案；專案反饋檔案沒有因此改變。', 'draft'); } catch (error) { message('update-message', error.message, 'error'); } });
$('reload').addEventListener('click', load); $('search').addEventListener('input', renderItems); $('module-filter').addEventListener('change', renderItems); $('feedback-filter').addEventListener('change', renderFeedback);
for (const button of document.querySelectorAll('[data-close]')) button.addEventListener('click', () => $(button.dataset.close).close());
$('export-json').addEventListener('click', () => { if (snapshot) { download('project-board-record.json', snapshot); message('load-message', '已發起畫板記錄下載，請核對瀏覽器下載檔案；未改變專案檔案。'); } });
$('export-md').addEventListener('click', async () => {
  if (!snapshot) return;
  try {
    let content;
    if (snapshot.writable) {
      const response = await fetch('./api/export', { cache: 'no-store' }); if (!response.ok) throw new Error('匯出服務失敗'); content = await response.text();
    } else {
      content = '# ' + snapshot.board.project.title + ' · 靜態畫板記錄\n\n檔案存在與來源雜湊未複核。\n\n實現 ' + formatPercent(snapshot.progress.implemented) + '；驗收 ' + formatPercent(snapshot.progress.accepted) + '\n\n';
      for (const item of snapshot.board.items) content += '## ' + item.title + '\n\n' + item.summary + '\n\n' + item.checkpoints.map((p) => '- [' + (p.implemented ? 'x' : ' ') + '] ' + p.title + ' · ' + p.evidence.join('、') + ' · ' + p.gates.map((g) => gateNames[g.kind] + '：' + gateStates[g.status]).join('、')).join('\n') + '\n\n';
      for (const record of snapshot.feedback.records) content += '## ' + typeNames[record.type] + '：' + record.title + '\n\n' + record.text + '\n\n狀態：' + stateNames[record.state] + '\n\n';
    }
    download('project-board.md', content, 'text/markdown'); message('load-message', '已發起 Markdown 下載，請核對瀏覽器下載檔案；未改變專案檔案。');
  } catch (error) { message('load-message', error.message, 'error'); }
});
await load();
