import { OpenFeature, Client, EvaluationContext } from '@openfeature/server-sdk';
import { ConfigCatProvider } from '@openfeature/config-cat-provider';
import {
  ServerFeatureFlagKey,
  DEFAULT_SERVER_FEATURE_FLAGS,
} from './server-flags';
import {
  SharedFeatureFlagKey,
  DEFAULT_SHARED_FEATURE_FLAGS,
  FlagEvaluationContext,
  getFeatureFlagScope,
  FeatureFlagScope,
} from '../../shared/feature-flags';

export type AnyServerFlagKey = ServerFeatureFlagKey | SharedFeatureFlagKey;

export class ServerFlagService {
  private static instance: ServerFlagService;
  private serverClient: Client;
  private sharedClient: Client;
  private isInitialized = false;

  private constructor() {
    this.serverClient = OpenFeature.getClient('server-scope');
    this.sharedClient = OpenFeature.getClient('shared-scope');
  }

  public static getInstance(): ServerFlagService {
    if (!ServerFlagService.instance) {
      ServerFlagService.instance = new ServerFlagService();
    }
    return ServerFlagService.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

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
    this.isInitialized = true;
  }

  private getClient(key: string): Client {
    const scope = getFeatureFlagScope(key);
    return scope === FeatureFlagScope.SERVER ? this.serverClient : this.sharedClient;
  }

  private getDefaultValue(key: AnyServerFlagKey): unknown {
    if ((key as any) in DEFAULT_SERVER_FEATURE_FLAGS) {
      return (DEFAULT_SERVER_FEATURE_FLAGS as any)[key];
    }
    if ((key as any) in DEFAULT_SHARED_FEATURE_FLAGS) {
      return (DEFAULT_SHARED_FEATURE_FLAGS as any)[key];
    }
    return undefined;
  }

  public async getBoolean(
    key: AnyServerFlagKey,
    context?: FlagEvaluationContext,
    fallback?: boolean
  ): Promise<boolean> {
    const defaultVal = fallback !== undefined ? fallback : (this.getDefaultValue(key) as boolean ?? false);
    return await this.getClient(key).getBooleanValue(key, defaultVal, context as EvaluationContext);
  }

  public async getString(
    key: AnyServerFlagKey,
    context?: FlagEvaluationContext,
    fallback?: string
  ): Promise<string> {
    const defaultVal = fallback !== undefined ? fallback : (this.getDefaultValue(key) as string ?? '');
    return await this.getClient(key).getStringValue(key, defaultVal, context as EvaluationContext);
  }

  public async getNumber(
    key: AnyServerFlagKey,
    context?: FlagEvaluationContext,
    fallback?: number
  ): Promise<number> {
    const defaultVal = fallback !== undefined ? fallback : (this.getDefaultValue(key) as number ?? 0);
    return await this.getClient(key).getNumberValue(key, defaultVal, context as EvaluationContext);
  }

  public async getObject<T>(
    key: AnyServerFlagKey,
    context?: FlagEvaluationContext,
    fallback?: T
  ): Promise<T> {
    const defaultVal = fallback !== undefined ? fallback : (this.getDefaultValue(key) as unknown as T);
    return await this.getClient(key).getObjectValue<any>(key, defaultVal, context as EvaluationContext) as T;
  }

  public setFlag(key: AnyServerFlagKey, value: unknown): void {
    console.warn('[FlagService] setFlag called on ConfigCat Provider. Runtime overrides are not supported yet.');
  }
}

export const serverFlagService = ServerFlagService.getInstance();
