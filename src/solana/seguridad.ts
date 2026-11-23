import type { Connection } from '@solana/web3.js';
import { PublicKey } from '@solana/web3.js';
import programa from '../config/programa.json';
import { BODEGA_PROGRAM_ADDRESS } from '../../clients/js/src/generated';

export const DEVNET_GENESIS = 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG';

export function comprobarConfiguracion() {
  if (programa.esReferencia) {
    throw new Error(
      'El proyecto usa un Program ID temporal. Despliega el programa en Devnet y ejecuta npm run configurar:idl -- ./idl.json --program-id TU_PROGRAM_ID.'
    );
  }
  if (programa.programId !== String(BODEGA_PROGRAM_ADDRESS)) {
    throw new Error('El IDL y el cliente generado no corresponden. Ejecuta npm run cliente.');
  }
}

export async function comprobarDevnet(connection: Pick<Connection, 'getGenesisHash'>) {
  const genesis = await connection.getGenesisHash();
  if (genesis !== DEVNET_GENESIS) {
    throw new Error('Esta aplicación solo permite escribir en Solana Devnet. Revisa el RPC.');
  }
}

export async function comprobarPrograma(connection: Connection) {
  comprobarConfiguracion();
  await comprobarDevnet(connection);
  const cuenta = await connection.getAccountInfo(new PublicKey(BODEGA_PROGRAM_ADDRESS), 'confirmed');
  if (!cuenta?.executable) {
    throw new Error('El programa indicado no está desplegado en este RPC de Devnet. Verifica tu Program ID.');
  }
}
