import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

import * as fs from 'fs';

// Cargar variables de entorno considerando raíz o dev
dotenv.config({ path: path.resolve(__dirname, '../../../../.env.dev') });
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config();

const isInsideDocker = fs.existsSync('/.dockerenv') || process.env.IS_DOCKER === 'true';
const rawHost = process.env.DB_HOST || process.env.POSTGRES_HOST || 'localhost';
const effectiveHost = isInsideDocker ? rawHost : (rawHost === 'postgres' ? 'localhost' : rawHost);

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: effectiveHost,
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  username: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  database: process.env.POSTGRES_DB || 'japonparts_dev',
  entities: [path.join(__dirname, '../entities/*.entity{.ts,.js}')],
  migrations: [path.join(__dirname, 'migrations/*{.ts,.js}')],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
};

const AppDataSource = new DataSource(dataSourceOptions);
export default AppDataSource;
