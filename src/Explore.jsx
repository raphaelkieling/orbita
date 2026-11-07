import { useState } from 'react';
import { ArrowRight, BookOpen, Search } from 'lucide-react';
import { atlasPlaces, inRegion, regions } from './game';

const normalize = (value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export default function Explore({ region, onRegionChange, selected, onSelect, onStudy }) {
  const [search, setSearch] = useState('');
  const places = atlasPlaces.filter((place) => inRegion(place, region) && normalize(`${place.country} ${place.capital}`).includes(normalize(search)))
    .sort((a, b) => a.country.localeCompare(b.country, 'pt-BR'));
  return <section className="explore-panel" aria-label="Explorar países">
    <div className="panel-top"><span>Explorar</span><span className="muted">{places.length} {places.length === 1 ? 'país ou território' : 'países e territórios'}</span></div>
    <label className="region-filter">Região<select aria-label="Região para explorar" value={region} onChange={(event) => onRegionChange(event.target.value)}>{regions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    <div className="challenge-card atlas-card">
      {selected ? <div className="place-details"><span className="country-flag" role="img" aria-label={`Bandeira de ${selected.country}`}>{selected.flag || '⚑'}</span><h1>{selected.country}</h1><dl><div><dt>{selected.capitals?.length > 1 ? 'Capitais' : 'Capital'}</dt><dd>{selected.capitals?.join(', ') || selected.capital || 'Sem capital'}</dd></div></dl>{selected.study && <button className="secondary-button" onClick={() => onStudy(selected)}><BookOpen size={14} />Estudar este país<ArrowRight size={14} /></button>}</div> : <div className="atlas-intro"><h1>Selecione um país</h1><p className="description">Clique no globo ou escolha na lista para ver a capital e a bandeira.</p></div>}
      <label className="search-field atlas-search"><Search size={15} /><input type="search" aria-label="Buscar no mapa" placeholder="Buscar país ou capital" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
      <ul className="country-list">{places.map((place) => <li key={place.id}><button aria-label={`Ver ${place.country}`} aria-pressed={selected?.id === place.id} onClick={() => onSelect(place)}><span className="list-flag" aria-hidden="true">{place.flag || '⚑'}</span><span><strong>{place.country}</strong><small>{place.capital || 'Sem capital'}</small></span><ArrowRight size={13} /></button></li>)}{!places.length && <li className="atlas-empty">Nenhum lugar encontrado.</li>}</ul>
    </div>
  </section>;
}
