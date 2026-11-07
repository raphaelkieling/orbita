import { i18n, t } from './i18n';
import { useState } from 'react';
import { ArrowRight, BookOpen, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { cardKey, cards, cardTitle, confidence, dueLabel, gradeNames, stateNames, studyQueue } from './scheduler.js';

import { inRegion, regions } from './game.js';

const date = (value) => new Date(value).toLocaleString(i18n.language === 'pt' ? 'pt-BR' : 'en-US', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const normalize = (value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export default function Learning({ records, now, onStudy, region, onRegionChange }) {
  const [filter, setFilter] = useState('mixed');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(null);
  const scopedCards = cards.filter((card) => inRegion(card, region));
  const learned = scopedCards.map((card) => records[cardKey(card)]).filter(Boolean);
  const history = learned.flatMap((record) => record.history);
  const due = learned.filter((record) => record.card.due <= now).length;
  const average = learned.length ? Math.round(learned.reduce((sum, record) => sum + confidence(record.card, now), 0) / learned.length) : null;
  const accuracy = history.length ? Math.round(history.filter((event) => event.correct).length / history.length * 100) : null;
  const queue = studyQueue(records, filter, now, region);
  const filtered = scopedCards.filter((card) => (filter === 'mixed' || card.kind === filter) && normalize(`${t(card.country)} ${cardTitle(card)}`).includes(normalize(search)))
    .sort((a, b) => {
      const ar = records[cardKey(a)], br = records[cardKey(b)];
      const priority = (record) => !record ? 2 : record.card.due <= now ? 0 : 1;
      return priority(ar) - priority(br) || (ar && br ? ar.card.due - br.card.due : 0) || cardTitle(a).localeCompare(cardTitle(b), 'en-US');
    });

  return <section className="learning-page" aria-labelledby="learning-title">
    <div className="learning-header"><div><h1 id="learning-title">{t("Progress")}</h1><p>{t("Countries and capitals have separate reviews. FSRS schedules what to study next.")}</p></div><button className="primary-button" disabled={!queue.length} onClick={() => onStudy(queue)}><BookOpen size={16} />{queue.length ? t("Study now") : t("All caught up")}{queue.length > 0 && <span>{queue.length}<ArrowRight size={16} /></span>}</button></div>
    <div className="learning-stats"><div><span>{t("Places studied")}</span><strong>{learned.length}<small> / {scopedCards.length}</small></strong></div><div><span>{t("Due reviews")}</span><strong>{due}<small> {t("due now")}</small></strong></div><div><span>{t("Average 7-day confidence")}</span><strong>{average === null ? '—' : `${average}%`}</strong></div><div><span>{t("Accuracy")}</span><strong>{accuracy === null ? '—' : `${accuracy}%`}<small> · {history.length} {history.length === 1 ? t('answer') : t('answers')}</small></strong></div></div>

    <div className="learning-toolbar"><div className="filter-buttons" aria-label={t("Filter places")}>{[['mixed', t("All")], ['country', t("Countries")], ['capital', t("Capitals")]].map(([value, label]) => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>)}</div><select className="progress-region" aria-label={t("Progress region")} value={region} onChange={(event) => onRegionChange(event.target.value)}>{regions.map((item) => <option key={item.id} value={item.id}>{t(item.name)}</option>)}</select><label className="search-field"><Search size={15} /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("Search countries or capitals")} aria-label={t("Search countries or capitals")} /></label><span className="item-count">{filtered.length} {t("places")}</span></div>
    <p className="confidence-note">{t("Confidence is the FSRS estimate of remembering a place in 7 days. Unstudied places have no estimate yet.")}</p>
    <div className="learning-table-wrap"><table className="learning-table"><thead><tr><th>{t("Place")}</th><th>{t("Type")}</th><th>{t("7-day confidence")}</th><th>{t("Reviews")}</th><th>{t("Next review")}</th><th>{t("State")}</th><th><span className="sr-only">{t("Actions")}</span></th></tr></thead><tbody>
      {filtered.map((question) => {
        const key = cardKey(question), record = records[key], value = confidence(record?.card, now);
        return <Rows key={key} question={question} record={record} value={value} now={now} expanded={expanded === key} onExpand={() => setExpanded(expanded === key ? null : key)} onStudy={() => onStudy([question])} />;
      })}
      {!filtered.length && <tr><td colSpan={7} className="table-empty">{t("No places found.")}</td></tr>}
    </tbody></table></div>
    <p className="local-storage-note">{t("Progress is saved in this browser, including after closing the page. No cross-device sync.")}</p>
  </section>;
}

function Rows({ question, record, value, now, expanded, onExpand, onStudy }) {
  return <>
    <tr>
      <td><strong>{cardTitle(question)}</strong>{question.kind === 'capital' && <span className="place-country">{t(question.country)}</span>}</td>
      <td className="muted">{question.kind === 'country' ? t("Country") : t("Capital")}</td>
      <td>{value === null ? <span className="muted">{t("Not studied")}</span> : <div className="confidence-cell"><span className="confidence-bar"><i style={{ width: `${value}%` }} /></span><span>{value}%</span></div>}</td>
      <td><button className="history-button" disabled={!record} onClick={onExpand} aria-expanded={expanded} aria-label={`History for ${cardTitle(question)}, ${question.kind === 'country' ? 'country' : 'capital'}`}>{record?.history.length ?? 0}{record && (expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}</button></td>
      <td className={record?.card.due <= now ? 'due-now' : 'muted'} title={record ? date(record.card.due) : undefined}>{dueLabel(record?.card.due, now)}</td>
      <td><span className={`state-badge ${record ? 'studied' : ''}`}>{record ? stateNames[record.card.state] : t("New")}</span></td>
      <td><button className="practice-button" onClick={onStudy} aria-label={`Practice ${cardTitle(question)}, ${question.kind === 'country' ? 'country' : 'capital'}`}>{t("Practice")}<ArrowRight size={13} /></button></td>
    </tr>
    {expanded && record && <tr className="history-row"><td colSpan={7}><div className="history-content"><h3>History for {cardTitle(question)}</h3><ul>{record.history.slice(-10).reverse().map((event, i) => <li key={i}><time dateTime={event.at}>{date(event.at)}</time><span>{event.skipped ? t("Not sure") : event.correct ? t("Correct") : t("Incorrect")}</span><span>{t(gradeNames[event.grade])}</span><span>{event.confidence}% {t("confidence after review")}</span></li>)}</ul>{record.history.length > 10 && <p>Showing the 10 latest reviews out of {record.history.length}.</p>}</div></td></tr>}
  </>;
}
