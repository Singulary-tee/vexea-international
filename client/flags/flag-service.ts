import { OpenFeature, Client, ProviderEvents } from '@openfeature/web-sdk';
import { ConfigCatWebProvider } from '@openfeature/config-cat-web-provider';
import {
  FeatureFlagKey,
  DEFAULT_FEATURE_FLAGS,
  FlagEvaluationContext,
  getFeatureFlagScope,
  FeatureFlagScope,
} from '../../shared/feature-flags';
import { getClientDopplerSecret } from '../doppler';

export class ClientFlagService {
  private static instance: ClientFlagService;
  private clientScopeClient: Client;
  private sharedScopeClient: Client;

  private constructor() {
    const clientKey = (import.meta as any).env?.VITE_CONFIGCAT_SDK_KEY;
    const sharedKey = (import.meta as any).env?.VITE_SHARED_CONFIGCAT_SDK_KEY;

    if (clientKey) {
      console.log('[FlagService] Initializing Client Provider.');
      OpenFeature.setProvider('client-scope', ConfigCatWebProvider.create(clientKey));
    }
    
    if (sharedKey) {
      console.log('[FlagService] Initializing Shared Provider.');
      OpenFeature.setProvider('shared-scope', ConfigCatWebProvider.create(sharedKey));
    }

    this.clientScopeClient = OpenFeature.getClient('client-scope');
    this.sharedScopeClient = OpenFeature.getClient('shared-scope');
  }

  public hasClientKey(): boolean {
    return !!getClientDopplerSecret("VITE_CONFIGCAT_SDK_KEY") || !!(import.meta as any).env?.VITE_CONFIGCAT_SDK_KEY;
  }

  public hasSharedKey(): boolean {
    return !!getClientDopplerSecret("VITE_SHARED_CONFIGCAT_SDK_KEY") || !!getClientDopplerSecret("SHARED_CONFIGCAT_SDK_KEY") || !!(import.meta as any).env?.VITE_SHARED_CONFIGCAT_SDK_KEY;
  }

  public static getInstance(): ClientFlagService {
    if (!ClientFlagService.instance) {
      ClientFlagService.instance = new ClientFlagService();
    }
    return ClientFlagService.instance;
  }

  private getClient(key: FeatureFlagKey): Client {
    const scope = getFeatureFlagScope(key);
    return scope === FeatureFlagScope.CLIENT ? this.clientScopeClient : this.sharedScopeClient;
  }

  public getBoolean(key: FeatureFlagKey, fallback?: boolean): boolean {
    const defaultVal = fallback !== undefined ? fallback : (DEFAULT_FEATURE_FLAGS[key] as boolean);
    return this.getClient(key).getBooleanValue(key, defaultVal);
  }

  public getString(key: FeatureFlagKey, fallback?: string): string {
    const defaultVal = fallback !== undefined ? fallback : (DEFAULT_FEATURE_FLAGS[key] as string);
    return this.getClient(key).getStringValue(key, defaultVal);
  }

  public getNumber(key: FeatureFlagKey, fallback?: number): number {
    const defaultVal = fallback !== undefined ? fallback : (DEFAULT_FEATURE_FLAGS[key] as number);
    return this.getClient(key).getNumberValue(key, defaultVal);
  }

  public getObject<T>(key: FeatureFlagKey, fallback?: T): T {
    const defaultVal = fallback !== undefined ? fallback : (DEFAULT_FEATURE_FLAGS[key] as unknown as T);
    return this.getClient(key).getObjectValue<any>(key, defaultVal) as T;
  }

  public async waitForReady(): Promise<void> {
    const clients = [this.clientScopeClient, this.sharedScopeClient];
    await Promise.all(clients.map(client => {
      return new Promise<void>((resolve) => {
        // In OpenFeature, we can check status or listen for READY
        // Note: some providers might already be ready
        if ((client as any).status === ProviderEvents.Ready || (client as any).providerStatus === ProviderEvents.Ready) {
          resolve();
        } else {
          client.addHandler(ProviderEvents.Ready, () => resolve());
          // Also handle error to not block forever if provider fails
          client.addHandler(ProviderEvents.Error, () => resolve());
          // Safety timeout
          setTimeout(resolve, 3000);
        }
      });
    }));
  }
}

export const clientFlagService = ClientFlagService.getInstance();
