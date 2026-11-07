# Geographic data

`places.json` contains 177 countries and territories, with 167 countries available for study. Country IDs are stable so existing FSRS history is preserved.

- Names, capitals, regions and flags: [mledoze/countries](https://github.com/mledoze/countries), under [ODbL 1.0](https://github.com/mledoze/countries/blob/master/LICENSE).
- Capital coordinates: [Natural Earth populated places](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_10m_populated_places_simple.geojson), public domain. Original coordinates are retained, with explicit adjustments for El Aaiún and Port-aux-Français.
- Borders: Natural Earth via `world-atlas`, at 1:110 million scale. Very small territories may be omitted.

Country questions use polygon boundaries. Capital questions use capital coordinates. Middle East includes Cyprus, Egypt, Turkey, Iran, the Levant and the Arabian Peninsula. Latin America includes 20 independent Latin-language countries. North America includes Central America and the Caribbean.

All data is bundled locally; the app makes no external API requests.
