import { i18n, readSettings, SETTINGS_KEY, t } from './i18n';
import { useTranslation } from 'react-i18next';
import SettingsModal from './SettingsModal';
import { Settings } from 'lucide-react';
import React, { Component, Suspense, lazy, useEffect, useRef, useState } from 'react';
import { ArrowRight, BookOpen, Check, ChevronRight, CircleHelp, Crosshair, Flag, Globe2, LocateFixed, MapPin, Minus, MousePointer2, Plus, RotateCcw, Trophy, X } from 'lucide-react';
import { atlasPlaces, CAPITAL_RADIUS, coordinates, createGame, evaluateGuess, placeAt, regions } from './game';
import { cards, cardKey, cardTitle, dueLabel, gradeNames, loadProgress, previewRatings, Rating, reviewCard, saveProgress, studyQueue } from './scheduler.js';
import Learning from './Learning.jsx';
import Explore from './Explore.jsx';

const World = lazy(() => import('./World'));
const number = (value) => value.toLocaleString('en-US');

class GlobeBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? <div className="globe-error"><Globe2 size={44} /><h2>{t("Unable to load the globe")}</h2><p>{t("Enable browser hardware acceleration and reload.")}</p><button className="secondary-button" onClick={() => window.location.reload()}>{t("Reload")}</button></div> : this.props.children;
  }
}

function readProgress() {
  try { return loadProgress(window.localStorage); }
  catch { return { records: {}, error: t("Storage is unavailable. Progress will only last for this session."), canPersist: false }; }
}

export default function App() {
  useTranslation();
  const [settings, setSettings] = useState(readSettings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsError, setSettingsError] = useState(false);
  function updateSettings(next) {
    setSettings(next);
    i18n.changeLanguage(next.language);
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(next)); setSettingsError(false); }
    catch { setSettingsError(true); }
  }
  useEffect(() => { document.documentElement.lang = settings.language; document.title = settings.language === 'pt' ? 'Órbita — Geografia' : 'Orbit — Geography'; }, [settings.language]);
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
      catch { error = t("Unable to save progress. Answers will last for this session only. Check browser storage and permissions."); }
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
      if (event.repeat || event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || help || settingsOpen || tab !== 'learn') return;
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
      <a className="brand" href={import.meta.env.BASE_URL} aria-label={t("Orbit home")}><span className="brand-symbol"><Globe2 size={26} strokeWidth={1.4} /></span><span>{t("orbit.")}</span></a>
      <nav className="main-nav" aria-label={t("Main navigation")}>
        <button aria-current={tab === 'learn' ? 'page' : undefined} onClick={() => navigate('learn')}><BookOpen size={16} />{t("Learn")}</button>
        <button aria-current={tab === 'explore' ? 'page' : undefined} onClick={() => navigate('explore')}><Globe2 size={16} />{t("Explore")}</button>
        <button aria-current={tab === 'progress' ? 'page' : undefined} onClick={() => navigate('progress')}><Trophy size={16} />{t("Progress")}</button>
      </nav>
      <div className="navbar-actions"><button className="help-button" aria-label={t("How to play")} onClick={() => setHelp(true)}><CircleHelp size={17} /><span>{t("How to play")}</span></button><button className="settings-button" aria-label={t('Settings')} onClick={() => setSettingsOpen(true)}><Settings size={19} /></button></div>
    </header>

    {progress.error && <div className="storage-warning" role="alert">{progress.error}</div>}

    {showDashboard ? <Learning records={progress.records} now={clock} onStudy={startStudy} region={region} onRegionChange={changeRegion} /> : <>
      <section className="world-stage" aria-label={t("Interactive globe")}>
        <GlobeBoundary><Suspense fallback={<div className="loading"><Globe2 size={34} /><span>{t("Loading globe\u2026")}</span></div>}>
          <World ref={worldRef} colorful={settings.colorful} guess={guess} question={question} result={result} finished={finished} exploring={exploring} selectedPlace={selectedPlace} region={region} onSelect={(point, shape) => {
            if (exploring) selectPlace(shape ? atlasPlaces.find((place) => place.shapeName === shape.properties.name) : placeAt(point));
            else if (!result && !finished) setGuess(point);
          }} />
        </Suspense></GlobeBoundary>
      </section>

      <div className="game-layout">
        {exploring ? <Explore region={region} onRegionChange={changeRegion} selected={selectedPlace} onSelect={(place) => selectPlace(place, true)} onStudy={(place) => startStudy(cards.filter((card) => card.id === place.id))} /> : <section className="challenge-panel" aria-label={t("Current challenge")}>
          <div className="panel-top"><span>{studying ? t("FSRS review") : t("Learn")}</span>{studying ? <button className="text-button" onClick={() => setTab('progress')}>{t("Back to progress")}</button> : <select aria-label={t("Challenge type")} value={mode} onChange={(event) => restart(event.target.value)}><option value="mixed">{t("Countries and capitals")}</option><option value="country">{t("Countries")}</option><option value="capital">{t("Capitals")}</option></select>}</div>
          <label className="region-filter">{t("Region")}<select aria-label={t("Study region")} value={region} onChange={(event) => changeRegion(event.target.value)}>{regions.map((item) => <option key={item.id} value={item.id}>{t(item.name)}</option>)}</select></label>
          {finished ? <div className="challenge-card finish-card" aria-live="polite">
            <Trophy size={30} strokeWidth={1.5} />
            <h1>{t("Session complete")}</h1>
            <p className="description">{t("{{correct}} correct out of {{total}} answers.", { correct: hits, total: questions.length })}</p>
            <div className="final-score">{number(score)}<span>{t("of")} {number(questions.length * 1000)} {t("points")}</span></div>
            <button className="primary-button" onClick={() => { setTab('progress'); setStudying(false); }}>{t("View progress")}<ArrowRight size={17} /></button>
            <button className="secondary-button" disabled={studying && !studyQueue(progress.records, mode, new Date(), region).length} onClick={() => studying ? startStudy(studyQueue(progress.records, mode, new Date(), region)) : restart()}>{t("New session")}<RotateCcw size={15} /></button>
          </div> : <div className="challenge-card">
            <div className="round-row"><span>{t("Round")} <b>{String(round + 1).padStart(2, '0')}</b><span className="round-total"> / {questions.length}</span></span><span className="type-badge">{question.kind === 'country' ? <Flag size={12} /> : <MapPin size={12} />}{question.kind === 'country' ? t("Country") : t("Capital")}</span></div>
            <div className="round-progress" aria-label={t("Round {{round}} of {{total}}", { round: round + 1, total: questions.length })}>{questions.map((_, i) => <span key={i} className={i < answers.length ? (answers[i].correct ? 'hit' : 'miss') : i === round ? 'current' : ''} />)}</div>
            <div className="question-body"><p className="card-kicker">{question.kind === 'country' ? t("Where is this country?") : t("Where is this capital?")}</p><h1>{cardTitle(question)}</h1><p className="description">{t("Select a point on the globe and confirm.")}</p></div>
            {result ? <div className={`result-box ${result.correct ? 'correct' : 'incorrect'}`} role="status">
              <div className="result-title">{result.correct ? <Check size={18} /> : <Flag size={17} />}<strong>{result.skipped ? t("Answer revealed") : result.correct ? t("Correct") : t("Incorrect")}</strong><span>+{number(result.points)}</span></div>
              <p>{result.skipped ? t('{{place}} is marked on the globe.', { place: cardTitle(question) + (question.kind === 'capital' ? ', ' + t(question.country) : '') }) : question.kind === 'capital' ? <>{t("Your guess was")} <b>{number(result.distance)} km</b> {t("from")} {cardTitle(question)}, {t(question.country)}.</> : result.correct ? t('The point is inside {{place}}.', { place: t(question.country) }) : t('{{place}} is highlighted in white on the globe.', { place: t(question.country) })}</p>
            </div> : <div className={`guess-status ${guess ? 'selected' : ''}`} aria-live="polite"><Crosshair size={19} /><div><strong>{guess ? t("Guess selected") : t("No point selected")}</strong><span>{guess ? coordinates(guess) : t("Click the globe to place a marker")}</span></div>{guess && <button className="clear-guess" aria-label={t("Clear guess")} onClick={() => setGuess(null)}><X size={15} /></button>}</div>}

            {ratings && <div className="rating-section"><p>{t("How well did you remember?")}</p><div className="rating-options">{[Rating.Hard, Rating.Good, Rating.Easy].map((grade) => <button key={grade} aria-keyshortcuts={String(grade - 1)} onClick={() => rate(grade)}><strong><kbd aria-hidden="true">{grade - 1}</kbd>{t(gradeNames[grade])}</strong><span>{dueLabel(ratings[grade].card.due, new Date(result.answeredAt))}</span></button>)}</div></div>}
            {result?.reviewed && <p className="review-saved"><Check size={12} />{t(gradeNames[result.grade])} · {t("Next review")}: {dueLabel(result.due, clock).toLowerCase()}</p>}

            <button className="primary-button" aria-keyshortcuts="Enter" disabled={result ? !result.reviewed : !guess} onClick={result ? next : () => submit()}>{result ? (round === questions.length - 1 ? t("View results") : t("Next")) : t("Confirm guess")}<kbd aria-hidden="true">{t("Enter")}</kbd></button>
            {!result && <button className="secondary-button skip-button" aria-keyshortcuts="n" onClick={() => submit(true)}>{t("Not sure")}<kbd aria-hidden="true">{t("N")}</kbd></button>}
            <p className="rule-note">{question.kind === 'country' ? t("Any point inside the country counts.") : t('Within {{distance}} km of the capital counts.', { distance: CAPITAL_RADIUS })}</p>

          </div>}
          <div className="session-stats"><div><span>{t("Correct")}</span><strong>{hits}<small> / {answers.length || '—'}</small></strong></div><div><span>{t("Score")}</span><strong>{number(score)}<small> {t("pts")}</small></strong></div><div><span>{t("Place reviews")}</span><strong>{record?.history.length ?? 0}</strong></div></div>
          {!finished && <button className="restart-button" onClick={() => studying ? startStudy(studyQueue(progress.records, mode, new Date(), region)) : restart()}><RotateCcw size={12} />{t("Restart session")}</button>}
        </section>}
      </div>

      {!exploring && result && <div className="map-legend">{guess && <span><i className="guess-dot" />{t("Your guess")}</span>}<span><i className="answer-dot" />{t("Answer")}</span></div>}
      <div className="map-controls" aria-label={t("Globe controls")}><button aria-label={t("Zoom in")} onClick={() => worldRef.current?.zoom(0.75)}><Plus size={18} /></button><button aria-label={t("Zoom out")} onClick={() => worldRef.current?.zoom(1.3)}><Minus size={18} /></button><span /><button aria-label={t("Reset view")} onClick={() => worldRef.current?.reset()}><LocateFixed size={18} /></button></div>
      <footer className="footer"><span><MousePointer2 size={13} />{t("Drag to rotate \u00b7 Scroll to zoom")}</span><span>{t("Borders: Natural Earth")}</span></footer>
    </>}

    {help && <Help onClose={() => setHelp(false)} />}
    {settingsOpen && <SettingsModal settings={settings} onChange={updateSettings} onClose={() => setSettingsOpen(false)} storageError={settingsError} />}
  </main>;
}

function Help({ onClose }) {
  const dialog = useRef(null);
  useEffect(() => { const previous = document.activeElement; dialog.current.showModal(); return () => { previous?.focus(); }; }, []);
  return <dialog ref={dialog} className="help-dialog" onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }} aria-labelledby="help-title"><div className="help-content"><button className="dialog-close" onClick={onClose} aria-label={t("Close instructions")} autoFocus><X size={19} /></button><h2 id="help-title">{t("How to play")}</h2><ol><li><MousePointer2 /><div><strong>{t("Select a point")}</strong><span>{t("Drag to rotate the globe and scroll to zoom. Click to place your guess.")}</span></div></li><li><Check /><div><strong>{t("Confirm or reveal the answer")}</strong><span>{t("Countries: click inside the border. Capitals: within 300 km. Choose \u201cNot sure\u201d to reveal the answer, then move on.")}</span></div></li><li><BookOpen /><div><strong>{t("Rate your recall")}</strong><span>{t("After a correct answer, choose Hard, Good or Easy. Mistakes and \u201cNot sure\u201d count as Again. FSRS schedules your next review.")}</span></div></li></ol><p className="keyboard-help">{t("Shortcuts: Enter to confirm or continue; N for \u201cNot sure\u201d; 1, 2 and 3 for Hard, Good and Easy. Use arrow keys and +/\u2212 with the globe focused. In Explore, click countries to see their names, capitals and flags. Progress is saved in this browser.")}</p><button className="primary-button" onClick={onClose}>{t("Got it")}<ChevronRight size={17} /></button></div></dialog>;
}

