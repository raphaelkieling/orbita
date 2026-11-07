import { useState } from 'react';
import { ArrowRight, BookOpen, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { cardKey, cards, cardTitle, confidence, dueLabel, gradeNames, stateNames, studyQueue } from './scheduler.js';

import { inRegion, regions } from './game.js';

const date = (value) => new Date(value).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
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
  const filtered = scopedCards.filter((card) => (filter === 'mixed' || card.kind === filter) && normalize(`${card.country} ${cardTitle(card)}`).includes(normalize(search)))
    .sort((a, b) => {
      const ar = records[cardKey(a)], br = records[cardKey(b)];
      const priority = (record) => !record ? 2 : record.card.due <= now ? 0 : 1;
      return priority(ar) - priority(br) || (ar && br ? ar.card.due - br.card.due : 0) || cardTitle(a).localeCompare(cardTitle(b), 'pt-BR');
    });

  return <section className="learning-page" aria-labelledby="learning-title">
    <div className="learning-header"><div><h1 id="learning-title">Progresso</h1><p>Países e capitais têm revisões independentes. O FSRS agenda o que estudar a seguir.</p></div><button className="primary-button" disabled={!queue.length} onClick={() => onStudy(queue)}><BookOpen size={16} />{queue.length ? 'Estudar agora' : 'Revisões em dia'}{queue.length > 0 && <span>{queue.length}<ArrowRight size={16} /></span>}</button></div>
    <div className="learning-stats"><div><span>Lugares estudados</span><strong>{learned.length}<small> / {scopedCards.length}</small></strong></div><div><span>Revisões pendentes</span><strong>{due}<small> para agora</small></strong></div><div><span>Confiança média em 7 dias</span><strong>{average === null ? '—' : `${average}%`}</strong></div><div><span>Taxa de acerto</span><strong>{accuracy === null ? '—' : `${accuracy}%`}<small> · {history.length} respostas</small></strong></div></div>

    <div className="learning-toolbar"><div className="filter-buttons" aria-label="Filtrar lugares">{[['mixed', 'Todos'], ['country', 'Países'], ['capital', 'Capitais']].map(([value, label]) => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>)}</div><select className="progress-region" aria-label="Região do progresso" value={region} onChange={(event) => onRegionChange(event.target.value)}>{regions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><label className="search-field"><Search size={15} /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar país ou capital" aria-label="Buscar país ou capital" /></label><span className="item-count">{filtered.length} lugares</span></div>
    <p className="confidence-note">Confiança: chance estimada pelo FSRS de lembrar daqui a 7 dias. Lugares não estudados ainda não têm estimativa.</p>
    <div className="learning-table-wrap"><table className="learning-table"><thead><tr><th>Lugar</th><th>Tipo</th><th>Confiança em 7 dias</th><th>Revisões</th><th>Próxima revisão</th><th>Estado</th><th><span className="sr-only">Ações</span></th></tr></thead><tbody>
      {filtered.map((question) => {
        const key = cardKey(question), record = records[key], value = confidence(record?.card, now);
        return <Rows key={key} question={question} record={record} value={value} now={now} expanded={expanded === key} onExpand={() => setExpanded(expanded === key ? null : key)} onStudy={() => onStudy([question])} />;
      })}
      {!filtered.length && <tr><td colSpan={7} className="table-empty">Nenhum lugar encontrado.</td></tr>}
    </tbody></table></div>
    <p className="local-storage-note">Progresso salvo neste navegador. O histórico permanece ao fechar a página. Sem sincronização entre dispositivos.</p>
  </section>;
}

function Rows({ question, record, value, now, expanded, onExpand, onStudy }) {
  return <>
    <tr>
      <td><strong>{cardTitle(question)}</strong>{question.kind === 'capital' && <span className="place-country">{question.country}</span>}</td>
      <td className="muted">{question.kind === 'country' ? 'País' : 'Capital'}</td>
      <td>{value === null ? <span className="muted">Não estudado</span> : <div className="confidence-cell"><span className="confidence-bar"><i style={{ width: `${value}%` }} /></span><span>{value}%</span></div>}</td>
      <td><button className="history-button" disabled={!record} onClick={onExpand} aria-expanded={expanded} aria-label={`Histórico de ${cardTitle(question)}, ${question.kind === 'country' ? 'país' : 'capital'}`}>{record?.history.length ?? 0}{record && (expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}</button></td>
      <td className={record?.card.due <= now ? 'due-now' : 'muted'} title={record ? date(record.card.due) : undefined}>{dueLabel(record?.card.due, now)}</td>
      <td><span className={`state-badge ${record ? 'studied' : ''}`}>{record ? stateNames[record.card.state] : 'Novo'}</span></td>
      <td><button className="practice-button" onClick={onStudy} aria-label={`Praticar ${cardTitle(question)}, ${question.kind === 'country' ? 'país' : 'capital'}`}>Praticar<ArrowRight size={13} /></button></td>
    </tr>
    {expanded && record && <tr className="history-row"><td colSpan={7}><div className="history-content"><h3>Histórico de {cardTitle(question)}</h3><ul>{record.history.slice(-10).reverse().map((event, i) => <li key={i}><time dateTime={event.at}>{date(event.at)}</time><span>{event.skipped ? 'Não sei' : event.correct ? 'Acerto' : 'Erro'}</span><span>{gradeNames[event.grade]}</span><span>{event.confidence}% de confiança após a revisão</span></li>)}</ul>{record.history.length > 10 && <p>Mostrando as 10 revisões mais recentes de {record.history.length}.</p>}</div></td></tr>}
  </>;
}
