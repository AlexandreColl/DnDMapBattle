# Política de seguridad

## Versiones con soporte

Solo la última versión publicada recibe correcciones de seguridad.

| Versión | Soporte |
| ------- | ------- |
| 1.1.x   | ✅      |
| < 1.1   | ❌      |

## Cómo reportar una vulnerabilidad

**No abras un issue público.** Usa el reporte privado de GitHub:

1. Ve a la pestaña [Security → Advisories](https://github.com/AlexandreColl/DnDMapBattle/security/advisories/new) del repositorio.
2. Pulsa **Report a vulnerability** y describe:
   - qué parte se ve afectada (servidor, cliente, dependencias…),
   - cómo reproducirlo, idealmente con un mensaje de WebSocket o un fichero `.dndmap` de ejemplo,
   - qué impacto tiene (quién puede explotarlo y qué consigue).

Recibirás respuesta en un plazo de 7 días. Si se confirma, se publicará una versión corregida y un aviso de seguridad con el crédito correspondiente, salvo que prefieras quedar en el anonimato.

## Alcance

DnD Map Battle está pensado para **redes locales de confianza**: el servidor no tiene autenticación y cualquiera que se conecte puede modificar la partida. Esto es una decisión de diseño, no una vulnerabilidad.

Sí son vulnerabilidades, por ejemplo:

- Ejecutar código en el navegador de otro jugador (XSS) mediante nombres, imágenes o ficheros de partida.
- Tumbar o bloquear el servidor con un mensaje WebSocket que la validación debería rechazar.
- Leer ficheros del equipo que ejecuta el servidor fuera de `public/`.
- Dependencias con vulnerabilidades conocidas que afecten a la aplicación.
