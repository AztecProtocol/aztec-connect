import { blockchainStatusFromJson } from '../blockchain';
import { fetch } from '../iso_fetch';

export async function getServiceName(baseUrl: string): Promise<string> {
  const response = await fetch(baseUrl);
  try {
    const body = await response.json();
    return body.serviceName;
  } catch (err) {
    throw new Error(`Bad response from: ${baseUrl}`);
  }
}

export async function getBlockchainStatus(baseUrl: string) {
  const response = await fetch(`${baseUrl}/status`);
  try {
    const body = await response.json();
    return blockchainStatusFromJson(body.blockchainStatus);
  } catch (err) {
    throw new Error(`Bad response from: ${baseUrl}`);
  }
}
