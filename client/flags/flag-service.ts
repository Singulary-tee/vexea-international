import { OpenFeature, Client, ProviderEvents } from '@openfeature/web-sdk';
import { ConfigCatWebProvider } from '@openfeature/config-cat-web-provider';
import {
  ClientFeatureFlagKey,
  DEFAULT_CLIENT_FEATURE_FLAGS,
} from './client-flags';
import {
  SharedFeatureFlagKey,
  DEFAULT_SHARED_FEATURE_FLAGS,
  FlagEvaluationContext,
  getFeatureFlagScope,
  FeatureFlagScope,
} from '../../shared/feature-flags';
import { getClientDopplerSecret, dopplerLoaded } from '../doppler';
import { analytics } from '../firebase';
import { logEvent } from 'firebase/analytics';

export type AnyClientFlagKey = ClientFeatureFlagKey | SharedFeatureFlagKey;

export class ClientFlagService {
  private static instance: ClientFlagService;
  private clientScopeClient: Client;
  private sharedScopeClient: Client;
  private isInitialized = false;

  private constructor() {
    this.clientScopeClient = OpenFeature.getClient('client-scope');
    this.sharedScopeClient = OpenFeature.getClient('shared-scope');
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;
    await dopplerLoaded;

    const clientKey = (import.meta as any).env?.VITE_CONFIGCAT_SDK_KEY || getClientDopplerSecret("VITE_CONFIGCAT_SDK_KEY");
    const sharedKey = getClientDopplerSecret("SHARED_CONFIGCAT_SDK_KEY");

    if (clientKey) {
      console.log('[FlagService] Initializing Client Provider.');
      OpenFeature.setProvider('client-scope', ConfigCatWebProvider.create(clientKey, {
        setupHooks: (hooks) => hooks.on('flagEvaluated', (evaluationDetails) => {
          if (analytics) {
            logEvent(analytics, 'experience_impression', {
              'exp_variant_string': "configcat-" + evaluationDetails.key + "-" + evaluationDetails.value,
              'variation_id': evaluationDetails.variationId
            });
          }
        })
      }));
    }
    
    if (sharedKey) {
      console.log('[FlagService] Initializing Shared Provider.');
      OpenFeature.setProvider('shared-scope', ConfigCatWebProvider.create(sharedKey, {
        setupHooks: (hooks) => hooks.on('flagEvaluated', (evaluationDetails) => {
          if (analytics) {
            logEvent(analytics, 'experience_impression', {
              'exp_variant_string': "configcat-" + evaluationDetails.key + "-" + evaluationDetails.value,
              'variation_id': evaluationDetails.variationId
            });
          }
        })
      }));
    }

    this.isInitialized = true;
  }

  public hasClientKey(): boolean {
    return !!getClientDopplerSecret("VITE_CONFIGCAT_SDK_KEY") || !!(import.meta as any).env?.VITE_CONFIGCAT_SDK_KEY;
  }

  public hasSharedKey(): boolean {
    return !!getClientDopplerSecret("VITE_SHARED_CONFIGCAT_SDK_KEY") || !!getClientDopplerSecret("SHARED_CONFIGCAT_SDK_KEY");
  }

  public static getInstance(): ClientFlagService {
    if (!ClientFlagService.instance) {
      ClientFlagService.instance = new ClientFlagService();
    }
    return ClientFlagService.instance;
  }

  private getClient(key: string): Client {
    const scope = getFeatureFlagScope(key);
    return scope === FeatureFlagScope.CLIENT ? this.clientScopeClient : this.sharedScopeClient;
  }

  private getDefaultValue(key: AnyClientFlagKey): unknown {
    if ((key as any) in DEFAULT_CLIENT_FEATURE_FLAGS) {
      return (DEFAULT_CLIENT_FEATURE_FLAGS as any)[key];
    }
    if ((key as any) in DEFAULT_SHARED_FEATURE_FLAGS) {
      return (DEFAULT_SHARED_FEATURE_FLAGS as any)[key];
    }
    return undefined;
  }

  public getBoolean(key: AnyClientFlagKey, fallback?: boolean): boolean {
    const defaultVal = fallback !== undefined ? fallback : (this.getDefaultValue(key) as boolean ?? false);
    return this.getClient(key).getBooleanValue(key, defaultVal);
  }

  public getString(key: AnyClientFlagKey, fallback?: string): string {
    const defaultVal = fallback !== undefined ? fallback : (this.getDefaultValue(key) as string ?? '');
    return this.getClient(key).getStringValue(key, defaultVal);
  }

  public getNumber(key: AnyClientFlagKey, fallback?: number): number {
    const defaultVal = fallback !== undefined ? fallback : (this.getDefaultValue(key) as number ?? 0);
    return this.getClient(key).getNumberValue(key, defaultVal);
  }

  public getObject<T>(key: AnyClientFlagKey, fallback?: T): T {
    const defaultVal = fallback !== undefined ? fallback : (this.getDefaultValue(key) as unknown as T);
    return this.getClient(key).getObjectValue<any>(key, defaultVal) as T;
  }

  public async waitForReady(): Promise<void> {
    const clients = [this.clientScopeClient, this.sharedScopeClient];
    await Promise.all(clients.map(client => {
      return new Promise<void>((resolve) => {
        if ((client as any).status === ProviderEvents.Ready || (client as any).providerStatus === ProviderEvents.Ready) {
          resolve();
        } else {
          client.addHandler(ProviderEvents.Ready, () => resolve());
          client.addHandler(ProviderEvents.Error, () => resolve());
          setTimeout(resolve, 3000);
        }
      });
    }));
  }
}

export const clientFlagService = ClientFlagService.getInstance();
