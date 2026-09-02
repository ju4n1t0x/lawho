# Constitución

1. **Stack mínimo**: Astro 7.2 y solo biblioteca estándar; ninguna librería ni framework adicional, salvo para tests y la excepción de TailwindCSS v4 (junto con su plugin de Vite `@tailwindcss/vite`).
2. **Spec antes que código**: leer `docs/constitution.md` y la spec activa antes de tocar código; no añadir dependencias ni cambiar formatos sin actualizar antes la spec.
3. **Separación de capas**: pages (rutas), layouts (estructura), components (UI), content collections (contenido editorial), server islands (autenticación y escritura).
4. **Tests obligatorios**: solo se suma biblioteca para tests; al terminar cada tarea se ejecutan y se confirma que pasan.
5. **Persistencia externa**: PostgreSQL como servicio aparte consumido por variables de entorno; imágenes en filesystem servido por Nginx; Docker en un VPS con la base de datos fuera del docker-compose.
6. **Idioma**: variables en inglés, mensajes de usuario en español, contenido del sitio en español e inglés vía i18n (español por defecto).
