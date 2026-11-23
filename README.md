# Bodega On-Chain (`bodega-app`)

Aplicación full-stack en **Solana Devnet** para la gestión jerárquica de inventarios mediante cuentas PDA en Anchor y un cliente web en React + TypeScript generado con Codama.

- **Ruta elegida:** Proyecto propio.
- **Autor:** Adrián Téllez Almazán (`tellezdg14@gmail.com`).

---

## Propósito y arquitectura

`bodega-app` modela un almacén on-chain organizado en tres niveles de cuentas PDA encadenadas por semillas, donde cada nivel deriva de la dirección del nivel superior y valida la propiedad desde la raíz (`has_one = owner @ Errores::NoOwner`):

```text
Bodega     <- [b"bodega",    nombre_bodega, owner]
 └── Categoria <- [b"categoria", bodega,        id_categoria (u16 LE)]
      └── Producto  <- [b"producto",  categoria,     codigo]
```

### Cuentas on-chain (`programa/src/lib.rs`)

| Cuenta | Campos | Límites |
| --- | --- | --- |
| `Bodega` | `owner: Pubkey`, `nombre_bodega: String`, `categorias: Vec<Pubkey>`, `id_counter: u16` | `nombre_bodega` <= 30 B, hasta 10 categorías |
| `Categoria` | `id_categoria: u16`, `nombre: String`, `total_productos: u16`, `productos: Vec<Pubkey>` | `nombre` <= 30 B, hasta 10 productos |
| `Producto` | `codigo: String`, `etiqueta: String`, `stock: u32`, `activo: bool` | `codigo` <= 10 B, `etiqueta` <= 45 B |

### Instrucciones (6)

1. `crear_bodega(nombre_bodega)` — Inicializa la cuenta `Bodega` con `id_counter = 0`.
2. `crear_categoria(nombre)` — Verifica el límite de 10 categorías (`LimiteAlcanzado`), incrementa `id_counter`, crea la PDA de `Categoria` y guarda su dirección en `bodega.categorias`.
3. `registrar_producto(id_categoria, codigo, etiqueta, stock)` — Verifica el límite de 10 productos (`LimiteAlcanzado`), inicializa `Producto` con `activo = stock > 0`, agrega su PDA a `categoria.productos` y suma 1 a `total_productos`.
4. `actualizar_stock(id_categoria, codigo, nuevo_stock)` — Actualiza `stock` (admite `0` o mayor) y sincroniza `activo = nuevo_stock > 0` (mostrando `Activo` o `Agotado` en la UI).
5. `retirar_producto(id_categoria, codigo)` — Valida pertenencia al índice (`ProductoNoEncontrado`), elimina la referencia del vector, decrementa `total_productos` y cierra la cuenta devolviendo el rent a `owner`.
6. `cerrar_categoria(id_categoria)` — **Cierre condicionado**: exige `categoria.productos.is_empty()` (si aún tiene productos falla con `CategoriaConProductos`), verifica pertenencia en `bodega.categorias` (`CategoriaNoEncontrada`), elimina la referencia del índice y devuelve el rent a `owner`. El contador `id_counter` **no retrocede**, evitando colisiones futuras de semillas.

### Errores del programa (`6000..6004`)

- `6000` `NoOwner`: la wallet firmante no coincide con `bodega.owner`.
- `6001` `LimiteAlcanzado`: se alcanzó el máximo de 10 categorías o 10 productos.
- `6002` `ProductoNoEncontrado`: la PDA del producto no está en `categoria.productos`.
- `6003` `CategoriaNoEncontrada`: la PDA de la categoría no está en `bodega.categorias`.
- `6004` `CategoriaConProductos`: intento de cerrar una categoría con productos activos.

---

## Program ID en Devnet

- **Red:** Solana Devnet
- **Program ID desplegado (`declare_id!`):** `7myWGPTJ86h6VrRmcsYZAFtqRLz4URGooVtWxxGqe5bU`
- **Explorer del programa:** https://explorer.solana.com/address/7myWGPTJ86h6VrRmcsYZAFtqRLz4URGooVtWxxGqe5bU?cluster=devnet
- **Autoridad de despliegue:** `FvLLBUaBZDXHpTshNzv8rSTfgXSx1uVGJVLoEm26Qiqh`

### Redespliegue opcional en Solana Playground

Si deseas recompilar o desplegar una copia nueva en Solana Playground:

1. Abre [Solana Playground](https://beta.solpg.io/), selecciona la red **Devnet** y crea un proyecto Anchor.
2. Copia el contenido de [`programa/src/lib.rs`](programa/src/lib.rs) en `src/lib.rs`.
3. Ejecuta **Build** y luego **Deploy** (asegúrate de contar con SOL de prueba en Devnet).
4. Exporta `idl.json` desde Playground y vincula tu despliegue:

```bash
npm run configurar:idl -- ./idl.json --program-id TU_PROGRAM_ID
```

---

## Ejecución local

Requisitos: Node.js `>= 22.12.0 < 25` y una wallet compatible con Wallet Standard (Phantom, Solflare o Backpack) configurada en **Devnet**.

```bash
npm install
npm run dev
```

Comandos útiles:

- `npm run cliente`: regenera `clients/js/src/generated/` y `src/config/programa.json` a partir de `idl.json`.
- `npm run comprobar:idl`: valida coherencia entre `idl.json`, `src/config/programa.json` y el cliente generado.
- `npm run typecheck`: verificación estricta de tipos con TypeScript.
- `npm run build`: verifica el contrato y construye el bundle de producción.

---

## Aporte propio y guía de pruebas

### Aporte propio
- Dominio completo de gestión de bodegas e inventario (`bodega`: `Bodega -> Categoria -> Producto`).
- Estado automático de disponibilidad (`activo: bool`) calculado on-chain según `stock > 0`, aceptando stock `0` para marcar productos como **Agotado** sin eliminarlos.
- Regla de **cierre condicionado** en `cerrar_categoria` (`CategoriaConProductos`) con recuperación de rent (`close = owner`) y contador monotónico `id_counter`.
- Interfaz minimalista **Industrial Slate + Cobalt** con lectura pública sin firma, selección interactiva de categorías/productos y validación estricta de contrato IDL.

### Casos de prueba recomendados en Devnet

1. **Creación y lectura pública:** Crea `"Bodega Norte"`, agrega la categoría `"Eléctrico"` (`#1`) y registra el producto `CBL-12` (`stock = 24`). Consulta la bodega sin firmar y verifica el badge **Activo**.
2. **Modificación de stock a cero:** Actualiza el stock de `CBL-12` a `0`. Verifica que el producto permanezca visible con `stock = 0` y badge **Agotado** (`activo = false`).
3. **Rechazo por autoridad (`NoOwner`):** Cambia a una segunda wallet en Devnet e intenta crear una categoría o modificar stock sobre la bodega creada por la wallet original. El programa debe rechazar la transacción con `NoOwner`.
4. **Rechazo de cierre con productos (`CategoriaConProductos`):** Con la wallet propietaria, intenta ejecutar `Cerrar categoría` sobre `#1` mientras `CBL-12` siga registrado. Debe fallar con `CategoriaConProductos`.
5. **Cierre exitoso al vaciar:** Ejecuta `Retirar producto` para `CBL-12` (recupera rent) y vuelve a ejecutar `Cerrar categoría` sobre `#1`. La transacción debe confirmarse, la categoría desaparecerá del listado y al crear una nueva categoría su ID será `#2` (`id_counter` no retrocede).

---

## Pruebas y evidencias (Devnet)

- **Programa verificado en Devnet:** https://explorer.solana.com/address/7myWGPTJ86h6VrRmcsYZAFtqRLz4URGooVtWxxGqe5bU?cluster=devnet
- **Transacción verificada (`crear_bodega` — `"Bodega Norte"`):** https://explorer.solana.com/tx/3MUyD5d2icGdXk1ufHqVo9dE7GKXLwVUDCD6RJR2UPhabDjncNv1J4oji1ok68yAmcQntjT3g61PpUoSDd5bs69H?cluster=devnet
- **PDA `Bodega Norte` creada on-chain:** `FZUnjazhxN8rGRWDirLAMR4KuHHC825Xswogfm9TXqEL` (autoridad `FvLLBUaBZDXHpTshNzv8rSTfgXSx1uVGJVLoEm26Qiqh` — se puede consultar directamente en modo lectura desde el frontend sin firmar).

| Caso de prueba | Resultado esperado | Firma / Enlace en Explorer Devnet |
| --- | --- | --- |
| 1. Crear bodega (`"Bodega Norte"`) | Confirmado (`Finalized`, PDA `FZUnjazhxN8rGRWDirLAMR4KuHHC825Xswogfm9TXqEL`) | [Ver tx en Devnet](https://explorer.solana.com/tx/3MUyD5d2icGdXk1ufHqVo9dE7GKXLwVUDCD6RJR2UPhabDjncNv1J4oji1ok68yAmcQntjT3g61PpUoSDd5bs69H?cluster=devnet) |
| 2. Crear categoría, producto y actualizar stock a `0` | Confirmado (`Activo` → `Agotado`) | Reproducible en local (`npm run dev`) con wallet en Devnet |
| 3. Operación desde otra wallet | Rechazo `NoOwner` (`6000`) | Reproducible en local con segunda wallet |
| 4. Cerrar categoría con productos | Rechazo `CategoriaConProductos` (`6004`) | Reproducible en local desde pestaña `Cerrar categoría` |
| 5. Retirar producto y cerrar categoría | Confirmado y rent devuelto a `owner` | Reproducible en local desde `Retirar producto` + `Cerrar categoría` |

---

## Identificación

- **Nombre:** Adrián Téllez Almazán
- **Correo:** `tellezdg14@gmail.com`
