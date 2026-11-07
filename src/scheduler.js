import { createEmptyCard, fsrs, Rating } from 'ts-fsrs';
import { inRegion, places, ROUND_COUNT } from './game.js';

export { Rating };
export const STORAGE_KEY = 'orbita-fsrs-v1';
export const scheduler = fsrs({ request_retention: 0.9, enable_fuzz: false });
export const cards = places.flatMap((place) => ['country', 'capital'].map((kind) => ({ ...place, kind,
  ...(kind === 'country' ? { lat: place.countryLat, lng: place.countryLng } : {}),
})));
export const cardKey = (question) => `${question.id}:${question.kind}`;
export const cardTitle = (question) => question.kind === 'country' ? question.country : question.capital;
export const gradeNames = { [Rating.Again]: 'Repetir', [Rating.Hard]: 'Difícil', [Rating.Good]: 'Bom', [Rating.Easy]: 'Fácil' };
export const stateNames = ['Novo', 'Aprendendo', 'Em revisão', 'Reaprendendo'];

export function confidence(card, now = new Date()) {
  if (!card?.last_review) return null;
  return Math.round(scheduler.get_retrievability(card, new Date(now.getTime() + 7 * 864e5), false) * 100);
}

export function reviewCard(records, question, answer, grade, now = new Date()) {
  const key = cardKey(question);
  const previous = records[key];
  const { card, log } = scheduler.next(previous?.card ?? createEmptyCard(now), now, grade);
  return {
    ...records,
    [key]: {
      card,
      history: [...(previous?.history ?? []), {
        at: now.toISOString(), grade, correct: answer.correct, skipped: Boolean(answer.skipped),
        distance: answer.distance ?? null, confidence: confidence(card, now), log,
      }],
    },
  };
}

export function previewRatings(records, question, now = new Date()) {
  return scheduler.repeat(records[cardKey(question)]?.card ?? createEmptyCard(now), now);
}

export function studyQueue(records, mode = 'mixed', now = new Date(), region = 'world') {
  const pool = cards.filter((card) => (mode === 'mixed' || card.kind === mode) && inRegion(card, region));
  const due = pool.filter((question) => records[cardKey(question)]?.card.due <= now)
    .sort((a, b) => records[cardKey(a)].card.due - records[cardKey(b)].card.due);
  const unseen = pool.filter((question) => !records[cardKey(question)]);
  return [...due, ...unseen].slice(0, ROUND_COUNT);
}

export function dueLabel(date, now = new Date()) {
  if (!date) return 'Não estudado';
  const minutes = Math.ceil((new Date(date) - now) / 60000);
  if (minutes <= 0) return 'Agora';
  if (minutes < 60) return `Em ${minutes} min`;
  if (minutes < 1440) return `Em ${Math.ceil(minutes / 60)} h`;
  if (minutes < 1440 * 30) return `Em ${Math.ceil(minutes / 1440)} dias`;
  return new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function restoreRecord(record) {
  const c = record?.card;
  const numericFields = ['stability', 'difficulty', 'elapsed_days', 'scheduled_days', 'reps', 'lapses', 'learning_steps', 'state'];
  if (!c || !numericFields.every((field) => Number.isFinite(c[field]) && c[field] >= 0)
    || ![0, 1, 2, 3].includes(c.state) || !Array.isArray(record.history) || record.history.length !== c.reps
    || !record.history.every((event) => [1, 2, 3, 4].includes(event.grade) && typeof event.correct === 'boolean'
      && typeof event.skipped === 'boolean' && Number.isFinite(event.confidence)
      && Number.isFinite(new Date(event.at).getTime()))) throw new Error('Invalid progress');
  const card = { ...c, due: new Date(c.due), last_review: c.last_review ? new Date(c.last_review) : undefined };
  if (!Number.isFinite(card.due.getTime()) || !card.last_review || !Number.isFinite(card.last_review.getTime())) throw new Error('Invalid dates');
  return { ...record, card };
}

export function loadProgress(storage) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return { records: {}, error: '', canPersist: true };
    const saved = JSON.parse(raw);
    const keys = new Set(cards.map(cardKey));
    if (saved.version !== 1 || !saved.records || typeof saved.records !== 'object') throw new Error('Invalid progress');
    const records = Object.fromEntries(Object.entries(saved.records).map(([key, record]) => {
      if (!keys.has(key)) throw new Error('Unknown card');
      return [key, restoreRecord(record)];
    }));
    return { records, error: '', canPersist: true };
  } catch {
    return { records: {}, error: 'Não foi possível ler o progresso salvo. Os dados existentes serão preservados; as novas respostas ficarão apenas nesta sessão.', canPersist: false };
  }
}

export function saveProgress(storage, records) {
  storage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, records }));
}
