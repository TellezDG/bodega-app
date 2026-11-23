import { useEffect, useState } from 'react';
import { address, type Address } from '@solana/kit';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import programa from '../config/programa.json';
import { BODEGA_INICIAL, UNIDAD_STOCK } from '../config/interfaz';
import {
  actualizarStock,
  cerrarCategoria,
  crearBodega,
  crearCategoria,
  registrarProducto,
  retirarProducto,
} from '../solana/acciones';
import { leerBodega, type BodegaUI, type CategoriaUI, type ProductoUI } from '../solana/lecturas';
import { enlaceTransaccion, traducir } from '../solana/tx';
import { bodegaValida } from '../solana/validaciones';
import { Icono } from './Icono';

type Operacion =
  | 'crearBodega'
  | 'crearCategoria'
  | 'registrarProducto'
  | 'actualizarStock'
  | 'retirarProducto'
  | 'cerrarCategoria';

const OPERACIONES: { id: Operacion; etiqueta: string }[] = [
  { id: 'crearBodega', etiqueta: 'Crear bodega' },
  { id: 'crearCategoria', etiqueta: 'Nueva categoría' },
  { id: 'registrarProducto', etiqueta: 'Registrar producto' },
  { id: 'actualizarStock', etiqueta: 'Actualizar stock' },
  { id: 'retirarProducto', etiqueta: 'Retirar producto' },
  { id: 'cerrarCategoria', etiqueta: 'Cerrar categoría' },
];

export function Bodega({
  onCambio,
  onOcupado,
}: {
  onCambio: () => void;
  onOcupado: (estado: boolean) => void;
}) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const walletBase58 = wallet.publicKey?.toBase58() ?? '';

  const [nombreConsulta, setNombreConsulta] = useState(BODEGA_INICIAL);
  const [ownerConsulta, setOwnerConsulta] = useState('');
  const [bodega, setBodega] = useState<BodegaUI | null>(null);
  const [buscado, setBuscado] = useState(false);
  const [cargandoLectura, setCargandoLectura] = useState(false);
  const [errorLectura, setErrorLectura] = useState('');

  const [operacion, setOperacion] = useState<Operacion>('crearBodega');
  const [nombreBodegaOp, setNombreBodegaOp] = useState(BODEGA_INICIAL);
  const [nombreCategoria, setNombreCategoria] = useState('');
  const [idCategoria, setIdCategoria] = useState('1');
  const [codigo, setCodigo] = useState('');
  const [etiqueta, setEtiqueta] = useState('');
  const [stock, setStock] = useState('10');

  const [enviando, setEnviando] = useState(false);
  const [faseEnvio, setFaseEnvio] = useState('');
  const [errorOp, setErrorOp] = useState('');
  const [exitoOp, setExitoOp] = useState<{ mensaje: string; firma: string } | null>(null);

  useEffect(() => {
    if (walletBase58 && !ownerConsulta) {
      setOwnerConsulta(walletBase58);
    }
  }, [walletBase58, ownerConsulta]);

  async function cargarBodega(nombreObjetivo: string, ownerObjetivo: string) {
    setCargandoLectura(true);
    setErrorLectura('');
    try {
      const nombreLimpio = bodegaValida(nombreObjetivo);
      let ownerAddr: Address;
      try {
        ownerAddr = address(ownerObjetivo.trim());
      } catch {
        throw new Error('La dirección de autoridad no tiene un formato base58 válido de Solana.');
      }
      const resultado = await leerBodega(nombreLimpio, ownerAddr);
      setBodega(resultado);
      setBuscado(true);
    } catch (error) {
      setBodega(null);
      setErrorLectura(traducir(error));
    } finally {
      setCargandoLectura(false);
    }
  }

  function manejarConsulta(evento: React.FormEvent) {
    evento.preventDefault();
    setNombreBodegaOp(nombreConsulta.trim() || nombreBodegaOp);
    void cargarBodega(nombreConsulta, ownerConsulta);
  }

  function seleccionarCategoria(cat: CategoriaUI, abrirCierre = false) {
    setIdCategoria(String(cat.idCategoria));
    if (bodega) setNombreBodegaOp(bodega.nombreBodega);
    setOperacion(abrirCierre ? 'cerrarCategoria' : 'registrarProducto');
    setErrorOp('');
  }

  function seleccionarProducto(cat: CategoriaUI, prod: ProductoUI) {
    setIdCategoria(String(cat.idCategoria));
    setCodigo(prod.codigo);
    setEtiqueta(prod.etiqueta);
    setStock(String(prod.stock));
    if (bodega) setNombreBodegaOp(bodega.nombreBodega);
    if (operacion !== 'retirarProducto') {
      setOperacion('actualizarStock');
    }
    setErrorOp('');
  }

  async function ejecutarOperacion(evento: React.FormEvent) {
    evento.preventDefault();
    setErrorOp('');
    setExitoOp(null);
    setEnviando(true);
    onOcupado(true);

    const opciones = {
      onEstado: (estado: 'firma' | 'confirmacion') => {
        setFaseEnvio(
          estado === 'firma'
            ? 'Esperando firma en la wallet…'
            : 'Confirmando transacción en Devnet…',
        );
      },
    };

    try {
      let firma = '';
      let mensaje = '';
      const nombreActivo = nombreBodegaOp.trim();

      if (operacion === 'crearBodega') {
        firma = await crearBodega(wallet, connection, nombreActivo, opciones);
        mensaje = `Bodega "${nombreActivo}" inicializada on-chain.`;
      } else if (operacion === 'crearCategoria') {
        firma = await crearCategoria(wallet, connection, nombreActivo, nombreCategoria, opciones);
        mensaje = `Categoría "${nombreCategoria.trim()}" registrada en "${nombreActivo}".`;
        setNombreCategoria('');
      } else if (operacion === 'registrarProducto') {
        firma = await registrarProducto(
          wallet,
          connection,
          nombreActivo,
          Number(idCategoria),
          codigo,
          etiqueta,
          Number(stock),
          opciones,
        );
        mensaje = `Producto ${codigo.trim()} registrado en categoría #${idCategoria}.`;
        setCodigo('');
        setEtiqueta('');
      } else if (operacion === 'actualizarStock') {
        firma = await actualizarStock(
          wallet,
          connection,
          nombreActivo,
          Number(idCategoria),
          codigo,
          Number(stock),
          opciones,
        );
        mensaje = `Stock de ${codigo.trim()} actualizado a ${stock} ${UNIDAD_STOCK}.`;
      } else if (operacion === 'retirarProducto') {
        firma = await retirarProducto(
          wallet,
          connection,
          nombreActivo,
          Number(idCategoria),
          codigo,
          opciones,
        );
        mensaje = `Producto ${codigo.trim()} retirado y rent devuelto a la autoridad.`;
        setCodigo('');
      } else if (operacion === 'cerrarCategoria') {
        firma = await cerrarCategoria(wallet, connection, nombreActivo, Number(idCategoria), opciones);
        mensaje = `Categoría #${idCategoria} cerrada y rent recuperado.`;
      }

      setExitoOp({ mensaje, firma });
      onCambio();

      if (walletBase58) {
        setNombreConsulta(nombreActivo);
        setOwnerConsulta(walletBase58);
        await cargarBodega(nombreActivo, walletBase58);
      }
    } catch (error) {
      setErrorOp(traducir(error));
    } finally {
      setEnviando(false);
      setFaseEnvio('');
      onOcupado(false);
    }
  }

  const totalProductosBodega =
    bodega?.categorias.reduce((acc, cat) => acc + cat.productos.length, 0) ?? 0;

  return (
    <>
      <div className="section-heading">
        <div>
          <p className="eyebrow">INVENTARIO ON-CHAIN</p>
          <h2>Bodega, categorías y stock</h2>
        </div>
        <span className="tag">Jerarquía PDA · 3 niveles</span>
      </div>

      <section className="panel lookup-panel">
        <div className="panel-heading">
          <h3>Consultar bodega</h3>
          <span className="small-note">Lectura pública sin firma</span>
        </div>
        <form className="lookup-fields" onSubmit={manejarConsulta}>
          <label>
            Nombre de la bodega
            <input
              value={nombreConsulta}
              disabled={cargandoLectura}
              onChange={(e) => setNombreConsulta(e.target.value)}
              placeholder="Ej. Bodega Norte"
              maxLength={30}
              required
            />
          </label>
          <label>
            Autoridad (owner)
            <input
              value={ownerConsulta}
              disabled={cargandoLectura}
              onChange={(e) => setOwnerConsulta(e.target.value)}
              placeholder="Dirección pública en base58"
              autoComplete="off"
              spellCheck={false}
              required
            />
          </label>
          <button
            className="button"
            disabled={cargandoLectura || !nombreConsulta.trim() || !ownerConsulta.trim()}
          >
            {cargandoLectura ? 'Consultando…' : 'Consultar bodega'}
          </button>
        </form>
        {walletBase58 && ownerConsulta !== walletBase58 && (
          <button
            type="button"
            className="text-button inline-link"
            onClick={() => setOwnerConsulta(walletBase58)}
          >
            Usar dirección de la wallet conectada
          </button>
        )}
        {errorLectura && (
          <p className="notice error" role="alert">
            {errorLectura}
          </p>
        )}
      </section>

      <div className="workspace-grid">
        <section className="panel">
          <div className="panel-heading">
            <h3>Estado del inventario</h3>
            {bodega && (
              <span className="count">
                {bodega.categorias.length} / 10 categorías
              </span>
            )}
          </div>

          {!buscado ? (
            <div className="empty-state">
              <span className="empty-symbol">
                <Icono tipo="bodega" />
              </span>
              <h4>Inspecciona una bodega en Devnet</h4>
              <p>
                Ingresa el nombre de la bodega y la dirección de su autoridad para leer sus categorías, productos y estado de stock.
              </p>
            </div>
          ) : !bodega ? (
            <div className="empty-state">
              <span className="empty-symbol">
                <Icono tipo="vacio" />
              </span>
              <h4>Bodega no encontrada</h4>
              <p>
                No existe una cuenta PDA para "{nombreConsulta.trim()}" bajo esa autoridad. Puedes inicializarla en el panel de operaciones.
              </p>
            </div>
          ) : (
            <>
              <div className="registry-summary">
                <div>
                  <span className="label">Bodega</span>
                  <strong>{bodega.nombreBodega}</strong>
                </div>
                <div>
                  <span className="label">Contador IDs</span>
                  <strong>#{bodega.idCounter}</strong>
                </div>
                <div>
                  <span className="label">Productos</span>
                  <strong>{totalProductosBodega}</strong>
                </div>
              </div>

              <details className="technical-details">
                <summary>Ver PDA de la bodega</summary>
                <code className="address">{bodega.direccion}</code>
              </details>

              {bodega.categorias.length === 0 ? (
                <p className="empty-line">
                  La bodega no tiene categorías activas. Crea la primera desde la pestaña "Nueva categoría".
                </p>
              ) : (
                bodega.categorias.map((cat) => (
                  <article className="category-block" key={cat.direccion}>
                    <header>
                      <div>
                        <strong>
                          #{cat.idCategoria} · {cat.nombre}
                        </strong>
                        <span className="small-note">
                          {cat.productos.length} / 10 productos · PDA {cat.direccion.slice(0, 6)}…
                          {cat.direccion.slice(-4)}
                        </span>
                      </div>
                      <div className="category-actions">
                        <button
                          type="button"
                          className="text-button"
                          onClick={() => seleccionarCategoria(cat, false)}
                        >
                          Agregar producto
                        </button>
                        <button
                          type="button"
                          className="text-button danger"
                          onClick={() => seleccionarCategoria(cat, true)}
                        >
                          Cerrar
                        </button>
                      </div>
                    </header>

                    {cat.productos.length === 0 ? (
                      <p className="empty-line">
                        Sin productos registrados. Esta categoría está vacía y puede cerrarse para recuperar el rent.
                      </p>
                    ) : (
                      <div className="table-wrap">
                        <table>
                          <thead>
                            <tr>
                              <th>Código</th>
                              <th>Etiqueta</th>
                              <th className="numeric">Stock</th>
                              <th>Estado</th>
                            </tr>
                          </thead>
                          <tbody>
                            {cat.productos.map((prod) => (
                              <tr
                                key={prod.direccion}
                                onClick={() => seleccionarProducto(cat, prod)}
                                title="Clic para cargar en el panel de operaciones"
                              >
                                <td>
                                  <code>{prod.codigo}</code>
                                </td>
                                <td>{prod.etiqueta}</td>
                                <td className="numeric">
                                  {prod.stock.toLocaleString('es-MX')} <small>{UNIDAD_STOCK}</small>
                                </td>
                                <td>
                                  <span className={prod.activo ? 'badge active' : 'badge depleted'}>
                                    {prod.activo ? 'Activo' : 'Agotado'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </article>
                ))
              )}
            </>
          )}
        </section>

        <section className="panel operations-panel">
          <div className="panel-heading">
            <h3>Operaciones firmadas</h3>
            <span className="small-note">Solo autoridad</span>
          </div>

          {programa.esReferencia && (
            <div className="notice subtle" role="status">
              <strong>Program ID temporal activo</strong>
              <p>
                Las lecturas funcionan, pero las escrituras están bloqueadas hasta desplegar en Devnet y ejecutar{' '}
                <code>npm run configurar:idl -- ./idl.json --program-id TU_PROGRAM_ID</code>.
              </p>
            </div>
          )}

          {!wallet.publicKey && (
            <div className="notice information">
              <strong>Wallet no conectada</strong>
              <p>Conecta tu wallet en Devnet para firmar y enviar transacciones al programa.</p>
            </div>
          )}

          <div className="operation-tabs" role="tablist" aria-label="Operaciones del programa">
            {OPERACIONES.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={operacion === item.id}
                className={operacion === item.id ? 'active' : ''}
                disabled={enviando}
                onClick={() => {
                  setOperacion(item.id);
                  setErrorOp('');
                  setExitoOp(null);
                }}
              >
                {item.etiqueta}
              </button>
            ))}
          </div>

          <form onSubmit={ejecutarOperacion}>
            <fieldset disabled={enviando}>
              <label>
                Nombre de la bodega
                <input
                  value={nombreBodegaOp}
                  onChange={(e) => setNombreBodegaOp(e.target.value)}
                  placeholder="Ej. Bodega Norte"
                  maxLength={30}
                  required
                />
                <span className="help">Hasta 30 bytes UTF-8. Define la semilla principal junto con tu wallet.</span>
              </label>

              {operacion === 'crearCategoria' && (
                <label>
                  Nombre de la categoría
                  <input
                    value={nombreCategoria}
                    onChange={(e) => setNombreCategoria(e.target.value)}
                    placeholder="Ej. Eléctrico, Ferretería…"
                    maxLength={30}
                    required
                  />
                  <span className="help">El ID se asigna automáticamente desde id_counter + 1 (máximo 10 categorías activas).</span>
                </label>
              )}

              {(operacion === 'registrarProducto' ||
                operacion === 'actualizarStock' ||
                operacion === 'retirarProducto' ||
                operacion === 'cerrarCategoria') && (
                <label>
                  ID de categoría
                  <input
                    type="number"
                    min={1}
                    max={65535}
                    value={idCategoria}
                    onChange={(e) => setIdCategoria(e.target.value)}
                    required
                  />
                </label>
              )}

              {(operacion === 'registrarProducto' ||
                operacion === 'actualizarStock' ||
                operacion === 'retirarProducto') && (
                <label>
                  Código del producto
                  <input
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value)}
                    placeholder="Ej. CBL-12"
                    maxLength={10}
                    autoComplete="off"
                    required
                  />
                  <span className="help">Hasta 10 bytes. Único dentro de la categoría.</span>
                </label>
              )}

              {operacion === 'registrarProducto' && (
                <label>
                  Etiqueta / descripción
                  <input
                    value={etiqueta}
                    onChange={(e) => setEtiqueta(e.target.value)}
                    placeholder="Ej. Cable calibre 12 AWG rollo 100m"
                    maxLength={45}
                    required
                  />
                </label>
              )}

              {(operacion === 'registrarProducto' || operacion === 'actualizarStock') && (
                <label>
                  {operacion === 'registrarProducto' ? 'Stock inicial' : 'Nuevo stock'}
                  <input
                    type="number"
                    min={0}
                    max={4294967295}
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    required
                  />
                  <span className="help">
                    Acepta 0 o mayor. Con stock 0 el estado cambia automáticamente a Agotado (activo = false).
                  </span>
                </label>
              )}

              {operacion === 'retirarProducto' && (
                <div className="notice subtle">
                  <strong>Cierre de cuenta Producto</strong>
                  <p>
                    Retira el código del índice de la categoría, cierra su PDA y devuelve el rent al propietario.
                  </p>
                </div>
              )}

              {operacion === 'cerrarCategoria' && (
                <div className="notice subtle">
                  <strong>Regla de cierre condicionado</strong>
                  <p>
                    Solo procede si la categoría no tiene productos registrados. Si aún contiene productos, el programa rechazará la transacción con <code>CategoriaConProductos</code>. El contador <code>id_counter</code> de la bodega no retrocede.
                  </p>
                </div>
              )}

              <button
                className={
                  operacion === 'retirarProducto' || operacion === 'cerrarCategoria'
                    ? 'button primary danger-btn'
                    : 'button primary'
                }
                disabled={enviando || !wallet.publicKey}
              >
                {enviando
                  ? faseEnvio || 'Procesando…'
                  : OPERACIONES.find((item) => item.id === operacion)?.etiqueta}
              </button>
            </fieldset>
          </form>

          {errorOp && (
            <p className="notice error" role="alert">
              {errorOp}
            </p>
          )}

          {exitoOp && (
            <div className="notice success" role="status">
              <strong>Operación confirmada</strong>
              <p>{exitoOp.mensaje}</p>
              <p>
                <a href={enlaceTransaccion(exitoOp.firma)} target="_blank" rel="noreferrer">
                  Ver transacción en Solana Explorer Devnet
                </a>
              </p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
