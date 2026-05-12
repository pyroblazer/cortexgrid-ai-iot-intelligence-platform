#!/usr/bin/env node
/**
 * Cross-platform local Docker launcher.
 * Tears everything down first to avoid port conflicts, then starts fresh.
 * Works on Windows, macOS, and Linux.
 *
 * Usage:
 *   node scripts/docker-local.js           # infrastructure only (postgres, redis, mosquitto)
 *   node scripts/docker-local.js --dev     # infrastructure + app services in dev mode
 *   node scripts/docker-local.js --prod    # full production stack
 */

const { spawnSync } = require('child_process');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BASE_COMPOSE = 'docker-compose.yml';
const DEV_COMPOSE = 'docker/docker-compose.dev.yml';

const mode = process.argv.includes('--prod')
  ? 'prod'
  : process.argv.includes('--dev')
  ? 'dev'
  : 'infra';

const composeFiles =
  mode === 'dev'
    ? ['-f', BASE_COMPOSE, '-f', DEV_COMPOSE]
    : ['-f', BASE_COMPOSE];

// Services to start in infra-only mode (excludes app builds)
const infraServices = ['postgres', 'redis', 'mosquitto'];

function run(args, label) {
  console.log(`\n>>> ${label}`);
  console.log(`    docker compose ${args.join(' ')}\n`);
  const result = spawnSync('docker', ['compose', ...args], {
    cwd: ROOT,
    stdio: 'inherit',
    shell: false,
  });
  if (result.error) {
    console.error(`Failed to run docker compose: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status);
  }
}

// 1. Tear everything down first to clear any port conflicts
run([...composeFiles, 'down', '--remove-orphans'], 'Stopping existing containers');

// 2. Start fresh
if (mode === 'infra') {
  run(
    [...composeFiles, 'up', '-d', '--build', ...infraServices],
    'Starting infrastructure services'
  );
  console.log('\nInfrastructure running:');
  console.log('  PostgreSQL : localhost:5432');
  console.log('  Redis      : localhost:6379');
  console.log('  Mosquitto  : localhost:1883 (WS: 9001)');
} else if (mode === 'dev') {
  run(
    [...composeFiles, 'up', '--build'],
    'Starting full dev stack'
  );
} else {
  run(
    [...composeFiles, 'up', '--build'],
    'Starting full production stack'
  );
  console.log('\nProduction stack running:');
  console.log('  Web        : http://localhost:3000');
  console.log('  API        : http://localhost:3001');
  console.log('  Grafana    : http://localhost:3002');
  console.log('  Kibana     : http://localhost:5601');
  console.log('  Prometheus : http://localhost:9090');
}
