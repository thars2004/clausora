import { describe, it } from 'node:test';
import assert from 'node:assert';
import app from '../src/app';

describe('Clausora API Server Health & Routes', () => {
  it('initializes Express app successfully with registered routers', () => {
    assert.ok(app);
    assert.strictEqual(typeof app.listen, 'function');
  });

  it('contains expected API endpoints mounted', () => {
    const routes = (app._router?.stack || [])
      .filter((layer: any) => layer.route || layer.name === 'router')
      .map((layer: any) => layer.regexp?.toString() || '');

    assert.ok(routes.length > 5, 'Expected multiple routers mounted on Express app');
  });
});

