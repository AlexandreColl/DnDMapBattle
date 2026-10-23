# Changelog

Todos los cambios relevantes de este proyecto se documentan en este fichero.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el proyecto usa [Versionado Semántico](https://semver.org/lang/es/).

## [Sin publicar]

### Cambiado

- Nueva interfaz con estilo oscuro fantasía: paleta piedra y oro, tipografía Cinzel e iconos.
- Panel lateral dividido en _Preparar_ (mapa, cuadrícula, paredes, archivos) y _Partida_ (turno actual, compañía y enemigos).
- Herramientas exclusivas en una barra lateral (mover, medir, revelar niebla, paredes) con atajos `V`, `M`, `F`, `W` y `Esc`.
- La niebla se dibuja en canvas con bordes suaves, transiciones animadas y un halo de antorcha alrededor de los aliados.
- Las paredes se pintan arrastrando (y se borran con `Mayús`).
- Editor de fichas rediseñado: elección de imagen dentro del propio editor, colores de clase en muestras y selector aliado/enemigo.
- La iniciativa se edita directamente en la lista o en el menú de cada ficha, sin ventanas del navegador.
- Avisos y confirmaciones propios en lugar de `alert()` y `confirm()`.
- Barra de iniciativa flotante y controles de zoom en pantalla.

### Añadido

- Menú de ficha al hacer clic: iniciativa, visión y quitar del mapa.
- Atajo `N` para pasar al siguiente turno, y aviso «Turno de…» en todos los dispositivos.
- Las fichas que no están en el mapa aparecen atenuadas en la lista.

### Corregido

- La regla de medición se desplazaba al medir con el mapa ampliado.

## [1.0.0] - 2026-10-22

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

[Sin publicar]: https://github.com/AlexandreColl/DnDMapBattle/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/AlexandreColl/DnDMapBattle/releases/tag/v1.0.0
