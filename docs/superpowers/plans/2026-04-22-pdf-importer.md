# PDF Importer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir un tercer modo "PDF" al importador de carta con IA que procesa cada página como imagen y combina los resultados.

**Architecture:** `pdfjs-dist` se importa dinámicamente en el cliente. Cada página del PDF se renderiza a un canvas JPEG y se manda al endpoint `/api/menu/import` existente con `type:"image"`. Los resultados de todas las páginas se fusionan en el cliente antes de mostrar la pantalla de revisión. Sin cambios en el servidor.

**Tech Stack:** pdfjs-dist, React, Next.js 16 App Router, Tailwind, shadcn/ui

---

## File Map

| Acción | Archivo |
|---|---|
| Modify | `src/components/admin/MenuImport.tsx` |
| Install | `pdfjs-dist` |

---

## Task 1: Instalar pdfjs-dist

**Files:**
- Modify: `package.json` (via npm)

- [ ] **Step 1: Instalar dependencia**

```bash
npm install pdfjs-dist
```

- [ ] **Step 2: Verificar instalación**

```bash
node -e "const p = require('pdfjs-dist/package.json'); console.log('pdfjs version:', p.version)"
```

Salida esperada: `pdfjs version: X.X.X`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install pdfjs-dist for PDF import"
```

---

## Task 2: Añadir tipos, estado y utilidad de fusión

**Files:**
- Modify: `src/components/admin/MenuImport.tsx`

- [ ] **Step 1: Cambiar el tipo de `mode` para incluir `'pdf'`**

En `MenuImport.tsx`, línea 45, cambiar:

```typescript
const [mode, setMode] = useState<'image' | 'text'>('image')
```

por:

```typescript
const [mode, setMode] = useState<'image' | 'text' | 'pdf'>('image')
```

- [ ] **Step 2: Añadir estado de progreso PDF, nombre de archivo y ref del input PDF**

Después de la línea con `const fileRef = useRef<HTMLInputElement>(null)`, añadir:

```typescript
const pdfRef = useRef<HTMLInputElement>(null)
const [pdfProgress, setPdfProgress] = useState<{ current: number; total: number; itemsFound: number } | null>(null)
const [pdfFileName, setPdfFileName] = useState<string | null>(null)
```

- [ ] **Step 3: Añadir la función `mergeExtractedMenus`**

Añadir esta función justo antes de `handleFileSelect`:

```typescript
function mergeExtractedMenus(a: ExtractedMenu, b: ExtractedMenu): ExtractedMenu {
  const result: ExtractedMenu = {
    categories: a.categories.map(c => ({ ...c, items: [...c.items] })),
  }
  for (const bCat of b.categories) {
    const existing = result.categories.find(
      c => c.name.toLowerCase() === bCat.name.toLowerCase()
    )
    if (existing) {
      for (const bItem of bCat.items) {
        const isDuplicate = existing.items.some(
          i => i.name.toLowerCase() === bItem.name.toLowerCase()
        )
        if (!isDuplicate) existing.items.push(bItem)
      }
    } else {
      result.categories.push({ ...bCat, items: [...bCat.items] })
    }
  }
  return result
}
```

- [ ] **Step 4: Verificar que compila**

```bash
npm run build 2>&1 | tail -20
```

Sin errores de TypeScript.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/MenuImport.tsx
git commit -m "feat(pdf-import): add PDF mode state and mergeExtractedMenus utility"
```

---

## Task 3: Implementar processPdf()

**Files:**
- Modify: `src/components/admin/MenuImport.tsx`

- [ ] **Step 1: Añadir la función `processPdf`**

Añadir esta función justo antes de `handleExtract`:

```typescript
async function processPdf(file: File): Promise<ExtractedMenu> {
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

  const arrayBuffer = await file.arrayBuffer()
  let pdf: Awaited<ReturnType<typeof pdfjsLib.getDocument>>
  try {
    pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  } catch (err: unknown) {
    if ((err as { name?: string }).name === 'PasswordException') {
      throw new Error('Este PDF está protegido. Desbloquéalo antes de subirlo.')
    }
    throw new Error('El archivo no es un PDF válido.')
  }

  const total = pdf.numPages
  let merged: ExtractedMenu = { categories: [] }

  for (let pageNum = 1; pageNum <= total; pageNum++) {
    setPdfProgress({
      current: pageNum,
      total,
      itemsFound: merged.categories.reduce((acc, c) => acc + c.items.length, 0),
    })

    const page = await pdf.getPage(pageNum)
    const viewport = page.getViewport({ scale: 1.5 })
    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    const ctx = canvas.getContext('2d')!
    await page.render({ canvasContext: ctx, viewport }).promise
    const base64 = canvas.toDataURL('image/jpeg', 0.85)

    // Retry once on failure
    let pageResult: ExtractedMenu | null = null
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch('/api/menu/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'image', content: base64 }),
        })
        if (res.ok) {
          pageResult = await res.json()
          break
        }
      } catch {
        // retry
      }
    }

    if (pageResult?.categories?.length) {
      merged = mergeExtractedMenus(merged, pageResult)
    }
  }

  return merged
}
```

- [ ] **Step 2: Actualizar `handleExtract` para el modo PDF**

Localizar la función `handleExtract`. Reemplazar el bloque `try` completo (el que comienza en `setError('')`) por:

```typescript
async function handleExtract() {
  setError('')
  setStep('loading')
  setPdfProgress(null)

  try {
    let data: ExtractedMenu

    if (mode === 'pdf') {
      const file = pdfRef.current?.files?.[0]
      if (!file) throw new Error('No se ha seleccionado ningún PDF')
      data = await processPdf(file)
      setPdfProgress(null)
    } else {
      const body = mode === 'image'
        ? { type: 'image', content: imagePreview }
        : { type: 'text', content: textContent }

      const res = await fetch('/api/menu/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Error procesando')
      }

      data = await res.json()
    }

    if (!data.categories?.length) {
      throw new Error('No se encontraron platos. Prueba con la opción Foto o Texto.')
    }

    for (const cat of data.categories) {
      for (const item of cat.items) {
        item._allergenIds = resolveAllergenIds(item.allergens ?? [])
      }
    }

    setExtracted(data)
    setStep('preview')
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido'
    setError(msg)
    toast.error(msg)
    setPdfProgress(null)
    setStep('input')
  }
}
```

- [ ] **Step 3: Verificar que compila**

```bash
npm run build 2>&1 | tail -20
```

Sin errores de TypeScript.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/MenuImport.tsx
git commit -m "feat(pdf-import): implement processPdf with page-by-page extraction and retry"
```

---

## Task 4: Añadir UI del tab PDF en el paso input

**Files:**
- Modify: `src/components/admin/MenuImport.tsx`

- [ ] **Step 1: Añadir icono `FileUp` a los imports de lucide-react**

Localizar la línea de imports de lucide-react y añadir `FileUp`:

```typescript
import { Camera, FileText, FileUp, Sparkles, Trash2, ArrowLeft, Save, Loader2, CheckCircle2, X, ChevronDown, ChevronUp, ImagePlus, AlertTriangle } from 'lucide-react'
```

- [ ] **Step 2: Actualizar la descripción del header del importador**

Localizar el `<p>` con el texto *"Sube una foto de tu carta en papel o pega el texto..."* y reemplazarlo por:

```tsx
<p className="text-sm text-muted-foreground">
  Sube una foto, un PDF o pega el texto de tu carta. La IA extraerá los platos automáticamente.
</p>
```

- [ ] **Step 3: Añadir el botón PDF al selector de modo**

Localizar el bloque `{/* Mode toggle */}` con los dos `<Button>` existentes. Añadir el tercer botón **después** del botón de "Pegar texto":

```tsx
<Button
  variant={mode === 'pdf' ? 'default' : 'outline'}
  size="sm"
  onClick={() => setMode('pdf')}
  className="cursor-pointer"
>
  <FileUp className="w-4 h-4 mr-1.5" />
  PDF
</Button>
```

- [ ] **Step 4: Añadir la sección de input PDF**

Localizar el bloque que termina con `)}` del `mode === 'text'` (el cierre del ternario `mode === 'image' ? ... : ...`). Reemplazar ese ternario completo por:

```tsx
{mode === 'image' ? (
  <div className="space-y-3">
    <Label>Sube una foto o captura de tu carta</Label>
    <Input
      ref={fileRef}
      type="file"
      accept="image/*"
      capture="environment"
      onChange={handleFileSelect}
    />
    {imagePreview && (
      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imagePreview}
          alt="Preview carta"
          className="max-h-64 rounded-lg border border-border object-contain mx-auto"
        />
        <button
          className="absolute top-2 right-2 bg-destructive text-white rounded-full w-6 h-6 flex items-center justify-center cursor-pointer"
          onClick={() => { setImagePreview(null); if (fileRef.current) fileRef.current.value = '' }}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    )}
  </div>
) : mode === 'pdf' ? (
  <div className="space-y-3">
    <Label>Sube tu carta en PDF</Label>
    <div
      className="border-2 border-dashed border-primary/30 rounded-xl p-8 text-center cursor-pointer hover:border-primary/60 transition-colors bg-muted/30"
      onClick={() => pdfRef.current?.click()}
    >
      <FileUp className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
      <p className="text-sm font-medium text-foreground">Haz clic para seleccionar un PDF</p>
      <p className="text-xs text-muted-foreground mt-1">Digital o escaneado · Máx. 20 MB</p>
      <input
        ref={pdfRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (!file) return
          if (file.size > 20 * 1024 * 1024) {
            setError('El PDF es demasiado grande (máx. 20 MB).')
            e.target.value = ''
            setPdfFileName(null)
            return
          }
          setError('')
          setPdfFileName(file.name)
        }}
      />
    </div>
    {pdfFileName && (
      <p className="text-sm text-muted-foreground flex items-center gap-2">
        <FileUp className="w-4 h-4 text-primary" />
        {pdfFileName}
      </p>
    )}
  </div>
) : (
  <div className="space-y-2">
    <Label>Pega aquí el texto de tu carta</Label>
    <Textarea
      placeholder={"ENTRANTES\nEnsalada César - 9.50€\nCroquetas caseras - 7.00€\n\nPRINCIPALES\nEntrecot de ternera - 18.00€\nMerluza a la plancha - 15.50€"}
      value={textContent}
      onChange={e => setTextContent(e.target.value)}
      rows={10}
      className="font-mono text-sm"
    />
  </div>
)}
```

- [ ] **Step 5: Actualizar la condición `disabled` del botón "Extraer carta con IA"**

Localizar el botón con `disabled={mode === 'image' ? !imagePreview : !textContent.trim()}` y reemplazarlo por:

```tsx
<Button
  onClick={handleExtract}
  disabled={
    mode === 'image' ? !imagePreview :
    mode === 'pdf' ? !pdfFileName :
    !textContent.trim()
  }
  className="w-full cursor-pointer"
  size="lg"
>
  <Sparkles className="w-4 h-4 mr-2" />
  Extraer carta con IA
</Button>
```

- [ ] **Step 6: Verificar que compila**

```bash
npm run build 2>&1 | tail -20
```

Sin errores de TypeScript.

- [ ] **Step 7: Commit**

```bash
git add src/components/admin/MenuImport.tsx
git commit -m "feat(pdf-import): add PDF tab UI with file selector and validation"
```

---

## Task 5: Actualizar el paso de carga para mostrar progreso PDF

**Files:**
- Modify: `src/components/admin/MenuImport.tsx`

- [ ] **Step 1: Reemplazar el bloque `STEP: LOADING`**

Localizar el bloque `// ─── STEP: LOADING ───` completo y reemplazarlo por:

```tsx
// ─── STEP: LOADING ───
if (step === 'loading') {
  return (
    <Card>
      <CardContent className="py-20 text-center">
        <Loader2 className="w-10 h-10 mx-auto mb-4 text-primary animate-spin" />
        {pdfProgress ? (
          <>
            <p className="text-lg font-medium text-foreground">Extrayendo carta del PDF...</p>
            <div className="max-w-xs mx-auto mt-6 space-y-2">
              <Progress value={Math.round((pdfProgress.current / pdfProgress.total) * 100)} className="h-2" />
              <p className="text-sm text-muted-foreground">
                Página {pdfProgress.current} de {pdfProgress.total}
                {pdfProgress.itemsFound > 0 && (
                  <> · {pdfProgress.itemsFound} platos encontrados</>
                )}
              </p>
            </div>
          </>
        ) : (
          <>
            <p className="text-lg font-medium text-foreground">Analizando tu carta...</p>
            <p className="text-sm text-muted-foreground mt-2">La IA está extrayendo los platos y detectando alérgenos. Esto puede tardar unos segundos.</p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Verificar que compila**

```bash
npm run build 2>&1 | tail -20
```

Sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/MenuImport.tsx
git commit -m "feat(pdf-import): show page-by-page progress in loading step"
```

---

## Task 6: Verificación manual end-to-end

- [ ] **Step 1: Arrancar el servidor de desarrollo**

```bash
npm run dev
```

- [ ] **Step 2: Abrir el importador**

Navegar a `http://localhost:3000/admin/carta` → hacer clic en "Importar con IA".

- [ ] **Step 3: Probar PDF digital**

1. Seleccionar tab "PDF"
2. Subir un PDF con texto (ej. exportado desde Word)
3. Verificar que aparece la barra de progreso con "Página X de Y"
4. Verificar que la pantalla de revisión muestra los platos extraídos

- [ ] **Step 4: Probar PDF escaneado**

1. Subir un PDF de foto/scan de carta
2. Mismo flujo — debe funcionar igual

- [ ] **Step 5: Probar PDF de más de una página**

1. Subir PDF de 2+ páginas
2. Verificar que la barra de progreso avanza
3. Verificar que el resultado combina platos de todas las páginas sin duplicados

- [ ] **Step 6: Probar límite de tamaño**

1. Intentar subir un PDF > 20 MB
2. Debe aparecer el mensaje: "El PDF es demasiado grande (máx. 20 MB)."

- [ ] **Step 7: Verificar que los modos Foto y Texto siguen funcionando**

Probar que los otros dos modos no se han roto.

- [ ] **Step 8: Commit final**

```bash
git add -A
git commit -m "feat: PDF import — scan menu PDFs page-by-page with AI extraction"
```
