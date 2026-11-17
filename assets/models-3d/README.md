# Recursos 3D

Vacío a propósito: FITNESS OS no incluye modelos ni animaciones inventados.

Cada recurso que se añada debe registrarse en `exercise_media` con:
`kind` (anatomy_model | animation | thumbnail), `uri`, `format` (glb), `size_bytes`,
`checksum_sha256`, `source`, `license` y `attribution`. La base de datos rechaza
marcar un recurso como `available` sin `uri`, `source` y `license`.

Requisitos para móviles: GLB con compresión Draco o meshopt, texturas ≤ 2048 px
(preferible KTX2), ≤ ~5 MB por modelo de ejercicio. Mallas musculares nombradas
con el `id` de `muscle_groups` (p. ej. `pectorals`) para poder resaltarlas por rol.
