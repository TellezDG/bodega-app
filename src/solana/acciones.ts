import { address, createNoopSigner, type Address } from '@solana/kit';
import type { Connection } from '@solana/web3.js';
import {
  getActualizarStockInstruction,
  getCerrarCategoriaInstruction,
  getCrearBodegaInstruction,
  getCrearCategoriaInstruction,
  getRegistrarProductoInstruction,
  getRetirarProductoInstruction,
} from '../../clients/js/src/generated';
import { cadena, cadenaCategoria, pdaBodega, pdaCategoria } from './pdas';
import { siguienteIdCategoria } from './lecturas';
import { enviar, type OpcionesEnvio, type WalletFirma } from './tx';
import { comprobarConfiguracion } from './seguridad';
import {
  bodegaValida,
  categoriaValida,
  codigoValido,
  etiquetaValida,
  idValido,
  stockValido,
} from './validaciones';

export function direccionDe(wallet: Pick<WalletFirma, 'publicKey'>): Address {
  if (!wallet.publicKey) throw new Error('Conecta tu wallet primero.');
  return address(wallet.publicKey.toBase58());
}

function firmante(wallet: WalletFirma) {
  comprobarConfiguracion();
  return createNoopSigner(direccionDe(wallet));
}

export async function crearBodega(
  wallet: WalletFirma,
  connection: Connection,
  nombreBodega: string,
  opciones?: OpcionesEnvio,
): Promise<string> {
  nombreBodega = bodegaValida(nombreBodega);
  const owner = firmante(wallet);
  const bodega = pdaBodega(nombreBodega, owner.address);
  const ix = getCrearBodegaInstruction({ owner, bodega, nombreBodega });
  return enviar(ix, wallet, connection, opciones);
}

export async function crearCategoria(
  wallet: WalletFirma,
  connection: Connection,
  nombreBodega: string,
  nombre: string,
  opciones?: OpcionesEnvio,
): Promise<string> {
  nombreBodega = bodegaValida(nombreBodega);
  nombre = categoriaValida(nombre);
  const owner = firmante(wallet);
  const bodega = pdaBodega(nombreBodega, owner.address);
  const idCategoria = await siguienteIdCategoria(nombreBodega, owner.address);
  const categoria = pdaCategoria(bodega, idCategoria);
  const ix = getCrearCategoriaInstruction({ owner, bodega, categoria, nombre });
  return enviar(ix, wallet, connection, opciones);
}

export async function registrarProducto(
  wallet: WalletFirma,
  connection: Connection,
  nombreBodega: string,
  idCategoria: number,
  codigo: string,
  etiqueta: string,
  stock: number,
  opciones?: OpcionesEnvio,
): Promise<string> {
  nombreBodega = bodegaValida(nombreBodega);
  idCategoria = idValido(idCategoria);
  codigo = codigoValido(codigo);
  etiqueta = etiquetaValida(etiqueta);
  stock = stockValido(stock);
  const owner = firmante(wallet);
  const { bodega, categoria, producto } = cadena(nombreBodega, owner.address, idCategoria, codigo);
  const ix = getRegistrarProductoInstruction({
    owner,
    bodega,
    categoria,
    producto,
    idCategoria,
    codigo,
    etiqueta,
    stock,
  });
  return enviar(ix, wallet, connection, opciones);
}

export async function actualizarStock(
  wallet: WalletFirma,
  connection: Connection,
  nombreBodega: string,
  idCategoria: number,
  codigo: string,
  nuevoStock: number,
  opciones?: OpcionesEnvio,
): Promise<string> {
  nombreBodega = bodegaValida(nombreBodega);
  idCategoria = idValido(idCategoria);
  codigo = codigoValido(codigo);
  nuevoStock = stockValido(nuevoStock);
  const owner = firmante(wallet);
  const { bodega, categoria, producto } = cadena(nombreBodega, owner.address, idCategoria, codigo);
  const ix = getActualizarStockInstruction({
    owner,
    bodega,
    categoria,
    producto,
    idCategoria,
    codigo,
    nuevoStock,
  });
  return enviar(ix, wallet, connection, opciones);
}

export async function retirarProducto(
  wallet: WalletFirma,
  connection: Connection,
  nombreBodega: string,
  idCategoria: number,
  codigo: string,
  opciones?: OpcionesEnvio,
): Promise<string> {
  nombreBodega = bodegaValida(nombreBodega);
  idCategoria = idValido(idCategoria);
  codigo = codigoValido(codigo);
  const owner = firmante(wallet);
  const { bodega, categoria, producto } = cadena(nombreBodega, owner.address, idCategoria, codigo);
  const ix = getRetirarProductoInstruction({
    owner,
    bodega,
    categoria,
    producto,
    idCategoria,
    codigo,
  });
  return enviar(ix, wallet, connection, opciones);
}

export async function cerrarCategoria(
  wallet: WalletFirma,
  connection: Connection,
  nombreBodega: string,
  idCategoria: number,
  opciones?: OpcionesEnvio,
): Promise<string> {
  nombreBodega = bodegaValida(nombreBodega);
  idCategoria = idValido(idCategoria);
  const owner = firmante(wallet);
  const { bodega, categoria } = cadenaCategoria(nombreBodega, owner.address, idCategoria);
  const ix = getCerrarCategoriaInstruction({
    owner,
    bodega,
    categoria,
    idCategoria,
  });
  return enviar(ix, wallet, connection, opciones);
}
