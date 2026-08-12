import dotenv from 'dotenv';
dotenv.config();

const API_USERNAME = process.env.CONFIGCAT_API_USERNAME;
const API_PASSWORD = process.env.CONFIGCAT_API_PASSWORD;

if (!API_USERNAME || !API_PASSWORD) {
  console.error('Error: CONFIGCAT_API_USERNAME and CONFIGCAT_API_PASSWORD must be defined in environment variables.');
  process.exit(1);
}

const authHeader = 'Basic ' + Buffer.from(`${API_USERNAME}:${API_PASSWORD}`).toString('base64');
const BASE_URL = 'https://api.configcat.com/v1';

interface FlagDef {
  key: string;
  scope: 'CLIENT' | 'SERVER' | 'SHARED';
  type: 'boolean' | 'string' | 'number' | 'array';
  defaultValue: any;
  purpose: string;
}

const FLAGS_TO_SYNC: FlagDef[] = [
  // Client Flags
  { key: 'sentry_client_enabled', scope: 'CLIENT', type: 'boolean', defaultValue: true, purpose: 'Master toggle for client-side Sentry initialization.' },
  { key: 'sentry_client_traces_rate', scope: 'CLIENT', type: 'number', defaultValue: 1.0, purpose: 'Sample rate for client performance monitoring.' },
  { key: 'sentry_browser_profiling', scope: 'CLIENT', type: 'boolean', defaultValue: true, purpose: 'Enables client-side browser profiling.' },
  { key: 'sentry_feedback_enabled', scope: 'CLIENT', type: 'boolean', defaultValue: true, purpose: 'Enables the user-facing feedback collection widget.' },
  { key: 'sentry_client_metrics_enabled', scope: 'CLIENT', type: 'boolean', defaultValue: true, purpose: 'Toggles collection of client-side Web Vitals and custom metrics.' },
  { key: 'sentry_replay_enabled', scope: 'CLIENT', type: 'boolean', defaultValue: false, purpose: 'Enables full session replay recording.' },
  { key: 'telemetry_webgpu_errors', scope: 'CLIENT', type: 'boolean', defaultValue: true, purpose: 'Captures WebGPU device and pipeline compilation error traces.' },
  { key: 'telemetry_physics_worker_latency', scope: 'CLIENT', type: 'boolean', defaultValue: true, purpose: 'Monitors Rapier physics worker round-trip latency.' },

  // Server Flags (21 flags including match_difficulty_preset as expected in server config)
  { key: 'sentry_server_enabled', scope: 'SERVER', type: 'boolean', defaultValue: true, purpose: 'Master toggle for server-side Sentry initialization.' },
  { key: 'sentry_server_traces_rate', scope: 'SERVER', type: 'number', defaultValue: 1.0, purpose: 'Sample rate for server performance monitoring.' },
  { key: 'sentry_node_profiling', scope: 'SERVER', type: 'boolean', defaultValue: true, purpose: 'Enables server-side Node.js profiling.' },
  { key: 'sentry_server_metrics_enabled', scope: 'SERVER', type: 'boolean', defaultValue: true, purpose: 'Toggles collection of server-side performance metrics.' },
  { key: 'sentry_llm_tracing', scope: 'SERVER', type: 'boolean', defaultValue: true, purpose: 'Enables OpenTelemetry AI spans for LLM API calls.' },
  { key: 'LLM_COMMANDER_FAMILY', scope: 'SERVER', type: 'string', defaultValue: 'gemini', purpose: 'Active AI commander adapter family (gemini, kimi, claude, openai).' },
  { key: 'llm_primary_model', scope: 'SERVER', type: 'string', defaultValue: 'gemini-3.5-flash', purpose: 'Primary Gemini model for drone swarm orchestration.' },
  { key: 'llm_fallback_models', scope: 'SERVER', type: 'array', defaultValue: ['gemini-3.6-flash', 'gemini-3.1-flash'], purpose: 'Fallback Gemini models on rate limits.' },
  { key: 'llm_token_ceiling', scope: 'SERVER', type: 'number', defaultValue: 55000, purpose: 'Match token budget ceiling before falling back to offline AI.' },
  { key: 'llm_cycle_interval_sec', scope: 'SERVER', type: 'number', defaultValue: 8, purpose: 'AI Commander execution cycle interval in seconds.' },
  { key: 'llm_ap_regen_rate', scope: 'SERVER', type: 'number', defaultValue: 10, purpose: 'AP pool regeneration rate per AI cycle.' },
  { key: 'kimi_primary_model', scope: 'SERVER', type: 'string', defaultValue: 'kimi-k2.6', purpose: 'Primary Kimi model for drone orchestration.' },
  { key: 'kimi_fallback_models', scope: 'SERVER', type: 'array', defaultValue: ['kimi-k2.5'], purpose: 'Fallback Kimi models on rate limits.' },
  { key: 'claude_primary_model', scope: 'SERVER', type: 'string', defaultValue: 'claude-sonnet-4-6', purpose: 'Primary Claude model for drone orchestration.' },
  { key: 'claude_fallback_models', scope: 'SERVER', type: 'array', defaultValue: ['claude-opus-4-8', 'claude-haiku-4-5-20251001'], purpose: 'Fallback Claude models on rate limits.' },
  { key: 'openai_primary_model', scope: 'SERVER', type: 'string', defaultValue: 'gpt-5.6-sol', purpose: 'Primary OpenAI model for drone orchestration.' },
  { key: 'openai_fallback_models', scope: 'SERVER', type: 'array', defaultValue: ['gpt-5.6-terra'], purpose: 'Fallback OpenAI models on rate limits.' },
  { key: 'llm_max_output_tokens_per_cycle', scope: 'SERVER', type: 'number', defaultValue: 800, purpose: 'Max completion tokens allocated per AI step.' },
  { key: 'llm_max_tool_calls_per_cycle', scope: 'SERVER', type: 'number', defaultValue: 6, purpose: 'Hard limit on tool calls executed per cycle.' },
  { key: 'security_exploit_logging', scope: 'SERVER', type: 'boolean', defaultValue: true, purpose: 'Toggles security exploit attempt logging to Sentry.' },
  { key: 'match_difficulty_preset', scope: 'SERVER', type: 'string', defaultValue: 'STANDARD', purpose: 'Scales drone stats on server authoritative engine.' },

  // Shared Flags
  { key: 'store_dynamic_offers', scope: 'SHARED', type: 'boolean', defaultValue: true, purpose: 'Enables store offer rotations.' },
  { key: 'match_energy_cost', scope: 'SHARED', type: 'number', defaultValue: 2, purpose: 'Energy cost per match entry.' },
  { key: 'energy_regen_minutes', scope: 'SHARED', type: 'number', defaultValue: 10, purpose: 'Minutes required to regenerate 1 energy unit.' },
  { key: 'energy_max_free', scope: 'SHARED', type: 'number', defaultValue: 10, purpose: 'Maximum free storable energy capacity.' },
  { key: 'ad_reward_energy', scope: 'SHARED', type: 'number', defaultValue: 3, purpose: 'Energy rewarded for watching an ad.' },
  { key: 'ad_daily_cap', scope: 'SHARED', type: 'number', defaultValue: 5, purpose: 'Maximum daily ad reward claims allowed per player.' },
  { key: 'new_player_starter_credits', scope: 'SHARED', type: 'number', defaultValue: 500, purpose: 'Starting credit balance for new players.' },
  { key: 'new_player_starter_energy', scope: 'SHARED', type: 'number', defaultValue: 10, purpose: 'Starting energy balance for new players.' },
  { key: 'faction_war_active', scope: 'SHARED', type: 'boolean', defaultValue: true, purpose: 'Toggles active Faction Warfare season events.' },
  { key: 'bp_season_id', scope: 'SHARED', type: 'string', defaultValue: 'SEASON_01', purpose: 'Active Battle Pass season identifier.' },
  { key: 'bp_tier_count', scope: 'SHARED', type: 'number', defaultValue: 50, purpose: 'Total number of tiers in the battle pass.' },
  { key: 'bp_xp_per_tier', scope: 'SHARED', type: 'number', defaultValue: 10, purpose: 'XP required per tier.' },
  { key: 'match_difficulty_preset', scope: 'SHARED', type: 'string', defaultValue: 'STANDARD', purpose: 'Scales drone stats.' },
  { key: 'telemetry_desync_threshold', scope: 'SHARED', type: 'number', defaultValue: 0.5, purpose: 'Position divergence threshold before logging dead reckoning snap.' },
  { key: 'flags_used_enabled', scope: 'SHARED', type: 'boolean', defaultValue: false, purpose: 'Test flag for architecture analysis.' },
];

async function apiRequest(path: string, method = 'GET', body?: any) {
  const options: RequestInit = {
    method,
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json',
    },
  };
  if (body) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(`${BASE_URL}${path}`, options);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API Request ${method} ${path} failed (${res.status} ${res.statusText}): ${text}`);
  }
  if (res.status === 204) return null;
  return await res.json();
}

function mapTypeToSettingType(type: FlagDef['type']): string {
  switch (type) {
    case 'boolean': return 'boolean';
    case 'string':
    case 'array': return 'string';
    case 'number': return 'double';
  }
}

async function sync() {
  console.log('Fetching products from ConfigCat...');
  // NOTE: Always run and verify sync against the "test" environment first before applying changes to "Prod".
  const products = await apiRequest('/products');
  console.log(`Found ${products.length} product(s).`);

  if (products.length === 0) {
    console.error('No products found in ConfigCat account.');
    return;
  }

  for (const product of products) {
    console.log(`\n--- Processing Product: ${product.name} (ID: ${product.productId}) ---`);
    const configs = await apiRequest(`/products/${product.productId}/configs`);
    const environments = await apiRequest(`/products/${product.productId}/environments`);

    console.log(`Configs: ${configs.map((c: any) => c.name).join(', ') || 'None'}`);
    console.log(`Environments: ${environments.map((e: any) => e.name).join(', ') || 'None'}`);

    for (const config of configs) {
      console.log(`\nChecking Config: ${config.name} (${config.configId})...`);
      const targetScope = config.name === 'Frontend' ? 'CLIENT' : config.name === 'Server' ? 'SERVER' : config.name === 'Shared' ? 'SHARED' : null;
      if (!targetScope) {
        console.log(`  Skipping config '${config.name}' (no mapping)`);
        continue;
      }
      const configFlags = FLAGS_TO_SYNC.filter(f => f.scope === targetScope);

      const existingSettings = await apiRequest(`/configs/${config.configId}/settings`);
      const existingKeyMap = new Map<string, any>();
      for (const s of existingSettings) {
        existingKeyMap.set(s.key, s);
      }

      const validKeys = new Set(configFlags.map(f => f.key));
      for (const s of existingSettings) {
        if (!validKeys.has(s.key)) {
          console.log(`  [DELETING] Misplaced flag '${s.key}' (ID: ${s.settingId}) from config '${config.name}'...`);
          try {
            await apiRequest(`/settings/${s.settingId}`, 'DELETE');
            console.log(`  [DELETED] Flag '${s.key}'`);
          } catch (err: any) {
            console.warn(`    Could not delete '${s.key}': ${err.message}`);
          }
        }
      }

      for (const flag of configFlags) {
        const settingType = mapTypeToSettingType(flag.type);
        let settingId: number | undefined;

        if (existingKeyMap.has(flag.key)) {
          const existing = existingKeyMap.get(flag.key);
          settingId = existing.settingId;
          console.log(`  [EXISTS] Flag '${flag.key}' (ID: ${settingId})`);
        } else {
          console.log(`  [CREATING] Flag '${flag.key}'...`);
          const created = await apiRequest(`/configs/${config.configId}/settings`, 'POST', {
            key: flag.key,
            name: flag.key,
            hint: flag.purpose,
            settingType: settingType,
          });
          settingId = created.settingId;
          console.log(`  [CREATED] Flag '${flag.key}' (ID: ${settingId})`);
        }

        // Now set default values across environments using V2 PATCH endpoint
        for (const env of environments) {
          try {
            let path = '/defaultValue/doubleValue';
            let val = flag.defaultValue;
            if (flag.type === 'boolean') {
              path = '/defaultValue/boolValue';
            } else if (flag.type === 'string') {
              path = '/defaultValue/stringValue';
            } else if (flag.type === 'array') {
              path = '/defaultValue/stringValue';
              val = JSON.stringify(flag.defaultValue);
            } else if (flag.type === 'number') {
              path = '/defaultValue/doubleValue';
            }

            const patchRes = await fetch(`https://api.configcat.com/v2/environments/${env.environmentId}/settings/${settingId}/value`, {
              method: 'PATCH',
              headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify([
                { op: 'replace', path, value: val }
              ])
            });
            if (!patchRes.ok) {
              const errText = await patchRes.text();
              throw new Error(`PATCH failed (${patchRes.status}): ${errText}`);
            }
            console.log(`    Updated '${flag.key}' in env '${env.name}' -> ${JSON.stringify(val)}`);
          } catch (err: any) {
            console.warn(`    Could not set value for '${flag.key}' in env '${env.name}': ${err.message}`);
          }
        }
      }
    }
  }

  console.log('\n✅ ConfigCat Feature Flag Sync Complete!');
}

sync().catch(err => {
  console.error('Sync failed:', err);
  process.exit(1);
});
