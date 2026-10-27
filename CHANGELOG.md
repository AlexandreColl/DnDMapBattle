# Changelog

Todos los cambios relevantes de este proyecto se documentan en este fichero.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el proyecto usa [Versionado Semántico](https://semver.org/lang/es/).

## [Sin publicar]

### Añadido

- Tests E2E con Playwright: dos jugadores en la misma partida (cuadrícula, fichas, paredes, turnos y medición), gestos táctiles y comprobaciones de accesibilidad con axe.
- Cobertura de los tests unitarios con umbral mínimo y comprobación de tipos con TypeScript sobre el JavaScript existente.
- La CI se divide en trabajos paralelos: lint, formato y tipos; tests unitarios y cobertura; tests E2E; auditoría de dependencias.
- CodeQL como workflow propio, en `main`, `develop` y sus PRs.
- Check del formato de commits y del título de cada PR.
- OpenSSF Scorecard con badge en el README.
- Releases automáticas al subir un tag `v*`: notas desde el CHANGELOG, zip listo para usar con las dependencias incluidas, SBOM (CycloneDX), sumas SHA-256 y atestaciones firmadas de procedencia y SBOM.
- Política de seguridad (`SECURITY.md`) con reporte privado de vulnerabilidades, formularios para reportar errores y proponer funcionalidades, plantilla de PR con checklist y `CODEOWNERS`.

### Seguridad

- Los workflows tienen permisos mínimos por trabajo, tiempo máximo, cancelan ejecuciones repetidas de un PR, usan una imagen de Ubuntu fija y registran sus conexiones de red con Harden-Runner.

### Corregido

- El texto secundario tenía un contraste insuficiente (WCAG AA).

## [1.1.0] - 2026-10-26

### Cambiado

- **Requiere Node.js 24 (LTS) o superior** (antes, 20). La versión está fijada en `.nvmrc` y `launcher.bat` avisa si el Node instalado es anterior.
- pnpm 12 (antes, 9). Su configuración pasa de `.npmrc` a `pnpm-workspace.yaml`.
- Dependencias actualizadas a sus últimas versiones mayores: Express 5, Zod 4, ESLint 10, Vitest 5, globals 17 y eslint-config-prettier 10.
- La CI se ejecuta solo con Node 24 e incluye `pnpm audit`.
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
- Soporte táctil para tablets y móviles: arrastrar fichas con el dedo (mantener pulsada en la lista para sacarlas), pintar paredes, desplazar el mapa y pellizcar para hacer zoom.

### Corregido

- La regla de medición se desplazaba al medir con el mapa ampliado.

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

[Sin publicar]: https://github.com/AlexandreColl/DnDMapBattle/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/AlexandreColl/DnDMapBattle/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/AlexandreColl/DnDMapBattle/releases/tag/v1.0.0
