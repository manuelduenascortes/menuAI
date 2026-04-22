# Spec: Importador de carta por PDF

**Fecha:** 2026-04-22
**Estado:** Aprobado

## Contexto

El importador de carta con IA acepta actualmente dos modos de entrada: foto (imagen) y texto pegado. Los restaurantes suelen tener su carta en PDF — tanto digital (texto seleccionable) como escaneado (imagen). Este spec añade un tercer modo: subir un PDF y que la IA extraiga la carta automáticamente.

## Decisiones de diseño

- **Procesamiento client-side**: El PDF se procesa en el navegador con `pdfjs-dist`. No se añade lógica nueva al servidor.
- **Reutilización del endpoint existente**: Cada página del PDF se convierte a imagen JPEG y se manda a `/api/menu/import` con `type: "image"` — el mismo flujo que ya existe para fotos.
- **Página a página con progreso**: PDFs de cualquier tamaño se procesan página a página mostrando barra de progreso. Más robusto que enviar todo de golpe.
- **Import dinámico de pdfjs-dist**: Se carga con `import()` solo cuando el usuario selecciona el tab PDF, sin impacto en el bundle principal.

## Alcance

### Incluido
- Tab "PDF" en `MenuImport.tsx` junto a "Foto" y "Texto"
- Validación del archivo: tipo `application/pdf`, máx 20 MB
- Renderizado de cada página a canvas JPEG con `pdfjs-dist`
- Envío página a página a `/api/menu/import` (endpoint sin cambios)
- Barra de progreso: "Página X de Y · N platos encontrados"
- Fusión de resultados multipágina (categorías y platos combinados, sin duplicados por nombre)
- Pantalla de revisión existente con el resultado combinado

### Excluido
- Cambios en `/api/menu/import` o cualquier otro endpoint
- Almacenamiento del PDF original
- Selector manual de páginas
- Procesamiento server-side

## Arquitectura

```
Usuario sube PDF (≤20 MB)
  ↓
MenuImport.tsx (cliente)
  ↓ pdfjs-dist (import dinámico)
  ├─ Renderizar página 1 → canvas → JPEG base64
  │    ↓ POST /api/menu/import { type:"image", content: base64 }
  │    ↓ ExtractedMenu (categorías + platos)
  ├─ Renderizar página 2 → ...
  │    ↓ POST /api/menu/import ...
  │    ↓ Fusionar con resultados anteriores
  ├─ ... (todas las páginas)
  ↓
mergeExtractedMenus() → ExtractedMenu combinado
  ↓
Pantalla de revisión existente (sin cambios)
```

## Componentes y cambios

### `src/components/admin/MenuImport.tsx`

Único archivo modificado. Cambios:

1. **Nuevo tab "PDF"** entre "Foto" y "Texto" en el selector de modo.

2. **Estado nuevo**:
   - `pdfProgress: { current: number; total: number; itemsFound: number } | null`

3. **Zona de drop PDF**: misma estética que la de imagen, acepta solo `.pdf`.

4. **`processPdf(file: File): Promise<ExtractedMenu>`**:
   ```
   - Importar pdfjs-dist dinámicamente
   - Cargar PDF, obtener numPages
   - Para i = 1..numPages:
       - Renderizar página i a canvas (escala 1.5 para mejor calidad)
       - Canvas → toDataURL("image/jpeg", 0.85) → base64
       - POST /api/menu/import { type:"image", content: base64 }
       - Acumular resultado en mergeExtractedMenus()
       - Actualizar pdfProgress
   - Retornar ExtractedMenu fusionado
   ```

5. **`mergeExtractedMenus(a, b): ExtractedMenu`**:
   - Une categorías por nombre (case-insensitive)
   - Dentro de cada categoría, descarta platos con nombre duplicado (conserva el primero)

6. **Manejo de errores por página**: si una página falla, se reintenta una vez; si falla de nuevo se omite y continúa.

### Dependencia nueva

```bash
npm install pdfjs-dist
```

`pdfjs-dist` requiere configurar el worker. Se usa la versión legacy del worker compatible con Next.js:

```typescript
import * as pdfjsLib from 'pdfjs-dist'
pdfjsLib.GlobalWorkerOptions.workerSrc = 
  `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`
```

## Gestión de errores

| Caso | Comportamiento |
|---|---|
| PDF protegido con contraseña | Error inmediato: "Este PDF está protegido. Desbloquéalo antes de subirlo." |
| Página sin contenido | Se omite silenciosamente, continúa con la siguiente |
| Error de red en una página | Reintentar 1 vez; si falla, omitir con aviso al final |
| Ningún plato encontrado en todo el PDF | Mensaje: "No se encontraron platos. Prueba con la opción Foto o Texto." |
| Archivo > 20 MB | Validación antes de procesar: "El PDF es demasiado grande (máx 20 MB)." |
| No es un PDF válido | Error de pdfjs al cargar: "El archivo no es un PDF válido." |

## Verificación

1. Subir PDF digital (ej. exportado desde Word) → deben aparecer los platos en la pantalla de revisión
2. Subir PDF escaneado (foto de carta) → deben aparecer los platos
3. Subir PDF de 3+ páginas → barra de progreso avanza página a página, resultado final combina todo
4. Subir PDF protegido con contraseña → aparece mensaje de error claro
5. Subir archivo que no es PDF → no debe aparecer en el selector (filtro `accept=".pdf"`)
6. Subir PDF > 20 MB → mensaje de error antes de procesar
7. El tab PDF no debe aumentar el tiempo de carga inicial (import dinámico)
