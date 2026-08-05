import { OpenFeature, Client, EvaluationContext } from '@openfeature/server-sdk';
import { ConfigCatProvider } from '@openfeature/config-cat-provider';
import {
  FeatureFlagKey,
  DEFAULT_FEATURE_FLAGS,
  FlagEvaluationContext,
  getFeatureFlagScope,
  FeatureFlagScope,
} from '../../shared/feature-flags';

export class ServerFlagService {
  private static instance: ServerFlagService;
  private serverClient: Client;
  private sharedClient: Client;
  private initialized: boolean = false;

  private constructor() {
    const serverKey = process.env.SERVER_CONFIGCAT_SDK_KEY;
    const sharedKey = process.env.SHARED_CONFIGCAT_SDK_KEY;

    if (serverKey) {
      console.log('[FlagService] Initializing Server Provider.');
      OpenFeature.setProvider('server-scope', ConfigCatProvider.create(serverKey));
    }
    
    if (sharedKey) {
      console.log('[FlagService] Initializing Shared Provider.');
      OpenFeature.setProvider('shared-scope', ConfigCatProvider.create(sharedKey));
    }

    this.serverClient = OpenFeature.getClient('server-scope');
    this.sharedClient = OpenFeature.getClient('shared-scope');
    this.initialized = true;
  }

  public static getInstance(): ServerFlagService {
    if (!ServerFlagService.instance) {
      ServerFlagService.instance = new ServerFlagService();
    }
    return ServerFlagService.instance;
  }

  private getClient(key: FeatureFlagKey): Client {
    const scope = getFeatureFlagScope(key);
    return scope === FeatureFlagScope.SERVER ? this.serverClient : this.sharedClient;
  }

  public async getBoolean(
    key: FeatureFlagKey,
    context?: FlagEvaluationContext,
    fallback?: boolean
  ): Promise<boolean> {
    const defaultVal = fallback !== undefined ? fallback : (DEFAULT_FEATURE_FLAGS[key] as boolean);
    return await this.getClient(key).getBooleanValue(key, defaultVal, context as EvaluationContext);
  }

  public async getString(
    key: FeatureFlagKey,
    context?: FlagEvaluationContext,
    fallback?: string
  ): Promise<string> {
    const defaultVal = fallback !== undefined ? fallback : (DEFAULT_FEATURE_FLAGS[key] as string);
    return await this.getClient(key).getStringValue(key, defaultVal, context as EvaluationContext);
  }

  public async getNumber(
    key: FeatureFlagKey,
    context?: FlagEvaluationContext,
    fallback?: number
  ): Promise<number> {
    const defaultVal = fallback !== undefined ? fallback : (DEFAULT_FEATURE_FLAGS[key] as number);
    return await this.getClient(key).getNumberValue(key, defaultVal, context as EvaluationContext);
  }

  public async getObject<T>(
    key: FeatureFlagKey,
    context?: FlagEvaluationContext,
    fallback?: T
  ): Promise<T> {
    const defaultVal = fallback !== undefined ? fallback : (DEFAULT_FEATURE_FLAGS[key] as unknown as T);
    return await this.getClient(key).getObjectValue<any>(key, defaultVal, context as EvaluationContext) as T;
  }

  public setFlag(key: FeatureFlagKey, value: unknown): void {
    console.warn('[FlagService] setFlag called on ConfigCat Provider. Runtime overrides are not supported yet.');
  }
}

export const serverFlagService = ServerFlagService.getInstance();
