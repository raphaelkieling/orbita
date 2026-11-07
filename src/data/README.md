# Dados geográficos

`places.json` é um snapshot local com 177 países e territórios presentes no mapa. Destes, 167 países têm os dois cartões disponíveis para estudo (334 cartões). Os identificadores ISO numéricos dos 34 países originais foram mantidos, preservando seu histórico FSRS.

Fontes:

- Nomes, capitais, regiões e bandeiras: [mledoze/countries](https://github.com/mledoze/countries), sob [ODbL 1.0](https://github.com/mledoze/countries/blob/master/LICENSE). Os nomes dos países foram adaptados para português brasileiro; as capitais originais e os nomes comuns do Oriente Médio também estão em português.
- Coordenadas das capitais: [Natural Earth populated places](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_10m_populated_places_simple.geojson), domínio público. Mantivemos as coordenadas dos lugares originais; as coordenadas de El Aaiún e Port-aux-Français foram ajustadas explicitamente.
- Fronteiras: Natural Earth via `world-atlas`, escala 1:110 milhões. Territórios muito pequenos podem não aparecer nesta escala.

Os pontos `countryLat`/`countryLng` apenas centralizam e indicam o país. As respostas de capitais usam `lat`/`lng`; respostas de países usam o polígono, sem tolerância baseada no centro.

Oriente Médio: Chipre, Egito, Turquia, Irã e os países do Levante e da Península Arábica presentes no mapa. América Latina: os 20 países independentes de línguas latinas das Américas. América do Norte inclui América Central e Caribe; há filtros separados para essas sub-regiões. Esses recortes são opções de estudo, não alterações nas fronteiras.

Os dados e bandeiras são incluídos no build. Não há consultas externas durante o uso do app.
