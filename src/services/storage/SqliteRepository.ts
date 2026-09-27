/**
 * Native SQLite Repository Access Layer
 * Hardened multi-business data isolation with parameterized queries:
 * WHERE business_id = :active_business_id
 */

import { Repository } from './repository';

export const SqliteRepository = Repository;
export type SqliteRepository = Repository;
export { Repository };
export default Repository;
