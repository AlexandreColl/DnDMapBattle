# Changelog

Todos los cambios relevantes de este proyecto se documentan en este fichero.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el proyecto usa [Versionado Semántico](https://semver.org/lang/es/).

## [Sin publicar]

### Cambiado

- **Requiere Node.js 24 (LTS) o superior** (antes, 20). La versión está fijada en `.nvmrc` y `launcher.bat` avisa si el Node instalado es anterior.
- pnpm 12 (antes, 9). Su configuración pasa de `.npmrc` a `pnpm-workspace.yaml`.
- Dependencias actualizadas a sus últimas versiones mayores: Express 5, Zod 4, ESLint 10, Vitest 5, globals 17 y eslint-config-prettier 10.
- La CI se ejecuta solo con Node 24 e incluye `pnpm audit`.

### Seguridad

- Corregidas las 22 vulnerabilidades conocidas en dependencias (4 críticas, 5 altas), heredadas de Express 4 y Vitest 2.
- pnpm no instala versiones publicadas hace menos de 3 días (`minimumReleaseAge`) ni subdependencias desde git o URLs.
- Las GitHub Actions están fijadas por SHA de commit.
- Revisión de dependencias en cada PR: falla si se añade una con vulnerabilidades conocidas.
- Dependabot propone cada semana, contra `develop`, las actualizaciones de dependencias y de Actions, con 3 días de espera.

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
