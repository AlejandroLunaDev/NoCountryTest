import { seedDatabase } from './scripts/seedDatabase';
import { cleanDatabase } from './scripts/cleanDatabase';

export const devTools = {
  seedDatabase,
  cleanDatabase
};

// Exportamos una función para ejecutar directamente desde consola
// con argumentos (ejemplo: npm run devtools seed)
if (require.main === module) {
  const command = process.argv[2];

  if (!command) {
    console.error('Debe especificar un comando: seed o clean');
    process.exit(1);
  }

  switch (command) {
    case 'seed':
      seedDatabase()
        .then(() => process.exit(0))
        .catch(error => {
          console.error('Error al ejecutar seed:', error);
          process.exit(1);
        });
      break;

    case 'clean':
      cleanDatabase()
        .then(() => process.exit(0))
        .catch(error => {
          console.error('Error al ejecutar clean:', error);
          process.exit(1);
        });
      break;

    case 'reset':
      // Limpiar y luego poblar la base de datos
      cleanDatabase()
        .then(() => seedDatabase())
        .then(() => {
          console.log('Base de datos reiniciada exitosamente.');
          process.exit(0);
        })
        .catch(error => {
          console.error('Error al reiniciar la base de datos:', error);
          process.exit(1);
        });
      break;

    default:
      console.error('Comando no reconocido. Use: seed, clean o reset');
      process.exit(1);
  }
}
