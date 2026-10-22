# Changelog

Todos los cambios relevantes de este proyecto se documentan en este fichero.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el proyecto usa [Versionado Semántico](https://semver.org/lang/es/).

## [1.0.0] - Sin publicar

Primera versión estable.

### Añadido

- Mapa con cuadrícula configurable y ajuste automático a celdas cuadradas.
- Editor de fichas circulares con color de borde por clase.
- Niebla de guerra con visión por personaje, paredes que bloquean la visión y revelado manual.
- Iniciativa y control de turnos.
- Medición de distancias entre casillas.
- Guardar/cargar partidas (`.dndmap`) y exportar/importar personajes (`.dndchars`).
- Sincronización multijugador en tiempo real con Socket.IO.
- Tests (Vitest), ESLint, Prettier e integración continua en GitHub Actions.

### Seguridad

- El servidor valida cada mensaje WebSocket (tipos, rangos y tamaño de la cuadrícula) y descarta los no válidos en lugar de caerse.
- Los nombres de personaje ya no se insertan como HTML (XSS).
- Solo se aceptan imágenes `data:image/…` para mapas y fichas.
- El servidor solo sirve la carpeta `public/` y envía cabeceras de seguridad (CSP, `nosniff`).
- Tamaño máximo de mensaje reducido de 50 MB a 16 MB (configurable con `MAX_PAYLOAD_MB`).

### Corregido

- «Limpiar todo» no borraba las paredes en el servidor.
- Una iniciativa de 0 se guardaba como «sin iniciativa».
- Ocultar de nuevo una celda revelada se propagaba a los demás como «revelada».
- Cargar una partida o importar personajes no se sincronizaba con los demás jugadores.
- El zoom saltaba al llegar a los límites.

[1.0.0]: https://github.com/AlexandreColl/DnDMapBattle/releases/tag/v1.0.0
