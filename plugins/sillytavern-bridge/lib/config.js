import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { randomBytes } from 'node:crypto';

export const VERSION = '0.3.0-dsh020rc2.1';
export const DEFAULTS = Object.freeze({ tavernDirectory: '', nodeCommand: 'node', tavernPort: 8000, gatewayPort: 8100, sharingEnabled: false, sharedProviders: [] });
export const storageDirectory = () => path.join(process.env.DSH_HOME || path.join(os.homedir(), '.dsh'), 'storages', 'sillytavern-bridge');
export function localUrl(port, suffix = '/') { return `http://${'127.0.0.1'}:${port}${suffix}`; }

export function normalizeConfig(value = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('配置必须为对象 / Configuration must be an object');
  const text = (key, fallback) => {
    const result = value[key] === undefined ? fallback : value[key];
    if (typeof result !== 'string' || result.length > 4096 || /[\0\r\n]/.test(result)) throw new Error(`Invalid ${key}`);
    return result.trim();
  };
  const port = key => {
    const result = value[key] === undefined ? DEFAULTS[key] : Number(value[key]);
    if (!Number.isInteger(result) || result < 1024 || result > 65535) throw new Error(`Invalid ${key}: use 1024–65535`);
    return result;
  };
  const tavernPort = port('tavernPort'), gatewayPort = port('gatewayPort');
  if (tavernPort === gatewayPort) throw new Error('酒馆和网关端口不能相同 / Ports must differ');
  const directory = text('tavernDirectory', DEFAULTS.tavernDirectory);
  if (directory && !path.isAbsolute(directory)) throw new Error('请填写酒馆绝对目录 / Use an absolute SillyTavern directory');
  const providers = value.sharedProviders ?? [];
  if (!Array.isArray(providers) || providers.length > 100 || providers.some(v => typeof v !== 'string' || !/^[A-Za-z0-9_.-]{1,100}$/.test(v))) throw new Error('Invalid provider allowlist');
  const nodeCommand = text('nodeCommand', DEFAULTS.nodeCommand);
  if (!nodeCommand || /\.(?:cmd|bat)$/i.test(nodeCommand)) throw new Error('请指定 Node 可执行程序，不是脚本 / Specify Node, not a shell script');
  if (value.sharingEnabled !== undefined && typeof value.sharingEnabled !== 'boolean') throw new Error('Invalid sharingEnabled');
  return { tavernDirectory: directory, nodeCommand, tavernPort, gatewayPort, sharingEnabled: value.sharingEnabled === true, sharedProviders: [...new Set(providers)] };
}

export class ConfigStore {
  constructor(directory = storageDirectory()) { this.directory = directory; this.configFile = path.join(directory, 'config.json'); this.keyFile = path.join(directory, 'gateway-auth.json'); }
  async load() {
    try { return normalizeConfig(JSON.parse(await fs.readFile(this.configFile, 'utf8'))); }
    catch (error) { if (error.code === 'ENOENT') return normalizeConfig(); throw new Error('插件配置无法读取，请检查本地配置 / Cannot read local plugin configuration'); }
  }
  async save(value) {
    const config = normalizeConfig(value);
    await fs.mkdir(this.directory, { recursive: true });
    const temporary = this.configFile + '.' + randomBytes(8).toString('hex') + '.tmp';
    try { await fs.writeFile(temporary, JSON.stringify(config, null, 2) + '\n', { mode: 0o600, flag: 'wx' }); await fs.rename(temporary, this.configFile); }
    finally { await fs.rm(temporary, { force: true }); }
    return config;
  }
  async gatewayKey() {
    try {
      const key = JSON.parse(await fs.readFile(this.keyFile, 'utf8')).key;
      if (typeof key !== 'string' || !/^[a-f0-9]{64}$/.test(key)) throw new Error('Invalid local key');
      return key;
    } catch (error) {
      if (error.code !== 'ENOENT') throw new Error('本地网关密钥文件损坏 / Invalid local gateway key file');
    }
    await fs.mkdir(this.directory, { recursive: true });
    const key = randomBytes(32).toString('hex');
    try { await fs.writeFile(this.keyFile, JSON.stringify({ key }) + '\n', { mode: 0o600, flag: 'wx' }); return key; }
    catch (error) { if (error.code === 'EEXIST') return this.gatewayKey(); throw error; }
  }
}
