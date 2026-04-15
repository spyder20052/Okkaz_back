/**
 * @module supabase
 * @description Client Supabase initialisé avec la service role key
 *   pour les opérations back-end privilégiées.
 *
 * @dependencies @supabase/supabase-js, env
 * @author Spynel KOUTON
 */

import { createClient } from '@supabase/supabase-js';
import { env } from './env';

export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
