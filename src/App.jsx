import React, { Component, Suspense, lazy, useEffect, useRef, useState } from 'react';
import { ArrowRight, BookOpen, Check, ChevronRight, CircleHelp, Crosshair, Flag, Globe2, LocateFixed, Minus, MousePointer2, Plus, RotateCcw, Trophy, X } from 'lucide-react';
import { atlasPlaces, CAPITAL_RADIUS, coordinates, createGame, evaluateGuess, placeAt, regions } from './game';
import { cards, cardKey, cardTitle, dueLabel, gradeNames, loadProgress, previewRatings, Rating, reviewCard, saveProgress, studyQueue } from './scheduler.js';
import Learning from './Learning.jsx';
import Explore from './Explore.jsx';

const World = lazy(() => import('./World'));
const number = (value) => value.toLocaleString('pt-BR');

class GlobeBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? <div className="globe-error"><Globe2 size={44} /><h2>O globo não pôde carregar</h2><p>Ative a aceleração gráfica do navegador e recarregue.</p><button className="secondary-button" onClick={() => window.location.reload()}>Recarregar</button></div> : this.props.children;
  }
}

function readProgress() {
  try { return loadProgress(window.localStorage); }
  catch { return { records: {}, error: 'O armazenamento está indisponível. O progresso ficará apenas nesta sessão.', canPersist: false }; }
}

export default function App() {
  const [tab, setTab] = useState('learn');
  const [studying, setStudying] = useState(false);
  const [mode, setMode] = useState('mixed');
  const [questions, setQuestions] = useState(() => createGame('mixed'));
  const [round, setRound] = useState(0);
  const [guess, setGuess] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [finished, setFinished] = useState(false);
  const [help, setHelp] = useState(false);
  const [region, setRegion] = useState('world');
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [progress, setProgress] = useState(readProgress);
  const [clock, setClock] = useState(() => new Date());
  const worldRef = useRef(null);
  const question = questions[round];
  const result = answers[round];
  const score = answers.reduce((sum, answer) => sum + answer.points, 0);
  const hits = answers.filter((answer) => answer.correct).length;
  const showDashboard = tab === 'progress';
  const exploring = tab === 'explore';
  const record = progress.records[cardKey(question)];
  const ratings = result?.correct && !result.reviewed ? previewRatings(progress.records, question, new Date(result.answeredAt)) : null;

  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  function startSession(nextQuestions, nextMode = mode) {
    setMode(nextMode); setQuestions(nextQuestions); setRound(0); setGuess(null);
    setAnswers([]); setFinished(false);
    worldRef.current?.reset();
  }

  function restart(nextMode = mode) {
    startSession(createGame(nextMode, region), nextMode);
  }

  function startStudy(queue) {
    if (!queue.length) return;
    const nextMode = queue.every((card) => card.kind === queue[0].kind) ? queue[0].kind : 'mixed';
    startSession(queue, nextMode); setStudying(true); setTab('learn');
  }

  function persistReview(answer, grade) {
    const records = reviewCard(progress.records, question, answer, grade, new Date(answer.answeredAt));
    let error = progress.error;
    if (progress.canPersist) {
      try { saveProgress(window.localStorage, records); error = ''; }
      catch { error = 'Não foi possível salvar o progresso. As respostas ficarão nesta sessão; verifique o espaço e as permissões do navegador.'; }
    }
    setProgress({ ...progress, records, error });
    setClock(new Date());
    return records[cardKey(question)].card.due;
  }

  function submit(skipped = false) {
    if ((!guess && !skipped) || result || finished) return;
    const answer = {
      ...(skipped ? { correct: false, distance: null, points: 0 } : evaluateGuess(question, guess)),
      skipped, answeredAt: new Date().toISOString(), reviewed: false,
    };
    if (skipped) setGuess(null);
    if (!answer.correct) { answer.due = persistReview(answer, Rating.Again); answer.reviewed = true; answer.grade = Rating.Again; }
    setAnswers((previous) => [...previous, answer]);
    worldRef.current?.reveal(question);
  }

  function rate(grade) {
    if (!result?.correct || result.reviewed) return;
    const due = persistReview(result, grade);
    setAnswers((previous) => previous.map((answer, index) => index === round ? { ...answer, reviewed: true, grade, due } : answer));
  }

  function next() {
    if (!result?.reviewed) return;
    if (round === questions.length - 1) setFinished(true);
    else { setRound((value) => value + 1); setGuess(null); }
  }

  function navigate(nextTab) {
    setTab(nextTab);
  }

  function changeRegion(nextRegion) {
    setRegion(nextRegion); setSelectedPlace(null);
    startSession(createGame(mode, nextRegion)); setStudying(false);
  }

  function selectPlace(place, focus = false) {
    if (!place) return;
    setSelectedPlace(place);
    if (focus) worldRef.current?.reveal({ ...place, lat: place.countryLat, lng: place.countryLng });
  }

  useEffect(() => {
    const onKey = (event) => {
      if (event.repeat || event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || help || tab !== 'learn') return;
      const target = event.target;
      if (target.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (event.key === 'Enter') {
        if (target.closest('button, a')) return;
        event.preventDefault();
        if (result?.reviewed) next();
        else if (!result && guess && !finished) submit();
      } else if (event.key.toLowerCase() === 'n' && !result && !finished) {
        event.preventDefault(); submit(true);
      } else if (['1', '2', '3'].includes(event.key) && result?.correct && !result.reviewed && !finished) {
        event.preventDefault(); rate([Rating.Hard, Rating.Good, Rating.Easy][Number(event.key) - 1]);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  return <main className={`app ${showDashboard ? 'dashboard-view' : ''}`}>
    <header className="navbar">
      <a className="brand" href={import.meta.env.BASE_URL} aria-label="Órbita, início"><span className="brand-symbol"><Globe2 size={26} strokeWidth={1.4} /></span><span>órbita.</span></a>
      <nav className="main-nav" aria-label="Navegação principal">
        <button aria-current={tab === 'learn' ? 'page' : undefined} onClick={() => navigate('learn')}><BookOpen size={16} />Aprender</button>
        <button aria-current={tab === 'explore' ? 'page' : undefined} onClick={() => navigate('explore')}><Globe2 size={16} />Explorar</button>
        <button aria-current={tab === 'progress' ? 'page' : undefined} onClick={() => navigate('progress')}><Trophy size={16} />Progresso</button>
      </nav>
      <button className="help-button" aria-label="Como jogar" onClick={() => setHelp(true)}><CircleHelp size={17} /><span>Como jogar</span></button>
    </header>

    {progress.error && <div className="storage-warning" role="alert">{progress.error}</div>}

    {showDashboard ? <Learning records={progress.records} now={clock} onStudy={startStudy} region={region} onRegionChange={changeRegion} /> : <>
      <section className="world-stage" aria-label="Globo interativo">
        <GlobeBoundary><Suspense fallback={<div className="loading"><Globe2 size={34} /><span>Carregando globo…</span></div>}>
          <World ref={worldRef} guess={guess} question={question} result={result} finished={finished} exploring={exploring} selectedPlace={selectedPlace} region={region} onSelect={(point, shape) => {
            if (exploring) selectPlace(shape ? atlasPlaces.find((place) => place.shapeName === shape.properties.name) : placeAt(point));
            else if (!result && !finished) setGuess(point);
          }} />
        </Suspense></GlobeBoundary>
      </section>

      <div className="game-layout">
        {exploring ? <Explore region={region} onRegionChange={changeRegion} selected={selectedPlace} onSelect={(place) => selectPlace(place, true)} onStudy={(place) => startStudy(cards.filter((card) => card.id === place.id))} /> : <section className="challenge-panel" aria-label="Desafio atual">
          <div className="panel-top"><span>{studying ? 'Revisão FSRS' : 'Aprender'}</span>{studying ? <button className="text-button" onClick={() => setTab('progress')}>Voltar ao progresso</button> : <select aria-label="Tipo de desafio" value={mode} onChange={(event) => restart(event.target.value)}><option value="mixed">Países e capitais</option><option value="country">Países</option><option value="capital">Capitais</option></select>}</div>
          <label className="region-filter">Região<select aria-label="Região de estudo" value={region} onChange={(event) => changeRegion(event.target.value)}>{regions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          {finished ? <div className="challenge-card finish-card" aria-live="polite">
            <Trophy size={30} strokeWidth={1.5} />
            <h1>Sessão concluída</h1>
            <p className="description">{hits} acertos em {questions.length} respostas.</p>
            <div className="final-score">{number(score)}<span>de {number(questions.length * 1000)} pontos</span></div>
            <button className="primary-button" onClick={() => { setTab('progress'); setStudying(false); }}>Ver progresso<ArrowRight size={17} /></button>
            <button className="secondary-button" disabled={studying && !studyQueue(progress.records, mode, new Date(), region).length} onClick={() => studying ? startStudy(studyQueue(progress.records, mode, new Date(), region)) : restart()}>Nova sessão<RotateCcw size={15} /></button>
          </div> : <div className="challenge-card">
            <div className="round-row"><span>Rodada <b>{String(round + 1).padStart(2, '0')}</b><span className="round-total"> / {questions.length}</span></span><span className="type-badge">{question.kind === 'country' ? <Flag size={12} /> : <MapPin size={12} />}{question.kind === 'country' ? 'País' : 'Capital'}</span></div>
            <div className="round-progress" aria-label={`Rodada ${round + 1} de ${questions.length}`}>{questions.map((_, i) => <span key={i} className={i < answers.length ? (answers[i].correct ? 'hit' : 'miss') : i === round ? 'current' : ''} />)}</div>
            <div className="question-body"><p className="card-kicker">{question.kind === 'country' ? 'Onde fica este país?' : 'Onde fica esta capital?'}</p><h1>{cardTitle(question)}</h1><p className="description">Marque um ponto no globo e confirme.</p></div>
            {result ? <div className={`result-box ${result.correct ? 'correct' : 'incorrect'}`} role="status">
              <div className="result-title">{result.correct ? <Check size={18} /> : <Flag size={17} />}<strong>{result.skipped ? 'Resposta revelada' : result.correct ? 'Correto' : 'Incorreto'}</strong><span>+{number(result.points)}</span></div>
              <p>{result.skipped ? `${cardTitle(question)}${question.kind === 'capital' ? `, ${question.country}` : ''} está marcado no globo.` : question.kind === 'capital' ? <>Seu palpite ficou a <b>{number(result.distance)} km</b> de {cardTitle(question)}, {question.country}.</> : result.correct ? `O ponto está dentro de ${question.country}.` : `${question.country} está destacado em branco no globo.`}</p>
            </div> : <div className={`guess-status ${guess ? 'selected' : ''}`} aria-live="polite"><Crosshair size={19} /><div><strong>{guess ? 'Palpite marcado' : 'Nenhum ponto selecionado'}</strong><span>{guess ? coordinates(guess) : 'Clique no globo para marcar'}</span></div>{guess && <button className="clear-guess" aria-label="Limpar palpite" onClick={() => setGuess(null)}><X size={15} /></button>}</div>}

            {ratings && <div className="rating-section"><p>Como foi lembrar?</p><div className="rating-options">{[Rating.Hard, Rating.Good, Rating.Easy].map((grade) => <button key={grade} aria-keyshortcuts={String(grade - 1)} onClick={() => rate(grade)}><strong><kbd aria-hidden="true">{grade - 1}</kbd>{gradeNames[grade]}</strong><span>{dueLabel(ratings[grade].card.due, new Date(result.answeredAt))}</span></button>)}</div></div>}
            {result?.reviewed && <p className="review-saved"><Check size={12} />{gradeNames[result.grade]} · Próxima revisão: {dueLabel(result.due, clock).toLowerCase()}</p>}

            <button className="primary-button" aria-keyshortcuts="Enter" disabled={result ? !result.reviewed : !guess} onClick={result ? next : () => submit()}>{result ? (round === questions.length - 1 ? 'Ver resultado' : 'Próximo') : 'Confirmar palpite'}<kbd aria-hidden="true">Enter</kbd></button>
            {!result && <button className="secondary-button skip-button" aria-keyshortcuts="n" onClick={() => submit(true)}>Não sei<kbd aria-hidden="true">N</kbd></button>}
            <p className="rule-note">{question.kind === 'country' ? 'Qualquer ponto dentro do país vale.' : `Tolerância de ${CAPITAL_RADIUS} km da capital.`}</p>

          </div>}
          <div className="session-stats"><div><span>Acertos</span><strong>{hits}<small> / {answers.length || '—'}</small></strong></div><div><span>Pontuação</span><strong>{number(score)}<small> pts</small></strong></div><div><span>Revisões deste lugar</span><strong>{record?.history.length ?? 0}</strong></div></div>
          {!finished && <button className="restart-button" onClick={() => studying ? startStudy(studyQueue(progress.records, mode, new Date(), region)) : restart()}><RotateCcw size={12} />Reiniciar sessão</button>}
        </section>}
      </div>

      {!exploring && result && <div className="map-legend">{guess && <span><i className="guess-dot" />Seu palpite</span>}<span><i className="answer-dot" />Resposta</span></div>}
      <div className="map-controls" aria-label="Controles do globo"><button aria-label="Aumentar zoom" onClick={() => worldRef.current?.zoom(0.75)}><Plus size={18} /></button><button aria-label="Diminuir zoom" onClick={() => worldRef.current?.zoom(1.3)}><Minus size={18} /></button><span /><button aria-label="Centralizar globo" onClick={() => worldRef.current?.reset()}><LocateFixed size={18} /></button></div>
      <footer className="footer"><span><MousePointer2 size={13} />Arraste para girar · Scroll para zoom</span><span>Fronteiras: Natural Earth</span></footer>
    </>}

    {help && <Help onClose={() => setHelp(false)} />}
  </main>;
}

function Help({ onClose }) {
  const dialog = useRef(null);
  useEffect(() => { const previous = document.activeElement; dialog.current.showModal(); return () => { previous?.focus(); }; }, []);
  return <dialog ref={dialog} className="help-dialog" onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }} aria-labelledby="help-title"><div className="help-content"><button className="dialog-close" onClick={onClose} aria-label="Fechar instruções" autoFocus><X size={19} /></button><h2 id="help-title">Como jogar</h2><ol><li><MousePointer2 /><div><strong>Selecione um ponto</strong><span>Arraste para girar o globo e use o scroll para dar zoom. Clique para marcar seu palpite.</span></div></li><li><Check /><div><strong>Confirme ou revele a resposta</strong><span>Países: o ponto deve estar dentro da fronteira. Capitais: até 300 km. Use “Não sei” para ver a resposta e depois avance.</span></div></li><li><BookOpen /><div><strong>Registre a revisão</strong><span>Nos acertos, escolha Difícil, Bom ou Fácil. Erros e “Não sei” contam como Repetir. O FSRS agenda a próxima revisão.</span></div></li></ol><p className="keyboard-help">Atalhos: Enter para confirmar ou avançar; N para “Não sei”; 1, 2 e 3 para Difícil, Bom e Fácil. Use as setas e +/− com o globo focado. Em Explorar, clique nos países para ver nome, capital e bandeira. O progresso é salvo neste navegador.</p><button className="primary-button" onClick={onClose}>Entendi<ChevronRight size={17} /></button></div></dialog>;
}

