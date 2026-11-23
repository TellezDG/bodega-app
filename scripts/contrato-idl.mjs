import { createHash } from 'node:crypto';
import { PublicKey } from '@solana/web3.js';

export const PROGRAMA = 'bodega';
export const REFERENCIA_ID = '3vmv8k7UbkCgD62dpv1FgTLuc8MLqvzimJZJ2t3sZucU';

const normalizar = (valor) => String(valor).replace(/_/g, '').toLowerCase();

const requeridas = {
  crearbodega: ['nombrebodega'],
  crearcategoria: ['nombre'],
  registrarproducto: ['idcategoria', 'codigo', 'etiqueta', 'stock'],
  actualizarstock: ['idcategoria', 'codigo', 'nuevostock'],
  retirarproducto: ['idcategoria', 'codigo'],
  cerrarcategoria: ['idcategoria'],
};

const tiposArgumentos = {
  crearbodega: ['string'],
  crearcategoria: ['string'],
  registrarproducto: ['u16', 'string', 'string', 'u32'],
  actualizarstock: ['u16', 'string', 'u32'],
  retirarproducto: ['u16', 'string'],
  cerrarcategoria: ['u16'],
};

const camposEsperados = {
  bodega: [
    ['owner', 'pubkey'],
    ['nombrebodega', 'string'],
    ['categorias', 'vec:pubkey'],
    ['idcounter', 'u16'],
  ],
  categoria: [
    ['idcategoria', 'u16'],
    ['nombre', 'string'],
    ['totalproductos', 'u16'],
    ['productos', 'vec:pubkey'],
  ],
  producto: [
    ['codigo', 'string'],
    ['etiqueta', 'string'],
    ['stock', 'u32'],
    ['activo', 'bool'],
  ],
};

const tipo = (valor) => {
  if (typeof valor === 'string') {
    if (valor === 'publicKey') return 'pubkey';
    if (valor === 'bool') return 'bool';
    return valor;
  }
  return valor?.vec ? 'vec:' + tipo(valor.vec) : JSON.stringify(valor);
};

export function validarIdl(idl, programIdOpcional) {
  if (!idl || typeof idl !== 'object' || !Array.isArray(idl.instructions)) {
    throw new Error('El archivo no tiene la estructura de un IDL de Anchor.');
  }
  const nombres = idl.name ?? idl.metadata?.name;
  if (normalizar(nombres) !== PROGRAMA) {
    throw new Error(`Este frontend espera el programa ${PROGRAMA}.`);
  }
  for (const [nombre, argumentos] of Object.entries(requeridas)) {
    const instruccion = idl.instructions.find((item) => normalizar(item.name) === nombre);
    if (!instruccion || !Array.isArray(instruccion.args)) {
      throw new Error('Falta la instruccion ' + nombre);
    }
    const recibidos = instruccion.args.map((item) => normalizar(item.name));
    if (JSON.stringify(recibidos) !== JSON.stringify(argumentos)) {
      throw new Error('Los argumentos de ' + nombre + ' no coinciden con el contrato del programa bodega.');
    }
    if (JSON.stringify(instruccion.args.map((item) => tipo(item.type))) !== JSON.stringify(tiposArgumentos[nombre])) {
      throw new Error('Los tipos de los argumentos de ' + nombre + ' no coinciden con el contrato del programa bodega.');
    }
  }
  for (const cuenta of Object.keys(camposEsperados)) {
    if (!idl.accounts?.some((item) => normalizar(item.name) === cuenta)) {
      throw new Error('Falta el tipo de cuenta ' + cuenta);
    }
    const definicion = idl.accounts.find((item) => normalizar(item.name) === cuenta).type
      ?? idl.types?.find((item) => normalizar(item.name) === cuenta)?.type;
    const campos = definicion?.fields?.map((item) => [normalizar(item.name), tipo(item.type)]);
    if (definicion?.kind !== 'struct' || JSON.stringify(campos) !== JSON.stringify(camposEsperados[cuenta])) {
      throw new Error('Los campos de la cuenta ' + cuenta + ' no coinciden con el contrato del programa bodega.');
    }
  }
  const direccion = programIdOpcional ?? idl.address ?? idl.metadata?.address;
  if (!direccion) {
    throw new Error('El IDL no incluye direccion. Agrega --program-id TU_PROGRAM_ID.');
  }
  let programId;
  try {
    programId = new PublicKey(direccion).toBase58();
  } catch {
    throw new Error('El Program ID no es una direccion valida de Solana.');
  }
  if (programId === '11111111111111111111111111111111') {
    throw new Error('El System Program no es el programa bodega. Usa el ID de tu despliegue.');
  }
  if (programIdOpcional && (idl.address ?? idl.metadata?.address) && programId !== (idl.address ?? idl.metadata?.address)) {
    throw new Error('El --program-id y la direccion del IDL no coinciden. Exporta el IDL correcto.');
  }
  return { programId, esReferencia: programId === REFERENCIA_ID };
}

export function prepararIdl(idl, programId) {
  const copia = structuredClone(idl);
  if (copia.address) copia.address = programId;
  else copia.metadata = { ...copia.metadata, address: programId };
  for (const instruccion of copia.instructions) {
    for (const argumento of instruccion.args ?? []) {
      argumento.name = argumento.name.replace(/^_+/, '');
    }
  }
  return copia;
}

export function huellaIdl(idl) {
  return createHash('sha256').update(JSON.stringify(idl)).digest('hex');
}
