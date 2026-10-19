import { loadTestEnv } from './test-env.js';

// Tests unitaires Jest : uniquement les valeurs fictives de backend/.env.test.
// Jest donne au code testé sa propre copie de process.env : les vrais identifiants de
// backend/.env ne lui parviennent pas.
loadTestEnv(process.env);
