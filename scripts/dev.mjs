#!/usr/bin/env node
import { execSync, spawn } from 'node:child_process';
import { platform } from 'node:os';

const IS_WINDOWS = platform() === 'win32';
const COMPOSE_CMD = 'docker compose -f docker-compose.yml -f docker/docker-compose.dev.yml';

console.log('🚀 CortexGrid Development Environment Setup\n');

// ─────────────────────────────────────────────────────────
// 1. FREE UP PORTS 3000 AND 3001
// ─────────────────────────────────────────────────────────
console.log('🔓 Freeing ports 3000 and 3001...');
try {
  if (IS_WINDOWS) {
    // Windows: use PowerShell to kill processes on ports 3000 and 3001
    const killCmd = `
      $ports = @(3000, 3001)
      foreach ($port in $ports) {
        $processes = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object OwningProcess
        if ($processes) {
          foreach ($proc in $processes) {
            $pid = $proc.OwningProcess
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
          }
        }
      }
    `;
    execSync(`powershell -Command "${killCmd.replace(/"/g, '\\"')}"`, { stdio: 'pipe' });
  } else {
    // Linux/Mac: use lsof to find and kill processes
    try {
      execSync('lsof -ti:3000,3001 | xargs kill -9', { stdio: 'pipe' });
    } catch {
      // Ignore if no processes found
    }
  }
  console.log('✅ Ports 3000 and 3001 freed\n');
} catch (error) {
  console.warn('⚠️  Could not free ports (they may already be free)\n');
}

// ─────────────────────────────────────────────────────────
// 2. STOP AND CLEAN UP EXISTING DOCKER CONTAINERS
// ─────────────────────────────────────────────────────────
console.log('🛑 Stopping previous Docker containers...');
try {
  execSync(`${COMPOSE_CMD} down -v --remove-orphans`, { stdio: 'pipe' });
  console.log('✅ Cleanup complete\n');
} catch (error) {
  console.warn('⚠️  Could not stop containers (they may not exist)\n');
}

// ─────────────────────────────────────────────────────────
// 3. START DOCKER INFRASTRUCTURE
// ─────────────────────────────────────────────────────────
console.log('📦 Starting Docker infrastructure (postgres, redis, mosquitto, etc)...');
try {
  execSync(`${COMPOSE_CMD} up -d --build`, { stdio: 'inherit' });
  console.log('✅ Docker infrastructure started\n');
} catch (error) {
  console.error('❌ Failed to start Docker infrastructure');
  process.exit(1);
}

// ─────────────────────────────────────────────────────────
// 4. WAIT FOR SERVICES TO BE READY
// ─────────────────────────────────────────────────────────
console.log('⏳ Waiting for services to be healthy...');
let retries = 60;
let psqlReady = false;
let mqttReady = false;

while (retries-- > 0 && (!psqlReady || !mqttReady)) {
  try {
    // Check PostgreSQL
    if (!psqlReady) {
      try {
        execSync('docker exec cortexgrid-postgres pg_isready -U cortexgrid -d cortexgrid', { stdio: 'pipe' });
        console.log('✅ PostgreSQL is ready');
        psqlReady = true;
      } catch {
        // Not ready yet
      }
    }

    // Check Mosquitto
    if (!mqttReady) {
      try {
        execSync('docker exec cortexgrid-mosquitto mosquitto_sub -h localhost -p 1883 -t "test" -W 1', { stdio: 'pipe' });
        console.log('✅ Mosquitto is ready');
        mqttReady = true;
      } catch {
        // Not ready yet
      }
    }

    if (!psqlReady || !mqttReady) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  } catch {
    await new Promise((r) => setTimeout(r, 1000));
  }
}

if (!psqlReady) console.warn('⚠️  PostgreSQL did not become ready in 60s — continuing anyway');
if (!mqttReady) console.warn('⚠️  Mosquitto did not become ready in 60s — continuing anyway');
console.log();

// ─────────────────────────────────────────────────────────
// 5. START PNPM DEV (ALL SERVICES)
// ─────────────────────────────────────────────────────────
console.log('🎯 Starting pnpm dev (all services)...');
console.log('═'.repeat(60));
console.log();

try {
  execSync('pnpm dev', { stdio: 'inherit' });
} catch (error) {
  // pnpm dev runs continuously, so exit code doesn't matter
}
