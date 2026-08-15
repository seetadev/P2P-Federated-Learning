import { ipcMain } from 'electron';
import { PinataSDK } from 'pinata';
import * as fs from 'fs';

export function registerPinataHandlers() {
  ipcMain.handle(
    'pinata:uploadFile',
    async (_event, filePath: string, jwt: string, gateway: string) => {
      const pinata = new PinataSDK({ pinataJwt: jwt, pinataGateway: gateway });
      
      // Node.js file read converted into a format Pinata accepts
      const buffer = fs.readFileSync(filePath);
      const blob = new Blob([buffer]);
      const file = new File([blob], 'upload', { type: 'application/octet-stream' });
      
      const upload = await pinata.upload.public.file(file);
      return upload.cid;
    }
  );
}
