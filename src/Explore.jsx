import { t } from './i18n';
import { useState } from 'react';
import { ArrowRight, BookOpen, Search } from 'lucide-react';
import { atlasPlaces, inRegion, regions } from './game';

const normalize = (value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export default function Explore({ region, onRegionChange, selected, onSelect, onStudy }) {
  const [search, setSearch] = useState('');
  const places = atlasPlaces.filter((place) => inRegion(place, region) && normalize(`${t(place.country)} ${t(place.capital)}`).includes(normalize(search)))
    .sort((a, b) => a.country.localeCompare(b.country, 'en-US'));
  return <section className="explore-panel" aria-label={t("Explore countries")}>
    <div className="panel-top"><span>{t("Explore")}</span><span className="muted">{places.length} {places.length === 1 ? t("country or territory") : t("countries and territories")}</span></div>
    <label className="region-filter">{t("Region")}<select aria-label={t("Explore region")} value={region} onChange={(event) => onRegionChange(event.target.value)}>{regions.map((item) => <option key={item.id} value={item.id}>{t(item.name)}</option>)}</select></label>
    <div className="challenge-card atlas-card">
      {selected ? <div className="place-details"><span className="country-flag" role="img" aria-label={`Flag of ${t(selected.country)}`}>{selected.flag || '⚑'}</span><h1>{t(selected.country)}</h1><dl><div><dt>{selected.capitals?.length > 1 ? t("Capitals") : t("Capital")}</dt><dd>{selected.capitals?.map((name) => t(name)).join(', ') || t(selected.capital) || t("No capital")}</dd></div></dl>{selected.study && <button className="secondary-button" onClick={() => onStudy(selected)}><BookOpen size={14} />{t("Study this country")}<ArrowRight size={14} /></button>}</div> : <div className="atlas-intro"><h1>{t("Select a country")}</h1><p className="description">{t("Click the globe or choose from the list to see the capital and flag.")}</p></div>}
      <label className="search-field atlas-search"><Search size={15} /><input type="search" aria-label={t("Search the map")} placeholder={t("Search countries or capitals")} value={search} onChange={(event) => setSearch(event.target.value)} /></label>
      <ul className="country-list">{places.map((place) => <li key={place.id}><button aria-label={`View ${t(place.country)}`} aria-pressed={selected?.id === place.id} onClick={() => onSelect(place)}><span className="list-flag" aria-hidden="true">{place.flag || '⚑'}</span><span><strong>{t(place.country)}</strong><small>{t(place.capital) || t("No capital")}</small></span><ArrowRight size={13} /></button></li>)}{!places.length && <li className="atlas-empty">{t("No places found.")}</li>}</ul>
    </div>
  </section>;
}
