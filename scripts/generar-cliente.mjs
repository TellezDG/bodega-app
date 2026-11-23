import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createFromRoot } from 'codama';
import { rootNodeFromAnchor } from '@codama/nodes-from-anchor';
import { renderVisitor } from '@codama/renderers-js';
import { validarIdl, prepararIdl, huellaIdl } from './contrato-idl.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
try {
  const idl = JSON.parse(await readFile(resolve(root, 'idl.json'), 'utf8'));
  const datos = validarIdl(idl);
  const idlSha256 = huellaIdl(idl);
  let anterior;
  try {
    anterior = JSON.parse(await readFile(resolve(root, 'src/config/programa.json'), 'utf8'));
  } catch {
    /* Primera generacion. */
  }
  const importado = process.argv.includes('--idl-importado') || (
    anterior?.esReferencia === false && anterior.programId === datos.programId && anterior.idlSha256 === idlSha256
  );
  datos.esReferencia = datos.esReferencia && !importado;

  const idlPreparado = prepararIdl(idl, datos.programId);
  await mkdir(resolve(root, '.aula'), { recursive: true });
  await writeFile(resolve(root, '.aula/idl-codama.json'), JSON.stringify(idlPreparado, null, 2) + '\n');

  const codama = createFromRoot(rootNodeFromAnchor(idlPreparado));
  await codama.accept(renderVisitor(resolve(root, 'clients/js')));

  const clienteRuta = resolve(root, 'clients/js/package.json');
  const cliente = JSON.parse(await readFile(clienteRuta, 'utf8'));
  cliente.type = 'module';
  cliente.private = true;
  cliente.main = './src/generated/index.ts';
  delete cliente.scripts?.test;
  await writeFile(clienteRuta, JSON.stringify(cliente, null, 2) + '\n');

  await writeFile(resolve(root, 'src/config/programa.json'), JSON.stringify({
    ...datos,
    origen: datos.esReferencia
      ? 'Program ID temporal de muestra. Importa tu despliegue en Devnet para habilitar escrituras.'
      : 'IDL configurado para despliegue propio en Devnet.',
    idlSha256,
  }, null, 2) + '\n');

  console.log(datos.esReferencia
    ? 'Cliente generado con Program ID temporal. Importa el IDL de tu despliegue en Devnet para habilitar escrituras.'
    : 'Cliente generado para ' + datos.programId + '. Reinicia Vite si ya estaba abierto.');
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
