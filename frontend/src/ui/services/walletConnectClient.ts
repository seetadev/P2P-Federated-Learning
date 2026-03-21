import { useContext, useEffect, useCallback } from 'react';
import { WalletConnectContext } from '../contexts/WalletConnectContext';
import {
  ContractExecuteTransaction,
  ContractId,
  Hbar,
  LedgerId,
} from '@hashgraph/sdk';
import {
  DAppConnector,
  HederaChainId,
  HederaJsonRpcMethod,
  HederaSessionEvent,
  transactionToBase64String,
  type SignAndExecuteTransactionParams,
} from '@hashgraph/hedera-wallet-connect';
import type { SignClientTypes } from '@walletconnect/types';
import EventEmitter from 'events';
import type { ContractFunctionParameterBuilder } from './contractFunctionParameterBuilder';

const rawProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;
const projectId = rawProjectId?.trim();
const isWalletConnectConfigured =
  !!projectId && projectId !== 'your_walletconnect_project_id';

// Use an event emitter to signal state changes to the React component
const refreshEvent = new EventEmitter();

const metadata: SignClientTypes.Metadata = {
  name: 'DecentraAI',
  description: 'A decentralized ML training application.',
  url: window.location.origin,
  icons: [window.location.origin + '/vite.svg'],
};

let dappConnector: DAppConnector | null = null;
let walletConnectInitPromise: Promise<void> | undefined = undefined;

const getConnector = (): DAppConnector | null => {
  if (!isWalletConnectConfigured) {
    return null;
  }

  if (!dappConnector) {
    try {
      dappConnector = new DAppConnector(
        metadata,
        LedgerId.TESTNET,
        projectId!,
        Object.values(HederaJsonRpcMethod),
        [HederaSessionEvent.ChainChanged, HederaSessionEvent.AccountsChanged],
        [HederaChainId.Testnet]
      );
    } catch (error) {
      console.error('WalletConnect setup failed:', error);
      return null;
    }
  }

  return dappConnector;
};

const initializeWalletConnect = async () => {
  const connector = getConnector();
  if (!connector) {
    return;
  }

  if (walletConnectInitPromise === undefined) {
    walletConnectInitPromise = connector.init();
  }
  await walletConnectInitPromise;
};

export const openWalletConnectModal = async () => {
  const connector = getConnector();
  if (!connector) {
    throw new Error(
      'WalletConnect is not configured. Set VITE_WALLETCONNECT_PROJECT_ID in frontend/.env'
    );
  }

  await initializeWalletConnect();
  // The .then() ensures we emit the sync event AFTER the modal is closed
  await connector.openModal().then(() => {
    refreshEvent.emit('sync');
  });
};

class WalletConnectWallet {
  disconnect() {
    const connector = getConnector();
    if (!connector) {
      return;
    }

    connector.disconnectAll().then(() => {
      refreshEvent.emit('sync');
    });
  }

  async executeContractFunction(
    contractId: ContractId,
    functionName: string,
    functionParameters: ContractFunctionParameterBuilder,
    gasLimit: number,
    payableAmount: Hbar
  ): Promise<string | null> {
    const connector = getConnector();
    if (!connector) {
      throw new Error(
        'WalletConnect is not configured. Set VITE_WALLETCONNECT_PROJECT_ID in frontend/.env'
      );
    }

    const signerAccountId = connector.signers[0]?.getAccountId();
    if (!signerAccountId) {
      throw new Error('Wallet not connected or account not found.');
    }

    const tx = new ContractExecuteTransaction()
      .setContractId(contractId)
      .setGas(gasLimit)
      .setFunction(functionName, functionParameters.buildHAPIParams())
      .setPayableAmount(payableAmount)
      .freezeWithSigner(connector.signers[0]);

    const params: SignAndExecuteTransactionParams = {
      signerAccountId: signerAccountId.toString(),
      transactionList: transactionToBase64String(await tx),
    };

    const result = await connector.signAndExecuteTransaction(params);
    const transactionId = (result as any)?.transactionId;

    return transactionId || null;
  }
}

export const walletConnectWallet = new WalletConnectWallet();

// --- Headless React Component for State Syncing ---

export const WalletConnectClient = () => {
  const { setAccountId, setIsConnected } = useContext(WalletConnectContext);

  const syncWithWalletContext = useCallback(() => {
    const connector = getConnector();
    const signer = connector?.signers?.[0];
    const accountId = signer?.getAccountId()?.toString();

    if (accountId) {
      setAccountId(accountId);
      setIsConnected(true);
    } else {
      setAccountId('');
      setIsConnected(false);
    }
  }, [setAccountId, setIsConnected]);

  useEffect(() => {
    initializeWalletConnect()
      .then(() => {
        syncWithWalletContext();
      })
      .catch((error) => {
        console.error('WalletConnect init failed:', error);
        setAccountId('');
        setIsConnected(false);
      });

    refreshEvent.addListener('sync', syncWithWalletContext);

    return () => {
      refreshEvent.removeListener('sync', syncWithWalletContext);
    };
  }, [syncWithWalletContext, setAccountId, setIsConnected]);

  return null;
};
