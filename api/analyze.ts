import {handle} from '@hono/node-server/vercel';
import {app} from '../src/worker';
// API routing is shared with Cloudflare; no model calls are possible without
// an operator-enabled runtime flag AND server-only credentials.
export default handle(app);
