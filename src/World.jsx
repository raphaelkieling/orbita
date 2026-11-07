import { i18n, t } from './i18n';
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import Globe from 'react-globe.gl';
import { MeshPhongMaterial, Color, AmbientLight, DirectionalLight } from 'three';
import { geoGraticule } from 'd3-geo';
import { atlasPlaces, borders, countries, inRegion, regions } from './game';

const ocean = new MeshPhongMaterial({ color: new Color('#191919'), shininess: 8 });
const mapLines = [
  ...geoGraticule().step([30, 30])().coordinates.map((points) => ({ points, border: false })),
  ...borders.map((points) => ({ points, border: true })),
].map((line) => ({ ...line, points: line.points.map(([lng, lat]) => [lng, lat, line.border ? 0.005 : 0.001]) }));
const START = { lat: 15, lng: -28, altitude: 2.15 };

function countryTooltip(shape) {
  const place = atlasPlaces.find((place) => place.shapeName === shape.properties.name);
  const element = document.createElement('div');
  element.className = 'country-tooltip';
  element.textContent = place ? `${place.flag} ${t(place.country)} · ${t(place.capital) || t("No capital")}` : shape.properties.name;
  return element;
}

function markerElement(marker) {
  const element = document.createElement('div');
  element.className = `globe-marker ${marker.isGuess ? 'is-guess' : 'is-answer'}`;
  const content = document.createElement('div');
  content.className = 'marker-content';
  content.style.setProperty('--flag-color', marker.color);
  content.innerHTML = '<svg class="marker-flag" viewBox="0 0 32 44" aria-hidden="true"><ellipse cx="7" cy="40" rx="6" ry="2.5" fill="#000" opacity=".4"/><path d="M7 39V4" stroke="#fff" stroke-width="4" stroke-linecap="round"/><path d="M7 39V4" stroke="#222" stroke-width="1.5" stroke-linecap="round"/><path d="M8 5C16 1 20 11 29 6V22C20 27 16 17 8 21Z" fill="var(--flag-color)" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/><circle cx="7" cy="39" r="3" fill="var(--flag-color)" stroke="#fff" stroke-width="1.5"/></svg>';
  const label = document.createElement('span');
  label.className = 'marker-label';
  label.textContent = marker.text;
  content.appendChild(label);
  element.appendChild(content);
  return element;
}

export default forwardRef(function World({ guess, question, result, finished, onSelect, exploring = false, selectedPlace, region = 'world', colorful = false }, ref) {
  const globe = useRef(null);
  const host = useRef(null);
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [ready, setReady] = useState(false);
  const [hovered, setHovered] = useState(null);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const duration = reducedMotion ? 0 : 850;
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(host.current);
    // The globe ref is committed here; the library readiness callback can fire before mount.
    setReady(true);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!ready || !globe.current) return;
    const controls = globe.current.controls();
    controls.enablePan = false; controls.minDistance = 130; controls.maxDistance = 500; controls.rotateSpeed = 0.65; controls.enableDamping = true;
    const keyLight = new DirectionalLight('#ffffff', 2.1); keyLight.position.set(-100, 180, 250);
    globe.current.lights([new AmbientLight('#ffffff', 1.6), keyLight]);
    globe.current.renderer().setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }, [ready]);

  useEffect(() => {
    if (ready) globe.current.pointOfView(regions.find((item) => item.id === region) || START, 0);
  }, [ready, region]);

  useImperativeHandle(ref, () => ({
    zoom(factor) { if (ready) { const pov = globe.current.pointOfView(); globe.current.pointOfView({ ...pov, altitude: Math.min(4, Math.max(0.3, pov.altitude * factor)) }, 0); } },
    reset() { if (ready) globe.current.pointOfView(regions.find((item) => item.id === region) || START, 0); },
    reveal(target) { if (ready) globe.current.pointOfView({ lat: target.lat, lng: target.lng, altitude: 1.7 }, duration); },
  }), [ready, duration, region]);

  const markers = useMemo(() => exploring ? (selectedPlace ? [{ lat: selectedPlace.lat, lng: selectedPlace.lng, color: '#ef4444', text: t(selectedPlace.capital || selectedPlace.country) }] : []) : [
    ...(guess ? [{ ...guess, color: result ? '#999999' : '#ef4444', text: t("Your guess"), isGuess: Boolean(result) }] : []),
    ...(result ? [{ lat: question.lat, lng: question.lng, color: '#ef4444', text: t(question.kind === 'capital' ? question.capital : question.country) }] : []),
  ], [guess, result, question, exploring, selectedPlace, i18n.language]);

  function keyControl(event) {
    const movement = { ArrowLeft: [0, -12], ArrowRight: [0, 12], ArrowUp: [12, 0], ArrowDown: [-12, 0] }[event.key];
    if (!ready || (!movement && !['+', '=', '-'].includes(event.key))) return;
    event.preventDefault();
    const pov = globe.current.pointOfView();
    if (movement) globe.current.pointOfView({ lat: Math.max(-85, Math.min(85, pov.lat + movement[0])), lng: pov.lng + movement[1] }, duration / 3);
    else globe.current.pointOfView({ altitude: Math.max(0.3, Math.min(4, pov.altitude * (event.key === '-' ? 1.3 : 0.75))) }, 0);
  }

  return <div className="globe-host" ref={host} tabIndex={0} role="region" aria-label={t("3D globe. Drag to rotate, click to select. Use arrow keys and + or - on the keyboard.")} onKeyDown={keyControl}>
    <Globe ref={globe} width={size.width} height={size.height} backgroundColor="#00000000" globeMaterial={ocean}
      globeOffset={size.width > 800 ? [size.width * 0.125, 0] : [0, 0]}
      atmosphereColor="#aaaaaa" atmosphereAltitude={0.08}
      polygonsData={countries} polygonAltitude={0.004} polygonCapCurvatureResolution={4}
      polygonCapColor={(country) => {
        const place = atlasPlaces.find((place) => place.shapeName === country.properties.name);
        if (exploring && selectedPlace?.shapeName === country.properties.name || !exploring && result && country.id === question.id) return '#eeeeee';
        if (country === hovered && (exploring || !result && !finished)) return '#a0a0a0';
        if (place && !inRegion(place, region)) return '#333333';
        if (!colorful) return '#686868';
        const palette = ['#bd8e80', '#83a99b', '#9a9ec2', '#c7af78', '#7fabbf', '#b48fa7'];
        const hash = [...country.properties.name].reduce((sum, char) => sum * 31 + char.charCodeAt(0) >>> 0, 0);
        return palette[hash % palette.length];
      }}
      polygonLabel={exploring ? countryTooltip : () => ''}
      polygonSideColor={() => '#444444'} polygonStrokeColor={() => null} polygonsTransitionDuration={0}
      onPolygonHover={setHovered} onPolygonClick={(country, event, point) => onSelect(point, country)} onGlobeClick={(point) => onSelect(point)}
      pathsData={mapLines} pathPoints="points" pathPointLat={(p) => p[1]} pathPointLng={(p) => p[0]} pathPointAlt={(p) => p[2]} pathColor={(path) => path.border ? '#242424' : '#ffffff15'} pathStroke={(path) => path.border ? 1.5 : 0.3} pathTransitionDuration={0}
      onPathClick={(_, event, point) => onSelect(point)}
      htmlElementsData={markers} htmlElement={markerElement} htmlAltitude={0.008} htmlTransitionDuration={0}
      arcsData={!exploring && result && guess && question.kind === 'capital' ? [{ startLat: guess.lat, startLng: guess.lng, endLat: question.lat, endLng: question.lng }] : []} arcColor={() => ['#999999', '#ef4444']} arcStroke={0.5} arcDashLength={0.3} arcDashGap={0.1} arcsTransitionDuration={0}
    />
    {!ready && <div className="loading">{t("Loading globe\u2026")}</div>}
  </div>;
});
